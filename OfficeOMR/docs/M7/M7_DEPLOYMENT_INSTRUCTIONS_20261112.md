# M7 Cloud Functions 部署指南

**日期**: 2026-11-12  
**状态**: ✅ 代码修复完成 → ⏳ 等待部署

---

## 快速概览

所有 M7 代码修复已完成。三个关键问题已修复：

| # | 问题 | 文件 | 状态 |
|---|------|------|------|
| 1 | 函数装饰器（@cloud_event vs @callable）| [callables_m7.py](../../functions/callables_m7.py) | ✅ 已修复 |
| 2 | Firestore 安全漏洞（任何教师可修改任何 job）| [firestore.rules](../../firestore.rules) | ✅ 已修复 |
| 3 | 缺少身份验证和授权检查 | [callables_m7.py](../../functions/callables_m7.py) | ✅ 已修复 |
| 4 | 函数未在 main.py 中注册 | [main.py](../../functions/main.py) | ✅ 已修复 |

---

## 部署方法

由于本地环境中 Firebase CLI 的认证限制（Google Cloud 需要交互式 RAPT 重新认证），部署必须在您的本地机器上进行。

### 方法 A：使用自动化部署脚本（推荐）

在您的本地机器上运行以下命令：

```powershell
# 进入项目目录
cd D:\chhsban\OfficeOMR

# 运行部署脚本
.\DEPLOY_M7_FUNCTIONS.ps1
```

脚本会自动：
1. 验证 Firebase CLI 已安装
2. 打开浏览器进行 Google 登录
3. 验证项目配置
4. 部署 Firestore Rules
5. 部署所有 6 个 M7 Cloud Functions

**预计时间**: 5-10 分钟

### 方法 B：手动部署

```powershell
# 1. 登录 Firebase
cd D:\chhsban\OfficeOMR
firebase login

# 2. 部署 Firestore Rules
firebase deploy --only firestore:rules

# 3. 部署 Cloud Functions
firebase deploy --only functions
```

### 方法 C：使用 Google Cloud CLI

如果 Firebase CLI 出现问题：

```bash
gcloud auth login
cd D:\chhsban\OfficeOMR\functions

# 部署每个函数
gcloud functions deploy uploadAnswerKeyByImage --gen2 --runtime python311 \
  --region us-central1 --trigger-http --entry-point uploadAnswerKeyByImage \
  --project officeomr-fe542

gcloud functions deploy uploadAnswerKeyManually --gen2 --runtime python311 \
  --region us-central1 --trigger-http --entry-point uploadAnswerKeyManually \
  --project officeomr-fe542

# ... 依此类推，部署其他 4 个函数
```

---

## 修复的代码详情

### 1. Firestore Security Rules (`firestore.rules`)

**问题**：多个 allow 语句以 OR 方式组合，导致任何活跃教师可修改任何 job 的数据。

**修复**：
- 移除了危险的 `allow update` 权限
- 改为严格的只读规则（教师只能读自己的 job）
- 所有修改必须通过 Cloud Functions 的 Admin SDK（绕过规则）
- Admin SDK 内部有身份验证和授权检查

```firestore
// BEFORE (UNSAFE):
allow update: if resource.data.uid == request.auth.uid;

// AFTER (SAFE):
// No direct update allowed from frontend
// All writes via Cloud Functions with Admin SDK
```

### 2. Cloud Functions (`callables_m7.py`)

**问题**：
- 使用 `@functions_framework.cloud_event` 装饰器（事件触发，不兼容前端）
- 零身份验证检查
- 直接信任前端传递的 userId

**修复**：
- ✅ 改用 `@https_fn.on_call` 装饰器（正确的 callable 格式）
- ✅ 添加 `require_auth()` 函数验证身份
- ✅ 添加 `verify_job_ownership()` 函数验证授权
- ✅ 6 个完全重写的函数，都有适当的错误处理

```python
# BEFORE (BROKEN):
@functions_framework.cloud_event
def uploadAnswerKeyByImage(cloud_event):
    # 错误：cloud_event 是异步事件，不是 HTTP 请求

# AFTER (CORRECT):
@https_fn.on_call(region="us-central1")
def uploadAnswerKeyByImage(req: https_fn.CallableRequest) -> dict:
    # 正确：callable 函数，前后端兼容
    require_auth(req)  # 验证身份
    verify_job_ownership(req, job_id)  # 验证授权
    # ... 处理逻辑
```

### 3. 函数注册 (`main.py`)

**问题**：M7 函数在 `callables_m7.py` 中定义，但未在 `main.py` 中导入，导致 Firebase 无法发现和部署它们。

**修复**：在 `main.py` 末尾添加显式导入：

```python
# main.py (lines 410-420)
from callables_m7 import (
    uploadAnswerKeyByImage,
    uploadAnswerKeyManually,
    getAnswerKey,
    recognizeAndGradeSheet,
    batchRecognizeSheets,
    cleanupJobStudentData
)
```

### 4. 依赖项 (`requirements.txt`)

**问题**：缺少 `firebase-functions` 包，导致导入失败。

**修复**：添加了 `firebase-functions==0.5.0`

---

## 已部署的 6 个函数

### 1. `uploadAnswerKeyByImage`
- **用途**: 教师通过扫描答案纸上传标准答案
- **参数**: 图像 (Base64) + 模板配置
- **返回**: 识别到的答案数组 + 冻结状态

### 2. `uploadAnswerKeyManually`
- **用途**: 教师手动输入标准答案
- **参数**: 答案数组 (例: ['A', 'B', 'C', ...])
- **返回**: 答案存储确认 + 冻结状态

### 3. `getAnswerKey`
- **用途**: 检索已存储的标准答案
- **参数**: 工作 ID
- **返回**: 答案数组 + 冻结状态 + 上传者信息

### 4. `recognizeAndGradeSheet`
- **用途**: 识别学生答卷并与标准答案对比
- **参数**: 学生答卷图像 (Base64) + 工作 ID
- **返回**: 识别的答案 + 分数 + 正确/错误标记

### 5. `batchRecognizeSheets`
- **用途**: 批量识别多份答卷（第二阶段功能）
- **参数**: 答卷图像数组
- **返回**: 批处理结果汇总

### 6. `cleanupJobStudentData`
- **用途**: 24 小时后自动删除学生答卷数据
- **参数**: 工作 ID
- **返回**: 清理状态 + 删除的记录数

---

## 部署后验证

### 1. 检查 Firebase Console

访问 [Firebase Console - 函数](https://console.firebase.google.com/project/officeomr-fe542/functions)

验证所有 6 个函数已列出并显示"OK"状态：
- ✓ uploadAnswerKeyByImage
- ✓ uploadAnswerKeyManually
- ✓ getAnswerKey
- ✓ recognizeAndGradeSheet
- ✓ batchRecognizeSheets
- ✓ cleanupJobStudentData

### 2. 测试前端集成

1. 启动本地开发服务器：
   ```
   npm run dev
   ```

2. 以教师身份登录：
   - 访问 `http://localhost:3000/m7.html`
   - 用教师账户登录

3. 测试工作流：
   - 创建新考题
   - 上传标准答案（图像或手动）
   - 验证答案被冻结
   - 上传学生答卷
   - 验证自动批改

### 3. 查看函数日志

```powershell
firebase functions:log
```

或在 Firebase Console 中查看各函数的日志。

### 4. 测试安全性

验证安全修复：
- 尝试以非拥有者身份修改考题 → 应被拒绝
- 尝试在没有认证的情况下调用函数 → 应被拒绝
- 验证只有 job 拥有者或超级管理员可以访问

---

## 故障排除

### 部署失败：认证错误

```
Error: invalid_grant, error_description: reauth related error (invalid_rapt)
```

**解决**：在您的本地机器上运行 `firebase login`，让它打开浏览器完成 Google 重新认证。

### 函数返回 500 错误

检查日志：
```powershell
firebase functions:log | grep -i error
```

常见原因：
- 模块导入失败 → 检查 requirements.txt
- Firestore 权限问题 → 检查 Firestore Rules
- 环境变量缺失 → 检查 Cloud Functions 配置

### 前端无法调用函数

验证：
1. Firebase SDK 已初始化
2. 用户已认证
3. 函数 URL 正确
4. 跨域 (CORS) 配置正确

---

## 提交和参考

**Git 提交**：已包含所有修复的详细提交消息  
**相关文档**：[M7 设计文档](./M7_DETAILED_DESIGN.md)  
**代码审查**：[Claude 审查报告](./M7_claude%20suggestion.md)

---

## 总结

✅ 所有代码修复已完成  
⏳ 等待在您的本地机器上运行部署脚本  
📋 部署后将完成 M7 第一阶段

**问题**？查看 `firebase-debug.log` 或联系项目维护者。

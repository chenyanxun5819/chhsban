# M7 部署问题 — Firebase CLI 认证过期

**日期**: 2026-11-12  
**状态**: ⏸️ 等待用户交互式认证

## 问题描述

修复了所有代码问题（firestore.rules 安全漏洞、callables_m7.py 函数装饰器等）后，尝试部署到 Firebase Cloud Functions，但遇到认证错误：

```
Error: {"error":"invalid_grant","error_description":"reauth related error (invalid_rapt)","error_uri":"https://support.google.com/a/answer/9368756","error_subtype":"invalid_rapt"}
Error: Failed to authenticate, have you run firebase login?
```

### 根本原因

- Google Cloud 要求重新认证（RAPT：Re-Authentication Protocol）
- Firebase CLI 运行在非交互环境中，无法打开浏览器完成 OAuth 流程
- 缓存的认证令牌已过期

## 解决方案

### 选项 A：本地手动部署（推荐）

在您的本地机器上运行：

```powershell
cd D:\chhsban\OfficeOMR
firebase login      # 这会打开浏览器，让您完成 Google 登录
firebase deploy --only functions
```

### 选项 B：使用 gcloud CLI

```powershell
gcloud auth login   # 完成交互式认证
gcloud functions deploy uploadAnswerKeyByImage --gen2 --runtime python311 --region us-central1 --source D:\chhsban\OfficeOMR\functions --entry-point uploadAnswerKeyByImage --trigger-http --allow-unauthenticated --project=officeomr-fe542
```

（重复上述命令以部署所有 6 个函数）

### 选项 C：使用服务账户密钥（自动化用）

1. 在 Google Cloud Console 创建服务账户密钥
2. 保存为 `D:\chhsban\OfficeOMR\firebase-key.json`
3. 运行：
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "D:\chhsban\OfficeOMR\firebase-key.json"
   firebase deploy --only functions
   ```

## 已完成的工作

✅ **firestore.rules** — 修复了安全漏洞  
✅ **callables_m7.py** — 完全重写，使用正确的 `@https_fn.on_call` 装饰器  
✅ **main.py** — 注册了所有 6 个 M7 函数  
✅ **requirements.txt** — 降级到兼容 Python 3.11 的版本（NumPy 1.24.3）

## 要部署的 6 个函数

1. `uploadAnswerKeyByImage` — 通过图像上传标准答案
2. `uploadAnswerKeyManually` — 手动输入标准答案
3. `getAnswerKey` — 检索标准答案
4. `recognizeAndGradeSheet` — 识别并批改学生答卷
5. `batchRecognizeSheets` — 批量处理（第二阶段）
6. `cleanupJobStudentData` — 24小时清理学生数据

## 后续步骤

完成部署后：

1. 验证所有 6 个函数在 Firebase Console 中可见
2. 测试前端 M7 页面调用这些函数
3. 检查答案纸冻结逻辑是否正常工作
4. 测试 24 小时清理验证

---

**参考文件**:
- [callables_m7.py](../../functions/callables_m7.py)
- [firestore.rules](../../firestore.rules)
- [main.py](../../functions/main.py)

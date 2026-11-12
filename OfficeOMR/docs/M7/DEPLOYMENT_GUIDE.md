# M7 部署指南 — 2026-11-12

## 🚀 部署前检查

### ✅ 已完成的准备工作

- [x] **后端代码** - `callables_m7.py` 已实现 (800+ 行)
- [x] **单元测试** - `test_m7.py` 已完成 (18/21 通过)
- [x] **前端服务** - `m7-service.js` 已创建
- [x] **应用集成** - `app.js` 已更新
- [x] **HTML 更新** - 已添加 Firestore/Functions SDK
- [x] **部署脚本** - `DEPLOY_M7.ps1` 已准备
- [x] **Firebase 配置** - `.firebaserc` 和 `firebase.json` 已就位

### ✅ Firebase 项目配置

```
项目 ID: officeomr-fe542
地区: us-central1 (Asia Southeast 1 可用)
类型: Blaze 计划 (支持 Cloud Functions)
```

---

## 📋 部署步骤

### 第 1 步：验证 Firebase CLI

```powershell
firebase --version
# 应该显示 11.x 以上版本
```

如果未安装：
```powershell
npm install -g firebase-tools
firebase login
```

### 第 2 步：验证项目

```powershell
cd D:\chhsban\OfficeOMR
firebase use
# 应该显示: default: officeomr-fe542
```

### 第 3 步：运行部署脚本（推荐）

**PowerShell 版本** (Windows):
```powershell
.\scripts\DEPLOY_M7.ps1
```

**Bash 版本** (Linux/Mac):
```bash
bash scripts/DEPLOY_M7.sh
```

### 手动部署（如果脚本失败）

```powershell
# 部署 Firestore 规则 (answerKey 保护)
firebase deploy --only firestore:rules

# 部署 Storage 规则
firebase deploy --only storage

# 部署 Cloud Functions (M7)
firebase deploy --only functions

# 部署前端 (HTML/JS)
firebase deploy --only hosting
```

---

## 🔍 部署后验证

### 1️⃣ 检查 Cloud Functions

```powershell
firebase functions:list
```

应该看到 6 个 M7 函数：
```
uploadAnswerKeyByImage
uploadAnswerKeyManually
getAnswerKey
recognizeAndGradeSheet
batchRecognizeSheets
cleanupJobStudentData
```

### 2️⃣ 检查 Firestore 规则

```powershell
firebase firestore:indexes
```

验证 answerKey 保护规则已生效

### 3️⃣ 测试前端应用

访问: https://officeomr-fe542.web.app

应该看到：
- ✅ 登入页面加载
- ✅ Firebase 认证工作
- ✅ 浏览器控制台无错误
- ✅ M7Service 已初始化

### 4️⃣ 测试 M7 API 调用（可选）

在浏览器控制台测试：

```javascript
// 假设用户已登入，有有效的 jobId
const m7 = app.m7Service;
const result = await m7.getAnswerKey('test-job-123');
console.log(result);
```

---

## ⚙️ 部署后配置

### 1️⃣ Cloud Scheduler 设置（24h 自动清理）

在 Google Cloud Console:
1. 导航到 **Cloud Scheduler**
2. 创建新任务：
   ```
   名称: m7-cleanup-scheduler
   频率: 0 * * * * (每小时，在 0 分钟)
   时区: Asia/Kuala_Lumpur
   HTTP method: POST
   URL: https://us-central1-officeomr-fe542.cloudfunctions.net/cleanupJobStudentData
   ```

### 2️⃣ Cloud Storage 生命周期规则（可选，生产环保）

在 Google Cloud Console:
1. 导航到 **Cloud Storage**
2. 选择存储桶
3. 添加生命周期规则：
   ```json
   {
     "lifecycle": {
       "rule": [
         {
           "action": {"type": "Delete"},
           "condition": {
             "age": 1,
             "matchesPrefix": ["uploads/", "annotated/"]
           }
         }
       ]
     }
   }
   ```

### 3️⃣ 服务账户权限（如果需要）

确保 Cloud Functions 服务账户有权限：
- `firestore.databases.get` - 读取 Firestore
- `storage.buckets.get` - 读取 Storage
- `storage.objects.delete` - 删除学生数据

---

## 📊 部署配置文件示例

### firebase.json

```json
{
  "hosting": {
    "public": "web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "python311"
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### firestore.rules 中的 M7 规则

```firestore
// M7: 保护 answerKey 不被删除
match /jobs/{jobId} {
  allow read: if request.auth != null;
  allow update: if 
    request.auth != null &&
    !('answerKey' in request.resource.data.diff(resource.data));
}
```

---

## 🆘 常见问题

### Q: 部署失败 "authentication required"

**A:** 运行 `firebase login` 再试一次

### Q: Cloud Functions 超时

**A:** 函数初次冷启动可能需要 30 秒，属正常

### Q: "missing STORAGE_BUCKET" 环境变量

**A:** 部署脚本会自动设置，或手动指定：
```powershell
firebase deploy --only functions --set-env-vars "STORAGE_BUCKET=officeomr-fe542.firebasestorage.app"
```

### Q: 前端加载不了 M7Service

**A:** 检查浏览器控制台的脚本错误，确保 `/js/services/m7-service.js` 文件存在

### Q: Firestore 规则错误

**A:** 查看 `firestore.rules` 第 ~110 行的 answerKey 保护规则是否语法正确

---

## 📝 部署后清单

部署完成后，请确保：

- [ ] Firebase CLI 已登入且指向正确项目
- [ ] 所有 6 个 M7 Cloud Functions 已显示在列表中
- [ ] 前端应用 (https://officeomr-fe542.web.app) 加载成功
- [ ] 浏览器控制台显示 "M7Service initialized"
- [ ] Firestore 规则已部署 (firebase firestore:indexes)
- [ ] Cloud Scheduler 已配置用于自动清理（可选）
- [ ] 已备份现有的任何生产数据（重要！）

---

## 🔄 回滚方案

如果部署出现问题，回滚步骤：

```powershell
# 恢复前一个版本的 Firestore 规则
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules

# 禁用问题函数（临时）
# 在 Firebase Console → Functions → 禁用具体函数

# 恢复前一个版本的前端
firebase hosting:channels:list
firebase hosting:clone-version <previous-version>
```

---

## 📞 部署完成后

1. **告知 Wes** - 发送 `EMAIL_TO_WES_M7_COMPLETE.md` 中的邮件
2. **监控日志** - 在 Firebase Console 查看函数日志
3. **测试工作流** - 使用真实数据进行端到端测试
4. **收集反馈** - 获取用户对新功能的反馈

---

## 📚 相关文档

| 文档 | 用途 |
|------|------|
| `M7_IMPLEMENTATION_SUMMARY.md` | 部署检查清单 |
| `M7_TECHNICAL_SPECS.md` | API 文档 |
| `M7_DATA_RETENTION_MODEL.md` | 数据保留策略 |
| `EMAIL_TO_WES_M7_COMPLETE.md` | 确认邮件 |

---

**部署日期**: 2026-11-12  
**Firebase 项目**: officeomr-fe542  
**状态**: ✅ 已准备就绪

---

## 下一步

部署完成后的优先工作：

1. **OMR 集成** (Phase 2)
   - 实现 `omr_core.recognize_sheet()` 调用
   - 测试答案卡扫描识别

2. **前端 UI** (Phase 2)
   - 创建"上传标准答案"页面
   - 创建"学生答案卡管理"页面
   - 创建"成绩查看"页面

3. **监控和告警** (Phase 3)
   - 设置 Stackdriver 日志告警
   - 监控函数执行时间
   - 追踪 answerKey 删除错误

4. **生产发布** (Phase 3)
   - 邀请教师试用
   - 收集反馈
   - 正式上线

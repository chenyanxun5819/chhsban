# M6 Stage A - 部署清单 ✅

**状态**: ✅ 全部完成  
**最后更新**: 2026-11-11 08:30 UTC+8

---

## 部署清单

### ✅ 必需步骤 (已完成)

- [x] **Firestore 数据初始化**
  - 初始化时间: 2026-11-11 08:25
  - 脚本: `tools/init_m6_data.py`
  - 结果: settings/global + orgs/chhs + collections
  
- [x] **Bootstrap Super Admin**
  - 初始化时间: 2026-11-11 08:26
  - 脚本: `tools/bootstrap_admin.py`
  - 账户: `weschen@mybazaar.my`
  - UID: `cAutk7JkLoMlDFxghmHnmCCP21C2`
  - Claims: `{role: "super_admin"}`

- [x] **Cloud Functions 部署**
  - 部署时间: 2026-11-11 08:27
  - 命令: `firebase deploy --only functions`
  - 函数: recognize_sheet (v2, python311, 1GB)

---

## 🔧 快速参考

### 如果需要重新部署全部
```powershell
cd D:\chhsban\OfficeOMR

# 方式 1: 使用一键部署脚本
.\DEPLOY_M6_STAGE_A.ps1

# 方式 2: 手动执行各步骤
# 1. 初始化数据
$env:PYTHONIOENCODING = 'utf-8'
python tools/init_m6_data.py --project-id officeomr-fe542

# 2. Bootstrap Admin
python tools/bootstrap_admin.py officeomr-fe542 weschen@mybazaar.my

# 3. 部署函数
firebase deploy --only functions --project officeomr-fe542
```

### 如果只需要部署某一个组件

```powershell
# 仅部署 Cloud Functions
firebase deploy --only functions --project officeomr-fe542

# 仅部署 Firestore Rules
firebase deploy --only firestore:rules --project officeomr-fe542

# 仅初始化数据（跳过已存在的集合）
python tools/init_m6_data.py --project-id officeomr-fe542

# 仅为某个邮箱设置 Super Admin
python tools/bootstrap_admin.py officeomr-fe542 new-email@example.com
```

---

## 📊 部署状态一览

| 组件 | 状态 | 时间 | 说明 |
|------|------|------|------|
| Firestore 初始化 | ✅ | 08:25 | 4 个集合，7 个参数 |
| Bootstrap Admin | ✅ | 08:26 | weschen@mybazaar.my |
| Cloud Functions | ✅ | 08:27 | recognize_sheet v2 |
| Security Rules | ✅ | 已部署 | firestore.rules |

---

## 🔑 环境配置

### 认证方式 1: gcloud ADC (推荐用于开发)
```powershell
# 第一次配置
gcloud auth application-default login

# 验证
gcloud auth application-default print-access-token
```

### 认证方式 2: gcloud CLI
```powershell
# 配置
gcloud auth login

# 查看当前账户
gcloud config get-value account
```

### 认证方式 3: 服务账号密钥 (用于 CI/CD)
```powershell
# 设置环境变量
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\chhsban\OfficeOMR\officeomr-fe542-0cbe395f27f8.json"

# 验证
$env:GOOGLE_APPLICATION_CREDENTIALS
```

⚠️ **重要**: 不要将服务账号密钥提交到 Git！

---

## 🧪 快速验证

### 1. Firestore 集合是否已创建
```powershell
gcloud firestore documents list --collection=settings
gcloud firestore documents list --collection=orgs
gcloud firestore documents list --collection=allowedUsers
```

### 2. Super Admin 是否已设置
```powershell
# 列出所有用户的自定义声明
gcloud auth users describe weschen@mybazaar.my
```

### 3. Cloud Functions 是否已部署
```powershell
firebase functions:list --project officeomr-fe542

# 应该看到:
# ┌─────────────────┬─────────┬─────────┬─────────────┐
# │ recognize_sheet │ v2      │ https   │ us-central1 │
# └─────────────────┴─────────┴─────────┴─────────────┘
```

### 4. Firebase Console 验证 (推荐)
打开以下链接验证部署状态:
- **Firestore**: https://console.firebase.google.com/project/officeomr-fe542/firestore
- **Functions**: https://console.firebase.google.com/project/officeomr-fe542/functions
- **Auth**: https://console.firebase.google.com/project/officeomr-fe542/auth

---

## 📝 Stage B 准备清单

Stage B 前端实现需要:

- [ ] Web 前端框架选择 (React/Vue/Svelte)
- [ ] 身份验证 UI 组件
- [ ] Teacher Dashboard 设计
- [ ] Admin 管理面板设计
- [ ] API 客户端库 (Firebase SDK 集成)
- [ ] 权限管理 UI
- [ ] 扫描上传功能
- [ ] 测试套件

---

## ⚠️ 故障排除

### 问题: 403 权限错误
**原因**: Firestore Rules 拒绝访问  
**解决方案**:
1. 检查是否使用了正确的认证 (gcloud ADC)
2. 确保 `settings/global` 已经存在
3. 检查 Firestore Rules 是否已部署

### 问题: User not found
**原因**: Firebase Auth 中没有该用户  
**解决方案**:
1. 用户需要先通过 Google Sign-In 登录一次
2. 或者使用已经登录过的账户 (如 weschen@mybazaar.my)

### 问题: GOOGLE_APPLICATION_CREDENTIALS 路径错误
**原因**: 文件不存在或路径不正确  
**解决方案**:
```powershell
# 验证文件存在
Test-Path "C:\Users\MSI\AppData\Roaming\gcloud\application_default_credentials.json"

# 或使用 gcloud ADC login
gcloud auth application-default login
```

---

## 📞 需要帮助?

查看这些文档:
- [M6_DEPLOYMENT.md](../docs/M6_DEPLOYMENT.md) - 详细部署指南
- [M6_QUICK_START.md](../docs/M6_QUICK_START.md) - 快速开始
- [PLAN.md](../docs/PLAN.md) - 项目计划
- [firestore.rules](../firestore.rules) - 权限规则定义

---

**最后部署**: 2026-11-11 08:30 UTC+8  
**部署工程师**: Copilot  
**项目**: OfficeOMR M6  

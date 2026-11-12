# M6 Stage A 部署指南 - 本地执行

**状态**: ✅ 代码 100% 准备就绪 | ⏳ 需本地部署

---

## 🚀 快速开始（3 分钟）

在您的 **本地 VS Code PowerShell 终端**中执行：

```powershell
cd D:\chhsban\OfficeOMR
.\DEPLOY_M6_STAGE_A.ps1
```

这个脚本会自动执行：
1. ✅ 初始化 Firestore 数据 (settings/global, orgs/chhs, 等)
2. ✅ Bootstrap Wes 为 Super Admin
3. ✅ 部署 Cloud Functions 到 GCP (6 个函数)
4. ✅ 验证所有部署成功

---

## ⚠️ 前置条件检查

在运行脚本前，确认：

- [ ] VS Code PowerShell 终端已打开
- [ ] 已在本地运行过 `gcloud auth login` 或 `gcloud auth application-default login`
- [ ] `firebase-admin` Python 包已安装：`pip install firebase-admin`
- [ ] 文件 `officeomr-fe542-0cbe395f27f8.json` 存在于 `D:\chhsban\OfficeOMR\` 目录

```powershell
# 验证环境
cd D:\chhsban\OfficeOMR

# 检查密钥文件
Test-Path officeomr-fe542-0cbe395f27f8.json

# 检查 Python 包
pip list | Select-String firebase-admin

# 检查 gcloud 认证
gcloud auth list
```

---

## 📋 手动执行（如果需要调试）

如果需要逐步执行每个部分：

### 步骤 1: 初始化 Firestore 数据

```powershell
cd D:\chhsban\OfficeOMR
$env:PYTHONIOENCODING = 'utf-8'
python tools/init_m6_data.py --project-id officeomr-fe542
```

**预期输出**:
```
============================================================
M6 Firestore 初始化
============================================================
ℹ️ 使用服务账号: ...
ℹ️ 初始化全局设置...
✅ settings/global 已初始化
ℹ️ 创建默认组织...
✅ orgs/chhs 已创建
...
✅ Firestore 连接成功
```

### 步骤 2: Bootstrap Wes 为 Super Admin

```powershell
python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-0cbe395f27f8.json
```

**预期输出**:
```
============================================================
M6 Bootstrap Admin
============================================================
ℹ️ 认证服务账号...
✅ Firebase Admin SDK 初始化成功
ℹ️ 获取用户...
ℹ️ 设置 custom claims...
✅ Successfully set super_admin claim
   UID: <uid>
   Email: wes@chhs.edu.my
   Role: super_admin
```

### 步骤 3: 部署 Cloud Functions

```powershell
firebase deploy --only functions --project officeomr-fe542
```

**预期输出**:
```
=== Deploying to 'officeomr-fe542'...
i  deploying functions
...
✓ functions: claimAccess deployed successfully
✓ functions: approveTeacher deployed successfully
✓ functions: revokeTeacher deployed successfully
✓ functions: setUserActive deployed successfully
✓ functions: upsertOrg deployed successfully
✓ functions: updateGlobalSettings deployed successfully
+ Deploy complete!
```

### 步骤 4: 验证部署

```powershell
gcloud functions list --region us-central1 --project officeomr-fe542
```

**预期输出**:
```
NAME                  STATUS  TRIGGER      RUNTIME  REGION
claimAccess          ACTIVE  HTTPS        python311 us-central1
approveTeacher       ACTIVE  HTTPS        python311 us-central1
revokeTeacher        ACTIVE  HTTPS        python311 us-central1
setUserActive        ACTIVE  HTTPS        python311 us-central1
upsertOrg           ACTIVE  HTTPS        python311 us-central1
updateGlobalSettings ACTIVE  HTTPS        python311 us-central1
```

---

## 🔍 验证部署完成

部署完成后，执行以下验证：

### 1. 验证 Firestore 数据

访问: https://console.firebase.google.com/project/officeomr-fe542/firestore

检查是否存在：
- [ ] `settings/global` 文档 (包含 defaultDailySheetsPerUser, studentDataRetentionHours 等)
- [ ] `orgs/chhs` 文档 (包含 name, code, studentId 等)
- [ ] `allowedUsers` 集合 (初始为空，之后会添加教师)
- [ ] `usage` 集合 (初始为空)

### 2. 验证 Super Admin 账户

访问: https://console.firebase.google.com/project/officeomr-fe542/authentication

检查：
- [ ] 用户 `wes@chhs.edu.my` 存在
- [ ] 自定义声明包含 `role: "super_admin"`

### 3. 验证 Cloud Functions

访问: https://console.cloud.google.com/functions?project=officeomr-fe542

检查：
- [ ] 所有 6 个函数都列出
- [ ] 所有函数状态为 `ACTIVE`
- [ ] 区域都是 `us-central1`

### 4. 验证 Firestore Rules

访问: https://console.firebase.google.com/project/officeomr-fe542/firestore/rules

检查：
- [ ] Rules 已部署 (显示为"Active")
- [ ] 最后修改时间是最近的

---

## ⚡ 常见问题

### Q: 执行脚本时出现 "403 Missing or insufficient permissions"

**A:** 这意味着服务账号 (github-deployer) 权限不足。解决方式：

1. 运行 `gcloud auth login` 用您的用户账号登录
2. 修改脚本使用 Application Default Credentials (ADC)

或者手动给服务账号授予权限：
```powershell
gcloud projects add-iam-policy-binding officeomr-fe542 `
  --member=serviceAccount:github-deployer@officeomr-fe542.iam.gserviceaccount.com `
  --role=roles/editor
```

### Q: "firebase-admin SDK 未安装"

**A:** 安装依赖包：
```powershell
pip install firebase-admin
```

### Q: "User not found in Firebase Auth"

**A:** wes@chhs.edu.my 账户还未在 Firebase 中创建。需要先：
1. 访问 https://console.firebase.google.com/project/officeomr-fe542/authentication
2. 手动添加用户或让用户通过 Google Sign-In 登录一次

### Q: Cloud Functions 部署失败

**A:** 检查：
1. Firebase CLI 已安装：`firebase --version`
2. `.firebaserc` 中项目 ID 正确
3. `functions/` 目录存在且包含代码文件

---

## 📚 相关文档

- [M6_QUICK_COMMAND_REFERENCE.md](docs/M6_QUICK_COMMAND_REFERENCE.md) - 命令快速参考
- [M6_STAGE_A_CHECKLIST.md](docs/M6_STAGE_A_CHECKLIST.md) - 详细检查清单
- [M6_DEPLOYMENT.md](docs/M6_DEPLOYMENT.md) - 完整部署步骤
- [M6_STAGE_A_STATUS.md](M6_STAGE_A_STATUS.md) - 项目状态报告

---

## ✅ 完成后

所有部署步骤完成后：

1. 验证所有检查清单项
2. 在 Firestore/Firebase/GCP 控制台中确认数据
3. 通知我: "✅ M6 Stage A 已完成"
4. 准备进入 **Stage B - 前端实现**

---

**预计耗时**: 3-5 分钟
**最后更新**: 2026-11-07

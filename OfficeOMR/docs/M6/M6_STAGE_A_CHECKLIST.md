# M6 Stage A 部署检查清单

## 🚀 部署状态

### ✅ 已完成（自动化环境）
- [x] Firestore Security Rules 部署到生产环境
  - 文件: `firestore.rules`
  - 部署命令已执行: `firebase deploy --only firestore:rules`
  - 验证: Rules 编译成功，已发布到 cloud.firestore

- [x] 所有代码文件已创建并验证
  - `firestore.rules` - M6 多角色权限模型
  - `functions/callables_m6.py` - 6个管理函数
  - `tools/bootstrap_admin.py` - Super Admin 初始化
  - `tools/init_m6_data.py` - Firestore 数据初始化
  - `functions/tests/test_firestore_rules_m6.py` - 单元测试
  - 完整的文档和指南

---

## ⏳ 待完成（需在 VS Code 中执行）

> **重要**: 以下步骤必须在 VS Code 的 PowerShell 终端中执行，因为 VS Code 拥有有效的 Google 认证

### 步骤 1️⃣: 初始化 Firestore 数据

**目标**: 创建 Firestore 中的基本集合和初始数据

**在 VS Code 中执行:**
```powershell
cd D:\chhsban\OfficeOMR
$env:PYTHONIOENCODING = 'utf-8'
python tools/init_m6_data.py --project-id officeomr-fe542
```

**验证成功标志:**
- ✅ 消息: "M6 Firestore 初始化"
- ✅ 设置全局默认值成功
- ✅ 创建组织 chhs 成功
- ✅ 创建 allowedUsers 集合成功
- ✅ 创建 usage 集合成功
- ✅ Firestore 连接验证通过

**检查清单:**
- [ ] 脚本执行完成，无 403 权限错误
- [ ] Firestore Console 显示以下集合:
  - [ ] `settings` → `global` 文档 (包含 defaultDailySheetsPerUser, studentDataRetentionHours 等)
  - [ ] `orgs` → `chhs` 文档 (包含 name, code, studentId 等)
  - [ ] `allowedUsers` 集合存在 (初始为空)
  - [ ] `usage` 集合存在 (初始为空)

---

### 步骤 2️⃣: Bootstrap Wes 为 Super Admin

**目标**: 为 Wes (wes@chhs.edu.my) 创建 super_admin 角色和自定义声明

**在 VS Code 中执行:**
```powershell
python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-0cbe395f27f8.json
```

**验证成功标志:**
- ✅ 消息: "Successfully set super_admin claim"
- ✅ 显示 UID 和 Email
- ✅ 未报告权限错误

**检查清单:**
- [ ] 脚本成功完成
- [ ] 在 Firebase Console → Authentication 中验证:
  - [ ] 用户 wes@chhs.edu.my 存在
  - [ ] 自定义声明包含 `role: "super_admin"`

---

### 步骤 3️⃣: 部署 Cloud Functions

**目标**: 将 6 个管理函数部署到 GCP

**在 VS Code 中执行:**
```powershell
firebase deploy --only functions --project officeomr-fe542
```

**部署的函数:**
1. `claimAccess` - 用户认领访问权限
2. `approveTeacher` - 管理员批准教师
3. `revokeTeacher` - 撤销教师权限
4. `setUserActive` - 设置用户活跃状态
5. `upsertOrg` - 创建/更新组织
6. `updateGlobalSettings` - 更新全局设置

**验证成功标志:**
- ✅ 消息: "Deploy complete!"
- ✅ 所有函数显示 "✓" 符号
- ✅ 函数配置:
  - 内存: 256 MiB (仅管理函数)
  - max-instances: 2
  - 区域: us-central1
  - 超时: 60 秒

**检查清单:**
- [ ] `firebase deploy` 完成，无错误
- [ ] 在 GCP Console → Cloud Functions 验证:
  - [ ] 所有 6 个函数都存在
  - [ ] 所有函数状态为 "Active"
  - [ ] 代码已上传
  - [ ] 环境变量正确 (FIRESTORE_PROJECT_ID: officeomr-fe542)

---

### 步骤 4️⃣: 验证部署完成

**在 VS Code 中执行:**
```powershell
gcloud functions list --region us-central1 --project officeomr-fe542
```

**预期输出:**
```
NAME                 STATUS  TRIGGER      
claimAccess         ACTIVE  HTTP          
approveTeacher      ACTIVE  HTTP          
revokeTeacher       ACTIVE  HTTP          
setUserActive       ACTIVE  HTTP          
upsertOrg          ACTIVE  HTTP          
updateGlobalSettings ACTIVE  HTTP          
```

**验证清单:**
- [ ] 所有 6 个函数列出
- [ ] 所有函数状态为 ACTIVE
- [ ] 访问权限正确 (Callable)

---

## 🎯 Stage A 完成标准

当以下所有项都完成时，Stage A 部署完成:

### 基础设施
- [ ] ✅ Firestore Rules 部署到生产
- [ ] ✅ Firestore 数据结构初始化 (4 个集合)
- [ ] ✅ Cloud Functions 部署 (6 个函数)
- [ ] ✅ Super Admin 账户创建

### 权限模型
- [ ] ✅ Custom Claims 在 ID Token 中设置
- [ ] ✅ Rules 层实现双层检查 (token.role + allowedUsers.active)
- [ ] ✅ 立即失效实现 (停用后立刻被拒)

### 验证
- [ ] ✅ Firebase Console 显示所有数据结构
- [ ] ✅ GCP Console 显示所有活跃函数
- [ ] ✅ 无权限错误和部署失败

---

## 📚 相关文档

- **`docs/M6_QUICK_START.md`** - 快速开始指南
- **`docs/M6_DEPLOYMENT.md`** - 详细部署步骤和验证
- **`docs/M6_STAGE_A_SUMMARY.md`** - 技术架构总结
- **`docs/M6_PROJECT_SUMMARY.md`** - 项目决策和设计
- **`DEPLOY_M6_STAGE_A.ps1`** - 自动化部署脚本

---

## 🔗 外部链接

- Firebase Console: https://console.firebase.google.com/project/officeomr-fe542/overview
- GCP Cloud Functions: https://console.cloud.google.com/functions?project=officeomr-fe542
- Firestore Database: https://console.firebase.google.com/project/officeomr-fe542/firestore
- Firebase Authentication: https://console.firebase.google.com/project/officeomr-fe542/authentication

---

## ⚠️ 故障排除

### 问题: Python 脚本输出乱码
**解决:** 设置环境变量
```powershell
$env:PYTHONIOENCODING = 'utf-8'
```

### 问题: "403 Missing or insufficient permissions"
**解决:** 确保在 VS Code 中执行，VS Code 已有有效认证

### 问题: Firebase CLI 说"credentials are no longer valid"
**解决:** 在 VS Code 中运行，该环境的凭证有效

### 问题: Cloud Functions 部署失败
**检查:**
1. firebase.json 中的 functions.source 指向 "functions"
2. 运行时是 python311
3. 所有依赖在 requirements.txt 中

---

## 📝 提示

- 部署过程中出现的警告（如 "Unused function" 或 "Invalid variable name"）不影响功能
- 所有错误都应该立即解决，不能忽略
- 如果任何步骤失败，检查错误信息并在 VS Code 中重试，不要继续下一步

---

**最后更新**: 2026-07-04
**状态**: ⏳ 等待在 VS Code 中执行步骤 1-4

# M6 Stage A 最终部署清单

**日期**: 2026-11-07
**状态**: ⏳ 等待本地执行

---

## 🎯 一句话总结

所有代码 100% 准备好了，在本地 VS Code 中执行 `.\DEPLOY_M6_STAGE_A.ps1` 即可完成部署。

---

## 📋 代码准备清单

### ✅ 已完成

- [x] Firestore Security Rules (`firestore.rules`)
  - 多角色权限模型
  - 立即失效机制 (Rules 层双层检查)
  - ✅ 已部署到生产环境

- [x] Cloud Functions (`functions/callables_m6.py`)
  - 6 个管理函数完整实现
  - 256 MiB 内存配置
  - max-instances: 2
  - 区域: us-central1

- [x] Firestore 初始化脚本 (`tools/init_m6_data.py`)
  - 已修复为支持 ADC 和服务账号
  - 创建 settings/global, orgs/chhs, allowedUsers, usage

- [x] Bootstrap Admin 脚本 (`tools/bootstrap_admin.py`)
  - 为 wes@chhs.edu.my 创建 super_admin 角色
  - 完整的错误处理

- [x] 自动化部署脚本 (`DEPLOY_M6_STAGE_A.ps1`)
  - 一键执行所有 4 个步骤
  - 详细的输出和错误处理

- [x] 完整文档 (7 份)
  - README_M6_DEPLOYMENT.md (本地部署指南)
  - M6_QUICK_COMMAND_REFERENCE.md (命令参考)
  - M6_STAGE_A_CHECKLIST.md (检查清单)
  - M6_DEPLOYMENT.md (详细步骤)
  - M6_STAGE_A_SUMMARY.md (技术总结)
  - M6_PROJECT_SUMMARY.md (设计决策)
  - M6_STAGE_A_STATUS.md (项目状态)

---

## ⏳ 本地部署清单

### 步骤 1: 初始化 Firestore 数据
- [ ] 执行 `python tools/init_m6_data.py --project-id officeomr-fe542`
- [ ] 验证创建成功的消息
- [ ] 检查 Firestore Console 中存在:
  - [ ] `settings/global`
  - [ ] `orgs/chhs`
  - [ ] `allowedUsers` 集合
  - [ ] `usage` 集合

### 步骤 2: Bootstrap Super Admin
- [ ] 执行 `python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-0cbe395f27f8.json`
- [ ] 验证成功消息包含 UID 和 email
- [ ] 在 Firebase Console → Authentication 中验证:
  - [ ] 用户 wes@chhs.edu.my 存在
  - [ ] 自定义声明: `{"role": "super_admin"}`

### 步骤 3: 部署 Cloud Functions
- [ ] 执行 `firebase deploy --only functions --project officeomr-fe542`
- [ ] 验证所有 6 个函数部署成功:
  - [ ] claimAccess
  - [ ] approveTeacher
  - [ ] revokeTeacher
  - [ ] setUserActive
  - [ ] upsertOrg
  - [ ] updateGlobalSettings

### 步骤 4: 验证部署
- [ ] 执行 `gcloud functions list --region us-central1 --project officeomr-fe542`
- [ ] 验证所有 6 个函数显示 ACTIVE 状态

---

## 🔍 最终验证清单

### Firestore 数据
- [ ] https://console.firebase.google.com/project/officeomr-fe542/firestore
  - [ ] 集合 `settings` 包含文档 `global`
  - [ ] 集合 `orgs` 包含文档 `chhs`
  - [ ] 集合 `allowedUsers` 存在（初始为空）
  - [ ] 集合 `usage` 存在（初始为空）

### Firebase Authentication
- [ ] https://console.firebase.google.com/project/officeomr-fe542/authentication
  - [ ] 用户列表显示 wes@chhs.edu.my
  - [ ] 用户的自定义声明包含 `role: "super_admin"`

### Cloud Functions
- [ ] https://console.cloud.google.com/functions?project=officeomr-fe542
  - [ ] 6 个函数都显示
  - [ ] 所有函数状态为 ACTIVE
  - [ ] 所有函数区域为 us-central1
  - [ ] 所有函数内存为 256 MiB

### Firestore Security Rules
- [ ] https://console.firebase.google.com/project/officeomr-fe542/firestore/rules
  - [ ] Rules 显示为已发布
  - [ ] 版本号最近更新

---

## 🚀 执行步骤

### 快速方式 (推荐)
```powershell
cd D:\chhsban\OfficeOMR
.\DEPLOY_M6_STAGE_A.ps1
```

### 逐步方式
```powershell
# Step 1
python tools/init_m6_data.py --project-id officeomr-fe542

# Step 2
python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-0cbe395f27f8.json

# Step 3
firebase deploy --only functions --project officeomr-fe542

# Step 4
gcloud functions list --region us-central1 --project officeomr-fe542
```

---

## ⚠️ 故障排除

| 问题 | 解决方案 |
|------|---------|
| 403 权限错误 | 在本地 VS Code 中执行（您已登入 GCP） |
| firebase-admin 不存在 | `pip install firebase-admin` |
| User not found | 先在 Firebase Console 添加用户或让用户登录一次 |
| gcloud 凭证过期 | 运行 `gcloud auth login` |

---

## ✅ 完成标记

所有步骤完成后：

1. [ ] 所有本地部署清单项已勾选
2. [ ] 所有最终验证清单项已勾选
3. [ ] Firestore/Firebase/GCP 控制台中数据已验证
4. [ ] [ ] 通知: "✅ M6 Stage A 已完成"

---

## 📞 完成后

告诉我: **"✅ M6 Stage A 已完成"**

然后我们将立即进入:
- 🎯 **Stage B - 前端实现**
  - Super Admin 管理界面
  - 教师权限管理页面
  - 完整端到端测试
  - 8 个 M6 接受标准验证

---

**预计耗时**: 3-5 分钟
**最后更新**: 2026-11-07
**执行环境**: 本地 VS Code PowerShell (Windows)

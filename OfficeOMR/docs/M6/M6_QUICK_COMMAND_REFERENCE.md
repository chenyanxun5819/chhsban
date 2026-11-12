# M6 Stage A 快速参考 - 命令复制卡

## 🚀 在 VS Code PowerShell 终端中执行

### 方式 1: 使用自动化脚本（推荐）
```powershell
cd D:\chhsban\OfficeOMR
.\DEPLOY_M6_STAGE_A.ps1
```

---

### 方式 2: 手动执行各步骤

#### 步骤 1: 初始化 Firestore 数据
```powershell
cd D:\chhsban\OfficeOMR
$env:PYTHONIOENCODING = 'utf-8'
python tools/init_m6_data.py --project-id officeomr-fe542
```

**预期输出:**
```
============================================================
M6 Firestore 初始化
============================================================
ℹ️ 初始化全局设置...
✅ 初始化 settings/global 成功
ℹ️ 创建默认组织...
✅ 创建 orgs/chhs 成功
...
✅ Firestore 连接成功
```

**验证:** 访问 https://console.firebase.google.com/project/officeomr-fe542/firestore 并检查集合

---

#### 步骤 2: Bootstrap Wes 为 Super Admin
```powershell
python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-0cbe395f27f8.json
```

**预期输出:**
```
============================================================
M6 Bootstrap Admin
============================================================
ℹ️ 认证服务账号...
✅ 服务账号认证成功: github-deployer@...
ℹ️ 获取用户 UID...
ℹ️ 设置 custom claims...
✅ Successfully set super_admin claim
   UID: <uid>
   Email: wes@chhs.edu.my
   Role: super_admin
```

**验证:** 访问 https://console.firebase.google.com/project/officeomr-fe542/authentication 查看用户和自定义声明

---

#### 步骤 3: 部署 Cloud Functions
```powershell
firebase deploy --only functions --project officeomr-fe542
```

**预期输出:**
```
=== Deploying to 'officeomr-fe542'...

i  deploying functions
i  functions: preparing cloud.functions directory for upload...
i  functions: packaged ... B (XX.XX MB)
i  functions: uploaded cloud functions code
✓  functions: claimAccess deployed successfully
✓  functions: approveTeacher deployed successfully
✓  functions: revokeTeacher deployed successfully
✓  functions: setUserActive deployed successfully
✓  functions: upsertOrg deployed successfully
✓  functions: updateGlobalSettings deployed successfully

+  Deploy complete!
```

**验证:** 访问 https://console.cloud.google.com/functions?project=officeomr-fe542

---

#### 步骤 4: 验证部署
```powershell
gcloud functions list --region us-central1 --project officeomr-fe542
```

**预期输出:**
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

## 📋 完整检查清单

### 数据初始化验证
- [ ] `python tools/init_m6_data.py` 执行完成
- [ ] Firestore Console 显示:
  - [ ] `settings/global` 存在
  - [ ] `orgs/chhs` 存在
  - [ ] `allowedUsers` 集合存在
  - [ ] `usage` 集合存在

### Bootstrap 验证
- [ ] `python tools/bootstrap_admin.py` 执行完成
- [ ] Firebase Console 显示 wes@chhs.edu.my 用户
- [ ] 用户有 custom claim: `role: "super_admin"`

### Cloud Functions 验证
- [ ] `firebase deploy` 完成
- [ ] 所有 6 个函数显示 ACTIVE
- [ ] 函数配置:
  - [ ] 内存: 256 MiB
  - [ ] max-instances: 2
  - [ ] 区域: us-central1
  - [ ] 超时: 60s

---

## ⚠️ 常见问题

### 权限错误: 403 Missing or insufficient permissions
→ **确保在 VS Code 中执行**（不是这个 PowerShell 会话）

### Python 编码错误
→ 运行此命令再尝试:
```powershell
$env:PYTHONIOENCODING = 'utf-8'
```

### Firebase CLI 说凭证过期
→ 在 VS Code 中执行，VS Code 的凭证仍然有效

### Cloud Functions 部署失败
→ 检查:
1. `firebase.json` 中 `functions.source` 是否为 "functions"
2. 运行时是否为 "python311"
3. 所有依赖是否在 `requirements.txt` 中

---

## 🔗 重要链接

- **Firebase Console**: https://console.firebase.google.com/project/officeomr-fe542
- **Cloud Functions**: https://console.cloud.google.com/functions?project=officeomr-fe542
- **Firestore Database**: https://console.firebase.google.com/project/officeomr-fe542/firestore
- **Authentication**: https://console.firebase.google.com/project/officeomr-fe542/authentication

---

## 📝 完成后通知

所有步骤完成后，告诉我："M6 Stage A 已完成"

然后我们将开始 **Stage B - 前端实现**

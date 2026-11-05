# 🔑 获取 Firebase 服务账号密钥

**当前状态**: 需要下载服务账号密钥以初始化 Firestore 数据

---

## 步骤 1: 打开 Google Cloud Console

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 确保在顶部选择了项目: **officeomr-fe542**

---

## 步骤 2: 创建服务账号

1. 左侧导航栏 → **APIs & Services** → **Service Accounts**
2. 点击 **Create Service Account**
3. 填写信息:
   - **Service account name**: `officeomr-firebase-init`
   - **Service account ID**: 自动生成
   - **Description**: OfficeOMR Firestore Initialization
4. 点击 **Create and Continue**

---

## 步骤 3: 授予权限

1. 在 "Grant this service account access to project" 部分:
   - 选择角色: **Firebase Admin**
2. 点击 **Continue**
3. 点击 **Done**

---

## 步骤 4: 创建密钥

1. 在服务账号列表中找到刚创建的账号
2. 点击服务账号名称进入详情页
3. 点击 **Keys** 标签
4. 点击 **Add Key** → **Create new key**
5. 选择 **JSON** 格式
6. 点击 **Create**

---

## 步骤 5: 保存密钥

密钥文件会自动下载，文件名类似:
```
officeomr-fe542-xxxxx-key.json
```

**保存位置**: 
```
D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json
```

⚠️ **重要**: 
- ✅ 保管好这个文件，**不要提交到 Git**
- ✅ 文件已在 `.gitignore` 中（应检查）
- ✅ 建议定期轮换密钥

---

## 步骤 6: 验证密钥

在 PowerShell 中运行:

```powershell
# 检查密钥文件是否存在
Test-Path D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json

# 查看密钥内容（可选）
Get-Content D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json | ConvertFrom-Json
```

期望输出应包含:
- `"type": "service_account"`
- `"project_id": "officeomr-fe542"`
- `"private_key": "..."`

---

## 步骤 7: 初始化 Firestore

密钥保存后，执行初始化脚本:

```powershell
cd D:\chhsban\OfficeOMR\functions
python init_data.py
```

**预期输出**:
```
ℹ️ OfficeOMR Firestore 初始化
✅ Firebase Admin SDK 初始化成功
✅ 创建全局配置 (settings/global)
✅ 初始化完成！
```

---

## 可选: 设置环境变量（替代方案）

如果不想在 functions 目录保存密钥文件，可以设置环境变量:

```powershell
# 设置环境变量
$env:GOOGLE_APPLICATION_CREDENTIALS = "D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json"

# 执行脚本
python init_data.py

# 清除环境变量（会话后自动清除）
Remove-Item env:GOOGLE_APPLICATION_CREDENTIALS
```

---

## 检查 .gitignore

确保密钥文件不会被提交到 Git:

```bash
# 检查 .gitignore
cat .gitignore | grep -E "(\.json|officeomr.*key)"
```

应包含:
```
*-key.json
officeomr-fe542-key.json
.env
```

---

## 问题排查

### 错误: "Permission denied" 或 "Access Denied"

**解决**:
- [ ] 确认服务账号已被授予 **Firebase Admin** 角色
- [ ] 检查密钥文件格式是否正确（应为有效 JSON）
- [ ] 等待 5-10 分钟让权限生效

### 错误: "Unable to parse the Firebase service account credentials"

**解决**:
- [ ] 检查密钥文件是否损坏
- [ ] 重新下载新的密钥
- [ ] 确保文件路径正确（无空格，无中文）

### 错误: "Firestore database not found"

**解决**:
- [ ] Firebase Console → Firestore → 检查数据库是否已创建
- [ ] 如需创建，点击 **Create Database**，选择 **Native** 模式
- [ ] 等待数据库初始化完成（约 1 分钟）

---

## 下一步

✅ 密钥已准备好  
➡️ 执行 Firestore 初始化脚本  
➡️ 验证全局配置已创建  
➡️ 进入 Phase 4 任务 3: 部署 Cloud Function

---

**文档版本**: Service Account Setup v1.0  
**更新时间**: 2026-07-04

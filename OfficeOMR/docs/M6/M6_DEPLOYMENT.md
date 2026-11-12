# M6 部署與驗收步驟

**狀態**: ✅ 階段 A（基礎設施）已完成  
**日期**: 2026-11-07  
**下一步**: 階段 B（Cloud Functions 部署）

---

## 階段 A 完成項目

✅ **1. Bootstrap 腳本** - `tools/bootstrap_admin.py`
- 為 Wes 的 Google 帳號設置 `super_admin` claim
- 使用服務帳號密鑰（密鑰 **不提交 git**）

✅ **2. M6 Firestore 初始化** - `tools/init_m6_data.py`
- 初始化 `settings/global`（全局系統設置）
- 創建默認組織 `orgs/chhs`（森美蘭芙蓉中華中學）
- 初始化 `allowedUsers` 與 `usage` 集合

✅ **3. Security Rules** - `firestore.rules`
- 完整實現 M6 多角色權限模型
- **關鍵**：所有 rules 檢查 `allowedUsers/{email}.active == true`
- 停用後立即失效（即使 token 未過期）

✅ **4. Emulator 測試** - `functions/tests/test_firestore_rules_m6.py`
- 測試 settings、orgs、allowedUsers、jobs、usage 的權限
- 驗證「停用後 10 秒內被拒」的邏輯

---

## 階段 B 的準備工作

### 部署 Firestore Rules（立即執行）

```powershell
# 從 OfficeOMR 目錄執行

# 1. 驗證規則語法
firebase rules:test

# 2. 部署到生產環境
firebase deploy --only firestore:rules
```

### 初始化 Firestore 數據（立即執行）

```powershell
# 設置服務帳號認證
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\officeomr-fe542-key.json"

# 運行初始化腳本
python tools/init_m6_data.py --project-id officeomr-fe542

# 驗證初始化成功
# （檢查 Firebase Console → Firestore → collections）
```

### 設置 Bootstrap Admin（緊接著執行）

```powershell
# 為 Wes 的帳號設置 super_admin
python tools/bootstrap_admin.py officeomr-fe542 wes@email.com ./officeomr-fe542-key.json

# 預期輸出：
# ✅ Successfully set super_admin claim for wes@email.com
# ℹ️ User UID: ...
```

---

## Emulator 本地測試（可選但推薦）

### 設置 Emulator

```powershell
# 全局安裝 Firebase CLI（如果尚未安裝）
npm install -g firebase-tools

# 進入 OfficeOMR 目錄
cd D:\chhsban\OfficeOMR

# 啟動 Emulator（保持運行）
firebase emulator:start --only firestore

# 預期輸出：
# i  Firestore Emulator logging to firestore-debug.log
# ✓  Firestore Emulator started at localhost:8080
```

### 運行 Emulator 測試（另一個終端）

```powershell
cd D:\chhsban\OfficeOMR

# 安裝測試依賴（如需要）
pip install pytest firebase-admin

# 運行 M6 rules 測試
pytest functions/tests/test_firestore_rules_m6.py -v

# 預期輸出：
# test_teacher_user_exists PASSED
# test_teacher_inactive_user_exists PASSED
# test_firestore_initialization PASSED
# test_active_inactive_teacher_distinction PASSED
```

---

## Cloud Functions 部署（階段 B）

### 部署前檢查清單

- [ ] 確認 `functions/requirements.txt` 包含所需依賴
- [ ] 確認 `functions/callables_m6.py` 已創建
- [ ] 確認 `firestore.rules` 已部署到生產環境

### 部署 M6 Callable 函數

```powershell
cd D:\chhsban\OfficeOMR

# 1. 部署 claimAccess 和管理函數
gcloud functions deploy claimAccess \
  --region us-central1 \
  --runtime python311 \
  --trigger-http \
  --allow-unauthenticated \
  --source ./functions \
  --entry-point claimAccess \
  --memory 256MB \
  --max-instances 2 \
  --timeout 60s

# （重複部署其他函數）
gcloud functions deploy approveTeacher \
  --region us-central1 \
  --runtime python311 \
  --trigger-http \
  --source ./functions \
  --entry-point approveTeacher \
  --memory 256MB \
  --max-instances 2 \
  --timeout 60s

# 類似地部署：
#  - revokeTeacher
#  - setUserActive
#  - upsertOrg
#  - updateGlobalSettings
```

### 使用 PowerShell 腳本批量部署

```powershell
# 創建部署腳本 (deploy_m6_functions.ps1)
$functions = @(
    'claimAccess',
    'approveTeacher',
    'revokeTeacher',
    'setUserActive',
    'upsertOrg',
    'updateGlobalSettings'
)

foreach ($fn in $functions) {
    Write-Host "Deploying $fn..."
    
    gcloud functions deploy $fn `
      --region us-central1 `
      --runtime python311 `
      --trigger-http `
      --source ./functions `
      --entry-point $fn `
      --memory 256MB `
      --max-instances 2 `
      --timeout 60s `
      --set-env-vars STORAGE_BUCKET="officeomr-fe542.firebasestorage.app"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Deployment of $fn failed"
        exit 1
    }
}

Write-Host "✅ All M6 functions deployed successfully"
```

---

## 驗收標準檢查（階段 B 完成後）

### ✅ 1. Super Admin 能建立組織

```
操作：
  Super admin 登入 → 組織管理頁 → 新增組織
  
預期：
  ✓ 組織成功保存到 Firestore
  ✓ Rules 允許 super_admin 寫入 orgs/{orgId}
```

### ✅ 2. Super Admin 批准教師

```
操作：
  教師管理頁 → 輸入教師郵箱 → 選擇組織 → 批准
  
預期：
  ✓ 郵箱添加到 allowedUsers/{email}
  ✓ active=true, role=teacher, orgId 已設置
```

### ✅ 3. 已批准教師可登入

```
操作：
  用已批准的 Google 帳號登入
  
預期：
  ✓ claimAccess 函數檢查 allowedUsers
  ✓ Custom claims 已設置（role, orgId）
  ✓ 教師只看得到自己的組織
```

### ✅ 4. 未批准帳號被拒

```
操作：
  用未批准的 Google 帳號登入
  
預期：
  ✓ claimAccess 回傳 NOT_APPROVED
  ✓ 頁面顯示「尚未開通，請向管理員申請」
  ✓ 無任何數據訪問
```

### ✅ 5. 教師呼叫管理函數被拒

```
操作：
  教師帳號呼叫 approveTeacher()
  
預期：
  ✓ 函數檢查 request.auth.token.role == 'super_admin'
  ✓ 回傳 permission-denied 或 NOT_AUTHORIZED
```

### ✅ 6. 停用後立即失效

```
操作：
  1. 教師登入並訪問 org
  2. Super admin 停用該教師（setUserActive(email, false)）
  3. 教師立即（10 秒內）嘗試再次訪問
  
預期：
  ✓ 步驟 3 中的訪問被拒（Rules 檢查 active=false）
  ✓ 即使 ID token 仍然有效
  
測試方法（使用 Firestore Emulator）：
  pytest functions/tests/test_firestore_rules_m6.py::TestActiveStatusCheck -v
```

### ✅ 7. 修改系統設定無需部署生效

```
操作：
  系統設置頁 → 修改 defaultDailySheetsPerUser → 保存
  
預期：
  ✓ updateGlobalSettings 更新 settings/global
  ✓ 識別函數立即讀取新值（無需重新部署）
  ✓ 教師受影響的配額立即更新
```

### ✅ 8. Rules 測試全通過

```powershell
firebase emulator:start --only firestore

# 另一個終端
pytest functions/tests/test_firestore_rules_m6.py -v

預期：所有測試通過 ✓
```

---

## 後續步驟（階段 C：前端）

階段 B 完成後，開始實現前端頁面：

1. **登入流程重構**
   - Google 登入 → 呼叫 `claimAccess`
   - 檢查 claims（role, orgId）
   - 路由到對應頁面

2. **Super Admin 管理頁面**
   - Tab 1: 組織管理 (CRUD)
   - Tab 2: 教師管理（郵箱白名單）
   - Tab 3: 系統設定（9 個參數直接編輯）
   - Tab 4: 用量總覽（日用量統計）

3. **教師頁面改進**
   - 完全隱藏帳號、昵稱、頭像
   - 顯示組織名稱
   - 顯示剩餘日用量

---

## 疑難排解

### Firestore Rules 測試失敗

```powershell
# 檢查規則語法
firebase rules:test

# 查看具體錯誤
# 確保所有函數（isTeacherActive 等）已正確定義
```

### Bootstrap Admin 失敗

```
錯誤：「User not found」
→ 確保該 Google 帳號已至少登入一次

錯誤：「Permission denied」
→ 檢查服務帳號密鑰是否有效
→ 確認 GOOGLE_APPLICATION_CREDENTIALS 已設置
```

### Cloud Functions 部署失敗

```powershell
# 檢查日誌
gcloud functions describe claimAccess --region us-central1

# 查看部署日誌
gcloud functions logs read claimAccess --region us-central1 --limit 50

# 重新部署
gcloud functions deploy claimAccess --source ./functions --entry-point claimAccess
```

---

## 完成檢查清單

- [ ] ✅ Firestore Rules 已部署
- [ ] ✅ M6 初始數據已初始化
- [ ] ✅ Bootstrap admin 已執行
- [ ] ✅ Emulator 測試通過
- [ ] ✅ Cloud Functions 已部署
- [ ] ✅ 所有 8 個驗收標準已通過
- [ ] ✅ `docs/STATUS.md` 已更新（M6 完成）

**準備開工！** 🚀

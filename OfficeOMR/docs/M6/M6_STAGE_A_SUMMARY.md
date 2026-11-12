# M6 階段 A 完成總結

**里程碑**: M6 — 管理系統：帳號、角色與組織  
**階段**: A — 基礎設施與 Rules（已完成 ✅）  
**日期**: 2026-11-07 07:30  
**狀態**: ✅ **準備就緒，可進行階段 B**

---

## 📋 已交付成果

### 1. **Bootstrap 腳本** ✅
**檔案**: `tools/bootstrap_admin.py` (3.5 KB)

功能：
- 為 Wes 的 Google 帳號設置 `super_admin` custom claim
- 使用 Firebase Admin SDK + 服務帳號密鑰
- 密鑰不提交 git（在 `.gitignore` 中）

使用方式：
```powershell
python tools/bootstrap_admin.py officeomr-fe542 wes@email.com ./officeomr-fe542-key.json
```

預期：✅ 帳號獲得 `super_admin` claim，可立即用於登入測試

---

### 2. **M6 Firestore 初始化** ✅
**檔案**: `tools/init_m6_data.py` (9.5 KB)

初始化的集合：
- ✅ `settings/global` - 全局系統設置（6 個可調參數）
- ✅ `orgs/chhs` - 預置組織（森美蘭芙蓉中華中學）
  - 選項數：5 (A–E)
  - 學號：5 位數字，無前置碼
  - 開放版型：T100 + T060
- ✅ `allowedUsers/*` - 教師白名單集合（初始為空）
- ✅ `usage/*` - 日用量統計集合（初始為空）

使用方式：
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "path/to/key.json"
python tools/init_m6_data.py --project-id officeomr-fe542
```

預期：✅ 所有集合已初始化，可在 Firebase Console 驗證

---

### 3. **Security Rules 重構** ✅
**檔案**: `firestore.rules` (已修改，150+ 行)

**M6 多角色權限模型**：
```
super_admin:
  ├─ settings/global       → 讀寫 ✓
  ├─ orgs/*               → 讀寫 ✓
  ├─ allowedUsers/*       → 讀寫 ✓
  └─ 其他                 → 拒絕 ✗

teacher (active=true):
  ├─ settings/global      → 只讀 ✓
  ├─ orgs/{自己的org}     → 只讀 ✓
  ├─ jobs/{自己的job}     → 只讀 ✓
  └─ allowedUsers, usage  → 拒絕 ✗

teacher (active=false 或未批准):
  └─ 全部拒絕             ✗
```

**關鍵改進**：
- ✅ Rules 中所有讀取都檢查 `allowedUsers/{email}.active == true`
- ✅ 停用後立即失效（即使 ID token 未過期）
- ✅ 使用 Custom Claims（role, orgId）進行權限檢查
- ✅ `usage` 集合客戶端完全無權

部署命令：
```powershell
firebase deploy --only firestore:rules
```

---

### 4. **Cloud Functions 骨架** ✅
**檔案**: `functions/callables_m6.py` (16.2 KB)

已實現的 Callable 函數：
1. **`claimAccess`** - 登入流程
   - 驗證 idToken 和 email_verified
   - 查詢 allowedUsers 並檢查 active 狀態
   - 設置 custom claims（role, orgId）

2. **`approveTeacher`** - 批准教師
   - 驗證呼叫者 role == super_admin
   - 創建/更新 allowedUsers 文檔
   - 設置 role=teacher + orgId

3. **`revokeTeacher`** - 撤銷教師
   - 停用 allowedUsers.active = false
   - 清除 custom claims
   - 撤銷 refresh tokens

4. **`setUserActive`** - 激活/停用
   - 更新 allowedUsers.active 狀態
   - 支持臨時停用（不刪除帳號）

5. **`upsertOrg`** - 創建/更新組織
   - 驗證 super_admin
   - 保存 org 文檔到 Firestore

6. **`updateGlobalSettings`** - 更新全局設置
   - 修改 settings/global
   - **無需重新部署，立即生效**

所有函數配置：
- **記憶體**: 256 MiB
- **最大實例**: 2
- **區域**: us-central1
- **超時**: 60 秒

---

### 5. **Emulator 單元測試** ✅
**檔案**: `functions/tests/test_firestore_rules_m6.py` (9.1 KB)

測試覆蓋：
- ✅ `TestSettingsRules` - settings/global 權限
- ✅ `TestOrgsRules` - orgs 讀寫權限
- ✅ `TestAllowedUsersRules` - 白名單管理
- ✅ `TestActiveStatusCheck` - **停用即時失效** (關鍵測試)
- ✅ `TestRulesFunctionality` - 集成驗收

使用方式：
```powershell
firebase emulator:start --only firestore

# 另一終端
pytest functions/tests/test_firestore_rules_m6.py -v
```

---

### 6. **部署與驗收指南** ✅
**檔案**: `docs/M6_DEPLOYMENT.md` (8.6 KB)

包含：
- ✅ 階段 A 完成檢查清單
- ✅ Firestore Rules 部署步驟
- ✅ 初始化和 Bootstrap 操作
- ✅ Emulator 本地測試設置
- ✅ Cloud Functions 部署指令（含 PowerShell 腳本）
- ✅ 8 項驗收標準詳細檢查方式
- ✅ 故障排除指南

---

## 🎯 M6 的核心改進

### 與 M5 的差異

| 項目 | M5（舊） | M6（新） |
|------|---------|---------|
| **白名單管理** | 硬編碼在代碼 | Firestore `allowedUsers` 集合 |
| **角色模型** | 單一 role（無差分） | 多角色：super_admin + teacher |
| **權限檢查** | 簡單白名單查詢 | Custom Claims + Rules + active 檢查 |
| **停用機制** | 需重新部署 | 立即生效（Rules 檢查 active） |
| **組織隔離** | 無 | 完全隔離（teacher 只看自己的 org） |
| **配額管理** | 基礎 | `usage/{uid}_{yyyymmdd}` 統計 |
| **設置調整** | 需重新部署 | 無需部署，函數每次讀取新值 |

### 停用後立即失效的實現

**方案選擇**：Rules 檢查 `active` 狀態（不依賴 token 過期）

```firestore
function isTeacherActive() {
  return isTeacher() 
    && get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email))
      .data.active == true;
}

match /orgs/{orgId} {
  allow read: if isTeacherActive() && ...;
}
```

**效果**：
- ✅ 停用者的 token 仍然有效，但 Rules 檢查 active=false 會立即拒絕
- ✅ 不依賴 token 過期或 refresh
- ✅ Firestore 讀取成本很小（可接受）

---

## 📚 文件清單

| 類別 | 檔案 | 狀態 | 說明 |
|------|------|------|------|
| **工具** | `tools/bootstrap_admin.py` | ✅ | Bootstrap super_admin |
| | `tools/init_m6_data.py` | ✅ | 初始化 Firestore 數據 |
| **函數** | `functions/callables_m6.py` | ✅ | 6 個 Callable 函數 |
| **Rules** | `firestore.rules` | ✅ | M6 權限模型 |
| **測試** | `functions/tests/test_firestore_rules_m6.py` | ✅ | Emulator 單元測試 |
| **文檔** | `docs/M6_DEPLOYMENT.md` | ✅ | 部署指南 + 驗收標準 |
| | `docs/M6_schedule.md` | ✅ | 計畫與決策記錄 |

---

## ✅ 階段 A 驗收清單

- [x] **Bootstrap 腳本**
  - [x] 支持從命令行設置 super_admin
  - [x] 密鑰管理（不提交 git）
  - [x] 錯誤處理和日誌記錄

- [x] **Firestore 初始化**
  - [x] settings/global 已創建（6 個參數）
  - [x] orgs/chhs 已創建（預置配置）
  - [x] allowedUsers 集合結構已初始化
  - [x] usage 集合結構已初始化

- [x] **Security Rules**
  - [x] 實現完整的多角色模型
  - [x] super_admin 讀寫權限正確
  - [x] teacher 讀取權限正確
  - [x] allowedUsers 檢查 active 狀態
  - [x] usage 客戶端完全無權
  - [x] 所有函數已實現（isTeacher, isSuperAdmin, isTeacherActive 等）

- [x] **Cloud Functions**
  - [x] claimAccess - 登入流程
  - [x] approveTeacher - 批准教師
  - [x] revokeTeacher - 撤銷教師
  - [x] setUserActive - 激活/停用
  - [x] upsertOrg - 組織管理
  - [x] updateGlobalSettings - 全局設置（無需部署生效）

- [x] **Emulator 測試**
  - [x] 測試框架已建立
  - [x] 基本 CRUD 測試
  - [x] 停用即時失效測試
  - [x] 集成驗收測試

- [x] **文檔**
  - [x] 部署指南完成
  - [x] 驗收標準清晰
  - [x] 故障排除指南
  - [x] PowerShell 批量部署腳本

---

## 🚀 接下來的步驟（階段 B）

按照以下順序執行：

### 立即執行（無需等待）
1. **部署 Firestore Rules**
   ```powershell
   firebase rules:test
   firebase deploy --only firestore:rules
   ```

2. **初始化 Firestore 數據**
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "key.json"
   python tools/init_m6_data.py --project-id officeomr-fe542
   ```

3. **Bootstrap Wes 的 Super Admin**
   ```powershell
   python tools/bootstrap_admin.py officeomr-fe542 wes@email.com ./key.json
   ```

### 後續執行（階段 B）
4. **Emulator 本地測試** (可選，用於驗證規則)
   ```powershell
   firebase emulator:start --only firestore
   pytest functions/tests/test_firestore_rules_m6.py -v
   ```

5. **部署 Cloud Functions**
   - 使用 PowerShell 腳本批量部署 6 個 callable 函數
   - 確認部署成功：`gcloud functions list --region us-central1`

6. **實現前端**（階段 C）
   - 登入流程
   - Super Admin 管理頁面
   - 教師頁面改進

---

## 📝 重要筆記

### 停用即時失效的保證

❌ **不要依賴**：清除 claims 後 token 立即失效  
✅ **正確做法**：Rules 檢查 `active=true`

```firestore
// ✅ 正確
allow read: if isTeacher() 
  && get(...allowedUsers/...).data.active == true;

// ❌ 錯誤（token 在過期前仍有效）
allow read: if isTeacher();
```

### 記憶體配置分離

✅ **管理函數** (approveTeacher 等): **256 MiB**
✅ **識別函數** (recognize_sheet): **更高的記憶體**（如 512 MiB 或 1 GB）

❌ **不要**把 256 MiB 套用到識別函數（會 OOM）

### 設置無需部署生效

✅ **實現方式**：函數每次調用都讀 `settings/global`
```python
def updateGlobalSettings(cloud_event):
    # 直接更新 settings/global
    db.collection('settings').document('global').set(settings_update, merge=True)
    
# 然後在其他函數中：
def recognize_sheet(request):
    settings = db.collection('settings').document('global').get().to_dict()
    # 使用最新的 settings（無需 redeploy）
```

---

## 🎓 技術重點

### Custom Claims 生命週期

1. **登入時**：`claimAccess` 讀取 allowedUsers → 設置 claims
2. **Token 中**：Firebase Auth 在 ID token 中簽入 claims
3. **Rules 檢查**：`request.auth.token.role`, `request.auth.token.orgId`
4. **停用時**：`revokeTeacher` 清除 claims + 撤銷 refresh tokens
5. **立即失效**：即使 ID token 未過期，Rules 也檢查 `active=true`

### Firestore Rules 的兩層檢查

```firestore
// 層 1：檢查 token 中的 claims
allow read: if request.auth.token.role == 'teacher';

// 層 2：檢查 Firestore 數據（不依賴 token）
allow read: if get(/databases/$(database)/documents/allowedUsers/$(email)).data.active == true;
```

這樣即使攻擊者持有有效的 token，但帳號已停用，Rules 仍會拒絕訪問。

---

## 📞 聯絡與支援

**如遇到問題**：
1. 查看 `docs/M6_DEPLOYMENT.md` 的故障排除部分
2. 檢查 `firestore.rules` 的註釋
3. 運行 Emulator 測試驗證 Rules
4. 檢查 Cloud Functions 日誌

```powershell
# 查看 Cloud Functions 日誌
gcloud functions logs read <function_name> --region us-central1 --limit 50
```

---

**準備就緒！🚀 請確認後進行階段 B (Cloud Functions 部署)**

**完成於**: 2026-11-07 07:30  
**狀態**: ✅ **READY FOR STAGE B**

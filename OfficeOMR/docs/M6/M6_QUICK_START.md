# M6 快速開始指南

## 📊 階段 A 完成狀態

✅ **已完成** - 所有基礎設施與文檔已準備

```
M6 階段 A (基礎設施)           ✅ DONE
├─ Bootstrap Admin 腳本        ✅ tools/bootstrap_admin.py
├─ Firestore 初始化腳本        ✅ tools/init_m6_data.py
├─ Security Rules              ✅ firestore.rules (已修改)
├─ Cloud Functions 骨架        ✅ functions/callables_m6.py
├─ Emulator 單元測試           ✅ functions/tests/test_firestore_rules_m6.py
├─ 部署指南                    ✅ docs/M6_DEPLOYMENT.md
└─ 文檔與計畫                  ✅ docs/M6_STAGE_A_SUMMARY.md
```

---

## 🚀 立即執行的 3 個步驟

### 步驟 1️⃣ : 部署 Firestore Rules （5 分鐘）

```powershell
cd D:\chhsban\OfficeOMR

# 驗證語法
firebase rules:test

# 部署到生產環境
firebase deploy --only firestore:rules
```

**預期**: ✅ Rules deployed successfully

---

### 步驟 2️⃣ : 初始化 Firestore 數據 （3 分鐘）

```powershell
cd D:\chhsban\OfficeOMR

# 設置認證
$env:GOOGLE_APPLICATION_CREDENTIALS = "path\to\officeomr-fe542-key.json"

# 運行初始化
python tools/init_m6_data.py --project-id officeomr-fe542
```

**預期**: ✅ M6 初始化完成！  
驗證：Firebase Console → Firestore → Collections 查看 settings、orgs

---

### 步驟 3️⃣ : 設置 Wes 的 Super Admin （1 分鐘）

```powershell
cd D:\chhsban\OfficeOMR

python tools/bootstrap_admin.py officeomr-fe542 wes@chhs.edu.my ./officeomr-fe542-key.json
```

**預期**: 
```
✅ Successfully set super_admin claim for wes@chhs.edu.my
ℹ️ User UID: ...
```

---

## 🔍 驗證完成

執行後檢查：

```powershell
# 1. 檢查 Firestore 文檔
gcloud firestore documents list --collection=settings
gcloud firestore documents list --collection=orgs

# 2. 檢查 Auth claims
gcloud auth users describe wes@chhs.edu.my

# 3. Emulator 測試 (可選)
firebase emulator:start --only firestore
# 另一終端：
pytest functions/tests/test_firestore_rules_m6.py -v
```

---

## 📝 核心概念速記

### Custom Claims 機制

```
[Google Login] 
    ↓
[claimAccess 函數] 
    ├─ 驗證 email_verified
    ├─ 查詢 allowedUsers/{email}
    ├─ 檢查 active == true
    └─ 設置 claims: {role: "teacher", orgId: "chhs"}
    ↓
[Firestore Rules]
    ├─ 讀取 request.auth.token.role
    ├─ 讀取 request.auth.token.orgId
    └─ 再檢查一次 active == true
    ↓
[訪問通過或拒絕]
```

**關鍵點**：停用後不需等待 token 過期，Rules 立即拒絕

### 權限速查表

| 集合 | Super Admin | Teacher (active=true) | Teacher (active=false) |
|------|------------|----------------------|----------------------|
| settings | R/W | R | ✗ |
| orgs | R/W | R (自己的) | ✗ |
| jobs | ✗ | R (自己的) | ✗ |
| allowedUsers | R/W | ✗ | ✗ |
| usage | ✗ | ✗ | ✗ |

---

## 🛠️ M6 Callable 函數列表

| 函數 | 權限要求 | 功能 | 配置 |
|------|---------|------|------|
| `claimAccess` | 任意 | 登入並設置 claims | HTTP trigger |
| `approveTeacher` | super_admin | 批准新教師 | 256MB, max-instances 2 |
| `revokeTeacher` | super_admin | 撤銷教師訪問 | 同上 |
| `setUserActive` | super_admin | 激活/停用教師 | 同上 |
| `upsertOrg` | super_admin | 創建/更新組織 | 同上 |
| `updateGlobalSettings` | super_admin | 更新設置（無需部署） | 同上 |

---

## ⚠️ 重要提醒

### ❌ 常見錯誤

1. **忘記部署 Rules**  
   → 運行：`firebase deploy --only firestore:rules`

2. **使用舊的初始化腳本**  
   → 使用：`tools/init_m6_data.py`（不是 functions/init_data.py）

3. **記憶體配置錯誤**  
   → 管理函數：256 MiB ✅  
   → 識別函數：另行配置（512 MiB 或更高）❌ 不要用 256 MiB

4. **依賴 token 過期實現停用**  
   → ❌ 錯誤做法  
   → ✅ 正確：Rules 檢查 `active == true`

### ✅ 關鍵檢查

- [ ] 已部署 firestore.rules
- [ ] 已運行 init_m6_data.py
- [ ] 已運行 bootstrap_admin.py
- [ ] Wes 可以用 Google 帳號登入
- [ ] 其他教師未經批准被拒絕
- [ ] Rules 檢查 `allowedUsers/{email}.active`

---

## 📚 詳細文檔

| 文檔 | 內容 | 何時查看 |
|------|------|---------|
| `M6_STAGE_A_SUMMARY.md` | 完整交付成果說明 | 📖 了解全貌 |
| `M6_DEPLOYMENT.md` | 部署 & 驗收標準 | 🚀 實施階段 B |
| `M6_schedule.md` | 計畫與決策記錄 | 📋 参考規格 |
| `firestore.rules` | Security Rules 源碼 | 🔐 規則細節 |

---

## 🎯 下一步（階段 B）

完成上述 3 個步驟後，通知我：

```
「階段 A 已完成，準備開始階段 B」
```

階段 B 將包括：
1. ✨ Cloud Functions 部署
2. 🧪 端到端測試
3. 📱 前端頁面實現

---

**時間**: 2026-11-07  
**狀態**: ✅ **READY TO GO**  
**下一步**: 執行上述 3 個步驟 → 確認完成 → 開始階段 B


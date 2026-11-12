# M6 實作計畫（已確認版本）

**日期**: 2026-11-07  
**里程碑**: M6 — 管理系統：帳號、角色與組織  
**狀態**: ✅ 規劃確認完成，開始實作

---

## 核心要點確認（Wes 已澄清）

### 1️⃣ **停用後立即失效的實現方案**
❌ **不能只靠清除 claims**（ID token 在過期前仍有效，最長 ~1 小時）

✅ **採用方案**：Rules 里每次都 `get()` 檢查 `allowedUsers` 的 active 狀態
- 即使 token 還沒過期，規則檢查 active=false 就拒絕存取
- Firestore 讀取成本很小，可接受
- **必須寫 emulator 測試案例**：停用後 10 秒內發起請求應被拒

備選方案（如需要）：在管理函數與識別函數驗證 token 時用 `verify_id_token(token, check_revoked=True)`

### 2️⃣ **記憶體配置明確**
- **管理函數**（approveTeacher 等）：256 MiB、max-instances 2、us-central1 ✅
- **`recognize_sheet` 識別函數**：另外配置更高內存（需自行決定）
- ❌ 不能套用 256 MiB 到 recognize_sheet（可能導致 OOM 失敗）

### 3️⃣ **M6 與 M5 的獨立性**
- M6 是登入、組織和權限管理
- M5 識別失敗另行排查（查 Cloud Functions 日誌）
- M6 **不依賴** M5 的識別函數完成

### 4️⃣ **教師頁面帳號資訊**
✅ **完全隱藏**：不顯示帳號名稱、昵稱、頭像
- 未批准時顯示：「尚未開通，請向管理員申請」

### 5️⃣ **設定不重新部署即生效**
✅ **實現方式**：函數每次調用都讀 `settings/global`
- 可做 30–60 秒內存緩存（可選）
- ❌ 不能在啟動時只讀一次

---

## M6 驗收標準（PLAN.md 第 10 節）

| # | 驗收項目 | 達成條件 |
|---|---------|--------|
| 1 | Super admin 批准教師 | 可新增郵箱 → 教師收到 claims |
| 2 | 已批准教師登入 | 只看得到自己的組織 |
| 3 | 未批准帳號登入 | 被拒＋無任何數據訪問 + 顯示「尚未開通」 |
| 4 | 教師呼叫管理函數 | 被拒（permission-denied） |
| 5 | 停用後立即失效 | **Emulator 測試**：停用後 10 秒內請求被拒 |
| 6 | 日用量超額 | 被拒 + 顯示今日已用/上限 |
| 7 | 修改系統設定 | 無需重新部署，新值立即生效 |
| 8 | Rules 測試 | Firebase Emulator 全通過 |

---

## M6 功能組件

### 📊 Firestore 數據模型

```firestore
settings/global: {
  "defaultDailySheetsPerUser": 100,
  "studentDataRetentionHours": 24,
  "maxExamsPerTeacher": 200,
  "maxPaperFileMB": 10,
  "maxPagesPerUpload": 10,
  "maxFileMB": 15
}

orgs/{orgId}: {
  "name": "森美蘭芙蓉中華中學",
  "code": "chhs",
  "active": true,
  "studentId": {"digits": 5, "charset": "numeric", "prefix": ""},
  "optionCount": 5,
  "allowedTemplates": ["T100-A4-v1", "T060-A4-v1"],
  "defaultTemplate": "T100-A4-v1",
  "dailySheetsPerUser": null,
  "createdAt": ...
}

allowedUsers/{email_lowercase}: {
  "orgId": "chhs",
  "role": "teacher",
  "active": true,  # ← Rules 每次檢查此欄
  "uid": null,     # 首次登入後綁定
  "dailySheetsOverride": null,
  "createdAt": ...
}

usage/{uid}_{yyyymmdd}: {
  "sheets": 123
}
```

### ☁️ Cloud Functions（Callable）

**配置**: 256 MiB、max-instances 2、us-central1、timeout 60s

| 函數名 | 功能 | 前置驗證 |
|--------|------|--------|
| `claimAccess()` | 登入時設置 claims | email_verified==true |
| `approveTeacher(email, orgId)` | 批准新教師 | role==super_admin |
| `revokeTeacher(email)` | 停用教師（清除 claims + 撤銷 token） | role==super_admin |
| `setUserActive(email, active)` | 激活/停用 | role==super_admin |
| `upsertOrg(orgData)` | 新增/更新組織 | role==super_admin |
| `updateGlobalSettings(settings)` | 更新全局設定 | role==super_admin |

### 🎨 前端頁面

**登入流程**:
1. Google 登入 → 取得 idToken
2. 呼叫 callable `claimAccess(idToken)`
3. 檢查 claims (`role`, `orgId`)
4. 若無 claims → 顯示「尚未開通」並登出
5. 若有 claims → 導向對應的頁面

**Super Admin 頁面**（4 個標籤頁）:
- 🏢 **組織管理**：新增/編輯組織、選項數、可用版型、每人日限
- 👨‍🏫 **教師管理**：郵箱白名單、批准/停用/改組織、個別日限設定
- ⚙️ **系統設定**：9 個全局參數直接編輯
- 📊 **用量總覽**：各教師今日用量 vs 上限

**教師頁面**（改進）:
- ❌ 不顯示帳號、昵稱、頭像
- ✅ 顯示所屬組織名稱
- ✅ 顯示剩餘日用量

### 📝 Firestore Security Rules

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // settings: super_admin 讀寫，teacher 只讀
    match /settings/{document=**} {
      allow read: if request.auth.token.role == 'super_admin' ||
                     request.auth.token.role == 'teacher';
      allow write: if request.auth.token.role == 'super_admin';
    }
    
    // orgs: super_admin 讀寫，teacher 只讀自己的
    match /orgs/{orgId} {
      allow read: if request.auth.token.role == 'super_admin' ||
                     (request.auth.token.role == 'teacher' &&
                      request.auth.token.orgId == orgId &&
                      get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email)).data.active == true);
      allow write: if request.auth.token.role == 'super_admin';
    }
    
    // allowedUsers: 只 super_admin
    match /allowedUsers/{email} {
      allow read, write: if request.auth.token.role == 'super_admin';
    }
    
    // jobs: teacher 只讀自己的
    match /jobs/{jobId} {
      allow read: if request.auth.token.role == 'teacher' &&
                     resource.data.uid == request.auth.uid &&
                     get(/databases/$(database)/documents/allowedUsers/$(request.auth.token.email)).data.active == true;
      allow write: if false; // 只由 Functions 寫入
    }
    
    // usage: 客戶端不可讀寫
    match /usage/{document=**} {
      allow read, write: if false;
    }
  }
}
```

**規則關鍵點**:
- ✅ 所有讀取都檢查 `allowedUsers/{email}.active == true`
- ✅ 即使 token 未過期，active=false 也拒絕
- ❌ Emulator 測試：停用後發起請求應被拒

---

## 修正後的實作順序

### **階段 A：Bootstrap 與基礎設施（已提前，先做）**

1. **`tools/bootstrap_admin.py`** ← **提前到這裡**
   - 使用服務帳號密鑰，為 Wes 的 Google 帳號設置 `super_admin` claim
   - 密鑰不提交 git
   - 執行後 Wes 可以用自己帳號登入做後續測試

2. **Firestore 數據模型**
   - 初始化 `settings/global`（預設值）
   - 初始化 `orgs/chhs`（森美蘭芙蓉中華中學，預置）
   - 初始化 `allowedUsers` 結構

3. **Firestore Security Rules** (`firestore.rules`)
   - 完整實現上述所有規則
   - 重點：所有讀取檢查 `active` 狀態

4. **Emulator 單元測試** (`functions/src/firestore.rules.test.ts`)
   - 測試 settings、orgs、allowedUsers、jobs、usage 的權限
   - **關鍵測試**：停用教師後，10 秒內讀取應被拒
   - Firebase Emulator 全通過 ✅

### **階段 B：Cloud Functions**

5. **`claimAccess()` Callable**
   - 驗證 `email_verified == true`
   - 查詢 `allowedUsers/{email}` 
   - 若找到 + active=true → 設置 custom claims `{role, orgId}`
   - 若未找到或 active=false → 回傳 `NOT_APPROVED`

6. **管理 Callables** × 5
   - `approveTeacher(email, orgId)` 
   - `revokeTeacher(email)`
   - `setUserActive(email, active)`
   - `upsertOrg(orgData)`
   - `updateGlobalSettings(settings)`
   - 每個都驗證 `role == super_admin`
   - 所有配置：256 MiB、max-instances 2、us-central1

7. **後續函數改進** (M6 後期)
   - 識別函數 `recognize_sheet` 讀取 `settings/global` 檢查配額
   - 每日清理函數讀取全局設定（30–60 秒緩存可選）

### **階段 C：前端**

8. **登入流程重構**
   - Google 登入後呼叫 `claimAccess`
   - 若無 claims → 顯示「尚未開通」 + 登出按鈕
   - 若有 claims → 存儲 role + orgId，路由到對應頁面

9. **Super Admin 頁面** （Tabbed UI）
   - Tab 1: 組織管理（CRUD）
   - Tab 2: 教師管理（郵箱白名單 CRUD）
   - Tab 3: 系統設定（9 個參數，直接編輯，無需部署）
   - Tab 4: 用量總覽（日用量統計）

10. **教師頁面改進**
    - 移除帳號 / 昵稱 / 頭像顯示
    - 顯示組織名稱
    - 顯示剩餘日用量

### **階段 D：測試與驗收**

11. **端到端測試**
    - ✅ Super admin 批准新教師 → 教師可登入
    - ✅ 已批准教師 → 只看自己組織的資料
    - ✅ 未批准教師 → 被拒
    - ✅ 教師呼叫管理函數 → permission-denied
    - ✅ 停用教師 → 10 秒內訪問被拒
    - ✅ 超額 → QUOTA_EXCEEDED
    - ✅ 修改設定 → 無需部署，新值立即生效

12. **更新文檔**
    - `docs/STATUS.md`：M6 完成標記
    - `docs/DECISIONS.md`：rules 檢查 active 的決策說明

---

## 預期時程

| 階段 | 工作項 | 預計時間 |
|------|--------|--------|
| A | Bootstrap + Rules + Emulator 測試 | 1 天 |
| B | Cloud Functions | 1 天 |
| C | 前端頁面 | 1–1.5 天 |
| D | 測試與驗收 | 0.5–1 天 |
| **總計** | | **3.5–4 天** |

---

## 開工前的確認清單

- ✅ 停用後立即失效：使用 Rules 每次檢查 active 狀態 + Emulator 測試
- ✅ 記憶體配置：管理函數 256 MiB，識別函數另配置
- ✅ Bootstrap 提前：先為 Wes 設置 super_admin
- ✅ 教師頁面：完全隱藏帳號資訊
- ✅ 設定生效：函數每次讀 `settings/global`，不在啟動時讀一次
- ✅ 所有命令用 PowerShell

**準備開工 ✅**
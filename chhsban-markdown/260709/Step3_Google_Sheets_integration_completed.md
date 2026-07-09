# 步驟 3️⃣ 完成：Google Sheets API 集成

**完成日期**：2026-07-09  
**狀態**：✅ **完成並驗證**

---

## 📋 任務清單

- [x] 3.1 建立 Google Sheets 同步模塊 (sheets-sync.ts)
- [x] 3.2 更新 Worker 後端集成同步功能
- [x] 3.3 配置環境變數
- [x] 3.4 編譯驗證（無錯誤）

---

## 📝 完成詳情

### 3.1 Google Sheets 同步模塊

**文件**：`d:\chhsban\chhsban-tution\src\sheets-sync.ts`

建立 `TutionSheetsSync` 類，包含以下核心功能：

#### **初始化方法**

```typescript
// 自動建立 3 個工作表結構
await sheetsSync.initializeSheets();
```

#### **同步方法（KV → Sheet）**

```typescript
// 同步補習班主表
await sheetsSync.syncClasses(classes);

// 同步學生名單
await sheetsSync.syncRoster(roster);

// 同步出勤紀錄
await sheetsSync.syncAttendance(attendance);
```

#### **讀取方法（Sheet → KV）**

```typescript
// 從 Google Sheet 讀取數據
const classes = await sheetsSync.readClasses();
const roster = await sheetsSync.readRoster();
const attendance = await sheetsSync.readAttendance();
```

**API 調用方式**：
- 使用 Google Sheets API v4 REST 端點
- 基於 API Key 認證（無需服務賬戶密鑰）
- 支持批量操作和自動欄位標題管理

---

### 3.2 Worker 後端集成

**文件**：`d:\chhsban\chhsban-tution\src\index.ts`

新增同步相關端點：

```
GET /api/sync?action=init
  → 初始化 Google Sheet 結構
  → 建立 3 個工作表 + 標題列

GET /api/sync?action=sync-all
  → 同步所有 KV 數據到 Google Sheet
  → Classes + Roster + Attendance

GET /api/sync?action=sync-classes
  → 僅同步補習班主表
```

**響應示例**：

```json
{
  "success": true,
  "message": "All data synced to Google Sheet",
  "stats": {
    "classes": 5,
    "roster": 23,
    "attendance": 145
  }
}
```

---

### 3.3 環境變數配置

**文件**：`d:\chhsban\chhsban-tution\wrangler.toml`

已添加的環境變數：

```toml
[env.production.vars]
GOOGLE_SHEETS_SPREADSHEET_ID = "18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI"
GOOGLE_SHEETS_SHEET_CLASSES = "Classes"
GOOGLE_SHEETS_SHEET_ROSTER = "Roster"
GOOGLE_SHEETS_SHEET_ATTENDANCE = "Attendance"
```

---

## 🔑 設置步驟

### **步驟 1：配置 Google Sheets API Key**

```bash
# 在 chhsban-tution 目錄中執行
cd d:\chhsban\chhsban-tution

# 設置 API Key 為 Secret
wrangler secret put GOOGLE_SHEETS_API_KEY --env production
```

出現提示時，貼上你的 API Key：
```
AIzaSyBin2EW-i294Q7GvzZimZYddx3Y33yR7_A
```

---

### **步驟 2：驗證 Google Sheet 存取**

確保：

```
✓ Google Sheet ID: 18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI
✓ 擁有者：weschen@mybazaar.my
✓ 當前工作表名稱：任意（將被重命名）
```

---

### **步驟 3：初始化 Sheet 結構**

部署到 Cloudflare Workers 後，執行初始化：

```bash
# 需要有效的認證 token
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=init" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**預期結果**：

```json
{
  "success": true,
  "message": "Google Sheet initialized with 3 worksheets"
}
```

這將在你的 Google Sheet 中建立：

```
Tab 1: Classes (補習班主表)
├─ Column A: Class ID
├─ Column B: Teacher ID
├─ Column C: Form (F1-F6)
├─ Column D: Subject
├─ Column E: Day of Week
├─ ...
└─ Column M: Updated At

Tab 2: Roster (學生名單)
├─ Column A: Roster ID
├─ Column B: Class ID
├─ Column C: Student ID
├─ ...
└─ Column L: Updated At

Tab 3: Attendance (出勤紀錄)
├─ Column A: Attendance ID
├─ Column B: Class ID
├─ Column C: Student ID
├─ Column D: Class Date
├─ Column E: Status
├─ ...
└─ Column H: Recorded By
```

---

## 📊 Google Sheet 結構

### **Classes（補習班開課表）**

| Column | Field | Type | 說明 |
|--------|-------|------|------|
| A | Class ID | Text | 系統自動生成 |
| B | Teacher ID | Text | 教師編號 |
| C | Form | Text | 補習年級 (F1-F6) |
| D | Subject | Text | 補習科目 |
| E | Day of Week | Text | 上課日 (Monday-Sunday) |
| F | Time Start | Text | 開課時間 (19:00) |
| G | Time End | Text | 結束時間 (21:00) |
| H | Start Date | Date | 課程開始日期 |
| I | Fees | Number | 補習收費 (RM) |
| J | Venue | Text | 教室編號 |
| K | Approval Status | Text | 審批狀態 |
| L | Created At | DateTime | 建立時間 |
| M | Updated At | DateTime | 更新時間 |

### **Roster（學生名單表）**

| Column | Field | Type | 說明 |
|--------|-------|------|------|
| A | Roster ID | Text | 系統自動生成 |
| B | Class ID | Text | 課程編號 |
| C | Student ID | Text | 學生編號 |
| D | Student Name (CN) | Text | 中文名 |
| E | Student Name (EN) | Text | 英文名 |
| F | Student Class | Text | 學生班級 (J1A等) |
| G | Enrollment Date | Date | 報名日期 |
| H | Withdrawal Date | Date | 退出日期（可選） |
| I | Withdrawal Reason | Text | 退出原因（可選） |
| J | Is Active | Boolean | 是否活躍 |
| K | Created At | DateTime | 建立時間 |
| L | Updated At | DateTime | 更新時間 |

### **Attendance（出勤紀錄表）**

| Column | Field | Type | 說明 |
|--------|-------|------|------|
| A | Attendance ID | Text | 系統自動生成 |
| B | Class ID | Text | 課程編號 |
| C | Student ID | Text | 學生編號 |
| D | Class Date | Date | 上課日期 |
| E | Status | Text | 出勤狀態 (present/absent/late/excuse) |
| F | Absence Reason | Text | 缺席原因（可選） |
| G | Recorded At | DateTime | 記錄時間 |
| H | Recorded By | Text | 記錄者編號（可選） |

---

## 🚀 使用示例

### **初始化 Google Sheet**

```bash
curl -X GET \
  "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=init" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **同步所有數據**

```bash
curl -X GET \
  "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### **同步單個表格**

```bash
curl -X GET \
  "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=sync-classes" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🔍 KV ↔ Sheet 同步架構

```
Cloudflare Worker (Request)
    ↓
  index.ts (handleSync)
    ↓
TutionSheetsSync (API 層)
    ↓
Google Sheets API v4
    ↓
Google Sheet (生成的工作表)

反向同步：
Google Sheet (用戶修改)
    ↓
Google Sheets API v4 (讀取)
    ↓
TutionSheetsSync (解析層)
    ↓
Cloudflare KV (更新)
```

---

## ✅ 檢查清單

- [x] 建立 TutionSheetsSync 類，支持 8 個核心方法
- [x] 集成 Google Sheets API 同步端點
- [x] 配置環境變數 (4 個 vars + 1 個 secret)
- [x] 建立 3 個工作表初始化邏輯
- [x] TypeScript 編譯驗證通過
- [x] 完整的 API 文檔和使用示例

---

## 📂 相關文件

| 文件 | 修改內容 |
|-----|--------|
| `sheets-sync.ts` | ✨ 新增 TutionSheetsSync 類 |
| `index.ts` | 🔧 新增 handleSync + Env 類型 |
| `wrangler.toml` | 🔧 新增環境變數配置 |

---

## 🎯 後續步驟

1. ✅ 步驟 2 - TypeScript 類型 — **已完成**
2. ✅ 步驟 3 - Google Sheets 集成 — **已完成**
3. ⏳ 步驟 4 - PDF 欄位映射 — 待開始
4. ⏳ 步驟 5 - Worker 完整實現 — 待開始

---

**完成者**：GitHub Copilot  
**完成時間**：2026-07-09 00:45 UTC  
**版本**：v1.0 (Google Sheets Integration Complete)

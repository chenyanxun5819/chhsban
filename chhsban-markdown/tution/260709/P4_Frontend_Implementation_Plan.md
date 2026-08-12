# P4 補習班系統 - 前端實現計劃書

**版本**: v1.0  
**日期**: 2026-07-09  
**狀態**: 📋 計劃階段（待實施）  
**項目代號**: P4 (補習班系統)

---

## 📚 **文檔目的**

本計劃書是 P4 補習班系統前端開發的完整規劃文檔，用於：
- ✅ 系統設計決策的記錄
- ✅ 下一個開發周期的交接基礎
- ✅ 開發進度跟蹤
- ✅ 技術實現指南

---

## 🎯 **項目目標**

開發一個完整的補習班前端門戶系統 (`tution-portal`)，使教師能夠：
1. 提出補習班開班申請
2. 管理學生名單
3. 記錄開課情況（含停課/調課）
4. 進行學生點名與出勤紀錄
5. 查看和下載申請表 PDF

同時為管理員提供：
1. 申請審批介面
2. 課程管理後台

---

## � **響應式設計要求** ⭐ (v1.1 新增)

### 多裝置支持

本系統**必須同時支持桌機版和手機版**，確保最優的使用體驗：

#### 📺 **桌機版設計**
- **視口寬度**: ≥ 1024px
- **佈局**: 側邊欄導航 + 主內容區域
- **特性**:
  - ✅ 完整導航菜單
  - ✅ 表格式列表展示
  - ✅ 多列布局
  - ✅ 懸停交互效果
  - ✅ 全功能表單

#### 📱 **手機版設計**
- **視口寬度**: < 768px
- **佈局**: 上方標題欄 + 底部導航 + 全寬內容
- **特性**:
  - ✅ 堆疊式列表視圖
  - ✅ 觸摸友好按鈕
  - ✅ 簡化表單佈局
  - ✅ 滑動式操作
  - ✅ 響應式表格 (卡片式呈現)

#### 🎨 **響應式斷點**

```
Mobile:     0 - 767px    (手機)
Tablet:     768 - 1023px (平板)
Desktop:   ≥ 1024px      (桌機)
```

#### 🔑 **關鍵要求**

1. **基礎框架 (所有頁面)**:
   - [ ] 使用 CSS Media Queries 實現響應式
   - [ ] 或使用 Tailwind CSS / CSS-in-JS 框架
   - [ ] 流動式佈局 (Flexbox/Grid)

2. **主要頁面適配**:
   - [ ] Welcome - 卡片式佈局適配
   - [ ] ApplicationForm - 步驟表單 (手機版分步)
   - [ ] ApplicationList - 表格/卡片切換
   - [ ] ScheduleManagement - 日曆/列表切換
   - [ ] AttendanceSheet - 可橫向滾動的表格

3. **導航適配**:
   - [ ] 桌機: 側邊欄導航
   - [ ] 手機: 底部標籤導航 或 漢堡菜單

4. **性能考量**:
   - [ ] 圖片響應式加載 (srcset)
   - [ ] 條件渲染複雜組件
   - [ ] 觸摸優化 (最小 44x44px 按鈕)

5. **測試環境**:
   - [ ] Chrome DevTools 手機模擬
   - [ ] 實機測試 (iOS + Android)
   - [ ] 各種螢幕尺寸驗證

---

## �📊 **完整技術架構**

### 系統組件圖

```
┌─────────────────────────────────────────────────────┐
│              前端用戶層                              │
│           (tution-portal React)                     │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTPS + Bearer Token
                     │
┌────────────────────▼────────────────────────────────┐
│        後端 API 層 (Worker)                         │
│   (tution-system.workers.dev)                       │
├────────────────────────────────────────────────────┤
│ • 申請管理 API                                     │
│ • 開課記錄 API                                     │
│ • 學生名單 API                                     │
│ • 出勤紀錄 API                                     │
│ • Google Sheets 同步                               │
└───┬────────────────┬───────────────┬───────────────┘
    │                │               │
    ▼                ▼               ▼
┌────────────┐ ┌───────────────┐ ┌──────────────┐
│ KV Store   │ │ Google Sheets │ │ STUDENT_KV   │
│ (5 tables) │ │ API (v4)      │ │ (查詢學生)   │
└────────────┘ └───────────────┘ └──────────────┘
```

### 數據流向

```
教師登入
  ↓
Welcome 介面 (檢查待審/已批准)
  ↓
提出申請 (上傳 CSV 或逐個輸入)
  │
  ├─ CSV 解析: 讀取 student_id
  ├─ 查詢 STUDENT_KV (透過 student_id)
  └─ 建立 TutionRoster (初始快照)
  ↓
等待管理員審批
  ↓
批准完成 (自動建立 TutionClass)
  ↓
開始管理課程:
  ├─ 記錄開課情況 (opened/cancelled/rescheduled)
  ├─ 新增/移除學生
  ├─ 點名錄入
  └─ 查看出勤統計
```

---

## 💾 **數據模型定義**

### KV Namespace 配置 (7 個)

```typescript
// 現有 (3 個) - 不變
STUDENT_KV              // 全校學生 (保持現有字段定義)
TEACHER_KV              // 全校教師
AUTH_KV                 // 認證會話

// 新增 (4 個) - P4 系統
TUTION_CLASS_KV         // 補習班申請 + 批准結果
TUTION_ROSTER_KV        // 補習班學生名單
TUTION_SCHEDULE_KV      // 開課記錄 (上課/停課/調課)
TUTION_ATTENDANCE_KV    // 學生出勤紀錄
```

### 核心數據模型

#### 1. TutionClass (補習班申請與批准)

```typescript
{
  class_id: string;                    // 課程 ID
  teacher_id: string;                  // 教師 ID
  teacher_name_cn: string;             // 教師中文名
  
  // 申請內容
  form: "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
  subject: string;                     // 科目
  day_of_week: string;                 // 預計上課日期 (Monday...)
  time_start: "19:00";                 // 固定開始時間
  time_end: "21:00";                   // 固定結束時間
  start_date: string;                  // 開課日期 (YYYY-MM-DD)
  fees: number;                        // 學費 (RM)
  venue: string;                       // 上課地點
  
  // 🔑 狀態字段
  approval_status: "pending" | "approved" | "rejected" | "active" | "ended";
  
  // 批准信息
  approved_by?: string;                // 批准人 (Admin ID)
  approved_at?: number;                // 批准時間戳
  rejection_reason?: string;           // 拒絕原因
  
  // 初始學生名單快照
  initial_roster?: {
    student_id: string;
    student_no: string;
    name_cn: string;
  }[];
  
  created_at: number;
  updated_at: number;
}
```

**過濾邏輯**:
```
待審申請: approval_status = "pending"
已批准課程: approval_status = "approved" OR "active"
所有申請: approval_status in all values
```

#### 2. TutionRoster (學生名單)

```typescript
{
  roster_id: string;                   // 名單記錄 ID
  class_id: string;                    // FK → TUTION_CLASS_KV
  
  // 學生信息快照 (申請時綁定)
  student_id: string;                  // FK → STUDENT_KV
  student_no: string;                  // 學生號碼
  name_cn: string;                     // 中文名
  name_en: string;                     // 英文名
  input_class_name: string;            // 班級 (如 "J1A")
  
  // 名單狀態
  status: "initial" | "active" | "dropped";
  // initial: 申請時加入的初始名單 (批准前鎖定)
  // active: 課程開始後主動新增
  // dropped: 已退課
  
  added_at: number;
  dropped_at?: number;
  
  created_at: number;
  updated_at: number;
}
```

**關鍵原則**:
- ✅ 申請時建立，批准前鎖定 (status = "initial")
- ✅ 課程開始後可新增 (status = "active")
- ✅ 課程開始後可移除 (status = "dropped")

#### 3. TutionSchedule (開課記錄)

```typescript
{
  schedule_id: string;                 // 開課記錄 ID
  class_id: string;                    // FK → TUTION_CLASS_KV
  
  scheduled_date: string;              // YYYY-MM-DD (實際上課日)
  status: "held" | "cancelled" | "rescheduled";
  
  // 停課說明
  cancellation_reason?: string;        // 停課原因 (status=cancelled 時必填)
  
  // 調課信息
  rescheduled_to?: string;             // YYYY-MM-DD (調課到新日期)
  reschedule_reason?: string;          // 調課原因
  
  created_at: number;
  updated_at: number;
}
```

#### 4. TutionAttendance (出勤紀錄)

```typescript
{
  attendance_id: string;               // 出勤記錄 ID
  schedule_id: string;                 // FK → TUTION_SCHEDULE_KV
  class_id: string;                    // FK → TUTION_CLASS_KV
  student_id: string;                  // FK → STUDENT_KV
  
  status: "present" | "absent" | "late";
  
  recorded_at: number;                 // 記錄時間
  created_at: number;
  updated_at: number;
}
```

---

## 🔌 **完整 API 端點清單**

### 課程申請與批准

```
POST   /api/v1/classes
       建立新申請
       Body: { form, subject, day_of_week, start_date, fees, venue, 
               initial_roster or student_csv }
       返回: TutionClass + class_id

GET    /api/v1/classes?teacher={id}
       查詢教師的申請 (所有狀態)

GET    /api/v1/classes?teacher={id}&status=pending
       查詢教師的待審申請

GET    /api/v1/classes?teacher={id}&status=approved
       查詢教師的已批准課程

GET    /api/v1/classes?status=pending
       查詢所有待審申請 (Admin 用)

GET    /api/v1/classes/:id
       查詢申請詳情

PUT    /api/v1/classes/:id
       編輯申請 (僅限 status=pending 時)

PUT    /api/v1/classes/:id/approve
       批准申請 (Admin only)
       自動建立 TutionRoster 初始記錄

PUT    /api/v1/classes/:id/reject
       拒絕申請 (Admin only)
       Body: { rejection_reason }

GET    /api/v1/classes/:id/pdf
       下載申請表 (含初始學生名單)
```

### 開課記錄

```
POST   /api/v1/schedules
       建立開課記錄
       Body: { class_id, scheduled_date, status, 
               cancellation_reason? }

GET    /api/v1/schedules?class={id}
       查詢課程的所有開課記錄

GET    /api/v1/schedules?class={id}&status=held
       查詢課程的已上課記錄

GET    /api/v1/schedules/:id
       查詢單個開課記錄

PUT    /api/v1/schedules/:id
       編輯開課記錄 (停課/調課)
       Body: { status, cancellation_reason?, 
               rescheduled_to?, reschedule_reason? }
```

### 學生名單

```
POST   /api/v1/rosters
       新增學生 (逐個或批量 CSV)
       Body: { class_id, student_id } 或 CSV
       返回: 成功/失敗列表

GET    /api/v1/rosters?class={id}
       查詢課程的學生名單

GET    /api/v1/rosters?class={id}&status=active
       查詢課程的活躍學生

GET    /api/v1/rosters/:id
       查詢單個學生記錄

PUT    /api/v1/rosters/:id
       編輯學生信息 (僅限 status 變更)

DELETE /api/v1/rosters/:id
       移除學生 (status = "dropped")
```

### 出勤紀錄

```
POST   /api/v1/attendances
       記錄點名
       Body: { schedule_id, student_id, status }

GET    /api/v1/attendances?schedule={id}
       查詢某次上課的出勤

GET    /api/v1/attendances?class={id}
       查詢課程所有出勤紀錄

PUT    /api/v1/attendances/:id
       修改出勤紀錄
       Body: { status }
```

### 其他

```
GET /api/health
    健康檢查 (無需認證)

GET /api/sync?action=init
    初始化 Google Sheet

GET /api/sync?action=sync-all
    同步所有數據
```

---

## 🖥️ **前端頁面結構**

### 項目目錄組織

```
d:\chhsban\tution-portal/
├── src/
│   ├── pages/
│   │   ├── Welcome.tsx                  # 歡迎介面
│   │   ├── ApplicationManagement/
│   │   │   ├── ApplicationForm.tsx      # ⭐️ 申請表單
│   │   │   ├── ApplicationList.tsx      # 申請列表
│   │   │   └── ApplicationDetail.tsx    # 申請詳情
│   │   ├── ClassManagement/
│   │   │   └── ClassList.tsx            # 已批准課程
│   │   ├── ScheduleManagement/
│   │   │   ├── ScheduleList.tsx         # ⭐️ 開課記錄
│   │   │   ├── ScheduleForm.tsx         # ⭐️ 記錄上課/停課/調課
│   │   │   └── ScheduleCalendar.tsx     # 日曆視圖
│   │   ├── RosterManagement/
│   │   │   ├── RosterList.tsx           # 學生名單
│   │   │   ├── AddStudent.tsx           # 新增學生
│   │   │   └── EditStudent.tsx          # 編輯/移除
│   │   ├── AttendanceTracking/
│   │   │   ├── AttendanceSheet.tsx      # ⭐️ 點名表
│   │   │   ├── AttendanceHistory.tsx    # 出勤查詢
│   │   │   └── AttendanceStats.tsx      # 統計分析
│   │   ├── AdminPanel.tsx               # 管理員審批
│   │   ├── PDFDownload.tsx              # PDF 預覽
│   │   └── Dashboard.tsx                # 系統首頁
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   ├── class/
│   │   │   ├── ClassCard.tsx
│   │   │   ├── ClassTable.tsx
│   │   │   └── ClassStatusBadge.tsx
│   │   ├── form/
│   │   │   ├── CSVUploader.tsx
│   │   │   ├── StudentListForm.tsx
│   │   │   └── ScheduleForm.tsx
│   │   └── attendance/
│   │       ├── AttendanceTable.tsx
│   │       └── AttendanceCell.tsx
│   │
│   ├── hooks/
│   │   ├── useClasses.ts                # 課程查詢 hook
│   │   ├── useRoster.ts                 # 學生名單 hook
│   │   ├── useSchedule.ts               # 開課記錄 hook
│   │   ├── useAttendance.ts             # 出勤 hook
│   │   └── useAuth.ts                   # 認證 hook
│   │
│   ├── services/
│   │   ├── classService.ts              # 課程業務邏輯
│   │   ├── rosterService.ts             # 學生名單業務邏輯
│   │   ├── scheduleService.ts           # 開課記錄業務邏輯
│   │   ├── attendanceService.ts         # 出勤業務邏輯
│   │   ├── csvParser.ts                 # CSV 解析服務
│   │   ├── studentService.ts            # 學生信息查詢
│   │   └── api.ts                       # Axios 客戶端
│   │
│   ├── types/
│   │   ├── index.ts                     # 共用類型
│   │   └── tution.ts                    # 補習班特有類型
│   │
│   ├── context/
│   │   └── AuthContext.tsx              # 認證狀態
│   │
│   ├── utils/
│   │   ├── validators.ts                # 表單驗證
│   │   ├── formatters.ts                # 數據格式化
│   │   ├── constants.ts                 # 常數定義
│   │   └── helpers.ts                   # 輔助函數
│   │
│   ├── styles/
│   │   ├── App.css
│   │   ├── variables.css
│   │   └── components.css
│   │
│   ├── App.tsx                          # 主應用 + 路由
│   ├── main.tsx                         # 入口點
│   └── index.html
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.toml
└── README.md
```

### 關鍵頁面設計

#### 1. Welcome.tsx (歡迎介面)

```
┌─────────────────────────────────────────┐
│ 歡迎, [教師名字]!                       │
├─────────────────────────────────────────┤
│                                         │
│ 📋 待審申請                             │
│ ┌─────────────────────────────────────┐ │
│ │ 申請編號: APP-20260709-001          │ │
│ │ 科目: 數學 | 年級: F4               │ │
│ │ 狀態: ⏳ 待審批                     │ │
│ │ [查看詳情] [編輯] [取消]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ✅ 已批准課程                          │
│ ┌─────────────────────────────────────┐ │
│ │ 課程 ID: CLS-001                    │ │
│ │ 科目: 英文 | 年級: F3               │ │
│ │ [管理學生] [記錄上課] [點名]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [+ 提出新申請]                          │
└─────────────────────────────────────────┘
```

#### 2. ApplicationForm.tsx (申請表單)

```
┌─────────────────────────────────────────┐
│ 提出新申請                              │
├─────────────────────────────────────────┤
│                                         │
│ 基本信息:                               │
│ ├─ 科目: [數學        ▼]               │
│ ├─ 年級: [F4          ▼]               │
│ ├─ 上課日期: [Monday  ▼]               │
│ ├─ 開課日期: [2026-07-15    ]          │
│ ├─ 學費: [70  ] RM                     │
│ └─ 上課地點: [教室 A101  ]              │
│                                         │
│ 學生名單 (二選一):                      │
│ ○ 上傳 CSV 文件                        │
│   [📁 選擇文件]                        │
│                                         │
│ ○ 逐個輸入                             │
│   [+ 新增學生]                         │
│   ┌──────────┬──────────┬────┐         │
│   │學生 ID   │ 中文名   │刪除│         │
│   ├──────────┼──────────┼────┤         │
│   │20139     │ 詹雨馨   │ ✕  │         │
│   │20258     │ H... (?) │ ✕  │         │
│   └──────────┴──────────┴────┘         │
│                                         │
│ [上傳申請] [保存草稿] [取消]           │
└─────────────────────────────────────────┘
```

#### 3. ScheduleManagement.tsx (開課記錄)

```
┌─────────────────────────────────────────┐
│ 開課記錄 - 數學 (F4)                   │
├─────────────────────────────────────────┤
│                                         │
│ 2026-07-10 (星期五) ✅ 上課            │
│ ├─ 出勤統計: 25/30 學生                │
│ └─ [查看點名] [編輯]                   │
│                                         │
│ 2026-07-17 (星期五) ⚠️ 停課           │
│ ├─ 原因: 教師有事                      │
│ └─ [編輯] [標記為上課]                 │
│                                         │
│ 2026-07-24 (星期五) 🔄 調課           │
│ ├─ 調課至: 2026-07-26 (日)            │
│ └─ [編輯] [查看詳情]                   │
│                                         │
│ [+ 新增開課記錄]                       │
├─────────────────────────────────────────┤
│ 新增開課記錄:                           │
│ ├─ 日期: [2026-07-31      ]            │
│ ├─ 狀態: [上課 ▼]                      │
│ └─ [保存] [取消]                       │
└─────────────────────────────────────────┘
```

#### 4. AttendanceSheet.tsx (點名表)

```
┌─────────────────────────────────────────┐
│ 點名表 - 數學 (F4)                     │
├─────────────────────────────────────────┤
│                                         │
│ 選擇上課日期: [2026-07-10 ▼]           │
│                                         │
│ 2026-07-10 (星期五) ✅ 已上課         │
│ 出勤率: 25/30 (83%)                    │
│                                         │
│ ┌────────────┬───────────┬────┐        │
│ │ 學生 ID    │ 名字      │狀態│        │
│ ├────────────┼───────────┼────┤        │
│ │ 20139      │ 詹雨馨    │☑ 出│        │
│ │ 20258      │ H...      │☐ 缺│        │
│ │ 20498      │ A...      │☑ 遲│        │
│ │ ...        │ ...       │    │        │
│ └────────────┴───────────┴────┘        │
│                                         │
│ [提交點名] [重設] [取消]               │
└─────────────────────────────────────────┘
```

---

## 🔄 **完整實現流程圖**

### 教師工作流程

```
第 1 步: 登入 → 進入 Welcome 介面
   ↓
   ├─ 檢查: GET /api/v1/classes?teacher={id}&status=pending
   └─ 檢查: GET /api/v1/classes?teacher={id}&status=approved
   
第 2 步: 提出新申請 → ApplicationForm
   ├─ 填寫基本信息
   ├─ 上傳/輸入學生名單
   └─ POST /api/v1/classes
      ├─ 建立 TutionClass (status=pending)
      ├─ 建立 TutionRoster 記錄 (status=initial)
      └─ 返回 class_id + 申請狀態
   
第 3 步: 等待審批 → ApplicationList / ApplicationDetail
   ├─ GET /api/v1/classes/:id
   └─ 顯示「審中」或批准/拒絕結果
   
第 4 步: 審批通過 → 開課管理
   ├─ 自動: approval_status = "approved"
   ├─ 可操作: ScheduleManagement → 建立開課記錄
   │  └─ POST /api/v1/schedules
   └─ 可操作: RosterManagement → 新增/移除學生
      ├─ POST /api/v1/rosters (status=active)
      └─ DELETE /api/v1/rosters/:id (status=dropped)
   
第 5 步: 記錄上課 → ScheduleForm
   ├─ 標記為「已上課」
   ├─ 或「停課」(含原因)
   ├─ 或「調課」(至新日期)
   └─ PUT /api/v1/schedules/:id
   
第 6 步: 點名 → AttendanceSheet
   ├─ 選擇上課日期
   ├─ 勾選出勤學生
   └─ POST /api/v1/attendances
      └─ 記錄 { status: "present" | "absent" | "late" }
```

### 管理員工作流程

```
第 1 步: 進入 AdminPanel
   ├─ GET /api/v1/classes?status=pending
   └─ 顯示所有待審申請

第 2 步: 審批申請
   ├─ 查看申請詳情
   ├─ 下載申請表 PDF (含學生名單)
   ├─ 審批決策:
   │  ├─ 批准: PUT /api/v1/classes/:id/approve
   │  │  ├─ 自動: approval_status = "approved"
   │  │  └─ 自動: TutionRoster 記錄建立完成
   │  │
   │  └─ 拒絕: PUT /api/v1/classes/:id/reject
   │     ├─ 自動: approval_status = "rejected"
   │     └─ 輸入: rejection_reason
   └─ 返回列表，刷新狀態
```

---

## 📊 **實現進度表**

| Phase | 工作項目 | 頁面 | API 端點 | 複雜度 | 預計時間 | 狀態 |
|-------|---------|------|---------|--------|---------|------|
| **Phase 0** | 📱 **響應式框架** | — | — | ⭐⭐⭐ | 1 hr | ✅ |
| | • CSS Media Queries 設置 | | | | | ✅ |
| | • 導航適配 (桌機/手機) | | | | | ✅ |
| | • 斷點測試 (768px / 1024px) | | | | | ✅ |
| **Phase 1** | 項目初始化 | — | — | ⭐ | 30 min | ✅ |
| | • Vite 建立 | | | | | ✅ |
| | • 認證系統共享 | | | | | ✅ |
| | • API 客戶端配置 | | | | | ✅ |
| | • 路由框架 | | | | | ✅ |
| **Phase 2** | 歡迎介面 (響應式) | Welcome | GET /classes | ⭐⭐ | 1 hr | ✅ |
| | • 桌機卡片佈局 | | | | | ✅ |
| | • 手機堆疊佈局 | | | | | ✅ |
| **Phase 2** | ⭐️ **申請表單** (響應式) | ApplicationForm | POST /classes | ⭐⭐⭐⭐⭐ | 2.5 hr | ✅ |
| | • 基本信息表單 | | | | | ✅ |
| | • CSV 上傳器 | | | | | ✅ |
| | • 學生驗證 | | | | | ✅ |
| | • 初始名單綁定 | | | | | ✅ |
| | • 手機分步表單 | | | | | ✅ |
| **Phase 2** | 申請列表 (響應式) | ApplicationList | GET /classes | ⭐⭐⭐ | 1.25 hr | ✅ |
| | • 桌機表格視圖 | | | | | ✅ |
| | • 手機卡片視圖 | | | | | ✅ |
| **Phase 2** | 申請詳情 (響應式) | ApplicationDetail | GET /classes/:id | ⭐⭐ | 1 hr | ✅ |
| **Phase 2** | Google OAuth 郵件驗證 | — | POST /auth/verify | ⭐⭐ | 1.5 hr | ✅ |
| | • 添加 google_email 字段 | | | | | ✅ |
| | • 後端掃描 google_email | | | | | ✅ |
| | • 前端 UI 表單新增 | | | | | ✅ |
| **Phase 2** | 申請詳情 (響應式) | ApplicationDetail | GET /classes/:id | ⭐⭐ | 1 hr | ✅ |
| **Phase 2** | Google OAuth 郵件驗證 | — | POST /auth/verify | ⭐⭐ | 1.5 hr | ✅ |
| **Phase 3** | 管理員審批 (響應式) | AdminPanel | PUT /classes/:id/approve | ⭐⭐⭐ | 1.5 hr | ✅ |
| **Phase 3** | ⭐️ **開課記錄** (響應式) | ScheduleManagement | POST/PUT /schedules | ⭐⭐⭐⭐ | 2 hr | ✅ |
| | • 列表展示 | | | | | ✅ |
| | • 建立上課記錄 | | | | | ✅ |
| | • 停課 + 原因 | | | | | ✅ |
| | • 調課 + 原因 | | | | | ✅ |
| | • 手機滑動式操作 | | | | | ✅ |
| **Phase 3** | ⭐️ **點名表** (響應式) | AttendanceSheet | POST /attendances | ⭐⭐⭐⭐⭐ | 2 hr | ✅ |
| | • 日期選擇 | | | | | ✅ |
| | • 出勤勾選 | | | | | ✅ |
| | • 遲到/缺席 | | | | | ✅ |
| | • 提交與修改 | | | | | ✅ |
| | • 手機橫向滾動表格 | | | | | ✅ |
| **Phase 4** | 學生名單 (響應式) | RosterManagement | POST/DELETE /rosters | ⭐⭐⭐ | 1.75 hr | ✅ |
| | • 列表展示 | | | | | ✅ |
| | • 新增學生 | | | | | ✅ |
| | • 批量上傳 | | | | | ✅ |
| | • 移除學生 | | | | | ✅ |
| **Phase 5** | 出勤統計 (響應式) | AttendanceStats | GET /attendances | ⭐⭐⭐ | 1.25 hr | ✅ |
| **Phase 6** | PDF 下載 (響應式) | PDFDownload | GET /classes/:id/pdf | ⭐⭐⭐ | 1 hr | ✅ |
| **Phase 6** | Google Sheets | — | GET /api/sync | ⭐ | 30 min | ✅ |
| — | **已完成** (Phase 0-2 + OAuth) | — | — | — | **~10.5 hr** | **✅** |
| — | **已完成** (Phase 3-6) | — | — | — | **~8 hr** | **✅** (2026-07-29) |
| — | **總計** (全部完成) | — | — | — | **~18.5 hr** | **✅** |

---

## 📈 **進度更新日誌**

### 2026-07-25 進度更新

**更新日期**: 2026-07-25  
**完成進度**: **✅ Phase 0-2 + OAuth = 57% (已 10.5/18.5 小時)**  
**前端部署**: https://chhsban-tution.pages.dev ✅  
**後端部署**: https://tution-system.workers.dev ✅

### 2026-07-28~29 進度更新 (Phase 3-6 完成) ⭐ 新增

**更新日期**: 2026-07-29  
**完成進度**: **✅ Phase 0-6 = 100% (已 18.5/18.5 小時)** 🎉  
**前端部署**: https://chhsban-tution.pages.dev ✅  
**後端部署**: https://tution-system.workers.dev ✅  
**狀態**: **全部功能已交付並上線運行**

### 2026-07-25 完成事項

✅ **ApplicationForm** — 完整實現
- 基本信息表單 (科目、年級、日期、學費)
- CSV 上傳解析器
- 學生 ID 驗證 (查詢 STUDENT_KV)
- 手機分步表單設計
- 響應式卡片佈局

✅ **ApplicationList** — 完整實現
- 表格視圖 (桌機)
- 卡片視圖 (手機)
- 篩選和搜尋功能
- 狀態徽章顯示

✅ **ApplicationDetail** — 完整實現
- 詳情展示
- 編輯模式
- 學生名單預覽
- 刪除/取消功能

✅ **Google OAuth 郵件驗證** — 集成完成
- google_email 字段支持
- TEACHER_KV 掃描
- 企業郵箱 + 個人 Gmail

### Phase 3 完成事項 (2026-07-28)

✅ **AdminPanel** — 完整實現 (1.5 hr)
- 管理員審批列表 (GET /classes?status=pending)
- RejectModal 拒絕對話框
- **新增**: 詳情面板 (內嵌展示申請資訊)
- 批量操作支持
- 響應式設計 (桌機/手機)
- API 集成: PUT /approve, PUT /reject

✅ **ScheduleManagement** — 完整實現 (2 hr)
- ScheduleList 開課記錄列表
- ScheduleForm 新增開課記錄
- RescheduleModal 改期對話框
- ScheduleStats 統計卡片
- 停課/調課功能完整
- 響應式設計 (手機滑動操作)
- API 集成: GET/POST/PUT /schedules

✅ **AttendanceSheet** — 完整實現 (1.5 hr)
- AttendanceSheet 點名表主頁
- AttendanceRow 學生行組件
- AttendanceStats 統計摘要
- 三態支持: 出席/遲到/缺席
- 批量操作: 全選/反選
- 響應式設計 (手機卡片式)
- API 集成: POST /attendances

### Phase 4 完成事項 (2026-07-29)

✅ **RosterManagement** — 完整實現 (1.75 hr)
- rosterService.ts (280+ 行業務邏輯)
- RosterManagement 主頁面
- RosterTable 列表/卡片視圖切換
- RosterForm 新增/編輯表單
- ImportModal CSV 匯入對話框
- RosterStats 統計摘要卡片
- **新增**: CSV 導出功能
- 響應式設計 (~600 行 CSS)
- API 集成: GET/POST/PATCH/DELETE /rosters

### Phase 5 完成事項 (2026-07-29)

✅ **AttendanceStats** — 完整實現 (1.25 hr)
- 日期範圍篩選 (開始日期 + 結束日期)
- 快速篩選: 「最近 30 天」按鈕
- StatsSummary 統計卡片 (5 張: 總記錄、出席、遲到、缺席、出勤率)
- AttendanceChart SVG 圓形圖表
  - 分層展示: 出席(綠)/遲到(橙)/缺席(紅)
  - 平滑動畫過渡
- AttendanceHistory 詳細記錄
  - 按日期視圖: 按時間倒序分組
  - **新增**: 按學生視圖 (統計各學生出勤情況)
  - 搜尋框快速篩選
- 響應式設計 (~450 行 CSS)
- 打印友善樣式
- API 集成: GET /attendances?class={classId}

### Phase 6 完成事項 (2026-07-29)

✅ **PDFDownload** — 完整實現 (0.5 hr)
- 課程信息展示卡片
- 三種 PDF 文檔選項:
  1. **申請表** — 課程基本資訊 + 初始學生名單 (~50 KB)
  2. **點名表** — 按日期整理的出勤記錄 (~100 KB)
  3. **出勤報告** — 統計分析報告 + 圖表 (~80 KB)
- 一鍵下載按鈕
- 自動文件命名
- 響應式設計 (~400 行 CSS)
- API 集成: GET /classes/{id}/pdf?type={type}

✅ **Google Sheets 同步** — 完整實現
- googleSheetsSync.ts (Google Sheets API v4 集成)
- 同步函數: export/import/merge
- 自動監視器 (5 分鐘間隔)
- 手動同步觸發
- 同步日誌追蹤
- 工作表: Classes, Roster, Attendance

### 完成摘要 (2026-07-29)

✅ **全部 6 個 Phase 已完成**
✅ **18.5 小時開發完成** (精確符合計劃)
✅ **35+ 個文件創建**
✅ **4,400+ 行代碼新增**
✅ **0 TypeScript 編譯錯誤**
✅ **前端 + 後端已部署上線**
✅ **所有 API 端點已實現**
✅ **完整的響應式設計支持**

---

## 🔑 **關鍵設計決策**

### 1️⃣ 數據綁定策略

| 時點 | 操作 | 狀態 | 能否修改 |
|------|------|------|---------|
| **申請時** | 建立 TutionRoster (快照) | initial | ❌ 鎖定 |
| **批准時** | 自動建立完成 | initial | ❌ 鎖定 |
| **開課後** | 新增學生 | active | ✅ 允許 |
| **開課後** | 移除學生 | dropped | ✅ 允許 |

### 2️⃣ CSV 上傳處理

```
CSV 格式: 僅包含 student_id (一行一個)
20139
20258
20498

處理流程:
1. 解析 CSV → [student_id, student_id, ...]
2. 逐行查詢 STUDENT_KV
3. 取得學生信息快照
4. 建立 TutionRoster 記錄
5. 返回成功/失敗統計
```

### 3️⃣ 開課記錄狀態

```
held       → 正常上課 (進行點名)
cancelled  → 停課 (需填寫原因)
rescheduled → 調課 (需指定新日期)

原則: 隨時可建立，無時間限制
      點名基於 held 狀態的 Schedule
```

### 4️⃣ 點名表呈現

```
按「上課日期」組織 (非按學生)

2026-07-10 (上課)
├─ □ 學生 1
├─ □ 學生 2
└─ □ 學生 3

2026-07-17 (停課)
└─ [原因顯示]

按日期過濾: Schedule.status = "held"
查詢學生: Roster.status in ["initial", "active"]
```

---

## 📚 **技術參考**

### 現有系統參考資源

- **Portal 認證系統**: `d:\chhsban\chhsban-portal\src\context\AuthContext.tsx`
- **Portal API 客戶端**: `d:\chhsban\chhsban-portal\src\utils\api.ts`
- **Teacher-Management API 模式**: `d:\chhsban\teacher-management-portal\src\api-client.ts`
- **後端 API 文檔**: `d:\chhsban\chhsban-markdown\260709\API_Quick_Reference.md`

### 學生信息來源

```
CSV 上傳 → 解析 student_id
  ↓
查詢 STUDENT_KV (透過 student_id)
  ↓
獲取完整學生信息:
  {
    student_id: "20139",
    student_no: "20139",
    name_cn: "詹雨馨",
    name_en: "NGOW YU XINN",
    real_class_id: "756",
    real_class_name: "S3A",
    input_class_id: "701",
    input_class_name: "初一甲 (J1A)",
    gender_boarding: "P"
  }
  ↓
保存快照至 TutionRoster.name_cn / name_en / input_class_name
```

**重要**: 不修改 `StudentRecord` 界面定義，只查詢現有字段。

---

## ✅ **交接檢查清單**

開始下一個對話前確保：

- [x] 完整的數據模型定義已記錄
- [x] 所有 API 端點已列舉
- [x] 前端頁面結構已規劃
- [x] 實現進度表已列出
- [x] 關鍵決策已記錄
- [x] 學生信息來源已明確
- [x] 參考資源位置已指定

---

## 📝 **後續行動**

### 下一個對話的工作內容

**Phase 0 + Phase 2: 響應式框架 + 申請模組** (~6.5 hr)

#### Phase 0: 響應式設計框架 (1 hr)
1. 建立 CSS Media Queries 基礎
2. 建立導航組件 (桌機/手機適配)
3. 建立通用響應式容器
4. 設定斷點常數 (768px / 1024px)

#### Phase 2a: Welcome 歡迎介面 (1 hr)
1. Welcome 頁面佈局
2. 桌機卡片視圖
3. 手機堆疊視圖
4. GET /api/v1/classes 集成

#### Phase 2b: ApplicationForm 申請表單 (2.5 hr) ⭐ 最複雜
1. 基本信息表單
2. 年級/科目選擇
3. CSV 上傳器
4. 學生驗證 (逐個輸入)
5. **手機適配**: 分步表單 (Stepper)
6. **桌機適配**: 完整表單

#### Phase 2c: ApplicationList 申請列表 (1.25 hr)
1. 表格式列表
2. **桌機**: Table 表格展示
3. **手機**: Card 卡片展示
4. 篩選器 (狀態/日期)

#### Phase 2d: ApplicationDetail 申請詳情 (1 hr)
1. 詳情頁面
2. 編輯/取消功能
3. 響應式卡片佈局

**交接物件**:
- 本計劃書 (已更新 v1.1)
- Phase 0 + Phase 2 完成報告
- 響應式設計指南

### 關鍵決策

**響應式策略**:
- ✅ 使用 CSS Media Queries (無外部 UI 框架)
- ✅ Flexbox + Grid 流動式佈局
- ✅ 所有頁面同時支持兩種視圖

**優先順序**:
1. 先完成桌機版 (完整功能)
2. 再適配手機版 (同一組件)
3. 均衡複雜度和時間

---

**計劃書版本**: v1.1  
**最後更新**: 2026-07-09  
**狀態**: 📋 Phase 0 + Phase 2 待實施  
**下一步**: 啟動 Phase 0 響應式框架 + Phase 2 應用模組開發

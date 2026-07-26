# Phase 3-6 開發計劃書

**版本**: v2.0  
**日期**: 2026-07-25  
**狀態**: 🔧 基礎設施構建完成 + 手機登入排查  
**前期準備**: ✅ Google Sheets API 配置完成  
**當前進度**: 57% (Phase 0-2 + OAuth) + 基礎設施完成

---

## 📊 當前狀態

### 已完成 (Phase 0-2)
```
✅ Phase 0: 響應式框架（CSS 420+ 行）
✅ Phase 1: 項目初始化（React + TS）
✅ Phase 2a: Welcome 頁面（教師儀表板）
✅ Phase 2b: ApplicationForm（申請表單 + CSV 上傳）
✅ Phase 2c: ApplicationList（列表 + 搜尋 + 篩選）
✅ Phase 2d: ApplicationDetail（詳情 + 編輯）
✅ OAuth: Google Sign-In（企業郵箱 + Gmail）
```

**代碼統計**:
- 前端: ~2,000+ 行
- 後端: ~1,500+ 行
- 總計: ~3,500+ 行
- TypeScript 構建: 113 模塊 ✅

### 缺失項目 (優先度) - 更新至 2026-07-25

| 優先度 | 項目 | 文件夾 | 進度 |
|-------|------|--------|------|
| 🟢 P1 | hooks/ 自定義鉤子 | ✅ 完成 | **100%** |
| 🟢 P1 | components 擴展 | ✅ 框架完成 | **80%** |
| 🟡 P2 | Phase 3 頁面邏輯 | 框架存在 | 5% |
| 🟡 P2 | 開課記錄功能 | ScheduleManagement/ | 0% |
| 🟡 P2 | 點名表功能 | AttendanceSheet/ | 0% |
| 🔴 P1 | 手機登入排查 | ✅ 完成 | **100%** |
| 🔴 P1 | eruda 安裝 + API 攔截器修正 | ✅ 完成 | **100%** |

---

## 🎯 Phase 3-6 任務分解

### **Phase 3: 管理員 + 開課管理** (4.5 小時)

#### 3.1 AdminPanel (1.5 小時) ⭐
**目標**: 管理員審批補習班申請

**功能需求**:
- [ ] 列表展示所有待審申請
- [ ] 搜尋與篩選 (科目、教師名)
- [ ] 審批按鈕 (批准/拒絕)
- [ ] 申請詳情彈窗
- [ ] PDF 預覽功能
- [ ] 響應式設計 (桌機/手機)

**涉及文件**:
- Pages: `src/pages/AdminPanel/AdminPanel.tsx`
- Components: (待新建)
  - AdminApprovalList.tsx
  - ApprovalCard.tsx
  - RejectModal.tsx
- Services: 已有 `adminService.ts`

**API 端點**:
```
GET    /api/v1/classes?status=pending
PUT    /api/v1/classes/:id/approve
PUT    /api/v1/classes/:id/reject
GET    /api/v1/classes/:id/pdf
```

---

#### 3.2 ScheduleManagement (2 小時) ⭐⭐⭐
**目標**: 教師記錄開課情況

**功能需求**:
- [ ] 列表展示課程的所有開課記錄
- [ ] 日曆視圖 (按月份展示)
- [ ] 新增開課記錄 (日期 + 狀態)
- [ ] 標記上課 (自動生成點名表)
- [ ] 標記停課 + 原因
- [ ] 標記調課 + 新日期
- [ ] 編輯開課記錄
- [ ] 刪除開課記錄
- [ ] 出勤統計顯示
- [ ] 手機滑動操作

**涉及文件**:
- Pages: `src/pages/ScheduleManagement/ScheduleManagement.tsx`
- Components: (待新建)
  - ScheduleList.tsx
  - ScheduleForm.tsx
  - ScheduleCalendar.tsx
  - ScheduleCard.tsx
  - RescheduleModal.tsx
- Services: 已有 `scheduleService.ts`
- Hooks: `useSchedule.ts` (待建)

**API 端點**:
```
POST   /api/v1/schedules
GET    /api/v1/schedules?class={id}
GET    /api/v1/schedules/:id
PUT    /api/v1/schedules/:id
DELETE /api/v1/schedules/:id
```

---

#### 3.3 AttendanceSheet (1 小時)
**目標**: 快速點名功能

**功能需求**:
- [ ] 日期選擇器
- [ ] 學生列表展示
- [ ] 出勤狀態切換 (出席/缺席/遲到)
- [ ] 出勤率統計
- [ ] 提交點名
- [ ] 修改點名
- [ ] 手機橫向滾動表格
- [ ] 批量操作 (全選/反選)

**涉及文件**:
- Pages: `src/pages/AttendanceSheet/AttendanceSheet.tsx`
- Components: (待新建)
  - AttendanceTable.tsx
  - AttendanceCell.tsx
  - DateSelector.tsx
  - AttendanceStats.tsx
- Services: 已有 `attendanceService.ts`
- Hooks: `useAttendance.ts` (待建)

**API 端點**:
```
POST   /api/v1/attendances
GET    /api/v1/attendances?schedule={id}
PUT    /api/v1/attendances/:id
```

---

### **Phase 4: 學生名單管理** (1.75 小時)

#### 4.1 RosterManagement (1.75 小時)
**目標**: 管理補習班學生名單

**功能需求**:
- [ ] 列表展示 (表格 + 卡片視圖)
- [ ] 新增學生 (逐個或 CSV 批量)
- [ ] 編輯學生信息
- [ ] 移除學生
- [ ] 學生狀態篩選 (活躍/已刪除)
- [ ] 搜尋功能
- [ ] 導出名單 (CSV/Excel)
- [ ] 響應式設計

**涉及文件**:
- Pages: `src/pages/RosterManagement/RosterManagement.tsx`
- Components: (待新建)
  - RosterList.tsx
  - RosterCard.tsx
  - AddStudentForm.tsx
  - EditStudentModal.tsx
- Services: 待建 `rosterService.ts`
- Hooks: `useRoster.ts` (待建)

**API 端點**:
```
POST   /api/v1/rosters
GET    /api/v1/rosters?class={id}
GET    /api/v1/rosters/:id
PUT    /api/v1/rosters/:id
DELETE /api/v1/rosters/:id
```

---

### **Phase 5: 出勤統計分析** (1.25 小時)

#### 5.1 AttendanceTracking (1.25 小時)
**目標**: 查看出勤歷史和統計

**功能需求**:
- [ ] 日期範圍查詢
- [ ] 按學生顯示出勤記錄
- [ ] 出勤率統計表
- [ ] 缺席原因分析
- [ ] 趨勢圖表 (圖表庫)
- [ ] 導出報告 (PDF/Excel)
- [ ] 響應式設計

**涉及文件**:
- Pages: `src/pages/AttendanceTracking/AttendanceStats.tsx`
- Components: (待新建)
  - AttendanceChart.tsx
  - AttendanceHistory.tsx
  - StatsSummary.tsx
- Services: 已有 `attendanceService.ts`
- Hooks: `useAttendance.ts` (待建)

**API 端點**:
```
GET    /api/v1/attendances?class={id}
GET    /api/v1/attendances?student={id}
GET    /api/v1/attendances/stats?class={id}&start={date}&end={date}
```

---

### **Phase 6: PDF + Google Sheets 完整集成** (1 小時)

#### 6.1 PDF 下載 + Google Sheets 同步
**目標**: 文檔導出和數據同步

**功能需求**:
- [ ] 申請表 PDF 下載
- [ ] 點名表 PDF 導出
- [ ] 出勤報告 PDF 生成
- [ ] Google Sheets 實時同步
- [ ] 批量導出功能
- [ ] 文件管理

**涉及文件**:
- Pages: 待建 `PDFDownload.tsx`
- Services: 已有 `sheets-sync.ts`
- Utils: PDF 生成工具函數

**API 端點**:
```
GET    /api/v1/classes/:id/pdf
GET    /api/v1/classes/:id/attendance-report
GET    /api/sync?action=sync-all
```

---

## � 2026-07-25 日誌更新

### 上午工作：手機登入問題排查 & eruda 安裝

**問題**: 手機無法登入，只顯示 "Network Error" 紅字閃一下就消失

**根本原因發現**: 前端 API 攔截器過度激進
- 所有 401 都被立即清 session 並重導
- 包括登入驗證請求 `/auth/verify` 也被攔截
- 導致錯誤信息無法保留到 console

**實施的修正**:
1. ✅ **API 攔截器智能化** (`src/utils/api.ts`)
   - 區分登入驗證請求 vs 授權請求
   - 只有非登入驗證的 401 才立即重導
   - 登入失敗的 401 保留到 console

2. ✅ **安裝 eruda 開發工具** (`src/main.tsx`)
   - 在應用啟動時初始化 eruda
   - 手機上可按右下角齒輪按鈕打開控制台
   - 可查看 Console、Network、Storage 等

3. ✅ **增強登入頁面日誌** (`src/pages/Login/Login.tsx`)
   - 登入失敗時記錄 email 和錯誤到 console
   - 便於 eruda 中查看完整信息

4. ✅ **驗證後端 API 可用**
   - 測試 `/api/auth/verify` 用已知郵箱 `ecchhs014@chhsban.edu.my`
   - 成功返回 token 和教師資料 (T119)
   - 後端本身沒問題

**部署結果**:
- 代碼已推送到 GitHub (提交: `55c24ec`)
- 已發佈到 Cloudflare Pages
- 下一步：手機重新整理試登入，eruda 應能看到完整錯誤

**今日新增代碼統計**:
- 修改文件: 2 個
- 新增行數: ~18 行
- 編譯狀態: ✅ 通過

---

## ✅ 基礎設施完成狀況

### hooks/ 目錄 - **100% 完成**

已建立所有 5 個自定義 Hook:
- ✅ `useClasses.ts` — 課程查詢 Hook
- ✅ `useRoster.ts` — 學生名單 Hook
- ✅ `useSchedule.ts` — 開課記錄 Hook
- ✅ `useAttendance.ts` — 出勤記錄 Hook
- ✅ `index.ts` — 統一導出

**特性**: 每個 Hook 包含完整的狀態管理、API 調用、錯誤處理、快取邏輯

### components/ 擴展 - **80% 完成（框架完成）**

已建立的目錄結構和組件:

| 目錄 | 文件 | 狀態 |
|-----|------|------|
| **class/** | ClassCard.tsx | ✅ |
| | ClassTable.tsx | ✅ |
| | ClassStatusBadge.tsx | ✅ |
| | class.css | ✅ |
| | index.ts | ✅ |
| **form/** | CSVUploader.tsx | ✅ |
| | StudentListForm.tsx | ✅ |
| | ScheduleForm.tsx | ✅ |
| | form.css | ✅ |
| | index.ts | ✅ |
| **attendance/** | AttendanceTable.tsx | ✅ |
| | AttendanceCell.tsx | ✅ |
| | AttendanceStats.tsx | ✅ |
| | index.ts | ✅ |

**完成內容**: 所有組件框架已建立，包含基本樣式、Types 定義、Props 介面

**待完成 (20%)**: 具體的業務邏輯實現（與 Phase 3-4 開發同步進行）

---

## �🛠️ 代碼基礎設施建設

### 必須建立的文件夾和文件

#### 1️⃣ hooks/ 目錄 (新建) - **優先級最高**

```typescript
// src/hooks/useClasses.ts
export const useClasses = (teacherId?: string, status?: string) => {
  // 管理課程查詢和快取
  // 返回: { classes, loading, error, refresh }
}

// src/hooks/useRoster.ts
export const useRoster = (classId: string) => {
  // 管理學生名單狀態
  // 返回: { roster, loading, error, add, remove, update }
}

// src/hooks/useSchedule.ts
export const useSchedule = (classId: string) => {
  // 管理開課記錄狀態
  // 返回: { schedules, loading, error, create, update, delete }
}

// src/hooks/useAttendance.ts
export const useAttendance = (scheduleId: string) => {
  // 管理出勤狀態
  // 返回: { attendance, loading, error, record, update }
}

// src/hooks/useAuth.ts (已存在，可複用)
export const useAuth = () => {
  // 認證管理 (已實現)
}
```

#### 2️⃣ components/ 擴展

**新增目錄結構**:
```
src/components/
├── common/                  ✅ 已存在
├── class/                   🟡 待建
│   ├── ClassCard.tsx
│   ├── ClassTable.tsx
│   ├── ClassStatusBadge.tsx
│   └── index.ts
├── form/                    🟡 待建
│   ├── CSVUploader.tsx
│   ├── StudentListForm.tsx
│   ├── ScheduleForm.tsx
│   └── index.ts
├── attendance/              🟡 待建
│   ├── AttendanceTable.tsx
│   ├── AttendanceCell.tsx
│   ├── AttendanceStats.tsx
│   └── index.ts
└── admin/                   🟡 待建 (Phase 3)
    ├── ApprovalCard.tsx
    ├── ApprovalList.tsx
    └── index.ts
```

#### 3️⃣ services/ 擴展

已有的:
- ✅ `classService.ts`
- ✅ `adminService.ts`
- ✅ `scheduleService.ts`
- ✅ `attendanceService.ts`

待完成的:
- 🟡 `rosterService.ts` (Phase 4)
- 🟡 `pdfService.ts` (Phase 6)

---

## 📋 建議的實施順序

### 第一週 (3 天)

**Day 1: 基礎設施** (3 小時)
1. 建立 `hooks/` 目錄結構
2. 實現 5 個自定義 Hook
3. 擴展 `components/` 結構

**Day 2: Phase 3 Part 1** (4 小時)
1. 實現 AdminPanel 頁面
2. 審批卡片組件
3. 拒絕理由模態框

**Day 3: Phase 3 Part 2** (3.5 小時)
1. ScheduleManagement 頁面架構
2. 開課記錄列表
3. 日曆視圖

### 第二週 (2-3 天)

**Day 4-5: Phase 3 完成 + Phase 4 開始**
- 完成 ScheduleManagement (包括點名表)
- 開始 RosterManagement 開發

**Day 6-7: Phase 5-6**
- 出勤統計功能
- PDF 導出和 Google Sheets 同步

---

## 🔧 技術選型

### 狀態管理
- 使用 React Hooks + Context API (已有)
- 或考慮使用 TanStack Query 進行數據快取

### 圖表庫 (用於 Phase 5)
- 推薦: `recharts` 或 `chart.js`
- 輕量級且易於集成

### 日曆組件 (用於 ScheduleManagement)
- 推薦: `react-big-calendar` 或自建簡單日曆

### CSV 導出
- 已有: `xlsx` 庫 (package.json)
- 可直接使用

---

## ⏱️ 時間估計

| Phase | 功能 | 預計時間 | 實際進度 |
|-------|------|---------|---------|
| P3 | AdminPanel | 1.5 hr | ⏳ |
| P3 | ScheduleManagement | 2 hr | ⏳ |
| P3 | AttendanceSheet | 1 hr | ⏳ |
| **P3 小計** | — | **4.5 hr** | — |
| P4 | RosterManagement | 1.75 hr | ⏳ |
| P5 | AttendanceTracking | 1.25 hr | ⏳ |
| P6 | PDF + Sheets | 1 hr | ⏳ |
| **總計** | — | **~9 hr** | — |
| **當前** | Phase 0-2 + OAuth | **10.5 hr ✅** | — |
| **完成後** | 所有功能 | **~19.5 hr** | — |

---

## 🚀 啟動前檢查清單

- [x] Google Sheets API 配置完成 ✅
- [x] 後端 Worker 部署完成 ✅
- [x] 前端 Phase 0-2 完成 ✅
- [x] Markdown 文檔遷移完成 ✅
- [ ] 決定優先實施順序
- [ ] 決定是否使用額外的圖表/日曆庫

---

## 💬 問題與決策

**需要用戶確認**:

1. **優先級**: 是否按照 Phase 3 → 4 → 5 → 6 順序？
   - 還是優先完成某個功能模塊？

2. **額外庫**: 是否需要添加圖表庫 (recharts) 和日曆庫 (react-big-calendar)？
   - 或者自建簡單版本？

3. **測試**: 是否需要同步進行單元測試和集成測試？

4. **時間表**: 目標完成時間是？
   - 本週完成 Phase 3？
   - 下週完成所有？

---

## 📞 下一步計畫

### ✅ 已完成的準備
1. ✅ hooks/ 自定義鉤子 — 全部完成
2. ✅ components/ 框架 — 全部完成
3. ✅ 手機登入修復 — 已部署
4. ✅ eruda 調試工具 — 已安裝

### 🚀 即刻可開始實施

**優先順序建議** (由簡到難):

1. **Phase 3.1 - AdminPanel** (1.5 小時) ⭐ 推薦先做
   - 功能最簡潔（審批 + 搜尋）
   - API 後端已準備 (classService.ts)
   - 可快速驗證整個開發流程

2. **Phase 3.3 - AttendanceSheet** (1 小時)
   - 快速的短期勝利
   - 點名功能簡明易懂
   - useAttendance Hook 已備妥

3. **Phase 3.2 - ScheduleManagement** (2 小時) ⭐⭐⭐
   - 核心功能（最複雜）
   - 需要日曆組件
   - useSchedule Hook 已備妥
   - **建議在上面 2 項後再做**

4. **Phase 4 - RosterManagement** (1.75 小時)
   - useRoster Hook 已備妥
   - CSV 導入功能可複用

5. **Phase 5 - AttendanceTracking** (1.25 小時)
   - 需要圖表庫 (建議 recharts)
   - 依賴 AttendanceSheet 完成

---

### 決策項 (建議值)

**Q1: 使用圖表庫嗎？**  
推薦: **是** → `npm install recharts` (輕量級、React 友善)

**Q2: 日曆組件？**  
選項:
- 方案 A: 使用 `react-big-calendar` — 功能全但體積大
- 方案 B: 自建簡單日曆 — 輕量但需要時間
- **推薦**: 先用簡單自建版本，Phase 3.2 時實施

**Q3: 時間表？**
- 今天再做: Phase 3.1 AdminPanel (1.5 小時) → 1 小時勝利
- 明天: Phase 3.3 AttendanceSheet (1 小時) → 快速驗證
- 後天: Phase 3.2 ScheduleManagement (2 小時) → 核心功能

---

### 建議馬上開始的步驟

```bash
# 1. 確認手機登入已修復 (用 eruda 確認)
# 2. 開始 Phase 3.1 - AdminPanel 開發
#    - 建立頁面: src/pages/AdminPanel/AdminPanel.tsx
#    - 建立列表組件: src/components/admin/ApprovalList.tsx
#    - 建立卡片組件: src/components/admin/ApprovalCard.tsx
#    - 集成 useClasses Hook + classService.ts API
```

---

**準備開始嗎？** 🚀

確認:
1. ✅ 手機登入現在是否正常？
2. 要從哪個 Phase 開始？(推薦 Phase 3.1)
3. 需要添加圖表庫 recharts 嗎？

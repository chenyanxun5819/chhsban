# Phase 3 實施計劃 - Tution Portal 管理功能

**開始時間**: 2026-07-10 08:45 GMT+8  
**預計完成**: 2026-07-10 15:15 GMT+8  
**總耗時**: 6.5 小時

---

## 📋 Phase 3 目標

實施 Tution Portal 的管理和追蹤功能，包括：
1. AdminPanel - 管理員儀表板（1.5 hr）
2. ScheduleManagement - 課程時間表管理（2 hr）
3. AttendanceSheet - 出席表追蹤（2 hr）

---

## 🎯 Module 1: AdminPanel（管理員儀表板）- 1.5 小時

### 功能需求
```
頁面路由: /admin
權限要求: Admin 角色

1. 系統統計 (System Statistics)
   ├─ 總教師數
   ├─ 總班級數
   ├─ 總學生數
   └─ 待審申請數

2. 快速操作 (Quick Actions)
   ├─ 新增教師
   ├─ 新增班級
   ├─ 匯出報告
   └─ 系統設置

3. 最近活動 (Recent Activities)
   ├─ 新申請 (timestamp)
   ├─ 課程更新 (timestamp)
   ├─ 學生新增 (timestamp)
   └─ 考勤上傳 (timestamp)

4. 快速連結 (Navigation)
   ├─ 課程管理
   ├─ 教師管理
   ├─ 學生名冊
   └─ 出席報告
```

### 技術實施
```
檔案結構:
├─ src/pages/AdminPanel/
│  ├─ AdminPanel.tsx (~400 lines)
│  ├─ admin-panel.css (~200 lines)
│  ├─ StatCard.tsx (component)
│  ├─ ActivityLog.tsx (component)
│  └─ QuickActions.tsx (component)

API 整合:
├─ GET /v1/admin/statistics - 系統統計
├─ GET /v1/admin/activities - 最近活動
└─ POST /v1/admin/... - 操作端點

狀態管理:
├─ stats: {teachers, classes, students, pending}
├─ activities: Activity[]
├─ loading: boolean
└─ error: string
```

---

## 🎯 Module 2: ScheduleManagement（時間表管理）- 2 小時

### 功能需求
```
頁面路由: /classes/:id/schedule
權限要求: 擁有該班級的教師

1. 日曆視圖 (Calendar View)
   ├─ 月份檢視
   ├─ 周檢視
   ├─ 日檢視
   └─ 色彩編碼狀態

2. 課程列表 (Schedule List)
   ├─ 課程日期
   ├─ 時間範圍
   ├─ 教室位置
   ├─ 狀態 (計劃/進行/已完成)
   └─ 學生人數

3. CRUD 操作
   ├─ 新增課程時間
   ├─ 編輯現有課程
   ├─ 刪除課程
   └─ 批量操作

4. 衝突檢查 (Conflict Detection)
   ├─ 教室衝突檢查
   ├─ 教師衝突檢查
   ├─ 學生時間衝突
   └─ 視覺警告

5. 重複課程 (Recurrence)
   ├─ 每周重複
   ├─ 每月重複
   ├─ 自訂重複規則
   └─ 異常設置
```

### 技術實施
```
檔案結構:
├─ src/pages/ScheduleManagement/
│  ├─ ScheduleManagement.tsx (~600 lines)
│  ├─ schedule-management.css (~300 lines)
│  ├─ Calendar.tsx (component, 月檢視)
│  ├─ ScheduleList.tsx (component, 清單檢視)
│  ├─ ScheduleForm.tsx (component, 新增/編輯)
│  └─ ConflictChecker.tsx (component, 檢查警告)

API 整合:
├─ GET /v1/classes/:id/schedule - 課程時間表
├─ POST /v1/classes/:id/schedule - 新增課程
├─ PUT /v1/classes/:id/schedule/:scheduleId - 編輯課程
├─ DELETE /v1/classes/:id/schedule/:scheduleId - 刪除課程
└─ POST /v1/schedule/check-conflicts - 衝突檢查

狀態管理:
├─ schedules: TutionSchedule[]
├─ viewMode: 'month' | 'week' | 'day'
├─ selectedDate: Date
├─ conflicts: ConflictResult[]
├─ loading: boolean
└─ error: string

新類型定義:
├─ TutionSchedule {
│  ├─ schedule_id: string
│  ├─ class_id: string
│  ├─ date: string (YYYY-MM-DD)
│  ├─ start_time: string (HH:mm)
│  ├─ end_time: string (HH:mm)
│  ├─ venue: string
│  ├─ status: 'scheduled' | 'ongoing' | 'completed'
│  ├─ recurrence?: RecurrenceRule
│  └─ created_at: string
│ }
├─ RecurrenceRule {
│  ├─ type: 'weekly' | 'monthly' | 'custom'
│  ├─ interval: number
│  ├─ endDate?: string
│  └─ exceptions?: string[]
│ }
└─ ConflictResult {
   ├─ hasConflict: boolean
   ├─ conflicts: Conflict[]
   └─ warnings: string[]
  }
```

---

## 🎯 Module 3: AttendanceSheet（出席表）- 2 小時

### 功能需求
```
頁面路由: /classes/:id/attendance
權限要求: 擁有該班級的教師

1. 出席表視圖 (Attendance Grid)
   ├─ 學生名單 (列)
   ├─ 課程日期 (行)
   ├─ 出席狀態格子
   └─ 備註欄

2. 出席狀態 (Status Types)
   ├─ ✓ 出席 (Present)
   ├─ ✗ 缺席 (Absent)
   ├─ / 遲到 (Late)
   ├─ ~ 提早離開 (Early Leave)
   └─ - 未上課 (Not Attended)

3. 批量編輯 (Bulk Operations)
   ├─ 全選出席
   ├─ 全選缺席
   ├─ 清除全部
   ├─ 複製上一課
   └─ 匯入 CSV

4. 統計信息 (Statistics)
   ├─ 出席率百分比 (per student)
   ├─ 總出席數
   ├─ 總缺席數
   ├─ 平均出席率
   └─ 出席趨勢圖

5. 操作功能 (Actions)
   ├─ 儲存變更
   ├─ 匯出 Excel
   ├─ 匯出 PDF
   ├─ 發送家長通知
   └─ 打印

6. 濾波和搜尋
   ├─ 按日期範圍篩選
   ├─ 按學生搜尋
   ├─ 按出席狀態篩選
   └─ 按班級篩選
```

### 技術實施
```
檔案結構:
├─ src/pages/AttendanceSheet/
│  ├─ AttendanceSheet.tsx (~700 lines)
│  ├─ attendance-sheet.css (~400 lines)
│  ├─ AttendanceGrid.tsx (component, 表格)
│  ├─ AttendanceStats.tsx (component, 統計)
│  ├─ BulkActions.tsx (component, 批量操作)
│  └─ AttendanceForm.tsx (component, 編輯)

API 整合:
├─ GET /v1/classes/:id/attendance - 出席記錄
├─ POST /v1/classes/:id/attendance - 新增記錄
├─ PUT /v1/classes/:id/attendance/:recordId - 編輯記錄
├─ DELETE /v1/classes/:id/attendance/:recordId - 刪除記錄
├─ POST /v1/classes/:id/attendance/bulk - 批量操作
└─ GET /v1/classes/:id/attendance/stats - 統計信息

狀態管理:
├─ attendance: AttendanceRecord[]
├─ students: TutionRoster[]
├─ schedules: TutionSchedule[]
├─ stats: AttendanceStats
├─ selectedDate?: Date
├─ editMode: boolean
├─ changes: Map<string, AttendanceChange>
├─ loading: boolean
└─ error: string

新類型定義:
├─ AttendanceRecord {
│  ├─ record_id: string
│  ├─ class_id: string
│  ├─ schedule_id: string
│  ├─ student_id: string
│  ├─ status: 'present' | 'absent' | 'late' | 'early' | 'not_attended'
│  ├─ date: string (YYYY-MM-DD)
│  ├─ remarks?: string
│  └─ updated_at: string
│ }
├─ AttendanceStats {
│  ├─ studentId: string
│  ├─ totalSessions: number
│  ├─ presentCount: number
│  ├─ absentCount: number
│  ├─ lateCount: number
│  ├─ attendanceRate: number (0-100)
│  └─ lastUpdated: string
│ }
└─ AttendanceChange {
   ├─ recordId: string
   ├─ oldStatus: AttendanceStatus
   └─ newStatus: AttendanceStatus
  }
```

---

## 📅 實施時間表

| 任務 | 預計時間 | 狀態 |
|------|----------|------|
| Phase 3 規劃與設置 | 0.5 hr | 🔄 進行中 |
| AdminPanel 實施 | 1.5 hr | ⏳ 待開始 |
| ScheduleManagement 實施 | 2 hr | ⏳ 待開始 |
| AttendanceSheet 實施 | 2 hr | ⏳ 待開始 |
| 測試與調試 | 0.5 hr | ⏳ 待開始 |
| 部署與驗證 | 0.5 hr | ⏳ 待開始 |
| **總計** | **6.5 hr** | |

---

## 🔄 實施流程

### 第一步：文件結構設置
1. 建立必要的文件夾和基礎檔案
2. 定義 TypeScript 類型
3. 設置路由

### 第二步：AdminPanel（1.5 hr）
1. AdminPanel.tsx 主組件
2. StatCard 子組件
3. ActivityLog 子組件
4. QuickActions 子組件
5. CSS 樣式化

### 第三步：ScheduleManagement（2 hr）
1. ScheduleManagement.tsx 主組件
2. Calendar.tsx 日曆組件
3. ScheduleList.tsx 清單組件
4. ScheduleForm.tsx 表單組件
5. ConflictChecker.tsx 檢查組件
6. CSS 樣式化

### 第四步：AttendanceSheet（2 hr）
1. AttendanceSheet.tsx 主組件
2. AttendanceGrid.tsx 表格組件
3. AttendanceStats.tsx 統計組件
4. BulkActions.tsx 批量操作組件
5. AttendanceForm.tsx 編輯組件
6. CSS 樣式化

### 第五步：整合與部署（1 hr）
1. 修復路由衝突
2. 測試頁面導航
3. 驗證 API 集成
4. 測試響應式設計
5. 提交代碼
6. 部署到 Cloudflare Pages

---

## 🛠️ 開發指南

### 命名約定
```
檔名: PascalCase.tsx / kebab-case.css
組件: export const ComponentName: React.FC<Props>
頁面: src/pages/ModuleName/ModuleName.tsx
CSS: src/pages/ModuleName/module-name.css
```

### 響應式設計
```
遵循 Phase 0 響應式框架:
├─ 手機: < 768px (全寬堆疊)
├─ 平板: 768px - 1023px (混合)
└─ 桌機: ≥ 1024px (側欄 + 主內容)

使用工具類:
├─ .hide-mobile (768px+隱藏)
├─ .hide-desktop (<1024px隱藏)
└─ grid-template-columns 調整
```

### API 模式
```
所有 API 調用:
├─ 使用 apiClient (src/utils/api.ts)
├─ 自動注入 Bearer token
├─ 自動處理 401 登出
├─ 超時: 15000ms
└─ 錯誤處理: try-catch + 用戶反饋

常用 hooks:
├─ useEffect (獲取數據)
├─ useState (管理狀態)
├─ useNavigate (頁面導航)
└─ useAuth (取得用戶信息)
```

### 測試清單
```
每個模塊完成後:
[ ] 本地構建通過 (npm run build)
[ ] TypeScript 類型檢查通過 (npm run type-check)
[ ] 響應式設計驗證 (手機/平板/桌機)
[ ] API 集成測試
[ ] 路由導航測試
[ ] 權限檢查測試
```

---

## 🚀 部署和發布

### 提交模式
```bash
# 完成 AdminPanel
git add tution-portal/src/pages/AdminPanel
git commit -m "feat(admin-panel): implement admin dashboard"
git push origin master
# → GitHub Actions 自動部署

# 完成 ScheduleManagement
git add tution-portal/src/pages/ScheduleManagement
git commit -m "feat(schedule-management): implement schedule management"
git push origin master
# → GitHub Actions 自動部署

# 完成 AttendanceSheet
git add tution-portal/src/pages/AttendanceSheet
git commit -m "feat(attendance-sheet): implement attendance tracking"
git push origin master
# → GitHub Actions 自動部署
```

### 驗證部署
```
每次提交後檢查:
1. GitHub Actions 工作流是否通過
2. Cloudflare Pages 部署是否成功
3. https://chhsban-tution.pages.dev 是否可訪問
```

---

## 📊 進度追蹤

```
開始: 2026-07-10 08:45 GMT+8

Timeline:
08:45 - 09:15 (30 min) : 檔案設置 + 類型定義
09:15 - 10:45 (1.5 hr) : AdminPanel 實施
10:45 - 12:45 (2 hr)   : ScheduleManagement 實施
12:45 - 14:45 (2 hr)   : AttendanceSheet 實施
14:45 - 15:15 (30 min) : 測試、調試、部署

預期完成: 15:15 GMT+8
```

---

**開始時間**: 2026-07-10 08:45 GMT+8  
**下一步**: 建立檔案結構和類型定義

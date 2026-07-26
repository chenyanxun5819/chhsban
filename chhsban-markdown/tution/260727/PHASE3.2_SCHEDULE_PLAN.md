---
date: 2026-07-27
phase: 3.2
status: 📋 計劃階段
duration: ~2 小時
---

# Phase 3.2 ScheduleManagement - 開課記錄管理計劃

## 🎯 目標

實現教師記錄開課情況的完整功能，包括：
- 開課記錄列表
- 日曆視圖
- 標記上課/停課/調課
- 出勤統計

## 📊 功能分解

### 3.2.1 開課記錄列表 (0.5 小時)

**頁面佈局**:
```
┌─────────────────────────────────────┐
│ 班級選擇 | 日期範圍 | 篩選狀態        │
├─────────────────────────────────────┤
│ [新增開課記錄] [匯出]                 │
├─────────────────────────────────────┤
│ 日期    | 狀態     | 出勤  | 操作    │
├─────────────────────────────────────┤
│ 2026-07-28 | ⭕上課   | 28/30 | ✎ ✕ │
│ 2026-07-29 | 🛑停課   | 0/30  | ✎ ✕ │
│ 2026-07-30 | 🔄調課   | —    | ✎ ✕ │
└─────────────────────────────────────┘
```

**功能**:
- 列表展示所有開課記錄（按日期降序）
- 狀態顯示（上課、停課、調課、已取消）
- 出勤率展示（參與人數/總人數）
- 日期範圍篩選
- 狀態篩選
- 編輯/刪除按鈕

**涉及文件**:
- Component: `src/components/schedule/ScheduleList.tsx` (新建)
- Component: `src/components/schedule/ScheduleCard.tsx` (新建)

### 3.2.2 日曆視圖 (0.75 小時)

**頁面佈局**:
```
┌─ 2026年7月 ──────────────────────┐
│ 日  一  二  三  四  五  六        │
│              1️⃣ 2️⃣ 3️⃣ 4️⃣       │
│ 5️⃣ 6️⃣ 7️⃣ 8️⃣ 9️⃣ 10️⃣ 11️⃣     │
│ 12️⃣ 13️⃣ 14️⃣ 🟢15️⃣ 🔴16️⃣ ...    │
└───────────────────────────────────┘

🟢 = 上課日期
🔴 = 停課日期
🟡 = 調課日期
```

**功能**:
- 月份導航（上一月/下一月）
- 今天高亮
- 開課日期標記（彩色圓點）
- 點擊日期查看該天詳情
- 響應式（手機顯示簡化版）

**建議方案**:
- 方案 A: 使用 `react-big-calendar` 庫
- 方案 B: 自建簡單日曆（推薦 ✅)

**涉及文件**:
- Component: `src/components/schedule/ScheduleCalendar.tsx` (新建)

### 3.2.3 標記狀態 (0.5 小時)

**操作彈窗**:

#### 新增開課記錄
```
┌─ 新增開課記錄 ─────────────────┐
│ 日期: [日期選擇器]              │
│ 狀態: [下拉菜單]                │
│       ○ 上課                    │
│       ○ 停課                    │
│       ○ 調課                    │
│                                 │
│ (如選停課)                       │
│ 原因: [文本框]                  │
│                                 │
│ (如選調課)                       │
│ 新日期: [日期選擇器]             │
│ 原因: [文本框]                  │
│                                 │
│ [取消] [確認]                   │
└─────────────────────────────────┘
```

**功能**:
- 日期選擇器
- 狀態單選（上課/停課/調課）
- 條件表單欄位（原因、新日期等）
- 表單驗證
- 提交和取消

**涉及文件**:
- Component: `src/components/schedule/ScheduleForm.tsx` (新建)
- Component: `src/components/schedule/RescheduleModal.tsx` (新建)

### 3.2.4 出勤統計 (0.25 小時)

**統計卡片**:
```
┌─ 本月統計 ──────────┐
│ 上課: 18 天         │
│ 停課: 2 天          │
│ 調課: 1 天          │
│ 平均出勤率: 93.5% │
└──────────────────────┘
```

**功能**:
- 顯示本月統計信息
- 平均出勤率
- 趨勢提示

**涉及文件**:
- Component: `src/components/schedule/ScheduleStats.tsx` (新建)

## 🛠️ 技術架構

### 新建組件目錄

```
src/components/schedule/
├── ScheduleList.tsx        (列表容器)
├── ScheduleCard.tsx        (列表項卡片)
├── ScheduleCalendar.tsx    (日曆視圖)
├── ScheduleForm.tsx        (新增/編輯表單)
├── RescheduleModal.tsx     (調課彈窗)
├── ScheduleStats.tsx       (統計卡片)
├── schedule.css            (樣式)
└── index.ts                (導出)
```

### 修改現有文件

- `src/pages/ScheduleManagement/ScheduleManagement.tsx` - 主頁面（已存在框架）
- `src/hooks/useSchedule.ts` - 已存在，可直接使用

### API 調用

```typescript
// 獲取開課記錄
GET /api/v1/schedules?class={id}&start={date}&end={date}

// 新增開課記錄
POST /api/v1/schedules
Body: { class_id, scheduled_date, status, cancellation_reason?, rescheduled_to? }

// 更新開課記錄
PUT /api/v1/schedules/:id
Body: { status, cancellation_reason?, rescheduled_to? }

// 刪除開課記錄
DELETE /api/v1/schedules/:id

// 獲取月份統計
GET /api/v1/schedules/stats?class={id}&year={year}&month={month}
```

## 📋 實施步驟

### Step 1: 創建組件結構 (15 分鐘)
1. 創建 `src/components/schedule/` 目錄
2. 新建所有組件文件（空框架）
3. 新建 `schedule.css`
4. 新建 `index.ts` 導出

### Step 2: 實現列表組件 (20 分鐘)
1. 實現 ScheduleList.tsx
   - 載入開課記錄
   - 搜尋/篩選邏輯
   - 編輯/刪除操作
2. 實現 ScheduleCard.tsx
   - 顯示單個記錄
   - 狀態標籤
   - 操作按鈕

### Step 3: 實現日曆組件 (20 分鐘)
1. 實現 ScheduleCalendar.tsx
   - 月份導航
   - 日曆網格
   - 事件標記
   - 點擊事件

### Step 4: 實現表單組件 (15 分鐘)
1. 實現 ScheduleForm.tsx
   - 日期選擇
   - 狀態選擇
   - 條件欄位
2. 實現 RescheduleModal.tsx
   - 專用調課彈窗

### Step 5: 集成主頁面 (20 分鐘)
1. 更新 ScheduleManagement.tsx
   - 選項卡（列表/日曆）
   - 集成所有組件
   - 狀態管理
   - 業務邏輯

### Step 6: 樣式和測試 (20 分鐘)
1. 編寫 schedule.css
   - 列表樣式
   - 日曆樣式
   - 表單樣式
   - 響應式設計
2. 測試各個功能
3. 修復 bug

## 🎨 UI/UX 設計指南

### 顏色方案
- 上課: 🟢 #28a745 (綠色)
- 停課: 🔴 #dc3545 (紅色)
- 調課: 🟡 #ffc107 (黃色)
- 待定: ⚪ #6c757d (灰色)

### 響應式斷點
- Desktop (1200px+): 並列視圖（列表 + 統計）
- Tablet (768px-1199px): 堆疊視圖
- Mobile (<768px): 單列堆疊

### 交互反饋
- Hover: 卡片升起
- Active: 色彩高亮
- Loading: Spinner 動畫
- Error: 紅色提示

## 📝 代碼範例

### useSchedule Hook 使用

```typescript
const { schedules, loading, error, create, update, delete } = useSchedule(classId);

// 新增開課記錄
const handleCreate = async (data) => {
  await create(data);
  // 自動刷新列表
};

// 更新狀態
const handleUpdate = async (scheduleId, status, reason) => {
  await update(scheduleId, { status, cancellation_reason: reason });
};
```

### API 集成

```typescript
import { scheduleService } from "@/services/scheduleService";

// 獲取記錄
const schedules = await scheduleService.getSchedules(classId, startDate, endDate);

// 新增記錄
const result = await scheduleService.createSchedule({
  class_id: classId,
  scheduled_date: selectedDate,
  status: "上課" | "停課" | "調課",
  cancellation_reason: reason,
  rescheduled_to: newDate,
});
```

## ✅ 完成檢查清單

- [ ] 創建 `src/components/schedule/` 目錄
- [ ] 實現 ScheduleList.tsx
- [ ] 實現 ScheduleCard.tsx
- [ ] 實現 ScheduleCalendar.tsx
- [ ] 實現 ScheduleForm.tsx
- [ ] 實現 RescheduleModal.tsx
- [ ] 實現 ScheduleStats.tsx
- [ ] 編寫 schedule.css
- [ ] 編寫 schedule/index.ts
- [ ] 更新 ScheduleManagement.tsx
- [ ] TypeScript 檢查通過
- [ ] 構建成功
- [ ] 測試功能完整
- [ ] 響應式設計驗證
- [ ] Git 提交
- [ ] 部署到生產

## 📌 時間估計

| 任務 | 預計 | 優先度 |
|------|------|--------|
| 列表組件 | 20 分 | 🔴 P1 |
| 日曆組件 | 20 分 | 🟡 P2 |
| 表單組件 | 15 分 | 🔴 P1 |
| 主頁集成 | 20 分 | 🔴 P1 |
| 樣式/測試 | 25 分 | 🔴 P1 |
| **總計** | **~2 小時** | — |

---

**狀態**: 📋 規劃階段  
**開始時間**: 待定  
**預計完成**: ~19:30 (2026-07-27)

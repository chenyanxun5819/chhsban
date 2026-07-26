---
date: 2026-07-27
target: Phase 3.2 快速啟動
duration: ~2 小時
---

# ⚡ Phase 3.2 - 快速啟動指南

## 🚀 5 分鐘快速開始

### 1️⃣ 目錄結構 (1 分鐘)

```bash
cd d:\chhsban\tution-portal

# 創建 schedule 組件目錄
mkdir -p src/components/schedule
```

### 2️⃣ 建立空框架文件 (2 分鐘)

```bash
# 創建所有組件文件
touch src/components/schedule/ScheduleList.tsx
touch src/components/schedule/ScheduleCard.tsx
touch src/components/schedule/ScheduleCalendar.tsx
touch src/components/schedule/ScheduleForm.tsx
touch src/components/schedule/RescheduleModal.tsx
touch src/components/schedule/ScheduleStats.tsx
touch src/components/schedule/schedule.css
touch src/components/schedule/index.ts
```

### 3️⃣ 啟動開發服務器 (2 分鐘)

```bash
npm run dev
# 瀏覽器打開 http://localhost:5173
```

## 📋 實施順序（推薦）

### 優先級 1: 核心列表功能 ⭐⭐⭐

**時間**: 40 分鐘

1. **ScheduleList.tsx** (20 分)
   - State: schedules, loading, filters
   - Effects: 獲取開課記錄
   - Handlers: 搜尋、篩選、編輯、刪除
   - Render: 調用 ScheduleCard

2. **ScheduleCard.tsx** (10 分)
   - Props: schedule object
   - Display: 日期、狀態、出勤率
   - Buttons: 編輯、刪除

3. **集成到 ScheduleManagement.tsx** (10 分)
   - import ScheduleList
   - 設置路由和狀態

### 優先級 2: 日曆視圖 (可選)

**時間**: 25 分鐘

1. **ScheduleCalendar.tsx**
   - 簡化版日曆（不使用外部庫）
   - 月份導航
   - 事件標記

### 優先級 3: 表單和彈窗

**時間**: 25 分鐘

1. **ScheduleForm.tsx**
2. **RescheduleModal.tsx**

### 優先級 4: 統計和樣式

**時間**: 30 分鐘

1. **ScheduleStats.tsx**
2. **schedule.css** (完整樣式)
3. 響應式測試

## 💡 關鍵代碼片段

### ScheduleList.tsx 骨架

```typescript
import React, { useEffect, useState } from "react";
import { useSchedule } from "@/hooks";
import { ScheduleCard } from "./ScheduleCard";

interface ScheduleListProps {
  classId: string;
}

export const ScheduleList: React.FC<ScheduleListProps> = ({ classId }) => {
  const { schedules, loading, error } = useSchedule(classId);
  const [filters, setFilters] = useState({ status: "", dateRange: "" });

  // 篩選邏輯
  const filtered = schedules.filter((s) => {
    if (filters.status && s.status !== filters.status) return false;
    return true;
  });

  if (loading) return <div>載入中...</div>;
  if (error) return <div>錯誤: {error}</div>;

  return (
    <div className="schedule-list">
      {/* 搜尋和篩選控件 */}
      <div className="list-controls">
        {/* 實現篩選 */}
      </div>

      {/* 列表 */}
      <div className="schedule-cards">
        {filtered.map((schedule) => (
          <ScheduleCard
            key={schedule.schedule_id}
            schedule={schedule}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        ))}
      </div>
    </div>
  );
};
```

### ScheduleCard.tsx 骨架

```typescript
import React from "react";
import type { TutionSchedule } from "@/types";

interface ScheduleCardProps {
  schedule: TutionSchedule;
  onEdit: (scheduleId: string) => void;
  onDelete: (scheduleId: string) => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
}) => {
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      上課: "🟢 上課",
      停課: "🔴 停課",
      調課: "🟡 調課",
    };
    return labels[status] || status;
  };

  return (
    <div className="schedule-card">
      <div className="card-date">
        {new Date(schedule.scheduled_date).toLocaleDateString("zh-TW")}
      </div>
      <div className="card-status">{getStatusLabel(schedule.status)}</div>
      <div className="card-actions">
        <button onClick={() => onEdit(schedule.schedule_id)}>編輯</button>
        <button onClick={() => onDelete(schedule.schedule_id)}>刪除</button>
      </div>
    </div>
  );
};
```

### schedule/index.ts

```typescript
export { ScheduleList } from "./ScheduleList";
export { ScheduleCard } from "./ScheduleCard";
export { ScheduleCalendar } from "./ScheduleCalendar";
export { ScheduleForm } from "./ScheduleForm";
export { RescheduleModal } from "./RescheduleModal";
export { ScheduleStats } from "./ScheduleStats";
```

### schedule.css 起始模板

```css
/* 列表容器 */
.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* 控件 */
.list-controls {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

/* 卡片網格 */
.schedule-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

/* 卡片 */
.schedule-card {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.schedule-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-date {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.card-status {
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

/* 響應式 */
@media (max-width: 768px) {
  .schedule-cards {
    grid-template-columns: 1fr;
  }

  .list-controls {
    flex-direction: column;
  }
}
```

## 🎯 日程表

| 時間 | 任務 | 代碼 |
|------|------|------|
| 00:00-00:10 | 設置目錄和文件 | 準備 |
| 00:10-00:30 | ScheduleList + ScheduleCard | P1 |
| 00:30-00:50 | 集成到主頁面 | P1 |
| 00:50-01:15 | ScheduleForm + Modal | P1 |
| 01:15-01:45 | 樣式和響應式 | P1 |
| 01:45-01:55 | 測試和修復 | P1 |
| 01:55-02:00 | 提交和部署 | ✅ |

## 🧪 測試清單

- [ ] 列表載入 ✓
- [ ] 搜尋功能 ✓
- [ ] 篩選功能 ✓
- [ ] 編輯彈窗 ✓
- [ ] 刪除確認 ✓
- [ ] 新增記錄 ✓
- [ ] 桌機響應式 ✓
- [ ] 手機響應式 ✓
- [ ] TypeScript 檢查 ✓
- [ ] 構建成功 ✓

## 📞 常見問題

**Q: 日曆組件要用什麼庫？**  
A: 推薦自建簡單版本（30 行 CSS + 50 行 JS），react-big-calendar 太重。

**Q: 如何獲取開課記錄？**  
A: 使用 `useSchedule(classId)` Hook，它已經內置了 API 調用邏輯。

**Q: 如何刪除記錄？**  
A: 使用 `scheduleService.deleteSchedule(scheduleId)`。

**Q: 調課如何實現？**  
A: 標記狀態為「調課」，並填入新日期和原因。

## 🚀 GO!

準備好了嗎？開始實施吧！

```bash
# 開發環境啟動
npm run dev

# 另一個終端：監控類型檢查
npm run type-check -- --watch

# 第三個終端：Git 準備
git status
git add -u  # 暫存已修改文件
```

**預期完成時間**: 2026-07-27 ~ 19:30  
**難度等級**: ⭐⭐ 中等

---

加油！💪

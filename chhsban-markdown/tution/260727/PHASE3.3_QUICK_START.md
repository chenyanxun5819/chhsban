# Phase 3.3 AttendanceSheet - 快速啟動指南 ⚡

**預計時間**: 1 小時  
**複雜度**: ⭐⭐ 中級  
**優先級**: 🔥 高

---

## 📋 概述

Phase 3.3 將實現快速點名系統，允許老師記錄學生出席狀態。

### 功能清單
- ✅ 出席記錄表格 (表單式點名)
- ✅ 狀態選擇 (出席、遲到、缺席)
- ✅ 批量操作 (全選、反選)
- ✅ 實時保存
- ✅ 點名歷史
- ✅ 統計摘要

---

## 🏗️ 架構設計

### 新增組件

```
src/components/attendance/
  ├── AttendanceSheet.tsx      (主表格組件 - 120 行)
  ├── AttendanceRow.tsx         (單個學生行 - 60 行)
  ├── AttendanceStats.tsx       (統計摘要 - 80 行)
  ├── attendance.css            (樣式表 - 300+ 行)
  └── index.ts                  (導出文件)
```

### 主頁面修改

```
src/pages/AttendanceManagement/
  └── AttendanceManagement.tsx  (頁面組件 - 將新增)
```

### 類型定義 (已有)

```typescript
interface TutionAttendance {
  attendance_id: string;
  schedule_id: string;
  class_id: string;
  student_id: string;
  status: AttendanceStatus;      // "present" | "absent" | "late"
  recorded_at: number;
  created_at: number;
  updated_at: number;
}

interface TutionRoster {
  roster_id: string;
  class_id: string;
  student_id: string;
  student_no: string;
  name_cn: string;
  // ... other fields
}
```

---

## 📝 實施步驟

### Step 1: 建立元件目錄
```bash
mkdir -p src/components/attendance
```

### Step 2: 創建 AttendanceRow 組件 (60 行)
```typescript
interface AttendanceRowProps {
  student: TutionRoster;
  attendance?: TutionAttendance;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  loading?: boolean;
}

// 功能:
// - 顯示學生姓名和學號
// - 狀態選擇按鈕 (出席/遲到/缺席)
// - 加載狀態
// - 選擇複選框
```

### Step 3: 創建 AttendanceSheet 組件 (120 行)
```typescript
interface AttendanceSheetProps {
  schedule: TutionSchedule;
  roster: TutionRoster[];
  onSubmit: (attendanceData: TutionAttendance[]) => Promise<void>;
}

// 功能:
// - 排期信息頭部
// - 學生列表表格
// - 批量操作工具欄 (全選/反選/清除)
// - 提交按鈕
```

### Step 4: 創建 AttendanceStats 組件 (80 行)
```typescript
interface AttendanceStatsProps {
  attendance: TutionAttendance[];
  roster: TutionRoster[];
}

// 功能:
// - 出席人數
// - 缺席人數
// - 遲到人數
// - 出席率百分比
// - 簡單圖表
```

### Step 5: 實施樣式表 (300+ 行)
```css
/* 主要樣式 */
.attendance-sheet          /* 容器 */
.attendance-row            /* 學生行 */
.status-button             /* 狀態按鈕 */
.status-present            /* 出席樣式 */
.status-absent             /* 缺席樣式 */
.status-late               /* 遲到樣式 */
.attendance-stats          /* 統計卡片 */
```

### Step 6: 實施主頁面 (150 行)
```typescript
interface AttendanceManagementState {
  schedule: TutionSchedule | null;
  roster: TutionRoster[];
  attendance: TutionAttendance[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

// 流程:
// 1. 用戶從排期列表點擊「點名」
// 2. 進入點名頁面，加載該排期的學生名單
// 3. 老師逐一選擇每位學生的狀態
// 4. 點擊提交保存
// 5. 顯示確認和統計
```

---

## 🔌 API 集成

### 需要的 API 端點

```bash
# 獲取排期的學生名單
GET /api/v1/rosters?class={classId}&status=active

# 保存點名記錄
POST /api/v1/attendance
Body: { attendance: TutionAttendance[] }

# 更新單條點名
PUT /api/v1/attendance/{attendanceId}
Body: { status: AttendanceStatus }

# 獲取點名歷史
GET /api/v1/attendance?schedule={scheduleId}
```

---

## 💻 代碼框架

### AttendanceRow 框架
```typescript
const AttendanceRow: React.FC<AttendanceRowProps> = ({
  student,
  attendance,
  onStatusChange,
  loading = false,
}) => {
  const [selected, setSelected] = useState(false);
  const currentStatus = attendance?.status || "absent";

  return (
    <div className="attendance-row">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => setSelected(e.target.checked)}
      />
      <div className="student-info">
        <span className="student-no">{student.student_no}</span>
        <span className="student-name">{student.name_cn}</span>
      </div>
      <div className="status-buttons">
        <button 
          className={`status-btn ${currentStatus === 'present' ? 'active' : ''}`}
          onClick={() => onStatusChange(student.student_id, 'present')}
          disabled={loading}
        >
          ✓ 出席
        </button>
        <button
          className={`status-btn ${currentStatus === 'late' ? 'active' : ''}`}
          onClick={() => onStatusChange(student.student_id, 'late')}
          disabled={loading}
        >
          ⏱ 遲到
        </button>
        <button
          className={`status-btn ${currentStatus === 'absent' ? 'active' : ''}`}
          onClick={() => onStatusChange(student.student_id, 'absent')}
          disabled={loading}
        >
          ✕ 缺席
        </button>
      </div>
    </div>
  );
};
```

### AttendanceSheet 框架
```typescript
const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  schedule,
  roster,
  onSubmit,
}) => {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(false);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = roster.map(student => ({
        schedule_id: schedule.schedule_id,
        class_id: schedule.class_id,
        student_id: student.student_id,
        status: attendance[student.student_id] || 'absent',
      }));
      await onSubmit(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="attendance-sheet">
      {/* 排期頭部 */}
      {/* 工具欄 */}
      {/* 學生列表 */}
      {/* 統計 */}
      {/* 提交按鈕 */}
    </div>
  );
};
```

---

## ✨ 功能細節

### 1. 點名狀態
```typescript
enum AttendanceStatus {
  Present = "present",    // ✓ 出席
  Absent = "absent",      // ✕ 缺席
  Late = "late",          // ⏱ 遲到
}
```

### 2. 快速操作
```typescript
// 全選出席
handleSelectAll('present')

// 反選 (出席 ↔ 缺席)
handleToggleAll()

// 清除 (全部設為缺席)
handleClearAll()
```

### 3. 實時保存選項
```typescript
// 選項 A: 逐個保存 (推薦用於小班)
onStatusChange() → API POST

// 選項 B: 批量保存 (推薦用於大班)
handleSubmit() → API POST 批量數據
```

### 4. 統計摘要
```
出席: 28 人 (80%)   [綠色]
遲到: 5 人  (14%)   [黃色]
缺席: 2 人  (6%)    [紅色]
───────────────────
總計: 35 人
```

---

## 📊 時間分配

| 任務 | 時間 | 說明 |
|------|------|------|
| 組件框架 | 15 分 | AttendanceRow, AttendanceSheet |
| 樣式設計 | 20 分 | CSS 樣式表和響應式設計 |
| API 整合 | 15 分 | 連接後端 API |
| 測試和修復 | 10 分 | 類型檢查和構建 |
| **總計** | **60 分** | **1 小時** |

---

## 🧪 測試檢查清單

- [ ] TypeScript 類型檢查: `npm run type-check`
- [ ] 生產構建: `npm run build`
- [ ] 本地開發測試: `npm run dev`
- [ ] 響應式設計測試 (手機/平板)
- [ ] 點名功能測試:
  - [ ] 逐個選擇狀態
  - [ ] 全選功能
  - [ ] 反選功能
  - [ ] 提交和保存
  - [ ] 錯誤處理

---

## 🚀 啟動命令

```bash
# 開始開發
npm run dev

# 檢查類型
npm run type-check

# 生產構建
npm run build

# 提交代碼
git add -A
git commit -m "feat: implement Phase 3.3 AttendanceSheet"
git push origin master
```

---

## 📚 相關文件

- **類型定義**: `src/types/index.ts`
- **Hook**: `src/hooks/useAttendance.ts` (需要新建)
- **API**: `src/utils/api.ts` (已有)
- **佈局**: `src/components/common/Layout.tsx` (已有)

---

## ✅ 完成標記

啟動時間: **2026-07-27 預計 15:00**  
預期完成: **2026-07-27 預計 16:00**  
狀態: 🟡 待啟動

---

**下一個 Phase**: Phase 3.4 RosterManagement (1.75 小時)

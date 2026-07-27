# Phase 3.4 RosterManagement - 快速啟動指南 ⚡

**預計時間**: 1.75 小時  
**複雜度**: ⭐⭐⭐ 中高級  
**優先級**: 🔥 高

---

## 📋 概述

Phase 3.4 將實現學生名單管理系統，允許老師管理補習班的學生。

### 功能清單
- ✅ 學生名單表格 (搜尋、篩選、分頁)
- ✅ 新增學生
- ✅ 移除學生
- ✅ 批量匯入 (CSV)
- ✅ 批量匯出 (CSV)
- ✅ 狀態管理 (active, dropped)
- ✅ 統計摘要

---

## 🏗️ 架構設計

### 新增組件

```
src/components/roster/
  ├── RosterTable.tsx           (主表格組件 - 180 行)
  ├── RosterRow.tsx             (單個學生行 - 80 行)
  ├── RosterForm.tsx            (新增/編輯表單 - 120 行)
  ├── ImportModal.tsx           (匯入對話框 - 100 行)
  ├── RosterStats.tsx           (統計摘要 - 70 行)
  ├── roster.css                (樣式表 - 400+ 行)
  └── index.ts                  (導出文件)
```

### 主頁面修改

```
src/pages/RosterManagement/
  └── RosterManagement.tsx      (頁面組件 - 150 行)
```

### 類型定義 (已有)

```typescript
interface TutionRoster {
  roster_id: string;
  class_id: string;
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  input_class_name: string;
  status: RosterStatus;          // "initial" | "active" | "dropped"
  added_at: number;
  dropped_at?: number;
  created_at: number;
  updated_at: number;
}

type RosterStatus = "initial" | "active" | "dropped";
```

---

## 📝 實施步驟

### Step 1: 建立元件目錄
```bash
mkdir -p src/components/roster
```

### Step 2: 創建 RosterRow 組件 (80 行)
```typescript
interface RosterRowProps {
  student: TutionRoster;
  onEdit: (student: TutionRoster) => void;
  onRemove: (studentId: string) => void;
  loading?: boolean;
}

// 功能:
// - 顯示學號、姓名、班級、狀態
// - 編輯按鈕
// - 移除按鈕
// - 狀態徽章 (active/dropped)
```

### Step 3: 創建 RosterTable 組件 (180 行)
```typescript
interface RosterTableProps {
  roster: TutionRoster[];
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  onEdit: (student: TutionRoster) => void;
  onRemove: (studentId: string) => Promise<void>;
  loading?: boolean;
}

// 功能:
// - 搜尋欄 (姓名、學號)
// - 篩選標籤 (全部、活躍、已移除)
// - 分頁控制
// - 學生列表
// - 統計信息
// - 工具欄 (新增、匯入、匯出)
```

### Step 4: 創建 RosterForm 組件 (120 行)
```typescript
interface RosterFormProps {
  student?: TutionRoster;
  onSubmit: (data: Partial<TutionRoster>) => Promise<void>;
  onCancel: () => void;
}

// 功能:
// - 學號輸入
// - 姓名輸入 (中文、英文)
// - 班級選擇
// - 表單驗證
// - 提交/取消按鈕
```

### Step 5: 創建 ImportModal 組件 (100 行)
```typescript
interface ImportModalProps {
  show: boolean;
  onConfirm: (file: File) => Promise<void>;
  onClose: () => void;
}

// 功能:
// - 檔案選擇
// - CSV 預覽
// - 確認導入
// - 進度提示
// - 錯誤處理
```

### Step 6: 創建 RosterStats 組件 (70 行)
```typescript
interface RosterStatsProps {
  roster: TutionRoster[];
}

// 功能:
// - 總人數
// - 活躍人數
// - 已移除人數
// - 百分比
```

### Step 7: 實施樣式表 (400+ 行)
```css
/* 主要樣式 */
.roster-table              /* 容器 */
.roster-header             /* 頭部 */
.roster-row                /* 學生行 */
.roster-stats              /* 統計卡片 */
.import-modal              /* 匯入對話框 */
.form-fields               /* 表單欄位 */
```

### Step 8: 實施主頁面 (150 行)
```typescript
interface RosterManagementState {
  roster: TutionRoster[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  showForm: boolean;
  showImport: boolean;
  editingStudent: TutionRoster | null;
}

// 流程:
// 1. 加載該課堂的學生名單
// 2. 顯示表格，允許搜尋和篩選
// 3. 支持新增、編輯、移除學生
// 4. 支持批量匯入/匯出
// 5. 實時統計更新
```

---

## 🔌 API 集成

### 需要的 API 端點

```bash
# 獲取學生名單
GET /api/v1/rosters?class={classId}&status={status}

# 新增學生
POST /api/v1/rosters
Body: { class_id, student_no, name_cn, name_en, input_class_name }

# 編輯學生
PUT /api/v1/rosters/{rosterId}
Body: { name_cn, name_en, input_class_name }

# 移除學生
DELETE /api/v1/rosters/{rosterId}

# 批量匯入
POST /api/v1/rosters/bulk/import
Body: FormData (CSV file)

# 批量匯出
GET /api/v1/rosters/export?class={classId}
Response: CSV file
```

---

## 💻 代碼框架

### RosterRow 框架
```typescript
const RosterRow: React.FC<RosterRowProps> = ({
  student,
  onEdit,
  onRemove,
  loading = false,
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRemove = async () => {
    if (confirm("確認移除此學生？")) {
      await onRemove(student.student_id);
      setShowConfirm(false);
    }
  };

  return (
    <tr className={`roster-row status-${student.status}`}>
      <td className="student-no">{student.student_no}</td>
      <td className="student-name">{student.name_cn}</td>
      <td className="student-name-en">{student.name_en}</td>
      <td className="input-class">{student.input_class_name}</td>
      <td className="status-cell">
        <span className={`status-badge status-${student.status}`}>
          {student.status === 'active' ? '活躍' : '已移除'}
        </span>
      </td>
      <td className="actions">
        <button onClick={() => onEdit(student)} disabled={loading}>
          編輯
        </button>
        <button onClick={handleRemove} disabled={loading}>
          移除
        </button>
      </td>
    </tr>
  );
};
```

### RosterTable 框架
```typescript
const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onAdd,
  onImport,
  onExport,
  onEdit,
  onRemove,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<RosterStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  
  const itemsPerPage = 20;

  const filteredRoster = useMemo(() => {
    return roster.filter(student => {
      const matchSearch = 
        student.name_cn.includes(searchQuery) ||
        student.student_no.includes(searchQuery);
      const matchStatus = 
        filterStatus === 'all' || student.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [roster, searchQuery, filterStatus]);

  const paginatedRoster = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return filteredRoster.slice(start, start + itemsPerPage);
  }, [filteredRoster, page]);

  return (
    <div className="roster-table">
      {/* 搜尋和篩選 */}
      {/* 表格 */}
      {/* 分頁 */}
      {/* 統計 */}
    </div>
  );
};
```

---

## ✨ 功能細節

### 1. 搜尋功能
```typescript
// 同時搜尋姓名和學號
const handleSearch = (query: string) => {
  setSearchQuery(query.toLowerCase());
  setPage(1);  // 重置頁碼
};
```

### 2. 狀態篩選
```typescript
enum RosterStatus {
  Initial = "initial",    // 初始
  Active = "active",      // 活躍
  Dropped = "dropped",    // 已移除
}
```

### 3. 批量操作
```typescript
// 匯入 CSV
handleImport(file: File) -> uploadCSV()

// 匯出 CSV
handleExport() -> downloadCSV()
```

### 4. 分頁
```typescript
// 每頁 20 個學生
const totalPages = Math.ceil(filteredRoster.length / 20);
```

---

## 📊 時間分配

| 任務 | 時間 | 說明 |
|------|------|------|
| 組件框架 | 30 分 | RosterRow, RosterTable, 其他組件 |
| 樣式設計 | 30 分 | CSS 樣式表和響應式設計 |
| API 整合 | 30 分 | 連接後端 API，實現 CRUD |
| 測試和修復 | 15 分 | 類型檢查、構建、測試 |
| **總計** | **105 分** | **1.75 小時** |

---

## 🧪 測試檢查清單

- [ ] TypeScript 類型檢查: `npm run type-check`
- [ ] 生產構建: `npm run build`
- [ ] 本地開發測試: `npm run dev`
- [ ] 搜尋功能測試
- [ ] 篩選功能測試
- [ ] 分頁功能測試
- [ ] 新增/編輯/移除測試
- [ ] 匯入/匯出測試
- [ ] 錯誤處理測試
- [ ] 移動裝置響應式測試

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
git commit -m "feat: implement Phase 3.4 RosterManagement"
git push origin master
```

---

## 📚 相關文件

- **類型定義**: `src/types/index.ts`
- **Hook**: `src/hooks/useRoster.ts` (需要新建)
- **API**: `src/utils/api.ts` (已有)
- **佈局**: `src/components/common/Layout.tsx` (已有)

---

## ✅ 完成標記

啟動時間: **2026-07-27 預計 16:00**  
預期完成: **2026-07-27 預計 17:45**  
狀態: 🟡 待啟動

---

**下一個 Phase**: Phase 3.5 Analytics (2 小時)

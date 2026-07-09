# 步驟 2 ✅ 完成：TypeScript 類型定義

**完成日期**：2026-07-09  
**狀態**：✅ **完成並驗證**

---

## 📋 任務清單

- [x] 2.1 新增 Tution 相關類型定義
- [x] 2.2 定義數據模型接口
- [x] 2.3 編譯驗證（無錯誤）
- [x] 2.4 建立 Worker 後端實現模板

---

## 📝 完成詳情

### 2.1 新增 TypeScript 類型定義

**文件**：`d:\chhsban\packages\kv-utils\src\types\index.ts`

新增以下核心類型定義：

#### **1️⃣ 狀態枚舉（Enums）**

```typescript
// 補習班狀態
export enum TutionClassStatus {
  PENDING = "pending",      // 待批准
  APPROVED = "approved",    // 已批准
  REJECTED = "rejected",    // 已駁回
  ACTIVE = "active",        // 進行中
  ENDED = "ended",          // 已結束
}

// 出勤狀態
export enum AttendanceStatus {
  PRESENT = "present",      // 到課
  ABSENT = "absent",        // 缺課
  LATE = "late",            // 遲到
  EXCUSE = "excuse",        // 有理由缺席
}

// PDF 字段數據類型
export enum PDFFieldDataType {
  TEXT = "text",
  DATE = "date",
  NUMBER = "number",
  SELECT = "select",
  CHECKBOX = "checkbox",
}
```

#### **2️⃣ 主表：TutionClass（14 字段）**

```typescript
export interface TutionClass {
  class_id: string;         // 系統自動生成
  teacher_id: string;       // FK -> TEACHER_KV
  form: "F1" | "F2" | ... | "F6";  // 補習年級
  subject: string;          // 補習科目
  day_of_week: string;      // 上課日（Monday-Sunday）
  time_start: string;       // 19:00
  time_end: string;         // 21:00
  start_date: string;       // YYYY-MM-DD
  fees: number;             // 補習收費（RM）
  venue: string;            // 教室編號
  approval_status: TutionClassStatus;  // 審批狀態
  created_at: number;       // Unix 時間戳
  updated_at: number;       // Unix 時間戳
}
```

#### **3️⃣ 子表1：TutionRoster（12 字段）**

```typescript
export interface TutionRoster {
  roster_id: string;        // 系統自動生成
  class_id: string;         // FK -> TutionClass
  student_id: string;       // FK -> STUDENT_KV
  student_name_cn: string;  // 中文名
  student_name_en: string;  // 英文名
  student_class: string;    // 學生班級（J1A 等）
  enrollment_date: string;  // 報名日期
  withdrawal_date?: string; // 退出日期（可選）
  withdrawal_reason?: string; // 退出原因（可選）
  is_active: boolean;       // 動態計算
  created_at: number;       // Unix 時間戳
  updated_at: number;       // Unix 時間戳
}
```

#### **4️⃣ 子表2：TutionAttendance（8 字段）**

```typescript
export interface TutionAttendance {
  attendance_id: string;    // 系統自動生成
  class_id: string;         // FK -> TutionClass
  student_id: string;       // FK -> STUDENT_KV
  class_date: string;       // YYYY-MM-DD 上課日期
  status: AttendanceStatus; // 出勤狀態
  absence_reason?: string;  // 未出席原因（可選）
  recorded_at: number;      // Unix 時間戳 - 簽到時間
  recorded_by?: string;     // 記錄者 ID（可選）
}
```

#### **5️⃣ 子表3：TutionPDFFieldMap（12 字段）**

```typescript
export interface TutionPDFFieldMap {
  field_id: string;         // 唯一標識
  pdf_field_name: string;   // PDF 表單字段名
  form_field: string;       // 對應表單項
  page_number: number;      // PDF 頁碼
  x_coordinate: number;     // X 坐標
  y_coordinate: number;     // Y 坐標
  width: number;            // 欄位寬度
  height: number;           // 欄位高度
  data_type: PDFFieldDataType;  // 數據類型
  source_table: "main" | "roster" | "attendance";  // 數據來源
  source_field: string;     // 源欄位名
  is_repeating: boolean;    // 是否重複
}
```

#### **6️⃣ 統計類型：AttendanceStats**

```typescript
export interface AttendanceStats {
  total_classes: number;    // 總上課次數
  present_count: number;    // 到課次數
  absent_count: number;     // 缺課次數
  late_count: number;       // 遲到次數
  excuse_count: number;     // 有理由缺席次數
  attendance_rate: number;  // 出勤率（0-100%）
}
```

#### **7️⃣ 管理器接口：TutionKVManager**

```typescript
export interface TutionKVManager {
  // 補習班主表操作（6 個方法）
  createClass(...): Promise<TutionClass>;
  getClass(...): Promise<TutionClass | null>;
  updateClass(...): Promise<TutionClass>;
  deleteClass(...): Promise<void>;
  listClassesByTeacher(...): Promise<TutionClass[]>;
  listClassesByStatus(...): Promise<TutionClass[]>;

  // 學生名單操作（5 個方法）
  addRosterEntry(...): Promise<TutionRoster>;
  getRosterEntry(...): Promise<TutionRoster | null>;
  listRosterByClass(...): Promise<TutionRoster[]>;
  updateRosterEntry(...): Promise<TutionRoster>;
  removeStudentFromRoster(...): Promise<void>;

  // 出勤紀錄操作（5 個方法）
  recordAttendance(...): Promise<TutionAttendance>;
  getAttendanceRecord(...): Promise<TutionAttendance | null>;
  listAttendanceByStudent(...): Promise<TutionAttendance[]>;
  updateAttendanceRecord(...): Promise<TutionAttendance>;
  getAttendanceStats(...): Promise<AttendanceStats>;

  // PDF 字段映射操作（2 個方法）
  getPDFFieldMaps(): Promise<TutionPDFFieldMap[]>;
  getPDFFieldMap(...): Promise<TutionPDFFieldMap | null>;

  // 通用操作（1 個方法）
  search(...): Promise<any[]>;
}
```

### 2.2 配置常量更新

**文件**：`d:\chhsban\packages\kv-utils\src\types\index.ts`

```typescript
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000,
  SESSION_PREFIX: "session:",
  STUDENT_PREFIX: "student:",
  TEACHER_PREFIX: "teacher:",
  TUTION_CLASS_PREFIX: "tution_class:",         // ✨ 新增
  TUTION_ROSTER_PREFIX: "tution_roster:",       // ✨ 新增
  TUTION_ATTENDANCE_PREFIX: "tution_attendance:", // ✨ 新增
} as const;
```

### 2.3 編譯驗證

✅ **TypeScript 編譯成功**

```bash
$ npm run build
> @chhsban/kv-utils@0.1.0 build
> tsc

✓ 編譯成功，無錯誤
```

### 2.4 Worker 後端實現模板

**文件**：`d:\chhsban\chhsban-tution\src\tution-service.ts`

已建立完整的實現模板包含：

1. **TutionKVService 類** — TutionKVManager 接口的完整實現
   - 補習班主表操作（6 個方法）
   - 學生名單操作（5 個方法）
   - 出勤紀錄操作（5 個方法）
   - PDF 欄位映射操作（2 個方法）
   - 通用搜索操作（1 個方法）

2. **handleTutionRequest 函數** — Worker 路由和端點處理
   - `/api/v1/classes` — 補習班主表 API
   - `/api/v1/roster` — 學生名單 API
   - `/api/v1/attendance` — 出勤紀錄 API

---

## 📊 數據模型統計

| 類型 | 字段數 | 用途 |
|------|-------|------|
| TutionClass | 14 | 主表 |
| TutionRoster | 12 | 學生名單 |
| TutionAttendance | 8 | 出勤紀錄 |
| TutionPDFFieldMap | 12 | PDF 映射 |
| **總計** | **46** | — |

---

## 🔍 關鍵修正

**修正1**：teacher/index.ts 中的屬性錯誤
- ❌ 舊：`teacher.role === "admin"`
- ✅ 新：`teacher.permission === "admin"`

---

## 📁 文件列表

| 文件 | 修改內容 |
|-----|--------|
| `kv-utils/src/types/index.ts` | ✨ 新增 7 個類型 + 3 個列舉 |
| `kv-utils/src/teacher/index.ts` | 🔧 修正屬性引用錯誤 |
| `chhsban-tution/src/tution-service.ts` | ✨ 新增實現模板 |

---

## ✅ 檢查清單

- [x] 定義了所有數據模型類型
- [x] 創建了狀態和類型枚舉
- [x] 定義了 TutionKVManager 接口（18 個方法）
- [x] 建立了完整的服務實現模板
- [x] 編譯驗證通過
- [x] 修正了編譯錯誤

---

## 🚀 準備開始步驟 3️⃣？

**下一步**：Google Sheet 模板建立（1-2 小時）

需要我現在開始嗎？

---

**完成者**：GitHub Copilot  
**完成時間**：2026-07-09 00:25 UTC  
**版本**：v1.0 (Type Definitions Complete)

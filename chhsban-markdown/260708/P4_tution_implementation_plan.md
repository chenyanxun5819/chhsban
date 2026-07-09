# P4 補習系統實施計劃

**計劃建立日期**：2026-07-08  
**計劃版本**：v1.0  
**狀態**：規劃中

---

## 📌 快速導覽

- [當前進度](#當前進度)
- [系統架構](#系統架構)
- [數據模型設計](#數據模型設計)
- [實施步驟詳細計畫](#實施步驟詳細計畫)
- [並行工作計劃](#並行工作計劃)
- [檢查清單](#檢查清單)

---

## 當前進度

- P0~P2：已初步完成
- 新增功能：教師管理頁面
- 目標：跳過 P3（公文系統），直接執行 P4（補習系統）

---

## 系統架構

### KV 和 Google Sheet 的角色分工

```
【Cloudflare Workers 後端】
    ↓
[TUTION_CLASS_KV]          ← 補習班主記錄
[TUTION_ROSTER_KV]        ← 學生名單  
[TUTION_ATTENDANCE_KV]    ← 出勤紀錄
    ↓
  API 層
    ↓
┌──────────────────┬──────────────────┐
↓                  ↓
Google Sheet       PDF 生成
（人工協作）       （自動化輸出）
```

### 三個 KV 的用途

| KV | 內容 | 讀寫頻率 | 用途 |
|----|------|--------|------|
| **TUTION_CLASS_KV** | 補習班主檔 | 低（申報時） | 存儲補習班基本信息 |
| **TUTION_ROSTER_KV** | 學生名單 | 中（經常查） | 存儲參加補習班的學生 |
| **TUTION_ATTENDANCE_KV** | 出勤記錄 | 高（每堂課） | 存儲每堂課的出勤情況 |

**為什麼要分成 3 個 KV？**
1. **性能優化** — 出勤紀錄量大，分開存儲避免查詢時掃描整個大表
2. **訪問控制** — 不同的權限邊界（教師只能看自己的班級）
3. **備份策略** — 可單獨備份或清理舊出勤數據
4. **跨系統共享** — TUTION_CLASS_KV 將來可能被多個 Worker 共用

### Google Sheet 的用途

- 教師**人工檢視和編輯**
- 數據**備份和審計跟踪**
- 便於**非技術人員**操作
- 支持**公式、驗證、評論**

**核心概念**：KV 是系統的"心臟"（快速讀寫），Google Sheet 是系統的"眼睛"（人工協作）

---

## 數據模型設計

### 主表：1 個 — 補習班開課表 (Tution Class)

| 字段 | 類型 | 說明 |
|------|------|------|
| class_id | string | 系統自動生成 |
| teacher_id | string | FK → TEACHER_KV |
| form | string | 補習年級（F1-F6） |
| subject | string | 補習科目 |
| day_of_week | string | 補習日期（Monday-Sunday） |
| time_start | string | 固定 19:00 |
| time_end | string | 固定 21:00 |
| start_date | date | 開課日期 |
| fees | number | 補習收費（RM） |
| venue | string | 使用地點（教室編號） |
| approval_status | enum | pending / approved / rejected / active / ended |
| created_at | timestamp | 系統生成 |
| updated_at | timestamp | 系統生成 |

### 子表 1：學生名單表 (Tution Roster)

| 字段 | 類型 | 說明 |
|------|------|------|
| roster_id | string | 系統自動生成 |
| class_id | string | FK → Tution Class |
| student_id | string | FK → STUDENT_KV |
| student_name_cn | string | 學生中文名 |
| student_name_en | string | 學生英文名 |
| student_class | string | 學生班級（如 J1A） |
| enrollment_date | date | 報名日期 |
| withdrawal_date | date | 退出日期（新增） |
| withdrawal_reason | string | 退出原因（新增） |
| is_active | boolean | 是否仍在補習班 |
| created_at | timestamp | 系統生成 |
| updated_at | timestamp | 系統生成 |

### 子表 2：學生出勤表 (Tution Attendance)

| 字段 | 類型 | 說明 |
|------|------|------|
| attendance_id | string | 系統自動生成 |
| class_id | string | FK → Tution Class |
| student_id | string | FK → Tution Roster |
| class_date | date | 上課日期 |
| status | enum | present / absent / late / excuse |
| absence_reason | string | 未出席原因（新增） |
| recorded_at | timestamp | 簽到時間 |
| recorded_by | string | 記錄者（教師ID） |

### 子表 3：PDF 字段映射表 (Tution PDF Field Map)

此表用於配合 pdf-lib 自動填充 Template_tution.pdf

| 字段 | 類型 | 說明 |
|------|------|------|
| field_id | string | 唯一標識 |
| pdf_field_name | string | PDF 表單字段名稱 |
| form_field | string | 對應的表單字段 |
| page_number | number | 頁碼 |
| x_coordinate | number | X 坐標 |
| y_coordinate | number | Y 坐標 |
| width | number | 寬度 |
| height | number | 高度 |
| data_type | string | text / date / number / select |
| source_table | string | 從哪個表取值（main / roster） |
| source_field | string | 源欄位名 |
| is_repeating | boolean | 是否重複填充（用於名單） |

---

## 實施步驟詳細計畫

### 🚀 步驟 1️⃣ ：設計 Cloudflare KV 命名空間

**依賴性**：無（並行起點）  
**預計時間**：1-2 小時

#### 1.1 新增 KV 配置

**文件**：`d:\chhsban\packages\cloudflare-config\src\kv-namespace.ts`

在 `KV_NAMESPACES` 對象中新增三個 KV 命名空間：

```typescript
TUTION_CLASS_KV: {
  binding: "TUTION_CLASS_KV",
  id: "xxx", // 待 Cloudflare 創建並填入
  description: "補習班開課記錄（主表）",
}
TUTION_ROSTER_KV: {
  binding: "TUTION_ROSTER_KV",
  id: "xxx", // 待 Cloudflare 創建並填入
  description: "補習班學生名單（子表1）",
}
TUTION_ATTENDANCE_KV: {
  binding: "TUTION_ATTENDANCE_KV",
  id: "xxx", // 待 Cloudflare 創建並填入
  description: "學生出勤紀錄（子表2）",
}
```

#### 1.2 在 Cloudflare 儀表板上創建命名空間

- 登入 Cloudflare Workers KV 儀表板
- 為每個命名空間建立預生產（preview）和生產環境版本
- 複製每個 ID 填回 1.1 中相應位置

#### 1.3 更新 wrangler 配置生成器

**文件**：`d:\chhsban\packages\cloudflare-config\src\workers.ts`

確認 `kvNamespaces` 陣列已包含新增的三個 KV 綁定

#### ✅ 驗證

```bash
cd d:\chhsban\packages\cloudflare-config
npm run generate:wrangler
# 檢查生成的 wrangler.toml 是否包含新的 KV 配置
```

---

### 📝 步驟 2️⃣ ：建立 TypeScript 類型定義

**依賴性**：無（並行起點）  
**預計時間**：2-3 小時

#### 2.1 新增 Tution 相關類型

**文件**：`d:\chhsban\packages\kv-utils\src\types\index.ts`

新增以下 TypeScript 介面：

```typescript
// ============= 補習班系統類型定義 =============

// 補習班開課記錄
export interface TutionClass {
  class_id: string;
  teacher_id: string;
  form: "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
  subject: string;
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  time_start: "19:00";
  time_end: "21:00";
  start_date: string; // YYYY-MM-DD
  fees: number; // RM
  venue: string;
  approval_status: "pending" | "approved" | "rejected" | "active" | "ended";
  created_at: number; // Unix timestamp
  updated_at: number;
}

// 補習班學生名單
export interface TutionRoster {
  roster_id: string;
  class_id: string;
  student_id: string;
  student_name_cn: string;
  student_name_en: string;
  student_class: string; // e.g., "J1A"
  enrollment_date: string; // YYYY-MM-DD
  withdrawal_date?: string; // YYYY-MM-DD
  withdrawal_reason?: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

// 學生出勤紀錄
export interface TutionAttendance {
  attendance_id: string;
  class_id: string;
  student_id: string;
  class_date: string; // YYYY-MM-DD
  status: "present" | "absent" | "late" | "excuse";
  absence_reason?: string;
  recorded_at: number; // Unix timestamp
  recorded_by: string; // teacher_id
}

// PDF 欄位映射
export interface TutionPDFFieldMap {
  field_id: string;
  pdf_field_name: string;
  form_field: string; // 表單項名稱
  page_number: number;
  x_coordinate: number;
  y_coordinate: number;
  width: number;
  height: number;
  data_type: "text" | "date" | "number" | "select";
  source_table: "main" | "roster" | "attendance";
  source_field: string;
  is_repeating: boolean;
  font_size?: number;
  font_color?: string;
}
```

#### 2.2 新增 KV 管理器介面

**文件**：`d:\chhsban\packages\kv-utils\src\types\index.ts`（或新檔 `tution.ts`）

```typescript
export interface TutionKVManager {
  // 補習班操作
  createClass(data: Omit<TutionClass, "class_id" | "created_at" | "updated_at">): Promise<TutionClass>;
  getClass(classId: string): Promise<TutionClass | null>;
  updateClass(classId: string, data: Partial<TutionClass>): Promise<TutionClass>;
  deleteClass(classId: string): Promise<void>;
  listClassesByTeacher(teacherId: string): Promise<TutionClass[]>;

  // 學生名單操作
  addStudent(data: Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">): Promise<TutionRoster>;
  getStudent(rosterId: string): Promise<TutionRoster | null>;
  updateStudent(rosterId: string, data: Partial<TutionRoster>): Promise<TutionRoster>;
  removeStudent(rosterId: string): Promise<void>;
  listStudentsByClass(classId: string, includeWithdrawn?: boolean): Promise<TutionRoster[]>;

  // 出勤操作
  recordAttendance(data: Omit<TutionAttendance, "attendance_id" | "recorded_at">): Promise<TutionAttendance>;
  getAttendance(attendanceId: string): Promise<TutionAttendance | null>;
  updateAttendance(attendanceId: string, data: Partial<TutionAttendance>): Promise<TutionAttendance>;
  listAttendanceByClass(classId: string, startDate?: string, endDate?: string): Promise<TutionAttendance[]>;
  getAttendanceRate(classId: string, studentId: string): Promise<number>;

  // PDF 映射
  loadPDFFieldMap(): Promise<TutionPDFFieldMap[]>;
}
```

#### ✅ 驗證

```bash
cd d:\chhsban\packages\kv-utils
npm run build
# 檢查是否有 TypeScript 編譯錯誤
```

---

### 🗂️ 步驟 3️⃣ ：建立 Google Sheet 模板

**依賴性**：無（並行起點）  
**預計時間**：1-2 小時

#### 3.1 建立 Google Sheet 結構

在 Google Drive 中建立新 Spreadsheet：
- **名稱**：`Tution Management System - 補習班管理系統`
- **共享範圍**：內部教師 + 系統管理員

建立三個工作簿：

**Sheet 1：Classes** — 補習班開課表

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| class_id | teacher_id | form | subject | day_of_week | time_start | time_end | start_date | fees | venue | approval_status |

**Sheet 2：Roster** — 學生名單

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| roster_id | class_id | student_id | student_name_cn | student_name_en | student_class | enrollment_date | withdrawal_date | withdrawal_reason | is_active | created_at | updated_at |

**Sheet 3：Attendance** — 出勤紀錄

| A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|
| attendance_id | class_id | student_id | class_date | status | absence_reason | recorded_at | recorded_by | remarks | created_at |

#### 3.2 設定欄位驗證和公式

在 Google Sheet 中為以下欄位設定下拉選項（Data Validation）：
- **approval_status**：pending, approved, rejected, active, ended
- **status**：present, absent, late, excuse
- **form**：F1, F2, F3, F4, F5, F6
- **day_of_week**：Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday

在 **is_active** 欄位設定公式：
```
=IF(ISBLANK(H2), TRUE, FALSE)
```

#### 3.3 設定共享和權限

- 獲取 Sheet ID（URL 中的 `/d/{SHEET_ID}/edit`）
- 生成 Google Sheets API 授權 token
- 設定檢視權限給教師（限制編輯）

#### ✅ 驗證

手動填寫測試數據，確認下拉選項和公式正確

---

### 📄 步驟 4️⃣ ：掃描並記錄 PDF 映射

**依賴性**：無（並行起點）  
**預計時間**：2-3 小時

#### 4.1 分析 Template_tution.pdf 結構

使用以下工具分析 PDF：

**選項 A：使用 pdf-lib 掃描**
```javascript
import { PDFDocument } from "pdf-lib";

const pdfBytes = fs.readFileSync("Template_tution.pdf");
const pdfDoc = await PDFDocument.load(pdfBytes);
const pages = pdfDoc.getPages();

pages.forEach((page, idx) => {
  const { width, height } = page.getSize();
  console.log(`Page ${idx + 1}: ${width} x ${height}px`);
});
```

**選項 B：使用 Adobe Acrobat/Reader 手動檢查**
- 開啟 PDF
- 檢查每個可填充欄位的名稱和位置
- 使用工具 > 準備表單 確認欄位

#### 4.2 記錄 PDF 欄位座標

建立檔案：`d:\chhsban\packages\kv-utils\src\config\tution-pdf-fields.json`

結構（JSON 格式）：
```json
{
  "template_version": "1.0",
  "template_name": "Template_tution",
  "template_pages": 2,
  "created_date": "2026-07-08",
  "fields": [
    {
      "field_id": "teacher_name",
      "pdf_field_name": "field_teacher_name",
      "form_field": "教師姓名",
      "page_number": 1,
      "x_coordinate": 150,
      "y_coordinate": 650,
      "width": 150,
      "height": 20,
      "data_type": "text",
      "source_table": "main",
      "source_field": "teacher_name_cn",
      "is_repeating": false,
      "font_size": 11,
      "font_color": "#000000"
    }
  ]
}
```

#### ✅ 驗證

手動驗證 3-5 個欄位的坐標是否正確

---

### ⚙️ 步驟 5️⃣ ：實現 Tution Worker 後端

**依賴性**：步驟 1、2、3、4（需要全部完成）  
**預計時間**：5-7 小時

#### 5.1 建立 Worker 項目結構

**路徑**：`d:\chhsban\chhsban-tution\src\`

```
src/
  ├── index.ts                    # 主入口、路由配置
  ├── types.ts                    # 引入 kv-utils 的類型
  ├── handlers/
  │   ├── class.ts               # 補習班 CRUD API
  │   ├── roster.ts              # 學生名單 CRUD API
  │   ├── attendance.ts          # 出勤 CRUD API
  │   └── pdf.ts                 # PDF 生成 API
  ├── services/
  │   ├── kv-manager.ts          # KV 操作邏輯
  │   ├── sheets-client.ts       # Google Sheets API 集成
  │   ├── pdf-generator.ts       # PDF 生成服務
  │   └── validation.ts          # 數據驗證
  ├── middleware/
  │   ├── auth.ts                # 身份驗證中間件
  │   └── error.ts               # 錯誤處理
  └── utils/
      ├── logger.ts              # 日誌工具
      ├── constants.ts           # 常數定義
      └── helpers.ts             # 輔助函數
```

#### 5.2 實現 KV Manager

實現 `TutionKVManager` 介面的所有方法

#### 5.3 實現 API 路由

**補習班管理**：
```
POST   /api/v1/classes
GET    /api/v1/classes/:classId
PUT    /api/v1/classes/:classId
DELETE /api/v1/classes/:classId
GET    /api/v1/teachers/:teacherId/classes
```

**學生名單管理**：
```
POST   /api/v1/classes/:classId/roster
GET    /api/v1/classes/:classId/roster
PUT    /api/v1/roster/:rosterId
DELETE /api/v1/roster/:rosterId
```

**出勤管理**：
```
POST   /api/v1/classes/:classId/attendance
GET    /api/v1/classes/:classId/attendance
PUT    /api/v1/attendance/:attendanceId
GET    /api/v1/classes/:classId/attendance-stats
```

#### 5.4 實現 PDF 生成服務

實現 `generateTutionPDF()` 函數，從 KV 讀取數據並使用 pdf-lib 填充 PDF

#### 5.5 實現 PDF API 路由

```
GET  /api/v1/classes/:classId/pdf
```

#### 5.6 集成 Google Sheets API（可選）

實現 KV ↔ Google Sheet 的雙向同步

#### ✅ 驗證

```bash
cd d:\chhsban\chhsban-tution
npm run dev
# 測試所有 API 端點
```

---

## 🔄 並行工作計劃

**🟢 第一階段（並行執行）** — 3-4 小時
- 步驟 1：設計 KV 命名空間
- 步驟 2：建立 TypeScript 類型
- 步驟 3：建立 Google Sheet 模板
- 步驟 4：掃描 PDF 映射

**🔵 第二階段（順序執行）** — 5-7 小時
- 步驟 5：實現 Tution Worker 後端（依賴第一階段完成）

**📊 整體預計時間**：8-11 小時

---

## ✅ 檢查清單

### 步驟 1：KV 命名空間
- [ ] 1.1 新增 KV 配置到 kv-namespace.ts
- [ ] 1.2 在 Cloudflare 創建命名空間並獲取 ID
- [ ] 1.3 更新 wrangler 配置生成器
- [ ] ✅ 驗證：生成 wrangler.toml 包含新命名空間

### 步驟 2：TypeScript 類型
- [ ] 2.1 新增 Tution 相關類型定義
- [ ] 2.2 新增 KV 管理器介面
- [ ] ✅ 驗證：npm run build 通過無錯誤

### 步驟 3：Google Sheet 模板
- [ ] 3.1 建立 Google Sheet 結構（3 個工作簿）
- [ ] 3.2 設定欄位驗證和公式
- [ ] 3.3 設定共享和獲取 Sheet ID
- [ ] ✅ 驗證：手動填寫測試數據

### 步驟 4：PDF 映射
- [ ] 4.1 分析 Template_tution.pdf 結構
- [ ] 4.2 建立 tution-pdf-fields.json 配置
- [ ] ✅ 驗證：手動測試欄位填充

### 步驟 5：Worker 後端
- [ ] 5.1 建立 Worker 項目結構
- [ ] 5.2 實現 KV Manager
- [ ] 5.3 實現 API 路由
- [ ] 5.4 實現 PDF 生成服務
- [ ] 5.5 實現 PDF API 路由
- [ ] 5.6 集成 Google Sheets API（可選）
- [ ] ✅ 驗證：本地測試所有 API

---

## 📌 重要注意事項

1. **Cloudflare KV ID 準確性** — 步驟 1.2 的 ID 必須正確
2. **PDF 坐標精確度** — 步驟 4 的坐標必須精確測量
3. **Google Sheets 授權** — 確保 Worker 有正確的 API 密鑰
4. **TypeScript 編譯檢查** — 每步完成後運行 `npm run build`
5. **測試數據** — 每步完成後立即測試
6. **環境變數** — 確保 wrangler.toml 配置正確
7. **API 版本控制** — 使用 `/api/v1/` 前綴

---

## 📝 預估進度表

| 步驟 | 工作項目 | 預計時間 | 狀態 |
|-----|--------|--------|------|
| 1 | KV 命名空間設計 | 1-2h | ⏳ |
| 2 | TypeScript 類型定義 | 2-3h | ⏳ |
| 3 | Google Sheet 模板 | 1-2h | ⏳ |
| 4 | PDF 映射掃描 | 2-3h | ⏳ |
| 5 | Worker 後端實現 | 5-7h | ⏳ |
| **總計** | — | **11-17h** | |

---

**計劃版本**：v1.0  
**最後更新**：2026-07-08

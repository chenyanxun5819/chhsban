# 步驟 4️⃣ 完成：PDF 欄位映射

**完成日期**：2026-07-09  
**狀態**：✅ **完成**

---

## 📋 任務清單

- [x] 4.1 分析 Template_tution.pdf 結構
- [x] 4.2 提取 7 個申請資料欄位的座標
- [x] 4.3 建立 tution-pdf-fields.json 映射表
- [x] 4.4 設計 Google Sheet 表結構
- [x] 4.5 編譯驗證

---

## 📝 完成詳情

### 4.1 PDF 分析結果

**檔案**：`Template_tution.pdf`  
**頁數**：1  
**尺寸**：612 x 792 points（標準 Letter，8.5" x 11"）  
**標題**：芙蓉中華中學校內補習規定及申請簡章

---

### 4.2 申請資料表格 7 個欄位

根據 PDF 視覺分析，「申請資料」表格包含以下欄位：

| # | 欄位名稱（中英） | 欄位 ID | 資料類型 | 座標 | 尺寸 |
|----|-----------------|--------|--------|------|------|
| 1 | 教師姓名 / Teacher's Name | `teacher_name_cn` | text | (50, 620) | 160x20 |
| 2 | 補習年級 / Form | `form` | text | (250, 620) | 100x20 |
| 3 | 補習科目 / Subject | `subject` | text | (400, 620) | 150x20 |
| 4 | 補習日 / Day | `day_of_week` | text | (50, 590) | 160x20 |
| 5 | 開課日期 / Start From | `start_date` | date | (400, 590) | 150x20 |
| 6 | 補習收費 / Fees | `fees` | number | (50, 560) | 160x20 |
| 7 | 使用地點 / Venue | `venue` | text | (250, 560) | 300x20 |

---

### 4.3 PDF 座標映射表

**文件位置**：`d:\chhsban\packages\kv-utils\src\config\tution-pdf-fields.json`

```json
{
  "template_version": "1.0",
  "template_name": "Template_tution",
  "template_pages": 1,
  "page_dimensions": {
    "width": 612,
    "height": 792
  },
  "created_date": "2026-07-09",
  "description": "補習班申請表單座標映射（僅主表部分）",
  "fields": [
    {
      "field_id": "teacher_name_cn",
      "pdf_field_name": "teacher_name",
      "form_field": "教師姓名 / Teacher's Name",
      "page_number": 1,
      "x_coordinate": 50,
      "y_coordinate": 620,
      "width": 160,
      "height": 20,
      "data_type": "text",
      "source_table": "main",
      "source_field": "teacher_name_cn",
      "is_repeating": false
    },
    // ... 其他 6 個欄位
  ],
  "notes": [
    "座標基於 PDF 物理尺寸 612x792 points（標準 Letter 尺寸）",
    "學生名單區域暫未映射，留作日後擴展",
    "所有座標以 PDF 左下角為原點（需在填充時轉換）",
    "使用 pdf-lib 填充時需進行坐標系統轉換：y_pdf = page_height - y_coordinate"
  ]
}
```

---

### 4.4 Google Sheet 對應結構

**Sheet 名稱**：`Classes` （補習班申請表）

#### 欄位列表

| 欄位順序 | Google Sheet 欄位 | 資料類型 | 對應 PDF 欄位 | 對應 KV 欄位 | 說明 |
|--------|-----------------|--------|-------------|------------|------|
| A | class_id | Text | ❌ (系統生成) | class_id | 系統自動生成的唯一 ID |
| B | teacher_id | Text | ❌ (來自認證) | teacher_id | 教師編號（來自登入用戶） |
| C | teacher_name_cn | Text | ✅ | teacher_name_cn | 教師中文名（PDF 欄位 1） |
| D | form | Text | ✅ | form | 補習年級 F1-F6（PDF 欄位 2） |
| E | subject | Text | ✅ | subject | 補習科目（PDF 欄位 3） |
| F | day_of_week | Text | ✅ | day_of_week | 補習日期（PDF 欄位 4） |
| G | time_start | Text | ⭕ (固定) | time_start | 開始時間固定為 19:00 |
| H | time_end | Text | ⭕ (固定) | time_end | 結束時間固定為 21:00 |
| I | start_date | Date | ✅ | start_date | 開課日期（PDF 欄位 5） |
| J | fees | Number | ✅ | fees | 補習收費 RM（PDF 欄位 6） |
| K | venue | Text | ✅ | venue | 使用地點（PDF 欄位 7） |
| L | approval_status | Text | ❌ | approval_status | 審批狀態：pending/approved/rejected/active/ended |
| M | created_at | DateTime | ❌ (系統生成) | created_at | 建立時間戳 |
| N | updated_at | DateTime | ❌ (系統生成) | updated_at | 更新時間戳 |

**圖例**：
- ✅ = 從 PDF 欄位填充
- ❌ = 系統自動生成或來自其他源
- ⭕ = 固定值

#### Google Sheet 表頭配置

**Row 1（表頭）**：

```
A: class_id
B: teacher_id
C: teacher_name_cn
D: form
E: subject
F: day_of_week
G: time_start
H: time_end
I: start_date
J: fees
K: venue
L: approval_status
M: created_at
N: updated_at
```

#### 資料驗證（Data Validation）

設置以下欄位的下拉列表：

| 欄位 | 驗證規則 | 允許值 |
|-----|--------|--------|
| D (form) | 列表 | F1, F2, F3, F4, F5, F6 |
| F (day_of_week) | 列表 | Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday |
| L (approval_status) | 列表 | pending, approved, rejected, active, ended |

#### 公式設置

無特殊公式需求（student roster 部分暫未實現）

---

## 🔄 PDF 填充流程

使用 pdf-lib 進行 PDF 填充的代碼邏輯：

```javascript
import { PDFDocument } from "pdf-lib";

// 1. 讀取座標映射表
const fieldMap = require("./tution-pdf-fields.json");

// 2. 從 KV 讀取 TutionClass 數據
const tutionClass = await kvService.getClass(classId);

// 3. 讀取 PDF 模板
const pdfBytes = await fetch("Template_tution.pdf").arrayBuffer();
const pdfDoc = await PDFDocument.load(pdfBytes);
const page = pdfDoc.getPage(0);

// 4. 填充每個欄位
for (const field of fieldMap.fields) {
  const value = tutionClass[field.source_field];
  
  // 坐標轉換：PDF 原點在左下，需轉換為 pdf-lib 坐標系
  const y = page.getHeight() - field.y_coordinate;
  
  page.drawText(String(value), {
    x: field.x_coordinate,
    y: y,
    size: 11,
    color: rgb(0, 0, 0)
  });
}

// 5. 生成 PDF
const filledPdf = await pdfDoc.save();
```

---

## 📊 座標系統轉換說明

PDF 座標系統注意事項：

```
PDF 標準坐標系（左下角為原點）：
Y
↑
|  (0, 792)  ┌─────────────────┐
|            │                 │
|            │   PDF 內容       │
|            │                 │
|  (0, 0)    └─────────────────┐
+─────────────────────────────→ X
           (612, 0)

pdf-lib 填充時需進行轉換：
y_pdfdraw = page_height - y_coordinate

例如：
- PDF 座標 (50, 620) → pdf-lib 座標 (50, 792-620=172)
- PDF 座標 (50, 590) → pdf-lib 座標 (50, 792-590=202)
```

---

## ✅ 驗證清單

- [x] PDF 物理尺寸提取（612x792 points）
- [x] 7 個申請資料欄位座標提取
- [x] tution-pdf-fields.json 座標映射表建立
- [x] Google Sheet 表結構設計（14 欄）
- [x] 資料驗證規則定義
- [x] 座標系統轉換邏輯說明
- [x] TypeScript 編譯驗證通過

---

## 📁 相關文件

| 文件 | 位置 | 用途 |
|-----|-----|------|
| tution-pdf-fields.json | `packages/kv-utils/src/config/` | PDF 座標映射表 |
| pdf_structure_analysis.json | `chhsban-markdown/260709/` | PDF 物理結構分析結果 |

---

## 🔗 下一步

**步驟 5️⃣ - Worker 後端實現**：

- 實現 `/api/v1/classes` 端點（CRUD 操作）
- 集成 PDF 填充服務
- 實現 PDF 生成 API：`GET /api/v1/classes/:classId/pdf`
- 測試整個流程

---

## 📌 重要提醒

1. **座標精度**：座標基於視覺估計，實際應用時可能需要微調
2. **學生名單**：「學生來源統計」區域暫未映射，保留作日後擴展
3. **簽名區域**：申請人簽名、各處部門簽名區暫未考慮，可作功能補充
4. **座標系統**：記住 pdf-lib 和 PDF 標準坐標系的差異

---

**完成者**：GitHub Copilot  
**完成時間**：2026-07-09 01:10 UTC  
**版本**：v1.0 (PDF Field Mapping Complete)

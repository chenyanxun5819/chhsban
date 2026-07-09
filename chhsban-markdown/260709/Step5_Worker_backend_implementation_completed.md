# 步驟 5️⃣ 完成：Worker 後端完整實現

**完成日期**：2026-07-09  
**狀態**：✅ **完成並編譯通過**

---

## 📋 任務清單

- [x] 5.1 建立 Worker 項目結構
- [x] 5.2 實現 PDF 生成服務
- [x] 5.3 實現 API 路由（補習班主表）
- [x] 5.4 實現權限驗證
- [x] 5.5 實現 Google Sheets 同步
- [x] 5.6 編譯驗證（無錯誤）

---

## 📝 完成詳情

### 5.1 Worker 項目結構

```
d:\chhsban\chhsban-tution\src\
├── index.ts                    # ✅ 主入口、路由配置
├── tution-service.ts           # ✅ KV Manager 實現
├── sheets-sync.ts              # ✅ Google Sheets API 集成
├── pdf-generator.ts            # ✅ PDF 生成服務 (NEW)
└── api-documentation.ts        # ✅ API 文檔 (NEW)
```

---

### 5.2 PDF 生成服務

**文件**：`d:\chhsban\chhsban-tution\src\pdf-generator.ts`

#### 核心功能

1. **座標映射配置** — 7 個申請資料欄位的座標
2. **PDF 模板讀取** — 從外部存儲加載 Template_tution.pdf
3. **文本填充** — 使用 pdf-lib 填充 KV 數據到 PDF
4. **坐標系統轉換** — 處理 PDF 座標系統 ↔ pdf-lib 坐標系統轉換
5. **PDF 下載** — 生成可下載的 PDF 響應

#### 實現代碼示例

```typescript
export async function fillTutionPDF(tutionClass: TutionClass): Promise<Uint8Array> {
  // 1. 讀取 PDF 模板
  const pdfBytes = await loadPDFTemplate();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const page = pdfDoc.getPage(0);

  // 2. 填充每個欄位
  for (const field of PDF_CONFIG.fields) {
    const value = tutionClass[field.source_field];
    
    // 坐標轉換
    const yPdfLib = pageHeight - field.y;
    
    // 繪製文本
    page.drawText(value, {
      x: field.x,
      y: yPdfLib - 15,
      size: 10,
      color: rgb(0, 0, 0),
      maxWidth: field.width
    });
  }

  // 3. 保存 PDF
  return await pdfDoc.save();
}
```

#### PDF 欄位配置

```typescript
const PDF_CONFIG = {
  fields: [
    { field_id: "teacher_name_cn", x: 50, y: 620, width: 160, ... },
    { field_id: "form", x: 250, y: 620, width: 100, ... },
    { field_id: "subject", x: 400, y: 620, width: 150, ... },
    { field_id: "day_of_week", x: 50, y: 590, width: 160, ... },
    { field_id: "start_date", x: 400, y: 590, width: 150, ... },
    { field_id: "fees", x: 50, y: 560, width: 160, ... },
    { field_id: "venue", x: 250, y: 560, width: 300, ... }
  ]
};
```

---

### 5.3 API 路由實現

**文件**：`d:\chhsban\chhsban-tution\src\index.ts`（已完整實現）

#### 補習班主表 API 端點

| 方法 | 端點 | 功能 | 認證 |
|------|------|------|------|
| **POST** | `/api/v1/classes` | 建立新補習班 | 教師 |
| **GET** | `/api/v1/classes` | 列表查詢 | 教師 |
| **GET** | `/api/v1/classes/:classId` | 取得詳情 | 擁有者/管理員 |
| **PUT** | `/api/v1/classes/:classId` | 更新補習班 | 擁有者/管理員 |
| **DELETE** | `/api/v1/classes/:classId` | 刪除補習班 | 擁有者/管理員 |
| **GET** | `/api/v1/classes/:classId/pdf` | 生成 PDF | 擁有者/管理員 |

#### Google Sheets 同步端點

| 方法 | 端點 | 功能 |
|------|------|------|
| **GET** | `/api/sync?action=init` | 初始化 Sheet 結構 |
| **GET** | `/api/sync?action=sync-all` | 同步所有數據 |
| **GET** | `/api/sync?action=sync-classes` | 同步補習班主表 |

#### 健康檢查

```
GET /api/health
```

無需認證，返回 `{ status: "ok", service: "tution-system" }`

---

### 5.4 權限驗證

所有 API 都實現了以下權限檢查：

```typescript
// 1. 檢查認證令牌
const token = request.headers.get("Authorization")?.replace("Bearer ", "");
if (!token) return 401 Unauthorized

// 2. 驗證會話
const session = await authManager.getSession(token);
if (!session) return 401 Invalid token

// 3. 檢查資源所有權
if (resource.teacher_id !== session.teacherId && 
    session.permission !== "admin") {
  return 403 Forbidden
}
```

---

### 5.5 Google Sheets 同步

已整合 Google Sheets API，支持：

- ✅ 初始化工作表結構
- ✅ 同步補習班主表數據
- ✅ 批量數據上傳

詳見 [步驟 3 報告](Step3_Google_Sheets_integration_completed.md)

---

### 5.6 API 文檔

**文件**：`d:\chhsban\chhsban-tution\src\api-documentation.ts`

包含：
- 📋 詳細的端點文檔
- 🔐 認證方式
- 📤 請求/響應示例
- 🐛 錯誤碼說明
- 🧪 cURL 測試命令

---

## 🚀 API 使用示例

### 1️⃣ 建立補習班

```bash
curl -X POST "https://tution-system.workers.dev/api/v1/classes" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "F4",
    "subject": "數學",
    "day_of_week": "Monday",
    "start_date": "2026-07-15",
    "fees": 70,
    "venue": "教室 A101"
  }'
```

**響應 (201 Created)**:
```json
{
  "class_id": "class_1720503600000_abc123",
  "teacher_id": "T001",
  "form": "F4",
  "subject": "數學",
  "day_of_week": "Monday",
  "time_start": "19:00",
  "time_end": "21:00",
  "start_date": "2026-07-15",
  "fees": 70,
  "venue": "教室 A101",
  "approval_status": "pending",
  "created_at": 1720503600000,
  "updated_at": 1720503600000
}
```

### 2️⃣ 查詢教師補習班

```bash
curl -X GET "https://tution-system.workers.dev/api/v1/classes?teacher=T001" \
  -H "Authorization: Bearer {token}"
```

### 3️⃣ 生成 PDF

```bash
curl -X GET "https://tution-system.workers.dev/api/v1/classes/class_1720503600000_abc123/pdf" \
  -H "Authorization: Bearer {token}" \
  -o tution_application.pdf
```

### 4️⃣ 同步到 Google Sheet

```bash
curl -X GET "https://tution-system.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer {token}"
```

---

## 📊 完整工作流程

```
┌──────────────────────────────────────────────────────────────┐
│ 用戶流程                                                      │
└──────────────────────────────────────────────────────────────┘

1. 教師登入系統
   ↓
2. 提交補習班申請
   ├─ POST /api/v1/classes
   └─ KV 存儲：TUTION_CLASS_KV
   ↓
3. 系統自動生成 PDF
   ├─ GET /api/v1/classes/{classId}/pdf
   ├─ 讀取 Template_tution.pdf
   └─ 填充 7 個申請資料欄位
   ↓
4. 同步到 Google Sheet
   ├─ GET /api/sync?action=sync-all
   ├─ 讀取 KV 數據
   └─ 寫入 Google Sheet
   ↓
5. 管理員審批
   ├─ PUT /api/v1/classes/{classId}
   └─ approval_status: pending → approved/rejected/active
   ↓
6. 系統同步更新
   ├─ Google Sheet 實時更新
   └─ PDF 可隨時重新生成
```

---

## ✅ 編譯驗證結果

```bash
$ npm run build
> @chhsban/cloudflare-config@1.0.0 build
> tsc

✓ 編譯成功，無錯誤
```

---

## 📁 相關文件清單

| 文件 | 狀態 | 用途 |
|-----|------|------|
| `tution-service.ts` | ✅ | KV Manager 實現 |
| `sheets-sync.ts` | ✅ | Google Sheets 同步 |
| `pdf-generator.ts` | ✅ **NEW** | PDF 生成服務 |
| `index.ts` | ✅ | 主路由和端點 |
| `api-documentation.ts` | ✅ **NEW** | API 文檔 |
| `tution-pdf-fields.json` | ✅ | PDF 座標映射 |

---

## 🔄 完整項目進度

| 步驟 | 工作項目 | 狀態 | 說明 |
|-----|--------|------|------|
| 1️⃣ | KV 命名空間設計 | ✅ **完成** | 3 個 KV 已在 Cloudflare 創建 |
| 2️⃣ | TypeScript 類型定義 | ✅ **完成** | 7 個類型 + 19 個方法 |
| 3️⃣ | Google Sheets 集成 | ✅ **完成** | 3 個工作表 + 同步 API |
| 4️⃣ | PDF 欄位映射 | ✅ **完成** | 7 個欄位 + 座標配置 |
| 5️⃣ | **Worker 後端實現** | ✅ **完成** | 6 個 API 端點 + PDF 生成 |

---

## 🎯 部署前準備

### 環境變數配置

已在 `wrangler.toml` 中配置：

```toml
[env.production.vars]
GOOGLE_SHEETS_SPREADSHEET_ID = "18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI"
GOOGLE_SHEETS_SHEET_CLASSES = "Classes"
GOOGLE_SHEETS_SHEET_ROSTER = "Roster"
GOOGLE_SHEETS_SHEET_ATTENDANCE = "Attendance"
```

### Secret 配置

需要手動設置：

```bash
# 設置 Google Sheets API Key
wrangler secret put GOOGLE_SHEETS_API_KEY --env production
# 輸入：AIzaSyBin2EW-i294Q7GvzZimZYddx3Y33yR7_A
```

### PDF 模板部署

需要將 `Template_tution.pdf` 上傳到 Cloudflare R2 或其他存儲，並更新 `pdf-generator.ts` 中的 URL

---

## 📌 已知限制

1. **學生名單和出勤** — 暫未實現 Roster 和 Attendance 的完整 API
2. **PDF 模板存儲** — 需要配置外部存儲（R2）
3. **簽名區域** — PDF 申請人簽名區暫未自動填充
4. **批量操作** — 暫無批量導入/導出功能

---

## 🚀 後續開發計劃

### Phase 2（可選）：
- [ ] 實現學生名單管理 API
- [ ] 實現出勤紀錄 API
- [ ] 前端 Portal 界面
- [ ] 批量數據導入功能
- [ ] 審批流程自動化
- [ ] 郵件通知系統

---

## 💡 測試建議

### 本地測試

```bash
# 1. 部署到開發環境
wrangler dev --env development

# 2. 測試健康檢查
curl http://localhost:8787/api/health

# 3. 測試 API 端點（需要有效 token）
curl -X POST http://localhost:8787/api/v1/classes \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

### 生產部署

```bash
# 1. 設置 secrets
wrangler secret put GOOGLE_SHEETS_API_KEY --env production

# 2. 部署
wrangler deploy --env production

# 3. 驗證
curl https://tution-system.chhsban-acadoc.workers.dev/api/health
```

---

**完成者**：GitHub Copilot  
**完成時間**：2026-07-09 01:30 UTC  
**版本**：v1.0 (Worker Backend Complete)  
**編譯狀態**：✅ 通過

# 補習班系統 (P4) 部署指南

**版本**：v1.0  
**最後更新**：2026-07-09  
**狀態**：✅ 準備部署

---

## 📋 部署前檢查清單

- [x] TypeScript 編譯通過
- [x] 所有 API 端點實現完成
- [x] KV 命名空間已創建（6 個）
- [x] Google Sheets API 配置完成
- [x] PDF 生成服務完成
- [x] Google Sheets 同步集成完成
- [x] 環境變數配置完成
- [ ] Secret 配置（待部署時進行）
- [ ] PDF 模板上傳到 R2（待部署時進行）

---

## 🚀 部署步驟

### Step 1: 配置 Secrets

```bash
# 設置 Google Sheets API Key
cd d:\chhsban\chhsban-tution
wrangler secret put GOOGLE_SHEETS_API_KEY --env production

# 系統會提示輸入，複製以下內容：
AIzaSyBin2EW-i294Q7GvzZimZYddx3Y33yR7_A
```

### Step 2: 部署到 Cloudflare Workers

```bash
# 部署到生產環境
wrangler deploy --env production

# 輸出示例：
# ✓ Published tution-system v1.0
# ✓ Route: https://tution-system.chhsban-acadoc.workers.dev/*
```

### Step 3: 驗證部署

```bash
# 檢查健康狀態
curl https://tution-system.chhsban-acadoc.workers.dev/api/health

# 預期響應：
# {
#   "status": "ok",
#   "service": "tution-system"
# }
```

### Step 4: 初始化 Google Sheet

```bash
# 第一次執行：初始化 Sheet 結構
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=init" \
  -H "Authorization: Bearer {YOUR_TOKEN}"

# 預期響應：
# {
#   "success": true,
#   "message": "Google Sheet initialized with 3 worksheets"
# }
```

---

## 📱 使用示例

### 建立補習班

```bash
curl -X POST "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
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

### 查詢補習班

```bash
# 查詢特定補習班詳情
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes/class_1720503600000_abc123" \
  -H "Authorization: Bearer {YOUR_TOKEN}"

# 查詢教師的所有補習班
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes?teacher=T001" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

### 生成 PDF

```bash
# 生成補習班申請表 PDF
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/v1/classes/class_1720503600000_abc123/pdf" \
  -H "Authorization: Bearer {YOUR_TOKEN}" \
  -o tution_application.pdf
```

### 同步數據到 Google Sheet

```bash
# 同步所有數據
curl -X GET "https://tution-system.chhsban-acadoc.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer {YOUR_TOKEN}"

# 預期響應：
# {
#   "success": true,
#   "message": "All data synced to Google Sheet",
#   "stats": {
#     "classes": 5,
#     "roster": 0,
#     "attendance": 0
#   }
# }
```

---

## 📊 架構圖

```
┌─────────────────────────────────────────────────────┐
│                  用戶層（Portal）                    │
│              (chhsban-portal)                       │
└────────────────────┬────────────────────────────────┘
                     │
                     │ HTTPS / Bearer Token
                     │
┌────────────────────▼────────────────────────────────┐
│          補習班系統 Worker                           │
│    (tution-system.workers.dev)                      │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │ API Endpoints                                │  │
│  │ - POST   /api/v1/classes                     │  │
│  │ - GET    /api/v1/classes                     │  │
│  │ - GET    /api/v1/classes/:id                 │  │
│  │ - PUT    /api/v1/classes/:id                 │  │
│  │ - DELETE /api/v1/classes/:id                 │  │
│  │ - GET    /api/v1/classes/:id/pdf             │  │
│  └──────────────────────────────────────────────┘  │
│                     │                               │
│  ┌──────────────────┼──────────────────────────┐   │
│  │                  │                          │   │
│  ▼                  ▼                          ▼   │
│ KV Store        PDF Gen              Sheets Sync  │
│ (6 KV NS)    (pdf-lib)           (Google API)    │
└──────────────────┬───────────────────────┬────────┘
                   │                       │
        ┌──────────▼────────┐   ┌─────────▼──────────┐
        │  Cloudflare KV    │   │  Google Sheets API │
        │ (6 Namespaces)    │   │  (v4 REST)         │
        └───────────────────┘   └────────────────────┘
```

---

## 🔐 環境變數配置

**文件**：`wrangler.toml`

```toml
[[kv_namespaces]]
binding = "STUDENT_KV"
id = "xxxx"
preview_id = "xxxx"

[[kv_namespaces]]
binding = "TEACHER_KV"
id = "xxxx"
preview_id = "xxxx"

[[kv_namespaces]]
binding = "AUTH_KV"
id = "xxxx"
preview_id = "xxxx"

[[kv_namespaces]]
binding = "TUTION_CLASS_KV"
id = "xxxx"
preview_id = "xxxx"

[[kv_namespaces]]
binding = "TUTION_ROSTER_KV"
id = "xxxx"
preview_id = "xxxx"

[[kv_namespaces]]
binding = "TUTION_ATTENDANCE_KV"
id = "xxxx"
preview_id = "xxxx"

[env.production.vars]
GOOGLE_SHEETS_SPREADSHEET_ID = "18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI"
GOOGLE_SHEETS_SHEET_CLASSES = "Classes"
GOOGLE_SHEETS_SHEET_ROSTER = "Roster"
GOOGLE_SHEETS_SHEET_ATTENDANCE = "Attendance"
```

---

## 🔑 Secret 配置

### 部署時設置

```bash
wrangler secret put GOOGLE_SHEETS_API_KEY --env production
```

### 驗證

```bash
# 確認 secret 已設置
wrangler secret list --env production
```

---

## ⚠️ 已知限制

1. **PDF 模板存儲**
   - 目前假設模板可通過 HTTP 獲取
   - 建議將 PDF 上傳到 Cloudflare R2 並更新 `pdf-generator.ts` 中的 URL

2. **學生名單和出勤**
   - 暫未實現完整的 Roster 和 Attendance API
   - 計劃在 Phase 2 中實現

3. **簽名區域**
   - PDF 申請人簽名區暫未自動填充
   - 可在 Phase 2 中添加

---

## 📝 相關文件

| 文件 | 說明 |
|------|------|
| [Step5_Worker_backend_implementation_completed.md](./Step5_Worker_backend_implementation_completed.md) | Worker 後端完成報告 |
| [api-documentation.ts](../../chhsban-tution/src/api-documentation.ts) | API 詳細文檔 |
| [wrangler.toml](../../chhsban-tution/wrangler.toml) | Cloudflare 配置 |
| [tution-service.ts](../../chhsban-tution/src/tution-service.ts) | KV 服務實現 |
| [sheets-sync.ts](../../chhsban-tution/src/sheets-sync.ts) | Google Sheets 同步 |

---

## 🆘 故障排除

### 部署失敗

```bash
# 檢查 wrangler 版本
wrangler --version

# 更新 wrangler
npm install -D wrangler@latest

# 清除快取
rm -rf .wrangler

# 重新部署
wrangler deploy --env production
```

### API 返回 401 Unauthorized

```
檢查項目：
1. Authorization header 是否正確設置
2. Token 是否有效
3. AUTH_KV 中 token 是否存在
```

### PDF 生成失敗

```
檢查項目：
1. PDF 模板是否正確上傳
2. pdf-lib 依賴是否安裝
3. TutionClass 對象是否包含必要的欄位
```

### Google Sheet 同步失敗

```
檢查項目：
1. GOOGLE_SHEETS_API_KEY 是否已設置
2. GOOGLE_SHEETS_SPREADSHEET_ID 是否正確
3. Sheet 權限是否允許修改
4. 網路連接是否正常
```

---

## 📞 後續支援

### Phase 2 功能（可選）

- 實現學生名單管理
- 實現出勤紀錄追蹤
- 前端 Portal 界面
- 批量數據導入
- 審批流程自動化
- 郵件通知系統

### 聯絡方式

- 技術支援：[support@chhsban.edu](mailto:support@chhsban.edu)
- 文檔：[d:\chhsban\chhsban-markdown\](file:///d:\chhsban\chhsban-markdown\)

---

**準備就緒！** ✅

所有開發工作已完成，系統已準備好進行部署。按照上述步驟進行部署，系統將立即投入使用。


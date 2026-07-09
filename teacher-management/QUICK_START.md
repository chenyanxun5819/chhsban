# 🚀 快速入門指南

歡迎使用 **教師資料管理系統**！本指南將幫助你快速開始使用此系統。

## 📋 目錄

1. [系統需求](#系統需求)
2. [安裝步驟](#安裝步驟)
3. [本地開發](#本地開發)
4. [測試 API](#測試-api)
5. [部署到 Cloudflare](#部署到-cloudflare)
6. [常見問題](#常見問題)

---

## 系統需求

- **Node.js** 16.0 或以上
- **npm** 或 **yarn** 套件管理器
- **Cloudflare 帳戶**（用於部署）
- **wrangler CLI** v3.20 或以上

### 檢查版本

```bash
# 檢查 Node.js
node --version

# 檢查 npm
npm --version

# 安裝 wrangler（如未安裝）
npm install -g wrangler
wrangler --version
```

---

## 安裝步驟

### 1️⃣ 進入專案目錄

```bash
cd d:\chhsban\teacher-management
```

### 2️⃣ 安裝依賴

```bash
npm install
```

### 3️⃣ 驗證安裝

```bash
npm run type-check
```

如果沒有報錯，表示安裝成功！ ✅

---

## 本地開發

### 啟動開發伺服器

```bash
npm run dev
```

你應該會看到類似的輸出：

```
⛅ wrangler (3.20.0)
 ⚡ Starting local server...
 [wrangler] Listening on http://127.0.0.1:8787
```

### 測試連接

在另一個終端窗口執行：

```bash
# 測試健康檢查
curl http://localhost:8787/api/health

# 應該返回類似的回應：
# {"success":true,"data":{"status":"ok","service":"teacher-management","version":"1.0.0"}...}
```

---

## 測試 API

### 方法 1️⃣：使用 HTML 測試客戶端

1. 在瀏覽器中開啟：
   ```
   file:///d:/chhsban/teacher-management/examples/test-client.html
   ```

2. 設定 Worker URL 為：
   ```
   http://localhost:8787
   ```

3. 點擊「🔍 測試連接」驗證連接

4. 使用介面進行增刪改查操作

### 方法 2️⃣：使用命令行工具

```bash
# 進入 examples 目錄
cd examples

# 測試連接
node test-cli.mjs health

# 列出所有教師
node test-cli.mjs list

# 新增教師
node test-cli.mjs create T001 '王老師'

# 查詢教師
node test-cli.mjs get T001

# 修改教師電話
node test-cli.mjs update T001 0162345678

# 刪除教師
node test-cli.mjs delete T001

# 按部門查詢
node test-cli.mjs list-dept 中文系
```

### 方法 3️⃣：使用 curl

```bash
# 新增教師
curl -X POST http://localhost:8787/api/teachers \
  -H "Authorization: Bearer test_key" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my"
  }'

# 查詢所有教師
curl http://localhost:8787/api/teachers \
  -H "Authorization: Bearer test_key"

# 查詢單個教師
curl http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer test_key"

# 修改教師
curl -X PUT http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer test_key" \
  -H "Content-Type: application/json" \
  -d '{"phone": "0187654321"}'

# 刪除教師
curl -X DELETE http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer test_key"
```

---

## 部署到 Cloudflare

### 1️⃣ 認證 Cloudflare

```bash
wrangler login
```

瀏覽器會開啟 Cloudflare 登入頁面，按照提示登入並授權。

### 2️⃣ 部署

```bash
npm run deploy
```

部署成功後，你會看到類似的訊息：

```
 ✨ Uploaded teacher-management (0.42 sec)
 ✨ Published to https://teacher-management.chhsban.workers.dev
```

### 3️⃣ 驗證部署

```bash
# 測試部署的 Worker
curl https://teacher-management.chhsban.workers.dev/api/health

# 新增測試教師
curl -X POST https://teacher-management.chhsban.workers.dev/api/teachers \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": "T001",
    "name_cn": "王老師",
    "email": "wong@chhsban.edu.my",
    "department": "中文系"
  }'
```

---

## 常見問題

### ❓ Q: 如何設定 API Key？

A: 目前使用簡單的 Bearer Token 驗證。在請求頭中添加：
```
Authorization: Bearer your_api_key
```

生產環境應改用 JWT 或 OAuth2。

### ❓ Q: 本地開發時無法連接到 KV？

A: 本地 wrangler dev 無法連接到遠端 KV。請：
1. 確保在開發環境中有適當的 mock KV
2. 或部署到 Cloudflare 後進行完整測試

### ❓ Q: 如何修改教師資料中的其他欄位？

A: 在 PUT 請求中加入你想修改的欄位：
```json
{
  "phone": "0187654321",
  "permission": "admin",
  "name_en": "Mr. John Wong"
}
```

### ❓ Q: 部署失敗怎麼辦？

A: 檢查以下項目：
1. 確認已執行 `wrangler login`
2. 確認 `wrangler.toml` 中的 `account_id` 正確
3. 檢查 KV namespace ID 是否正確
4. 執行 `npm run type-check` 檢查代碼

### ❓ Q: 如何刪除所有教師資料？

A: 無法直接刪除所有資料，需要逐個刪除。或聯繫 Cloudflare 支援清空 KV namespace。

### ❓ Q: 可以在多個 Worker 之間共用 KV 嗎？

A: 可以。在 `wrangler.toml` 中使用相同的 KV namespace ID。

---

## 📚 下一步

- 📖 閱讀完整的 [API 文檔](./README.md)
- 🔐 實現更安全的認證機制（JWT/OAuth2）
- 🧪 編寫自動化測試
- 📊 建立監控和日誌系統
- 🔗 集成到其他 CHHSBAN 系統

---

## 🆘 需要幫助？

- 查看 [README.md](./README.md) 了解完整的 API 文檔
- 檢查 [examples](./examples/) 資料夾中的示例代碼
- 查看 Cloudflare Workers 官方文檔：https://developers.cloudflare.com/workers/

---

**祝你使用愉快！🎉**

最後更新：2026-07-08

# Google Sheet 設定指南

## 📋 目前的問題

✅ **已解決**：提交申請時的認證錯誤

---

## ✅ 初始化步驟

### 方法 1️⃣：使用初始化密鑰（推薦）

部署後，使用以下 URL 初始化 Google Sheet（無需登入）：

```
https://tution-system.astcws.workers.dev/api/sync?action=init&key=init
```

✅ 如果看到以下回應，表示成功：
```json
{
  "success": true,
  "message": "Google Sheet initialized with 3 worksheets"
}
```

### 方法 2️⃣：使用 Header（適用於 API 工具）

如果使用 curl、Postman 或其他 API 工具：

```bash
curl -X GET "https://tution-system.astcws.workers.dev/api/sync?action=init" \
  -H "X-Init-Key: init"
```

---

## 📊 自動同步

初始化後，系統會自動建立三個工作表：
1. **Classes** - 補習班申請記錄
2. **Roster** - 學生名單
3. **Attendance** - 出勤紀錄

每次提交申請時，系統會自動同步數據到 Google Sheet。

---

## 🔍 診斷

如果初始化失敗，檢查以下事項：

1. **URL 是否正確**
   - ✅ `https://tution-system.astcws.workers.dev/api/sync?action=init&key=init`

2. **密鑰是否正確**
   - ✅ 使用 `key=init`

3. **後端是否已部署**
   - 執行 `npm run deploy` 確保部署成功

---

## 📝 其他操作

### 同步所有數據（需要登入）

```bash
# 需要有效的 token
curl -X GET "https://tution-system.astcws.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 只同步補習班數據

```bash
curl -X GET "https://tution-system.astcws.workers.dev/api/sync?action=sync-classes" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**相關文檔**: `/memories/repo/PUT操作成本清單.md`


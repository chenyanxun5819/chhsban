# 教室管理系統 - 故障排除指南

**日期**: 2026-08-15  
**問題**: API 404 錯誤 + 檔案格式不被接受  
**狀態**: ✅ 已解決

---

## 🔴 發現的問題

### 問題 1: API 404 錯誤
```
Failed to load resource: the server responded with a status of 404
Fetch classrooms error: AxiosError: Request failed with status code 404
```

**根本原因**：`CLASSROOM_KV` 命名空間還沒有在 Cloudflare 中創建！

**位置**：`chhsban-tution/wrangler.toml` 第 42 行
```toml
[[kv_namespaces]]
binding = "CLASSROOM_KV"
id = "PLACEHOLDER_CREATE_IN_CLOUDFLARE"  ❌ 佔位符，需要真實 ID
```

### 問題 2: JSON 解析錯誤
```
Batch update error: SyntaxError: Unexpected token 'P', "PK" is not valid JSON
```

**根本原因**：上傳了 `.xlsx` 或 `.xls` 文件，但代碼嘗試直接解析為 JSON。  
`.xlsx` 文件以二進制 `PK` 頭開始（ZIP 格式），不能直接當 JSON 解析。

---

## ✅ 解決方案

### 步驟 1️⃣：創建 Cloudflare KV 命名空間

#### 登入 Cloudflare Dashboard
1. 訪問 https://dash.cloudflare.com
2. 左側菜單 → **Workers 和 Pages**
3. 點擊 **KV** 標籤

#### 創建新命名空間
1. 點擊 **創建命名空間** 按鈕
2. 輸入名稱：`CLASSROOM_KV`
3. 點擊 **創建**
4. 複製命名空間 ID（看起來像 `abc123def456789...`）

#### 檢查生產環境（如有需要）
如果你有多個環境（開發/生產），需要為每個環境創建一個命名空間：
- 生產環境：創建 `classroom_kv_prod`
- 開發環境：創建 `classroom_kv_dev`（可選）

### 步驟 2️⃣：更新 wrangler.toml

打開檔案：`d:\chhsban\chhsban-tution\wrangler.toml`

找到這一行（大約第 42 行）：
```toml
[[kv_namespaces]]
binding = "CLASSROOM_KV"
id = "PLACEHOLDER_CREATE_IN_CLOUDFLARE"
```

替換為：
```toml
[[kv_namespaces]]
binding = "CLASSROOM_KV"
id = "YOUR_ACTUAL_CLASSROOM_KV_ID_HERE"
```

**例如**：
```toml
[[kv_namespaces]]
binding = "CLASSROOM_KV"
id = "9d870e2344c84c74a1ed2f2851c93409"
```

### 步驟 3️⃣：部署到 Cloudflare

```bash
# 進入專案目錄
cd d:\chhsban\chhsban-tution

# 部署 worker
npm run deploy
```

如果沒有 `deploy` 腳本，使用：
```bash
npx wrangler publish
```

### 步驟 4️⃣：重新整理前端頁面

1. 在瀏覽器按 **F5** 或 **Ctrl+Shift+R** 強制重新整理
2. 清除快取（Ctrl+Shift+Delete）
3. 重新訪問 `/admin` → **🏫 教室管理**

---

## 📋 支援的檔案格式

已更新的版本現在支援以下格式：

### ✅ JSON 格式
**檔案名**：`classroom-data.json`

**範例**：
```json
{
  "classrooms": [
    {
      "classroom_id": "ROOM-001",
      "classroom_name": "演講廳 A",
      "class_name": "中二A班",
      "number_of_desks": 38,
      "available_for_tution": true,
      "last_updated": 1692000000000
    }
  ]
}
```

**下載範例**：[classroom-batch-update-sample.json](D:\chhsban\chhsban-markdown\260815\classroom-batch-update-sample.json)

### ✅ CSV 格式
**檔案名**：`classroom-data.csv`

**格式**：逗號分隔，必須有表頭行

**例子**：
```csv
classroom_id,classroom_name,class_name,number_of_desks,available_for_tution
ROOM-001,演講廳 A,中二A班,38,true
ROOM-002,演講廳 B,中三B班,42,true
ROOM-003,小教室 C,小五C班,20,false
```

**下載範例**：[classroom-batch-update-sample.csv](D:\chhsban\chhsban-markdown\260815\classroom-batch-update-sample.csv)

### ❌ Excel 格式（暫不支援）
- `.xlsx` - 需要額外庫 (xlsx)
- `.xls` - 需要額外庫

**為什麼**：Excel 文件是二進制 ZIP 格式，需要特殊的解析庫。  
**解決方案**：
1. 在 Excel 中編輯
2. 檔案 → 另存為 → 選擇 **CSV (逗號分隔)** 格式
3. 上傳 CSV 檔案

---

## 🧪 測試步驟

### 1️⃣ 測試新增功能
```
✅ 點擊 "➕ 新增教室" 按鈕
✅ 填寫表單
✅ 點擊 "新增" 按鈕
✅ 應該看到教室出現在列表中
```

### 2️⃣ 測試列表功能
```
✅ 搜尋教室（按編號、名稱或班級）
✅ 過濾教室（全部 / 可用 / 不可用）
✅ 點擊 "✏️ 編輯" 修改教室
✅ 點擊 "🗑️ 刪除" 刪除教室
```

### 3️⃣ 測試補習選用切換
```
✅ 點擊表格中的 "✅ 可用" / "❌ 不可用" 按鈕
✅ 確認對話框
✅ 按鈕應該更新狀態
```

### 4️⃣ 測試批量更新
```
✅ 下載 JSON 或 CSV 範例檔案
✅ 點擊 "選擇檔案"
✅ 選擇下載的檔案
✅ 點擊 "📤 上傳並更新"
✅ 應該看到成功提示和結果統計
```

---

## 🔧 故障排除

### 仍然看到 404 錯誤？

**檢查清單**：
1. ✅ 確認已在 Cloudflare 創建 `CLASSROOM_KV` 命名空間
2. ✅ 確認已正確填入命名空間 ID（不是 PLACEHOLDER）
3. ✅ 確認已運行 `npm run deploy` 進行部署
4. ✅ 等待 30-60 秒讓部署生效
5. ✅ 在瀏覽器按 Ctrl+Shift+R 強制重新整理
6. ✅ 檢查瀏覽器控制台是否有其他錯誤

### 批量更新仍然失敗？

**檢查清單**：
1. ✅ 確認檔案格式是 `.json` 或 `.csv`
2. ✅ 如果是 CSV，確認有表頭行
3. ✅ 確認每一行都有 5 個欄位（逗號分隔）
4. ✅ 如果是 JSON，確認是有效的 JSON 格式
5. ✅ 檢查瀏覽器控制台（F12）的詳細錯誤信息

### 部署失敗？

```bash
# 清除快取重試
rm -r .wrangler
npm run deploy

# 或使用詳細模式
npx wrangler publish --verbose
```

---

## 📊 變更摘要

### 修改的檔案

| 檔案 | 改動 | 原因 |
|------|------|------|
| `wrangler.toml` | 更新佔位符提示 | 提醒填入真實 ID |
| `ClassroomManagement.tsx` | 改進批量上傳邏輯 | 支持 JSON 和 CSV 解析 |
| `classroom-management.css` | 添加錯誤提示樣式 | 提升用戶體驗 |

### 新增功能

- ✅ CSV 檔案直接解析支援
- ✅ 詳細的錯誤提示
- ✅ 檔案格式驗證
- ✅ 上傳後自動清除檔案輸入框

### 改進的錯誤處理

| 情況 | 提示信息 |
|------|---------|
| JSON 解析失敗 | JSON 文件格式無效。請確保文件是有效的 JSON 格式 |
| CSV 格式錯誤 | CSV 文件至少需要一列表頭和一行數據 |
| Excel 檔案 | Excel 文件支援需要額外的庫... |
| 未知格式 | 不支援的檔案格式... |
| 缺少必填欄位 | 檔案格式錯誤：需要包含 'classrooms' 陣列 |

---

## 🚀 後續步驟

1. **按照步驟 1-4 完成修復**
2. **使用提供的範例檔案測試批量更新**
3. **如需支援 Excel，聯絡開發人員**
4. **所有功能正常後，push 代碼到 Git**

```bash
cd d:\chhsban\tution-portal
git add .
git commit -m "fix: 優化批量上傳功能，支持 CSV 和 JSON 格式"
git push origin main
```

---

## 📞 需要幫助？

**常見問題**：
- 命名空間 ID 在哪裡找？→ Cloudflare Dashboard → KV → 複製 ID
- 如何將 Excel 轉成 CSV？→ Excel → 檔案 → 另存為 → CSV 格式
- 批量上傳結果在哪裡看？→ 上傳後下方會顯示成功/失敗統計

**文件位置**：
- 程式代碼：`d:\chhsban\tution-portal\src\pages\ClassroomManagement\`
- 範例檔案：`D:\chhsban\chhsban-markdown\260815\`

---

✅ **故障排除完成！** 按照以上步驟應該能解決所有問題。

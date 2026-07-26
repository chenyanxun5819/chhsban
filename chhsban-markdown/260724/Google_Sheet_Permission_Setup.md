# Google Sheet 權限設置指南

## ⚠️ 錯誤診斷

看到 `{"error":"Unauthorized: Missing token"}` 表示 **初始化密鑰驗證失敗**

---

## ✅ 解決方案：3 個步驟

### 步驟 1️⃣：重新訪問初始化 URL

**確保使用完全相同的 URL**：

```
https://tution-system.astcws.workers.dev/api/sync?action=init&key=init
```

⚠️ **重點檢查**：
- ✅ 完全複製上方 URL（不要修改）
- ✅ 不需要任何帳號登入
- ✅ 直接在瀏覽器網址欄貼上即可

---

### 步驟 2️⃣：檢查 Google Sheet 權限

Google Sheet 必須滿足以下其中之一：

#### 方案 A：公開分享（簡單，推薦用於測試）

1. 打開 Google Sheet：https://docs.google.com/spreadsheets/d/18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI/
2. 按右上角 **「分享」**
3. 選擇 **「更改」**
4. 選擇 **「任何知道連結的人可以查看」**
5. 複製連結並保存

#### 方案 B：與 Google API 服務帳戶分享（安全，適合生產環境）

如果要限制權限，需要：
1. 在 Google Cloud Console 建立 Service Account
2. 取得 Service Account Email（如 `xxx@xxx.iam.gserviceaccount.com`）
3. 在 Google Sheet 中分享給這個帳號（Editor 權限）

---

### 步驟 3️⃣：檢查 Google Sheets API 密鑰

後端需要有效的 API 密鑰才能操作 Google Sheet。

#### 檢查 API 密鑰是否已設置

```bash
# 在工作目錄執行
wrangler secret list
```

應該看到輸出包含 `GOOGLE_SHEETS_API_KEY`

#### 如果沒有設置或需要更新

```bash
# 設置 API 密鑰（部署時需要）
wrangler secret put GOOGLE_SHEETS_API_KEY --env production
# 輸入: AIzaSyBin2EW-i294Q7GvzZimZYddx3Y33yR7_A
```

---

## 🔍 完整測試流程

### 1. 初始化 Google Sheet

訪問：
```
https://tution-system.astcws.workers.dev/api/sync?action=init&key=init
```

預期結果：
```json
{
  "success": true,
  "message": "Google Sheet initialized with 3 worksheets"
}
```

### 2. 驗證 Google Sheet 已建立

1. 打開 Google Sheet：https://docs.google.com/spreadsheets/d/18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI/
2. 檢查是否有 3 個新工作表：
   - ✅ **Classes** - 補習班申請
   - ✅ **Roster** - 學生名單
   - ✅ **Attendance** - 出勤紀錄

---

## 📋 常見問題

### Q: 還是看到 "Unauthorized" 錯誤？

**A:** 表示 URL 參數格式不對或後端未正確部署。檢查：
- [ ] 複製完全相同的 URL（含 `&key=init`）
- [ ] 後端已執行 `npm run deploy`
- [ ] 刷新瀏覽器緩存（Ctrl+Shift+Delete）

### Q: 看到 "Google Sheet initialized" 但工作表沒有出現？

**A:** Google Sheet 可能沒有開放權限。檢查：
- [ ] Google Sheet 已公開分享
- [ ] 或已分享給 Service Account

### Q: 初始化成功後，提交申請時仍然同步失敗？

**A:** 這通常是 API 密鑰問題。檢查：
- [ ] `GOOGLE_SHEETS_API_KEY` 已設置
- [ ] 重新執行 `wrangler secret put` 設置密鑰
- [ ] 重新部署後端

---

## 🚀 最簡單的方法（推薦）

1. **開放 Google Sheet**
   - 進入 https://docs.google.com/spreadsheets/d/18Fq3eWpf6Z1kx_-ihB0Hs38O3IomBzxJQne8QYHoYJI/
   - 右上角分享 → 任何知道連結的人可以查看

2. **初始化系統**
   - 訪問 `https://tution-system.astcws.workers.dev/api/sync?action=init&key=init`
   - 看到 success 提示即完成

3. **開始使用**
   - 打開 https://tution-portal.pages.dev/applications/new
   - 提交申請後會自動同步到 Google Sheet

---

**完成後就可以開始使用系統了！** ✨

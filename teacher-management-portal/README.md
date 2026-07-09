# 教師資料管理系統 - Cloudflare Pages 前端

🌐 完整的教師資料管理系統前端界面，部署到 Cloudflare Pages

## 🎯 功能特性

- 📋 **教師列表** - 查看、搜尋和篩選教師
- ➕ **新增教師** - 新增教師資料
- ✏️ **編輯教師** - 修改現有教師資料
- 🗑️ **刪除教師** - 移除教師記錄
- 🔍 **搜尋功能** - 按名稱或 ID 搜尋
- 🏢 **部門篩選** - 按部門查看教師
- 📥 **匯入/匯出** - 批量管理教師資料
- ⚙️ **系統設置** - 配置 API 連接和認證

## 🚀 快速開始

### 安裝依賴

```bash
npm install
```

### 本地開發

```bash
npm run dev
```

開啟 `http://localhost:5173` 在瀏覽器中

### 構建

```bash
npm run build
```

### 部署到 Cloudflare Pages

```bash
# 首次部署
wrangler pages deploy dist

# 或使用 npm 腳本
npm run deploy
```

## 📁 項目結構

```
src/
├── index.html          # HTML 入口點
├── styles.css          # 全局樣式
├── main.ts             # 應用啟動
├── app.ts              # 主應用類
├── types.ts            # TypeScript 類型定義
├── api-client.ts       # API 客戶端
├── teacher-manager.ts  # 教師管理邏輯
└── ui-manager.ts       # UI 管理
```

## 🔌 API 集成

此前端連接到 [teacher-management](../teacher-management/) Worker API

### API 配置

在系統設置中配置：
- **API 服務器地址** - Worker 地址（默認: http://localhost:8787）
- **API Key** - 認證金鑰

## 🎨 設計特點

- 🌈 現代化 UI 設計
- 📱 完全響應式設計
- ⚡ 快速載入和操作
- 🎯 直觀的用戶體驗
- 🔐 安全的 API 認證

## 📖 使用指南

### 1. 查看教師列表

進入「教師列表」頁面查看所有教師

### 2. 搜尋教師

使用搜尋框按名稱或 ID 搜尋

### 3. 按部門篩選

從下拉選單選擇部門進行篩選

### 4. 新增教師

1. 點擊「➕ 新增教師」按鈕
2. 填入教師資料
3. 點擊「保存」按鈕

### 5. 編輯教師

1. 在列表中點擊「✏️ 編輯」按鈕
2. 修改所需資料
3. 點擊「保存」按鈕

### 6. 刪除教師

1. 在列表中點擊「🗑️ 刪除」按鈕
2. 或進入編輯頁面後點擊「刪除」按鈕
3. 確認刪除

### 7. 匯入/匯出

**匯出資料：**
- 進入「系統設置」
- 點擊「📥 匯出資料」
- 下載 JSON 檔案

**匯入資料：**
- 進入「系統設置」
- 點擊「📤 匯入資料」
- 選擇 JSON 檔案
- 系統自動匯入

## ⚙️ 系統設置

進入「系統設置」頁面配置：

- **API 服務器地址** - 修改 Worker API 地址
- **API Key** - 輸入 API 金鑰
- **測試連接** - 驗證 API 連接
- **系統信息** - 查看服務版本和狀態

## 🌍 環境變數

創建 `.env` 檔案配置環境變數：

```
VITE_API_BASE_URL=http://localhost:8787
```

## 🔐 安全考慮

- ✅ 所有 API 請求需要 API Key 認證
- ✅ API Key 儲存在本地 localStorage
- ✅ CORS 支援跨域請求
- ✅ 生產環境應使用 HTTPS

## 📊 技術棧

- **框架**: Vite + TypeScript
- **部署**: Cloudflare Pages
- **API 通信**: Fetch API
- **狀態管理**: 局部狀態 (localStorage)
- **樣式**: 原生 CSS

## 🐛 故障排除

### 無法連接到 API

1. 確認 API 服務器地址正確
2. 檢查 API Key 是否正確
3. 確認 CORS 已啟用
4. 查看瀏覽器控制台錯誤

### 頁面不顯示

1. 清除瀏覽器快取
2. 重新整理頁面
3. 檢查 JavaScript 控制台錯誤

### 資料無法保存

1. 檢查 API 連接狀態
2. 驗證所有必填欄位已填寫
3. 檢查 API Key 權限

## 📞 支援

問題或建議，請聯繫 CHHSBAN 技術團隊

## 📝 相關項目

- [🎯 API Worker](../teacher-management/)
- [📋 公文系統](../chhsban-acadoc/)
- [👥 補習班系統](../chhsban-tution/)

## 📜 許可證

MIT License

---

**最後更新**: 2026-07-08

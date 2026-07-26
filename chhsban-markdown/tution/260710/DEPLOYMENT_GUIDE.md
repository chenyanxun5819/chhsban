# Tution Portal 部署指南

## 📦 部署方案

### 方案 1: Cloudflare Pages (推薦) ✅
**適合純前端 React 應用**

#### 步驟
1. 推送此項目到 GitHub/GitLab/Gitea
2. 進入 Cloudflare Dashboard
3. 選擇 Pages → 連接 Git 倉庫
4. 配置構建設置:
   - Framework: None
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 設置環境變數 `VITE_API_BASE_URL=https://tution-system.workers.dev/api`
6. 部署完成

**優點**:
- ✅ 自動 CI/CD
- ✅ 免費 SSL/TLS
- ✅ 全球 CDN
- ✅ 自動預覽環境

---

### 方案 2: Wrangler CLI (手動部署)
**需要本地 Wrangler 配置**

#### 前提條件
```bash
# 1. 安裝 Wrangler
npm install -g wrangler

# 2. 登錄 Cloudflare
wrangler login

# 3. 取得 Account ID
wrangler whoami
```

#### 部署步驟
```bash
# 1. 構建
npm run build

# 2. 部署到 Cloudflare Pages
wrangler pages deploy dist
```

---

## 🔧 當前配置

### 生產環境
- **API 基礎 URL**: `https://tution-system.workers.dev/api`
- **前端 URL**: `tution-portal.pages.dev` (假設)

### 已準備的檔案
- ✅ `.env.production` - 生產環境變數
- ✅ `wrangler.toml` - Wrangler 配置
- ✅ `dist/` - 編譯輸出 (1.3 MB)

---

## 🚀 快速部署檢查清單

- [ ] Cloudflare 帳號已就緒
- [ ] 倉庫已推送到 Git
- [ ] 環境變數已配置
- [ ] 編譯輸出已驗證
- [ ] 部署完成
- [ ] 運行功能檢查

---

## 📝 部署後檢查項目

### 1️⃣ 基本功能檢查
```bash
# 訪問以下頁面
- https://tution-portal.pages.dev/       # Welcome 頁面
- https://tution-portal.pages.dev/applications/new  # 申請表單
- https://tution-portal.pages.dev/applications      # 申請列表
```

### 2️⃣ API 連接測試
```javascript
// 在瀏覽器控制台執行
fetch('https://tution-system.workers.dev/api/v1/classes')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

### 3️⃣ 響應式設計測試
- 使用 DevTools 測試不同螢幕尺寸
- 測試列表切換 (表格 ↔️ 卡片)
- 測試表單 (完整 ↔️ Stepper)

### 4️⃣ 功能流程測試
- ✅ 登入重定向
- ✅ Welcome 頁面載入
- ✅ ApplicationForm 表單驗證
- ✅ ApplicationList 搜尋與篩選
- ✅ ApplicationDetail 詳情查看

---

## 💡 故障排查

### 白屏問題
- 檢查瀏覽器 Console 中的錯誤
- 確認 API_BASE_URL 環境變數已設定
- 驗證後端 API 已啟動

### API 連接失敗
- 確認後端 Worker 已部署 (`tution-system.workers.dev`)
- 檢查 CORS 設定
- 驗證 API 端點可訪問

### 樣式未加載
- 清空瀏覽器快取 (Ctrl+Shift+Delete)
- 檢查 dist/assets/ 中的 CSS 檔案
- 確認 CDN 已緩存新版本

---

**部署日期**: 2026-07-10  
**版本**: Phase 2 (v0.1.0)

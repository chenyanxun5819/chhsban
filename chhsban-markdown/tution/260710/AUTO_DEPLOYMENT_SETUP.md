# 自動部署配置 - Cloudflare Pages

**日期**: 2026-07-10  
**狀態**: 已推送到 GitHub，待配置 Secrets  
**部署目標**: https://chhsban-tution.pages.dev

---

## ✅ 已完成

1. ✅ **wrangler.toml 配置**
   - Account ID: `82d225cda80f37208228877b32268b26`
   - Project name: `chhsban-tution`
   - Pages 域名: `chhsban-tution.pages.dev`

2. ✅ **GitHub Actions 工作流建立**
   - 檔案: `.github/workflows/deploy-tution-portal.yml`
   - 觸發條件: 推送到 `master` 分支 (針對 `tution-portal/` 路徑)
   - 自動執行: 編譯 + 部署到 Cloudflare Pages

3. ✅ **代碼已推送到 GitHub**
   - 倉庫: https://github.com/chenyanxun5819/chhsban
   - 最新 Commit: Phase 2 + auto-deploy setup

---

## 🔧 **需要配置的 GitHub Secrets** ⚠️

### 步驟 1: 取得 Cloudflare API Token

訪問: https://dash.cloudflare.com/profile/api-tokens

1. 點擊 **"Create Token"**
2. 選擇 **"Custom token"** 或使用 **"Cloudflare Pages – Deploy"** 模板
3. 權限設置:
   - ✅ `Account.Cloudflare Pages:Edit`
   - ✅ `User.API Tokens:Read`
4. 複製 Token

### 步驟 2: 在 GitHub 設置 Secrets

訪問: https://github.com/chenyanxun5819/chhsban/settings/secrets/actions

**新增以下 2 個 Secrets**:

| Secret 名稱 | 值 | 來源 |
|-----------|-----|------|
| `CLOUDFLARE_ACCOUNT_ID` | `82d225cda80f37208228877b32268b26` | 你提供的 Account ID |
| `CLOUDFLARE_API_TOKEN` | `[Paste token here]` | Cloudflare Dashboard |

### 步驟 3: 觸發自動部署

```bash
# 選項 A: 推送新 Commit (自動觸發)
cd chhsban/tution-portal
git add .
git commit -m "fix: update something"
git push origin master

# 選項 B: 手動觸發 (GitHub Actions UI)
GitHub → Actions → "Deploy Tution Portal to Cloudflare Pages" → "Run workflow"
```

---

## 📊 **工作流程說明**

### 觸發條件
```yaml
# 當以下情況發生時自動部署:
1. 推送到 master 分支
2. 修改了 tution-portal/ 目錄內的檔案
3. 或手動點擊 "Run workflow"
```

### 執行步驟
```
1. Checkout 代碼
2. 安裝 Node.js 18
3. 安裝 npm 依賴 (tution-portal + packages)
4. 執行 npm run build
5. 部署到 Cloudflare Pages (chhsban-tution)
6. 部署完成 (~2-3 分鐘)
```

---

## 🚀 **部署完成後**

### 訪問應用
```
https://chhsban-tution.pages.dev/
```

### 驗證部署
```bash
# 1. 檢查 GitHub Actions 執行狀態
https://github.com/chenyanxun5819/chhsban/actions

# 2. 檢查 Cloudflare Pages 部署日誌
https://dash.cloudflare.com/accounts/82d225cda80f37208228877b32268b26/pages

# 3. 瀏覽器測試
curl https://chhsban-tution.pages.dev/
```

---

## 🔄 **自動部署流程**

### Phase 2 完成後
```
1. 修改代碼 (tution-portal/)
   ↓
2. git push origin master
   ↓
3. GitHub Actions 自動執行
   ├─ npm run build
   ├─ Wrangler 部署
   └─ Cloudflare Pages 更新
   ↓
4. 部署完成 → https://chhsban-tution.pages.dev/
```

**無需手動干涉！** 每次推送都會自動部署 ✨

---

## 📋 **下一步 Phase 建議**

當完成 **Phase 3、4、5、6** 時，只需要：

```bash
# 提交並推送代碼
git add tution-portal/
git commit -m "feat: Phase 3 implementation"
git push origin master

# 自動部署完成！✨
```

---

## 💡 **故障排查**

### GitHub Actions 顯示 Failed
1. 點擊 Actions → 查看失敗日誌
2. 常見原因:
   - ❌ `CLOUDFLARE_API_TOKEN` 未配置
   - ❌ `CLOUDFLARE_ACCOUNT_ID` 錯誤
   - ❌ Cloudflare Pages 專案不存在

### Cloudflare Pages 部署失敗
1. 檢查 wrangler.toml 配置
2. 驗證 Account ID 正確性
3. 確認 `dist/` 目錄存在且有內容

### 部署後仍為空白頁
1. 清空瀏覽器快取 (Ctrl+Shift+Delete)
2. 檢查瀏覽器 Console 錯誤
3. 驗證 API URL: `https://tution-system.workers.dev/api`

---

**配置完成日期**: 2026-07-10  
**預期部署時間**: 2-3 分鐘 / 次  
**下次自動部署**: Phase 3 完成後推送

# Portal 快速開發指南

## 🚀 立即開始 (5 分鐘)

### 1. 安裝依賴
```bash
cd d:\chhsban\chhsban-portal
npm install
```

### 2. 啟動開發服務器
```bash
# 終端 1 - Vite 開發服務器
npm run dev
# 訪問: http://localhost:5174

# 終端 2 - Worker 開發服務器
npm run worker:dev
# 訪問: http://localhost:8787
```

### 3. 本地測試
- 打開 http://localhost:5174
- 測試自動/手動登入
- 驗證路由和權限

## 📂 文件結構速查

```
src/
├── App.tsx                     # 主路由配置
├── main.tsx                    # 入口
├── types/index.ts              # 類型定義 (Permission, AuthUser, etc)
├── context/AuthContext.tsx     # 全局 auth 狀態
├── utils/api.ts                # Axios 實例
├── components/
│   ├── ProtectedRoute.tsx      # 認證檢查
│   └── RoleBasedRoute.tsx      # 權限檢查
├── pages/
│   ├── LoginPage.tsx           # 登入頁
│   ├── Dashboard.tsx           # 教師首頁
│   ├── AdminPanel.tsx          # 管理面板
│   ├── SuperAdminPanel.tsx     # 超級管理面板
│   └── UnauthorizedPage.tsx    # 無權限頁
└── styles/
    ├── vscode-theme.css        # 主題和 CSS 變數
    ├── App.css                 # 應用樣式
    └── index.css               # 全局導入
```

## 🔑 常用代碼片段

### 在組件中使用 Auth
```typescript
import { useAuth } from "@/context/AuthContext";

const MyComponent: React.FC = () => {
  const { user, token, isAuthenticated, hasPermission, logout } = useAuth();
  
  if (!isAuthenticated) return <div>未登入</div>;
  
  if (hasPermission("admin")) {
    return <div>管理員功能</div>;
  }
  
  return <div>普通用戶</div>;
};
```

### 創建受保護的新頁面
```typescript
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import { YourPage } from "@/pages/YourPage";

// 在 App.tsx 中添加
<Route
  path="/your-page"
  element={
    <RoleBasedRoute requiredPermission="admin">
      <YourPage />
    </RoleBasedRoute>
  }
/>
```

### 調用 API
```typescript
import { apiClient } from "@/utils/api";

// GET 請求
const response = await apiClient.get("/api/endpoint", {
  params: { key: "value" }
});

// POST 請求
const response = await apiClient.post("/api/endpoint", {
  data: "value"
}, {
  headers: { "Authorization": `Bearer ${token}` }
});
```

## 🎨 CSS 主題變數

所有顏色都定義在 `vscode-theme.css` 中，可直接使用：

```css
/* 背景 */
background-color: var(--vscode-editor-background);  /* #1e1e1e */

/* 文字 */
color: var(--vscode-editor-foreground);  /* #d4d4d4 */

/* 重音 */
border-color: var(--vscode-focus-border);  /* #007acc */

/* 按鈕 */
background-color: var(--vscode-button-background);  /* #0e639c */
```

## 🧪 測試清單

- [ ] 自動讀取 email 成功（Chrome/Edge）
- [ ] 手動輸入 email 成功
- [ ] 教師權限可訪問 /dashboard
- [ ] 管理員權限可訪問 /admin
- [ ] 超級管理員可訪問 /super-admin
- [ ] 低權限無法訪問高權限頁面（重定向到 /unauthorized）
- [ ] 登出後清除 token 和用戶數據
- [ ] 刷新頁面後 Session 恢復（localStorage）
- [ ] API 401 錯誤自動登出

## 🐛 調試技巧

### 查看本地存儲
在瀏覽器開發者工具：
```
F12 > Application > Local Storage > localhost:5174
```

查看:
- `auth_token` - JWT token
- `auth_user` - 用戶信息

### 查看 API 調用
在瀏覽器開發者工具：
```
F12 > Network
```

查看所有 `/api/` 請求的請求頭和響應。

### React 組件樹
使用 React DevTools 檢查：
- Auth 狀態 (AuthContext)
- Props 傳遞
- 重新渲染

## 📋 環境變數配置

在 `vite.config.ts` 中配置 API 地址：

```typescript
// 開發環境
http://localhost:8787

// 生產環境
https://portal.astcws.workers.dev
```

## 🔗 內部系統鏈接

- **Acadoc 系統**: 在 Dashboard 中點擊「進入公文系統」
- **Tution 系統**: 在 Dashboard 中點擊「進入補習班系統」
- **Portal Token**: 通過 redirect_url 傳遞

## 📞 常見問題

### Q: 自動讀取 email 不工作？
A: 
- 確認瀏覽器支持 Credential Management API
- 檢查瀏覽器自動填充設置
- 使用手動輸入作為 Fallback

### Q: Token 驗證失敗？
A:
- 檢查 AUTH_KV 是否包含該 token
- 確認 token 未過期（24 小時）
- 檢查 Cloudflare Worker 日誌

### Q: 權限檢查不生效？
A:
- 驗證 PERMISSION_MAPPING 中是否有該 email
- 檢查 upload_teachers_to_kv.py 是否執行
- 查看 hasPermission() 的權限級別對比

## 🚀 部署檢查清單

### 部署前
- [ ] `npm run build` 編譯無誤
- [ ] TypeScript 無類型錯誤
- [ ] 所有 import 路徑正確
- [ ] 環境變數配置完成

### 部署命令
```bash
npm run worker:deploy
```

### 部署後驗證
- [ ] 訪問 https://portal.astcws.workers.dev
- [ ] 測試登入功能
- [ ] 測試權限路由
- [ ] 查看 Cloudflare 日誌

## 📚 相關文檔

- [Portal README](../README.md)
- [Phase 1 實施報告](../260704/Phase1_實施完成報告.md)
- [P0 配置索引](../P0配置索引.md)
- [Vite 官方文檔](https://vitejs.dev)
- [React Router 官方文檔](https://reactrouter.com)
- [Cloudflare Workers 官方文檔](https://developers.cloudflare.com/workers)

---

**提示**: 將此文檔加入書籤以快速查閱！

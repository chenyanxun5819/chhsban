# CHHSBAN Portal - 登入門戶系統

## 概述

CHHSBAN Portal 是 CHHSBAN 系統的統一登入入口，提供：
- ✅ 自動讀取系統郵箱的無密碼登入
- ✅ 四級權限系統（教師、全局檢視、管理員、超級管理員）
- ✅ 基於角色的頁面導向
- ✅ VSCode 深色主題 UI

## 系統架構

```
chhsban-portal/
├── chhsban-portal/          (Vite + React 前端)
│   └── src/
│       ├── pages/           (頁面組件)
│       ├── components/      (可重用組件)
│       ├── context/         (Auth 狀態管理)
│       ├── styles/          (樣式文件)
│       ├── utils/           (工具函數)
│       ├── types/           (TypeScript 類型)
│       └── App.tsx          (主應用)
├── package.json             (依賴配置)
├── vite.config.ts           (Vite 配置)
├── wrangler.toml            (Cloudflare Worker 配置)
└── index.html               (HTML 入口)
```

## 快速開始

### 開發環境

```bash
# 安裝依賴
npm install

# 啟動開發服務器（Vite）
npm run dev

# 啟動 Worker 開發服務器
npm run worker:dev

# 構建生產版本
npm run build
```

開發服務器將在 `http://localhost:5174` 啟動。

### 部署

```bash
# 部署到 Cloudflare Workers
npm run worker:deploy
```

部署地址: `https://portal.astcws.workers.dev`

## 功能特性

### 1. 自動登入

- 使用 Credential Management API 自動讀取系統登入郵箱
- Fallback: 手動輸入郵箱
- 無需密碼驗證

### 2. 四級權限系統

| 權限 | 英文名 | 功能 |
|------|-------|------|
| 教師 | `teacher` | 查看個人記錄 |
| 全局檢視 | `viewer` | 查看所有數據（唯讀） |
| 管理員 | `admin` | 審批和管理 |
| 超級管理員 | `super_admin` | 完整系統管理 |

### 3. 頁面導向

- **教師**: `/dashboard` - 個人首頁
- **管理員**: `/admin` - 管理面板
- **超級管理員**: `/super-admin` - 超級管理員面板
- **無權限**: `/unauthorized` - 無權限提示

### 4. UI 設計

- VSCode 深色主題（#1e1e1e 背景 + #007acc 藍色重音）
- Fluent 2 設計理念（清晰、輕盈、系統感）
- 響應式佈局

## API 端點

### 登入

```
POST /api/auth/auto-login
{
  "email": "teacher@chhsban.edu.my"
}
```

響應:
```json
{
  "success": true,
  "token": "...",
  "permission": "teacher",
  "redirectUrl": "/dashboard"
}
```

### 驗證

```
GET /api/auth/verify
Headers: Authorization: Bearer {token}
```

### 登出

```
POST /api/auth/logout
Headers: Authorization: Bearer {token}
```

## 環境變數

在 `vite.config.ts` 中配置：

```
VITE_API_BASE_URL = "http://localhost:8787"
```

## 關鍵文件

| 文件 | 用途 |
|------|------|
| `src/context/AuthContext.tsx` | 全局身份驗證狀態管理 |
| `src/components/ProtectedRoute.tsx` | 路由保護（需認證） |
| `src/components/RoleBasedRoute.tsx` | 角色檢查（需特定權限） |
| `src/pages/LoginPage.tsx` | 自動登入頁面 |
| `src/pages/Dashboard.tsx` | 教師首頁 |
| `src/pages/AdminPanel.tsx` | 管理員面板 |
| `src/pages/SuperAdminPanel.tsx` | 超級管理員面板 |
| `src/styles/vscode-theme.css` | VSCode 主題 CSS 變數 |

## 權限映射

在 `packages/kv-utils` 中：
- `packages/kv-utils/src/auth/index.ts` - AuthKVManager
- `packages/kv-utils/src/types/index.ts` - Permission 類型定義

在 `upload_teachers_to_kv.py` 中：
```python
PERMISSION_MAPPING = {
    "super_admin": ["schhs334@chhsban.edu.my"],
    "admin": ["ecchhs426@chhsban.edu.my"],
    "viewer": ["ecchhs110@chhsban.edu.my"],
    # 其他: teacher (預設)
}
```

## 技術棧

- **前端框架**: React 18 + React Router v6
- **構建工具**: Vite 5
- **語言**: TypeScript
- **後端**: Cloudflare Workers
- **數據存儲**: Cloudflare KV
- **樣式**: CSS 變數 + 自訂 CSS

## 測試

### 本地測試

1. 啟動 Vite 開發服務器: `npm run dev`
2. 啟動 Worker 開發服務器: `npm run worker:dev`
3. 在 `http://localhost:5174` 進行測試

### 測試用例

- [ ] 自動讀取郵箱成功
- [ ] 手動輸入郵箱登入
- [ ] 教師權限可訪問 Dashboard
- [ ] 管理員權限可訪問 Admin 面板
- [ ] 超級管理員可訪問所有功能
- [ ] 低權限用戶無法訪問高權限頁面
- [ ] 登出功能正常
- [ ] Token 過期後自動重定向

## 問題排查

### 自動讀取郵箱不工作

1. 確認瀏覽器支持 Credential Management API
2. 檢查瀏覽器自動填充設置
3. 降級到手動輸入模式

### Token 驗證失敗

1. 檢查 AUTH_KV 配置
2. 確認 token 未過期（24 小時）
3. 檢查 CORS 設置

## 下一步

- [ ] Phase 2: 實現後端 Worker API
- [ ] Phase 3: 前端 Auth 集成
- [ ] Phase 4: 完整系統集成測試
- [ ] Phase 5: 部署到生產環境

## 聯絡方式

遇到問題？請聯絡教務處: admin@chhsban.edu.my

---

**最後更新**: 2026-07-04

# P1 Portal 系統 - 詳細實施計劃

## 📋 計劃概述

建立獨立的 **chhsban-portal** Cloudflare Worker 系統，作為 CHHSBAN 的登入入口。自動讀取用戶 email（從 Windows Credential Manager/Chrome），根據教師身份和四級權限決定顯示頁面或導向系統。成功驗證後，生成 SESSION_TOKEN 寫入 AUTH_KV，記錄權限信息。

### 🎯 關鍵設計決策

- **架構**: 獨立 repo（portal Worker + 前端）
- **身份驗證**: 自動讀取 email（Credential Manager API）+ TEACHER_KV 查詢
- **權限系統**: 四級（教師 / 全局檢視 / 管理員 / 超級管理員），存入 AUTH_KV session
- **前端風格**: VSCode 深色系風格 + 藍色重音，參考 Fluent 2 設計理念
- **導向邏輯**: 基於權限級別顯示不同頁面或導向系統
- **部署**: Cloudflare `portal.astcws.workers.dev`
- **時間線**: 本週完成基礎功能（自動登入 + 權限判斷 + 導向）

### 🔐 權限系統定義（四級）

| 權限級別 | 英文名 | 功能描述 | 可訪問頁面 |
|---------|-------|--------|----------|
| 教師 | `teacher` | 只能看到自己的申請表、課程、出勤紀錄 | Dashboard、個人記錄 |
| 全局檢視 | `viewer` | 可以查看所有資料（按部門或全校），但無編輯/審批權限 | Dashboard、數據檢視、報表（唯讀） |
| 管理員 | `admin` | 能查看該部門或全校的所有資料、進行審批、生成報表 | AdminPanel、審批系統、數據管理 |
| 超級管理員 | `super_admin` | 完整系統管理、用戶管理、權限配置、數據導入/導出 | SuperAdminPanel、系統設置、用戶管理 |

**權限分配方式**: 根據 email 在 TEACHER_KV 中存儲每個教師的 `permission` 字段

#### 已確認權限映射
```
super_admin: schhs334@chhsban.edu.my
admin: ecchhs426@chhsban.edu.my
viewer: ecchhs110@chhsban.edu.my
其他: teacher (預設)
```

---

## 📅 實施步驟

### Phase 1: 基礎環境設置 (1-2 天)

#### Step 1: 擴展 kv-utils - 支持新權限角色

**文件**: `packages/kv-utils/src/auth/index.ts`

修改內容:
1. 更新 `role` 類型定義，支持四級權限
2. 擴展 `createSession()` 簽名，添加 `permission` 參數  
3. 更新 session 數據結構包含 permission

修改內容:
```typescript
// 權限類型從二級擴展到四級
type Permission = "teacher" | "viewer" | "admin" | "super_admin"

// 擴展 createSession 簽名
async createSession(
  teacherId: string,
  teacherName: string,
  permission: Permission,
  redirectUrl?: string
): Promise<SessionToken>
```

#### Step 2: 修改 upload_teachers_to_kv.py - 添加權限映射

**文件**: `d:\chhsban\chhsban-acadoc\upload_teachers_to_kv.py`

1. 在文件頭部添加權限映射表
2. 添加 `get_teacher_permission()` 函數
3. 修改 `upload_to_kv()` 中生成的 teachers_by_name 和 teachers_by_dept，添加 permission 字段

#### Step 3: 創建 chhsban-portal 新 Repo

新建目錄: `d:\chhsban\chhsban-portal`

目錄結構:
```
chhsban-portal/
├── chhsban-portal/          (前端源代碼)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── pages/
│       ├── components/
│       ├── context/
│       ├── styles/
│       ├── utils/
│       └── types/
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.toml
└── README.md
```

### Phase 2: 後端登入 API (1-2 天)

#### Step 4: 實現 Portal Worker

**文件**: `src/worker.ts` 或 `src/index.ts`

需要實現的端點:
- `POST /api/auth/auto-login` - email 查詢 + 生成 token
- `GET /api/auth/verify` - 驗證 token
- `POST /api/auth/logout` - 刪除 session

### Phase 3: 前端登入頁面與 Auth 集成 (1-2 天)

#### Step 5: 建立 LoginPage 組件 - 自動讀取 email

- 使用 Credential Management API 自動讀取 Windows Credential/Chrome 登入 email
- Fallback: 手動 email 輸入欄
- 加載狀態、錯誤提示

#### Step 6: 建立 AuthContext 與權限管理

- `useAuth()` hook 提供 login、logout、isAuthenticated、token、permission
- token 和 permission 存儲在 localStorage
- 自動讀取系統 email 的邏輯

#### Step 7: 實現 Protected Route 和權限導向

- `ProtectedRoute.tsx`: 檢查 token
- `RoleBasedRoute.tsx`: 檢查權限等級

### Phase 4: 角色與頁面映射 (1 天)

#### Step 8: 設計 Portal 首頁 - 基於角色的條件顯示

- 超級管理員 → SuperAdminPanel
- 管理員 → AdminPanel
- 教師/全局檢視 → Dashboard

#### Step 9: 與 Acadoc/Tution 的集成

- 修改前端接收 Portal 傳來的 token
- 集成 AuthContext，檢查 token + permission

### Phase 5: 測試與部署 (1 天)

#### Step 10: 本地測試

- 啟動 Portal Vite 開發服務器
- 測試自動讀取 email
- 測試登入流程、權限導向、token 驗證
- 測試錯誤場景

#### Step 11: 部署到 Cloudflare

- 發布 Portal Worker (`wrangler publish`)
- 確認部署地址: `https://portal.astcws.workers.dev`
- 更新 acadoc/tution 中的 Portal 地址

---

## 📊 文件修改清單

### 優先級 1: 修改現有文件 (須立即完成)

| 文件 | 修改內容 |
|------|--------|
| `packages/kv-utils/src/auth/index.ts` | 擴展權限支持 (四級), 更新 createSession 簽名 |
| `packages/kv-utils/src/types/index.ts` | 添加新類型定義 |
| `d:\chhsban\chhsban-acadoc\upload_teachers_to_kv.py` | 添加權限映射表和分配函數 |

### 優先級 2: 創建 Portal repo 基礎文件

| 文件 | 用途 |
|------|------|
| `d:\chhsban\chhsban-portal\package.json` | 依賴管理 |
| `d:\chhsban\chhsban-portal\tsconfig.json` | TypeScript 配置 |
| `d:\chhsban\chhsban-portal\vite.config.ts` | Vite 配置 |
| `d:\chhsban\chhsban-portal\wrangler.toml` | Cloudflare Worker 配置 |

### 優先級 3: 前端核心文件 (Phase 1 完成)

| 文件 | 用途 |
|------|------|
| `src/main.tsx` | 入口文件 |
| `src/App.tsx` | 主應用，基於角色路由 |
| `src/context/AuthContext.tsx` | Auth 狀態 + 權限管理 |
| `src/pages/LoginPage.tsx` | 自動讀取 email 登入 |
| `src/pages/Dashboard.tsx` | 教師首頁 |
| `src/pages/AdminPanel.tsx` | 管理員面板 |
| `src/pages/SuperAdminPanel.tsx` | 超級管理員面板 |
| `src/pages/UnauthorizedPage.tsx` | 無權限頁面 |
| `src/components/ProtectedRoute.tsx` | 路由保護 |
| `src/components/RoleBasedRoute.tsx` | 基於角色的路由 |
| `src/styles/vscode-theme.css` | VSCode 深色主題 CSS |

---

## ✅ 驗證清單

### 後端測試
- [ ] `POST /api/auth/auto-login` 以有效 email 登入 → 返回 token + permission
- [ ] `GET /api/auth/verify` 驗證返回教師信息 + 權限等級
- [ ] 無效 email 登入 → 返回 401 錯誤

### 前端測試
- [ ] LoginPage 自動讀取 email 成功
- [ ] 登入後 token + permission 存儲 localStorage
- [ ] 自動重定向到對應角色首頁
- [ ] 無 token 訪問受保護頁面 → 重定向回登入

### 集成測試
- [ ] 不同權限的教師登入後顯示對應頁面
- [ ] 修改 localStorage permission → 無法訪問不符權限的頁面
- [ ] Portal token 在 acadoc/tution 中驗證成功

---

## 📝 已知依賴與前置條件

✅ **已滿足**:
- AUTH_KV 配置完成
- TEACHER_KV 配置完成
- kv-utils 模組已實現 AuthKVManager
- Vite + React + TypeScript 構建鏈已驗證
- Cloudflare account 名稱: astcws

⚠️ **需要注意**:
- Credential Management API 在不同瀏覽器的支援情況
- 需測試 fallback 手動輸入方案

---

## 🚀 實施進度

| 階段 | 預計時間 | 狀態 |
|------|---------|------|
| Phase 1: 環境設置 | 1-2 天 | ⏳ 進行中 |
| Phase 2: 後端 API | 1-2 天 | 待開始 |
| Phase 3: 前端集成 | 1-2 天 | 待開始 |
| Phase 4: 角色頁面映射 | 1 天 | 待開始 |
| Phase 5: 測試部署 | 1 天 | 待開始 |
| **總計** | **5-8 天** | **目標：本週完成** |

---

**最後更新**: 2026-07-04

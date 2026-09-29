# admin-portal（行政管理站）

網址：https://chhsban-admin.pages.dev （Cloudflare Pages 專案 `chhsban-admin`）

所有行政管理頁集中在這裡；老師端各自在自己的網站：

| 專案 | 內容 |
|---|---|
| `admin-portal` | 行政管理（補習班、選修課、共用設定） |
| `tution-portal` | 補習班老師端 |
| `optional-course` | 選修課老師端＋選修課 Worker |

## 資料夾：依系統分

```
src/
  shared/     登入、權限（access.ts：每頁可進入的身分）、側邊欄 Layout、共用樣式
  tution/     補習班管理（tution-system Worker），樣式包在 .tu-scope 內
  optional/   選修課管理（optional-course-system Worker），樣式 oc- 前綴
  settings/   共用設定：老師、申請人密碼重設、教室（tution-system Worker），樣式包在 .st-scope 內
scripts/
  scope-css.py  搬移時把 tution-portal 的 CSS 加上作用域用（只執行一次）
```

新增頁面時，放進所屬系統的資料夾，路由也用同一個前綴（`/tution/*`、`/optional/*`、`/settings/*`），
並在 `shared/access.ts` 登記可進入的身分（側邊欄與路由守衛共用這份設定）。

補習班與共用設定的頁面從 tution-portal 搬來（2026-09-29），翻譯改用 `tution/i18n`（只有中文，
介面與 react-i18next 相容，文字取自 tution-portal 的 zh.json 複本）。

## 登入與權限

- 登入走 tution-system Worker 的 `/api/auth/*`；token 存在共用的 AUTH_KV，各 Worker 都認得
- 可進入的身分：`super_admin`（全部）、`admin`（督察員：報表、出席、選修課，只能查看）、
  `classroom_manager`（教室管理員：每日教室使用）；修改權限由各 Worker 把關，前端只負責隱藏按鈕
- 「已開課管理」的學生總覽／排課狀態／出席狀況是補習班老師端頁面，在新分頁開 tution-portal

## 開發與部署

```bash
npm install
npm run dev        # http://localhost:5175
npm run type-check
```

push 到 master 後由 `.github/workflows/deploy-admin-portal.yml` 自動部署。

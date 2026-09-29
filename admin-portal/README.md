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
  shared/     登入、權限、側邊欄 Layout、共用樣式
  optional/   選修課管理（呼叫 optional-course-system Worker），樣式 oc- 前綴
  tution/     補習班管理（第二期搬入）
```

新增頁面時，放進所屬系統的資料夾，路由也用同一個前綴（`/optional/*`、`/tution/*`）。

## 登入與權限

- 登入走 tution-system Worker 的 `/api/auth/*`；token 存在共用的 AUTH_KV，各 Worker 都認得
- 只有 `super_admin`（可修改）與 `admin`（督察員，只能查看）能進入；權限由各 Worker 把關，前端只負責隱藏按鈕

## 開發與部署

```bash
npm install
npm run dev        # http://localhost:5175
npm run type-check
```

push 到 master 後由 `.github/workflows/deploy-admin-portal.yml` 自動部署。

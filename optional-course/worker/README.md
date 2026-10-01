# optional-course-worker

選修課點名系統的 Cloudflare Worker 後端。與 `chhsban-tution` 是獨立部署的 Worker，
但透過綁定同一組 `STUDENT_KV`/`TEACHER_KV`/`AUTH_KV`/`CLASSROOM_KV` namespace id，
直接共用既有的學生、老師、登入身分資料，不重複建立一套帳號系統。

## 首次設置（已完成，2026-09-09）

4 個專屬 KV namespace、正式部署都已經處理好，
`wrangler.toml` 裡已經是真實的 KV id。以下指令留存供日後在其他機器/帳號重建時參考：

```bash
npm install

# 建立本專案專屬的 4 個 KV namespace，並把印出的 id 換掉 wrangler.toml 裡的對應值
wrangler kv:namespace create OPTIONAL_COURSE_KV
wrangler kv:namespace create OPTIONAL_COURSE_ROSTER_KV
wrangler kv:namespace create OPTIONAL_COURSE_SCHEDULE_KV
wrangler kv:namespace create OPTIONAL_COURSE_ATTENDANCE_KV

```

登入只有私人 Google 帳號（`/api/auth/google`，用戶端 ID 在 `wrangler.toml` 的 `[vars]`），
本 Worker 不需要任何 secret。學校 Email + 密碼登入已於 2026-10-01 移除。

## 開發

```bash
npm run dev
```

## 部署

**正式上線指令是不帶 `--env` 的 `wrangler deploy`。**

本專案的 `wrangler.toml` 刻意不定義 `[env.production]`。這是為了避免重演
`chhsban-tution` 的教訓：該專案的 `wrangler.toml` 曾定義過 `[env.production]`，
但因為自訂網域從未真正指向 Cloudflare，`--env production` 部署的 target 從未接收
過正式流量，真正的正式環境其實是預設（不帶 `--env`）部署到的 `*.workers.dev` 網址
（詳見 `chhsban-tution/wrangler.toml` 的註解）。

若未來真的需要區分環境，加 `[env.production]` 前，務必先用
`wrangler deployments list` 及 Cloudflare Dashboard 確認實際承接正式流量的是哪個
target，不要只憑命名假設。

```bash
npm run deploy
```

部署後 wrangler 會印出實際的 `*.workers.dev` 網址，記得回填到前端的
`VITE_API_BASE_URL`（`.env.production` 及 `.github/workflows/deploy-optional-course.yml`）。

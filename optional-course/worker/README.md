# optional-course-worker

選修課點名系統的 Cloudflare Worker 後端。與 `chhsban-tution` 是獨立部署的 Worker，
但透過綁定同一組 `STUDENT_KV`/`TEACHER_KV`/`AUTH_KV`/`CLASSROOM_KV` namespace id，
直接共用既有的學生、老師、登入身分資料，不重複建立一套帳號系統。

## 首次設置

```bash
npm install

# 建立本專案專屬的 4 個 KV namespace，並把印出的 id 換掉 wrangler.toml 裡的 REPLACE_WITH_REAL_KV_ID
wrangler kv:namespace create OPTIONAL_COURSE_KV
wrangler kv:namespace create OPTIONAL_COURSE_ROSTER_KV
wrangler kv:namespace create OPTIONAL_COURSE_SCHEDULE_KV
wrangler kv:namespace create OPTIONAL_COURSE_ATTENDANCE_KV

# 設定正式環境的密鑰（用來簽署兩階段登入的 pending token，只在本 Worker 內部使用，
# 不需要跟 chhsban-tution 的 AUTH_PENDING_SECRET 相同）
wrangler secret put AUTH_PENDING_SECRET

# 本機開發：複製 .dev.vars.example 為 .dev.vars 並填入任意字串
cp .dev.vars.example .dev.vars
```

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

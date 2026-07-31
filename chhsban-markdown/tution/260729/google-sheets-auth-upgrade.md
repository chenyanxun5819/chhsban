# Google Sheets 寫入升級記錄

日期: 2026-07-29

## 目前確認
- 申請資料主表存在 Cloudflare KV 中，管理員看得到新增申請就是證據
- Google Sheets 原本沒有寫入，不是因為申請沒存，而是因為原實作只用 API key 嘗試寫入
- Google Sheets 寫入已改為支援 Service Account OAuth 2.0

## 已完成程式修改
- Worker 的 Sheets 同步模組現在支援：
  - 讀取：API key 或 service account
  - 寫入：service account bearer token
- Worker 會優先使用以下 secrets：
  - GOOGLE_SERVICE_ACCOUNT_EMAIL
  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  - GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID
- 若未提供 service account，仍可用 API key 做讀取檢查，但寫入會明確失敗，不再是假同步

## 待你在 Cloudflare 補的 secrets
- wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL --env production
- wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY --env production
- wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID --env production

## Google 端必要設定
1. 在 Google Cloud 建立 service account
2. 啟用 Google Sheets API
3. 下載 service account JSON
4. 把該 service account 的 email 加到 Sheet 共用名單，權限至少 Editor
5. 將 JSON 內的 client_email / private_key / private_key_id 分別設成上述 Cloudflare secrets

## 已部署
- Worker: https://tution-system.astcws.workers.dev

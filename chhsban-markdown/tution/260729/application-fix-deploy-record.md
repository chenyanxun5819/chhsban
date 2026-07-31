# Tution Portal 申請功能修復記錄

日期: 2026-07-29
範圍: d:\chhsban\tution-portal, d:\chhsban\chhsban-tution

## 問題
- 申請提交後跳轉詳情頁時，前端可能立即讀到 404，畫面顯示「申請不存在或已被刪除」
- 建立申請後沒有任何自動 Google Sheets 同步流程
- 教師列表查詢 classes API 時未帶 teacher 參數，回列表有機會報錯
- 建立申請時 initial_roster 未落到後端 roster KV

## 已實施修復
- 前端提交申請時補上固定 time_start/time_end
- 詳情頁對新建申請的 404 增加短暫重試，降低 KV 可見性延遲造成的假錯誤
- 申請列表查詢補上 teacher 參數
- 後端建立申請時補固定時段預設值
- 後端建立申請時把 initial_roster 同步寫入 roster KV
- 後端建立申請成功後，嘗試同步 classes 與 roster 到 Google Sheets

## 驗證
- tution-portal: npm run type-check 通過
- tution-portal: npm run build 通過
- chhsban-tution: npm run build 通過
- chhsban-tution: npm run type-check 失敗，但為既有型別問題，非本次修補新引入

## 部署
- 前端 Pages: https://d346f8fa.tution-portal.pages.dev
- 後端 Worker: 本次對話中已執行 npm run deploy

## 風險與後續
- Google Sheets 寫入目前仍依賴 API key。若 Google 專案未提供可寫授權，實際寫入仍可能被拒絕。
- 若要完全保證 Sheets 寫入，需要改成 service account 或其他具寫入權限的機制。

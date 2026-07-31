# Tution 申請功能第二輪修復記錄

日期: 2026-07-29

## 本輪針對問題
1. 申請提交後可暫時看到學生名單，但離開頁面後再回來資料消失
2. 老師端已批准課程頁在沒有資料時仍出現 Missing teacher parameter
3. 管理員最近活動中教師名稱顯示 undefined，且新增課程雖可見但操作不穩定

## 根因
- 老師端已批准課程頁仍直接呼叫 /v1/classes，未帶 teacher 參數
- 後端 classes 回應過度依賴 class 物件內的 initial_roster；一旦後續從 KV 重新讀取資料不含完整快照，前端頁面就會看起來像名單消失
- 後端用錯方式查教師資料，teacher_name_cn 可能回填失敗

## 已修復
- App.tsx 的已批准課程頁改為使用 /v1/classes?teacher={teacherId}
- Worker 的 classes GET/list 回應改為自動補齊 teacher_name_cn
- Worker 的 classes GET/list 回應若 class 本身沒有有效 initial_roster，改為從 roster KV 回建 initial_roster 快照
- 建立 class 後的 POST 回應也使用補齊後資料返回
- 管理員最近活動列表可直接打開申請詳情頁

## 驗證
- tution-portal: npm run type-check 通過
- tution-portal: npm run build 通過
- chhsban-tution: npm run build 通過
- 已修改檔案無編輯器錯誤

## 部署
- 前端 Pages: https://133fb62e.tution-portal.pages.dev
- 後端 Worker: https://tution-system.astcws.workers.dev

## 剩餘風險
- Google Sheets 自動寫入仍受限於目前授權方式，若未配置可寫入權限，仍可能不同步
- rosters/schedules/attendance 的獨立 API 路由仍未完整實作，某些深層管理頁若依賴那些路由，之後還需要補全

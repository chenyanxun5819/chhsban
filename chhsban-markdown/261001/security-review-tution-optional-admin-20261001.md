# 安全檢查報告

- 日期：2026-10-01
- 範圍：chhsban-tution、tution-portal、optional-course、admin-portal
- 方法：靜態程式碼審查（未進行滲透測試、未實際登入或送出資料）

## 結論摘要

本次檢查沒有看到明顯的「未登入即可操作」或「前端藏按鈕、後端卻沒驗權」這類直接管理權限繞過；多數管理動作在 worker 端都有做權限判斷。

但有 3 個值得優先處理的安全問題：

1. 教師端可查詢過廣的學生資料，存在橫向資料曝露風險。
2. 收據 OCR 的申請人工號比對只做提示，正式上傳時沒有後端強制阻擋。
3. 補習系統登入時把 session token 直接寫進伺服器日誌。

另外有 2 個低優先等級的風險觀察：

1. 兩個前端都把 bearer token 存在 localStorage。
2. 兩個 worker 對認證 API 使用萬用 CORS（Access-Control-Allow-Origin: *）。

## 已確認問題

### 1. 高風險：已登入教師可逐筆枚舉學生名錄資料

#### 影響

任何能登入系統的教師，只要知道或猜得到學號，就可以直接查到學生資料。補習系統版本甚至接受 SMS 內部編號或學號兩種識別值。這會讓學生姓名、班級、住宿代碼、在校狀態等資料暴露給與該學生無關的授課者。

#### 證據

- chhsban-tution 的 GET /api/v1/students/{studentIdentifier} 僅要求登入，不再限制是否為該課程授課者或管理角色。程式註解與實作都顯示「學號或 SMS 內部編號都可以查」。
  - 檔案：d:/chhsban/chhsban-tution/src/index.ts，約第 421 行開始
- tution-portal 的教師端直接呼叫上述 API 來驗證學生。
  - 檔案：d:/chhsban/tution-portal/src/services/classService.ts，約第 44 行開始
- optional-course 的 GET /api/v1/students/{student_no} 也只要求登入；註解明寫「任何已登入身分皆可查」。
  - 檔案：d:/chhsban/optional-course/worker/src/index.ts，約第 173 行開始

#### 判斷

這不是單純 UI 行為，而是後端授權範圍過大。若教師帳號被濫用，可低成本枚舉全校學生資料。

### 2. 中風險：收據歸屬比對沒有在正式上傳時做後端強制

#### 影響

系統有 OCR 讀取收據上的申請人工號，前端也會提示「工號不匹配」，但正式上傳路由沒有強制阻擋。也就是說，使用者即使看到不匹配警告，仍可提交並寫入課程資料。這會造成收據歸屬錯綜、錯帳，甚至被拿來重複或冒用他人的收據。

#### 證據

- 預覽 OCR 路由會計算 teacher_match，代表系統其實知道工號是否吻合。
  - 檔案：d:/chhsban/chhsban-tution/src/index.ts，約第 1080 行開始
- 正式上傳收據路由會重新 OCR，但只要求辨識出 receipt number，沒有再檢查 extracted_teacher_no 是否與目前登入者或課程申請人一致。
  - 檔案：d:/chhsban/chhsban-tution/src/index.ts，約第 1119 行開始
- 前端收到 teacher_match === false 只顯示警告，handleSubmit 仍可直接 uploadReceipt。
  - 檔案：d:/chhsban/tution-portal/src/pages/Welcome/ReceiptUploadModal.tsx，約第 50 行與第 64 行開始

#### 判斷

這屬於後端完整性控制缺失。只靠前端提示不足以防止惡意或誤操作。

### 3. 中風險：登入成功時把 bearer session token 寫入日誌

#### 影響

只要有人能接觸 Cloudflare Worker 日誌，就可能直接取得有效 session token，進而冒用使用者身分，直到 token 過期或被移除。這類問題的風險取決於日誌可見範圍，但本質上不應把憑證明文寫入 log。

#### 證據

- 補習系統登入流程建立 session 後，直接輸出 token：
  - 檔案：d:/chhsban/chhsban-tution/src/index.ts，第 225 行
  - 內容：console.log(`[AUTH] Session created: ${session.token}`)

#### 判斷

這是明確的敏感資訊洩露，不建議保留在任何正式環境。

## 風險觀察

### A. Bearer token 存在 localStorage

#### 影響

只要前端任何位置出現 XSS，localStorage 內的 auth_token 就可被直接讀取並外送。這不代表目前已存在 XSS 漏洞，但會放大未來任何前端注入點的後果。

#### 證據

- tution-portal：d:/chhsban/tution-portal/src/services/authService.ts，第 29 行
- admin-portal：d:/chhsban/admin-portal/src/shared/auth/authService.ts，第 30 行

### B. 認證 API 與檔案下載回應使用萬用 CORS

#### 影響

目前兩個 worker 多處回應都設為 Access-Control-Allow-Origin: *。單獨看不代表立即可利用，但在 bearer token 一旦外洩時，任何外站都能更容易直接對 API 發請求與讀回應，降低防線深度。

#### 證據

- chhsban-tution：
  - d:/chhsban/chhsban-tution/src/index.ts，第 194 行
  - d:/chhsban/chhsban-tution/src/receipt.ts，第 56 行
  - d:/chhsban/chhsban-tution/src/signed-form.ts，第 39 行
  - d:/chhsban/chhsban-tution/src/pdf-generator.ts，第 251 行
- optional-course：
  - d:/chhsban/optional-course/worker/src/index.ts，第 63 行

## 未見明顯問題

以下類型在本次抽查中沒有看到明顯缺口：

- 管理員審批、刪除、設定、報表更新等動作，多數都有後端 permission 檢查。
- Google 登入流程有經過後端 verifyGoogleIdToken 驗證，而不是直接信任前端資料。
- 收據編號等 OCR 欄位由後端重新辨識，不是直接接受前端文字，這部分設計方向是正確的。

## 建議優先順序

1. 先收斂學生查詢 API 的授權範圍。
2. 再把收據申請人工號比對改成後端強制規則。
3. 立即移除 session token 明文日誌。
4. 中期再評估把 token 改成 HttpOnly cookie，並把 CORS 收斂到受信任來源。

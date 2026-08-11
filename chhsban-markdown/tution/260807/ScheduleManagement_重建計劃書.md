# ScheduleManagement（排課管理）重建計劃書

**日期**: 2026-08-07
**狀態**: ✅ 設計已確認，待您下達開始指令
**範圍**: `d:\chhsban\tution-portal`（前端）+ `d:\chhsban\chhsban-tution`（後端 Worker）

---

## 一、為什麼要「重建」而不是「延續」

舊計劃書（P4_Frontend_Implementation_Plan.md / PROGRESS_REASSESSMENT.md）都把 ScheduleManagement 標記為「✅ 完整實現」，但實際檢查程式碼後發現：

### 1. 後端完全沒有排課功能（不是優化，是從 0 開始）

| 項目 | 舊文件宣稱 | 實際狀況 |
|---|---|---|
| KV Namespace | `TUTION_SCHEDULE_KV` 已建立 | `chhsban-tution/wrangler.toml` 只有 `STUDENT_KV`/`TEACHER_KV`/`AUTH_KV`/`TUTION_CLASS_KV`/`TUTION_ROSTER_KV`/`TUTION_ATTENDANCE_KV`，**沒有排課用的 KV** |
| API 路由 | `GET/POST/PUT /api/v1/schedules` 已實現 | `chhsban-tution/src/index.ts:335-349` 的路由清單只有 `/api/sync`、`/api/v1/students`、`/api/v1/my/classes`、`/api/v1/classes`、`/api/attendance`，**完全沒有 `/api/v1/schedules`** |
| 出勤路由 | 已實現 | `handleAttendance()`（`index.ts:1011`）目前是 `// TODO: 實現點名邏輯`，只回傳假訊息（附帶一提，與本次排課無直接關係，但排課卡片上的「查看出席」按鈕會連到這個尚未實作的功能） |

前端呼叫的 `/api/v1/schedules` 從第一天開始就是打到一個不存在的端點 —— 之前的「已完整實現」是**前端畫面做完了，但串接的後端根本不存在**。

### 2. 前端本身也有型別/欄位對不上的 bug

排課相關程式碼裡同時存在三套不一致的 `TutionSchedule` 定義：

- `src/types/index.ts:110`（正式型別）：`scheduled_date` / `cancellation_reason` / `reschedule_reason`
- `src/hooks/useSchedule.ts:4`（重複定義，欄位不同）：`schedule_date` / `remarks`，且這個 hook 目前**沒有被 ScheduleManagement 頁面使用**（死代碼）
- `src/pages/ScheduleManagement/ScheduleManagement.tsx:73-97`：直接呼叫 `apiClient`，繞過 `src/services/scheduleService.ts`，用的欄位名稱（`schedule_date`/`remarks`）又是跟著 `useSchedule.ts` 的錯誤版本，導致真正欄位正確的 `scheduleService.ts` 反而是沒人用的死代碼

也就是說，就算把後端補上，現在的前端程式碼也會因為欄位名稱不一致而送出後端看不懂的資料，需要一併清理。

### 3. 目前的操作流程不符合您的需求

現有的 `ScheduleManagement.tsx` 是「選課堂 → 手動一筆一筆新增排期」，完全沒有「依 `day_of_week` + `start_date` 自動列出應上課日」的邏輯。這正是您需求第 4 點要的核心功能，目前是空白。

---

## 二、需求整理（依您原文＋討論後的決策）

1. 這是**已審批通過的課**（`approval_status` = `approved`/`active`）才需要排課，尚未審批的申請不顯示在此。
2. 申請人（老師）登入後管理自己的課，記錄每堂課「有上課 / 無上課（停課）/ 調課」。
3. 每個課的基準資料已存在 `TUTION_CLASS_KV`：
   - `day_of_week`：每週上課星期幾（Google Sheet「Classes」G 欄，已核對程式碼 `sheets-sync.ts:94/111` 一致）
   - `start_date`：開始上課日期（Google Sheet「Classes」J 欄，已核對 `sheets-sync.ts:97/114` 一致）
4. 管理介面需求：
   - 進入畫面後**自動**列出從 `start_date` 起算的所有上課日，不用老師手動一筆筆新增
   - 每個上課日可標記：**有開課**（預設）／**無開課**（需填原因）／**調課**（需填新日期＋新地點）
5. 要做響應式設計（沿用專案既有的 3 斷點：`0-767` / `768-1023` / `≥1024`）。

### 討論後追加的決策

- **產生範圍**：下限＝`start_date`（含所有已發生的歷史日期，統計才有意義），上限＝「今天 + 未來 1 週」，不做無限捲動載入更多。
- **課程結束日期**：`TutionClass` 目前沒有 `end_date`，需要新增這個欄位。**由管理員（AdminPanel）控制**，不開放給老師在申請表裡填，因為一般整學期課程結束日多半一致，只有少數提前結束的例外由管理員個別調整。
- **畫面呈現**：不用月曆（一個月可能只有 4 個標記，用整個畫面呈現太浪費），改用**清單／表格**：直向欄＝上課日期（每列一個日期），橫向欄＝該日的開課狀況＋點名情況。表格上方另外顯示彙總統計：**應開課數／實際開課數（含調課）／停課數／未確實點名數**。詳細設計見第六節。

---

## 三、資料模型變更

### 1. `TutionClass` 新增欄位

```ts
// src/types/index.ts（前端）
export interface TutionClass {
  // ...現有欄位不變
  end_date?: string; // YYYY-MM-DD，管理員設定，未設定則視為「尚未訂結束日」
}
```

後端 `PUT /api/v1/classes/:id`（`index.ts:554`）本來就是把 request body 直接 merge 進 KV 記錄（`kvService.updateClass`），**不需要改後端程式碼**，只要前端 AdminPanel 送出 `{ end_date }` 就能存進去。

Google Sheets「Classes」工作表建議加一欄 `End Date`（`sheets-sync.ts` 的 `syncClasses`/`readClasses` 要同步加欄位，否則之後同步會錯位）。

### 2. `TutionSchedule`（新／統一版本，取代三套不一致的定義）

```ts
export interface TutionSchedule {
  schedule_id: string;
  class_id: string;
  scheduled_date: string;         // YYYY-MM-DD，這堂課「原本」該上課的日期
  status: "held" | "cancelled" | "rescheduled";
  cancellation_reason?: string;   // status=cancelled 時必填
  rescheduled_to?: string;        // status=rescheduled 時必填：新日期
  rescheduled_venue?: string;     // 🆕 status=rescheduled 時必填：新地點（原本沒有這個欄位，但需求 4 明確要求）
  created_at: number;
  updated_at: number;
}
```

**關鍵設計**：`TUTION_SCHEDULE_KV` 只存「例外記錄」（老師主動標記過無開課／調課的日期），**不是**把每一週的上課日都存一筆。畫面上顯示的完整清單 = 「用 `day_of_week` + `start_date` 算出來的預設日期」 **merge** 「KV 裡的例外記錄」。沒有例外記錄的日期一律顯示「有開課」。這樣可以避免一開學就要為未來一整學期預先寫入幾十筆 KV（KV 有 PUT 額度限制，`tution-service.ts:19-21` 註解也提到全帳號共用 1,000 PUT/天）。

**型別要放在共用套件，不是只放前端**：目前 `TutionClass`/`TutionRoster`/`TutionAttendance` 的正式型別定義都在 `d:\chhsban\packages\kv-utils\src\types\index.ts`，後端 `tution-service.ts` 是 `import` 這個共用套件，前端 `types/index.ts` 則是各自重複定義了一份（這也是先前三套 `TutionSchedule` 對不上的根源之一）。這次新增的 `TutionSchedule` 一併補進 `@chhsban/kv-utils`，前後端都改成從這裡 import，不要再各自維護一份。

**額外核實發現（與第十節「點名」關聯有關）**：`@chhsban/kv-utils` 裡的 `TutionAttendance`（`kv-utils/src/types/index.ts:156`）其實**從來就沒有 `schedule_id` 這個欄位**，本來就是用 `class_id + class_date` 記錄出勤，只有前端自己 `types/index.ts` 那份重複定義才誤植了 `schedule_id`。也就是說第十節提出的「用 `class_id`＋日期關聯，不強制先有 `schedule_id`」其實不是新發明，是**後端本來就有的正確設計**，這次只是把前端錯誤的重複定義修正過來、對齊回共用套件。

---

## 四、排課日期產生邏輯

新增前端工具函式 `src/utils/scheduleGenerator.ts`：

```
輸入：class_id, day_of_week, start_date, end_date?, 例外記錄[]
規則：
  1. 從 start_date 開始，找出所有「星期 = day_of_week」的日期
  2. 上限 = min(今天 + 7 天, end_date ?? 今天 + 7 天)
  3. 對每個日期，查是否有對應的例外記錄：
     - 無 → 狀態顯示「有開課」（held，唯讀預設值，不寫入 KV）
     - 有 → 依例外記錄顯示 cancelled/rescheduled 及原因/新日期/新地點
輸出：完整日期清單（含預設 held 與例外），依日期排序
```

老師點某一天標記「無開課」或「調課」時，前端才呼叫 `POST /api/v1/schedules` 建立一筆例外記錄（若當天已有例外記錄則改用 `PUT` 更新）。標記回「有開課」則呼叫 `DELETE` 移除例外記錄，讓它回到預設狀態。

---

## 五、後端實作範圍（`chhsban-tution`）

1. **新增 KV Namespace**（您已授權，執行時不用再另外確認）
   - 在 `d:\chhsban\packages\cloudflare-config\src\kv-namespace.ts` 註冊 `TUTION_SCHEDULE_KV`（跟著現有 `TUTION_ROSTER_KV` 的寫法）
   - 在 `workers.ts:28` 的 `kvNamespaces` 陣列加入 `"TUTION_SCHEDULE_KV"`
   - 執行 `wrangler kv:namespace create TUTION_SCHEDULE_KV`（開發環境＋`--env production` 正式環境各建一個）取得實際 ID
   - 重新產生 `wrangler.toml`（該檔案開頭註明是自動產生，不能手動編輯，要透過 `packages/cloudflare-config` 的產生流程）

2. **新增排課路由**（比照 `index.ts:432` 的 `handleClasses` 寫法）
   ```
   GET    /api/v1/schedules?class={id}        列出該課程的所有例外記錄
   POST   /api/v1/schedules                    建立例外記錄（cancelled/rescheduled）
   PUT    /api/v1/schedules/:id                更新例外記錄
   DELETE /api/v1/schedules/:id                刪除例外記錄（改回「有開課」）
   ```
   - 權限比照 classes：只有該課程的 `teacher_id` 本人或 `admin`/`super_admin` 可操作
   - 在 `TutionKVService`（`tution-service.ts`）比照 `roster`/`attendance` 的模式加上 `createSchedule` / `getSchedule` / `listSchedulesByClass` / `updateSchedule` / `deleteSchedule`

3. **新增唯讀出勤查詢路由**（支援「未確實點名數」統計，僅讀取，不建立點名功能）
   ```
   GET /api/v1/attendance?class={id}   列出該課程所有出勤記錄（class_id + class_date + status）
   ```
   - 目前 `TUTION_ATTENDANCE_KV` 因為 `handleAttendance` 還是 TODO stub，實際上永遠是空的，這個端點現階段查回來都會是空陣列 —— 這是**正確**的行為，如實反映「點名功能還沒做」，不是要在這裡順便把點名做掉
   - 之所以現在就加這個唯讀端點，是因為排課表格的「未確實點名數」統計需要它；等下一個點名計畫把寫入功能做完，這個統計會自動變成有意義的數字，不用回頭改排課這邊的程式碼

4. **`index.ts` 路由表**（第 343-349 行附近）新增：
   ```ts
   if (pathname.startsWith("/api/v1/schedules")) {
     return handleSchedules(request, env, session);
   }
   ```
   `/api/attendance` 既有路由維持指向 `handleAttendance`（stub）不動；新的唯讀查詢改走 `/api/v1/attendance`，避免跟以後點名寫入功能的路由規劃衝突。

5. **Google Sheets 同步**：這次先不新增「Schedule」工作表同步（例外記錄量小、變動頻繁，同步價值低），只需要在 `syncClasses`/`readClasses` 加上 `End Date` 欄位對應 `end_date`。

---

## 六、前端實作範圍（`tution-portal`）

1. **清理不一致的型別/邏輯**
   - 刪除 `src/hooks/useSchedule.ts` 內重複的 `TutionSchedule` 定義，改 import `@/types`
   - `ScheduleManagement.tsx` 改成透過 `scheduleService.ts` 呼叫 API（欄位統一用 `scheduled_date`/`cancellation_reason`/`reschedule_reason`），不要直接用 `apiClient` 拼欄位
   - `scheduleService.ts` 補上 `createException`（無開課/調課）與 `clearException`（改回有開課）方法，並加上 `rescheduled_venue`

2. **`ScheduleManagement.tsx` 改版為清單表格**（`src/pages/ScheduleManagement/ScheduleManagement.tsx`）
   - 移除目前「list / form / stats」三個 tab 手動流程，改成：選課堂後**直接顯示自動產生的日期清單（表格）**

   **表格設計**（直向欄＝日期，橫向欄＝狀況）：

   | 日期（週幾） | 開課狀況 | 原因／調課資訊 | 點名情況 | 操作 |
   |---|---|---|---|---|
   | 2026-07-10（五） | ✅ 有開課 | — | ⚠️ 未點名 | 標記無開課／調課 |
   | 2026-07-17（五） | 🚫 無開課 | 教師有事 | — | 改回有開課 |
   | 2026-07-24（五） | 🔄 調課 → 07-26（日）＠ 教室 B203 | 場地衝突 | ⚠️ 未點名 | 改回有開課 |

   - 「點名情況」欄：查該列**實際上課日期**（`held`＝`scheduled_date`本身；`rescheduled`＝`rescheduled_to`）在 `TUTION_ATTENDANCE_KV` 有沒有記錄；`cancelled` 或日期還沒到的列不顯示點名情況（不適用）
   - 每列狀態預設「有開課」，老師點「標記無開課／調課」才彈出既有的 `ScheduleForm`／`RescheduleModal`；標記後可再點「改回有開課」（呼叫 `DELETE`）

   **表格上方統計列**：
   - 應開課數＝表格總列數（清單範圍內所有依 `day_of_week` 算出的日期）
   - 實際開課數（含調課）＝ `held` 數 + `rescheduled` 數
   - 停課數＝ `cancelled` 數
   - 未確實點名數＝ 實際上課日期 ≤ 今天，且狀態為 `held`/`rescheduled`，但查無出勤記錄的列數

   - `ScheduleStats.tsx` 改為呈現以上四個統計數字（取代原本「已上課/停課/調課次數」的簡易版本）

3. **`RescheduleModal.tsx`** 加上「新地點」欄位（目前只有新日期+原因，`components/schedule/RescheduleModal.tsx:77-104`）

4. **`AdminPanel.tsx`** 「已開課管理」分頁（`AdminPanel.tsx:260-324`）在每個 `course-row` 加上「設定結束日期」的輸入/按鈕，呼叫既有的 `PUT /api/v1/classes/:id` 存 `end_date`（後端不用改，只是前端新增這個小表單）

5. **響應式**：沿用 `components/schedule/schedule.css` 既有斷點架構、以及 `ApplicationList` 已經驗證過的「桌機表格／手機卡片」慣例：
   - 桌機（≥1024px）：完整表格，欄位如上
   - 手機（<768px）：表格改為單欄卡片堆疊，每張卡片＝一個日期，狀態／點名情況／操作按鈕垂直排列，按鈕維持可觸控大小（≥44×44px）
   - 課程開課時間長時列數會很多（例如上一整個學期），預設按日期新到舊排序，暫不做分頁；若您實際使用後覺得太長，可以再加分頁或「僅顯示最近 N 筆＋展開全部」

---

## 七、分階段執行順序

| 階段 | 內容 | 產出 |
|---|---|---|
| Phase A | 後端：新增 KV（含正式環境）+ `handleSchedules` CRUD + 唯讀 `/api/v1/attendance` 查詢 + `end_date` 支援確認 + `TutionSchedule` 補進 `@chhsban/kv-utils` | API 可用，可用 curl/Postman 驗證 |
| Phase B | 前端：清理型別不一致（改 import 共用套件）、`scheduleGenerator.ts` 產生邏輯 | 單元可測的純函式 |
| Phase C | 前端：`ScheduleManagement.tsx` 改版為表格（清單＋統計列＋逐列標記操作） | 主要功能可用 |
| Phase D | 前端：`RescheduleModal` 加地點欄位、`AdminPanel` 加結束日期設定 | 需求完整覆蓋 |
| Phase E | 響應式驗證（手機/平板/桌機）+ 部署 | 上線 |

---

## 八、本次明確不做的事（避免範圍蔓延）

- **點名的「寫入」功能**（實際點名 UI、`handleAttendance` 內部邏輯）——維持 TODO stub，「查看出席」按鈕先不處理。本次只加一個**唯讀**的出勤查詢端點供統計用，不等於把點名做掉
- Google Sheets 新增「Schedule」工作表同步
- 管理員的排課＋點名跨課程總覽（見第十節，留給下個點名計畫）
- `RosterManagement`、`AttendanceStats` 等其他模組的既有問題（不在本次需求範圍內，若您要一併處理可另外開計劃）

---

## 九、執行前確認狀態

1. ~~分頁/流程設計是否符合想像~~ → **已確認**：改為清單表格（直向＝日期，橫向＝開課狀況＋點名情況），非月曆，詳見第六節
2. ~~KV 建立是否需要另外確認~~ → **已授權**：Phase A 執行時直接建立，不再另外詢問
3. 依 Phase A → E 開始實作

**唯一提醒**：「點名情況」欄位在下個點名計畫做完之前，會**一律顯示「未點名」／未確實點名數會等於實際開課數**，這是如實反映現況（點名功能還沒上線），不是排課這邊的錯誤或 bug，請您知悉。

---

## 十、與未來「點名」計畫的關聯（核實結果）

您提出兩點：① 未來點名模組要能記錄「申請人當天有沒有切實點名」；② 管理員要能瀏覽申請人的開課＋點名情況總覽。核實後結論：

### 這次會處理的部分

1. **關聯鍵定案**：`TUTION_SCHEDULE_KV` 只存例外記錄，「有開課」（held）的日期完全不寫入 KV、也沒有 `schedule_id`。點名之後要記錄「某天有沒有點名」，關聯鍵定案為 `class_id + 日期`，不強制先有 `schedule_id`。這其實不是新發明——核實 `@chhsban/kv-utils` 的 `TutionAttendance` 型別後發現後端本來就是這樣設計（`class_id` + `class_date`，從來沒有 `schedule_id` 欄位），只是前端自己重複定義的那份型別誤植了 `schedule_id`。這次一併修正對齊，詳見第三節。
2. **唯讀出勤查詢**：新增 `GET /api/v1/attendance?class={id}`（唯讀），讓排課表格的「點名情況」欄和「未確實點名數」統計現在就能接上真實資料來源（雖然目前查回來都是空的，因為點名寫入功能還沒做，但架構已經接通，之後點名一上線這個統計會自動變準）。

排課表格本身要顯示的「點名情況」欄與統計數字，因此**不完全排除在外**，而是採「唯讀先接上、寫入留給下次」的做法。實際的點名輸入 UI、判斷規則、寫入 API 仍在第八節排除範圍。

### 留給下一個「點名」計畫的部分（先注記，供屆時參考）

1. **管理員總覽功能**：目前 `AdminPanel.tsx` 的「已開課管理」分頁只列課程基本資料，沒有任何排課/點名狀態欄位。下一個點名計畫需要新增類似 `GET /api/v1/admin/classes/:id/overview` 的彙總端點，回傳「本課程至今應上課日數／已標記狀態（held/cancelled/rescheduled）數／已點名數」，供管理員逐課或全體瀏覽。這需要排課（本次）與點名（下次）兩個後端都完成後才能實作，本次無法提前做。
2. **「有上課但未點名」的例外提示**：點名模組要能主動標示「已經標記 held 但過了上課時間還沒點名」的日期，方便老師補點名、管理員追蹤異常。這依賴點名後端的實際資料，本次不做，但已透過上面的關聯鍵決定預留了實作空間。
3. **點名與排課狀態的聯動規則**：例如老師把某天標成「無開課」後，該天是否要鎖定不能再點名；「調課」後點名該對應到原日期還是新日期——這些屬於點名模組的行為規則，建議下個計畫啟動時再與您確認。

---

**下一步**：計劃內容已依您兩輪回覆確認完畢，請您說一聲「開始」，我就依 Phase A → E 順序執行。

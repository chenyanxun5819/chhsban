# 點名系統開發計劃書 (v2 — 已核實，待最終確認後即可生成)

**建立日期**: 2026-08-10
**版本**: v2（依 2026-08-10 討論回覆修訂）
**狀態**: ✅ 主要決策已確認，僅餘極少數細節於下方標示
**前置文件**: `📝 文檔 (Markdown)/tution/260807/PROGRESS_REASSESSMENT.md`（2026-08-10 追加更新 B 節）

---

## 一、現況核實摘要（沿用 v1，未變動）

### 1.1 後端（chhsban-tution）
- `GET /api/v1/attendance?class={id}` — ✅ 可用，唯讀，回傳 `TutionAttendance[]`（目前恆為空陣列，因為沒有寫入路徑）。
- `POST/GET /api/attendance`（無 `/v1`）— ❌ 純占位樁，`// TODO: 實現點名邏輯`，無實際邏輯。
- `tution-service.ts` 已有可用的 `recordAttendance` / `updateAttendanceRecord` / `getAttendanceStats` 實作，但**目前路由 (`index.ts`) 沒有接上**，屬「寫好但沒接線」。
- 共用型別 `@chhsban/kv-utils`（詳見二、4 的說明）：
  ```ts
  export enum AttendanceStatus { PRESENT="present", ABSENT="absent", LATE="late", EXCUSE="excuse" }
  export interface TutionAttendance {
    attendance_id, class_id, student_id, class_date,
    status: AttendanceStatus, absence_reason?, recorded_at, recorded_by?
  }
  ```
  **本次確認：沿用既有 4 態，不擴充。**

### 1.2 前端（tution-portal）——目前並存 4 套互不相容的點名實作
| # | 檔案 | 路由狀態 | 狀態集合 | 備註欄 | 呼叫端點 |
|---|------|---------|---------|--------|---------|
| 1 | `pages/AttendanceSheet/AttendanceSheet.tsx` | ✅ 已掛路由 `/classes/:id/attendance` | 5 態（含 early/not_attended） | 無 | `/v1/classes/:id/attendance/bulk`（後端無對應） |
| 2 | `pages/AttendanceSheet/AttendanceManagement.tsx` + `components/attendance/AttendanceSheet.tsx`/`AttendanceRow.tsx` | ❌ 孤兒頁 | 3 態 | 無 | `/api/v1/attendance/bulk` |
| 3 | `services/attendanceService.ts` + `hooks/useAttendance.ts` | ❌ 未被引用 | 3 態 | 無 | `/v1/attendances`（複數） |
| 4 | `services/attendanceQueryService.ts` | ✅ 使用中（唯讀） | 4 態 | 無 | `/v1/attendance?class=`（唯讀） |

**重要發現（本次採用）**：檔案 #1（現有路由 `AttendanceSheet.tsx`）**已經是「學生 × 日期」矩陣格子（grid）設計**——橫欄為上課日期、直欄為學生，格子可點擊循環切換狀態，並有「編輯模式／儲存」的操作流程。這個 UI 骨架剛好符合您說的「30 學生 × 20 堂課 = 600 格」場景，**本次計劃直接沿用並改造這個既有骨架**，而不是重新設計一個逐日期列表頁，可省下不少工。

---

## 二、需求規格（v2 — 已依回覆確定）

### 2.1 狀態集合：沿用原有 4 態，取消 9 分類

| 顯示文字 | 代號（英文字首） | enum 值 |
|---------|-----------------|---------|
| 到課 | **P** | `present` |
| 缺席 | **A** | `absent` |
| 遲到 | **L** | `late` |
| 請假 | **E** | `excuse` |

- 預設值：**到課 (P)**。
- **工作流程**：學生若未到課又沒請假，老師先標記為「缺席 (A)」；事後向學生確認原因後，再把狀態改成「請假 (E)」並填寫理由。系統不會強制此流程（不鎖定 ABSENT → EXCUSE 的轉換順序），只是這是預期的實際操作方式，UI 上不需要特別限制。
- 代號採**英文字首**（PRESENT→P、ABSENT→A、LATE→L、EXCUSE→E），與 enum 值一一對應，不需要另外維護對照表。

### 2.2 理由（原「說明欄」，改為請假專屬的二層下拉選單）

- **只有狀態為「請假 (E)」時才需要填理由，且為必填**（不是原本設計的「可選填」）。到課／缺席／遲到皆不出現理由欄位。
- 理由本身是**下拉選單**（原 9 分類中扣掉「到課」「缺席」「遲到」，因為遲到已是獨立頂層狀態，不重複放入理由選單——此點已與您確認）：
  1. 事假
  2. 病假
  3. 公假
  4. 特假
  5. 喪假
  6. 活動開會
  7. **其他**（選此項時，出現一個自由文字輸入框，由老師手動填寫具體原因，此欄必填）

### 2.3 代號與色彩系統（因應大型矩陣顯示需求）

您描述的場景（30 學生 × 20 堂課 = 600 格）確認了矩陣格子必須「短代號 + 顏色」而非全稱文字，設計如下：

| 狀態 | 代號 | 建議色彩（沿用專案既有 schedule.css 色系） |
|------|------|------------------------------------------|
| 到課 P | `P` | 綠（同 `status-held` #28a745） |
| 缺席 A | `A` | 紅（同 `status-cancelled` #dc3545） |
| 遲到 L | `L` | 橙／黃（介於兩者之間，例如 #fd7e14） |
| 請假 E | `E` | 藍或灰紫（例如 #6c757d 或 #6f42c1，需與紅色明確區隔避免和缺席混淆） |

格子顯示「代號字母」，色塊為背景色；滑鼠 hover 或點擊展開時，才顯示完整文字（到課/缺席/遲到/請假）與（若為請假）理由內容。**不需要在資料庫另存 `status_code` 欄位**——代號是 `status` 值的固定衍生（首字母），我會在前端寫一個常數對照表（如 `STATUS_CODE = { present: "P", absent: "A", late: "L", excuse: "E" }`）就地換算，不增加資料儲存與維護成本。

---

## 三、資料模型設計（v2 — 確認不擴充 enum）

`@chhsban/kv-utils` 的 `AttendanceStatus` 與 `TutionAttendance` **維持現狀，不需修改**（與 v1 草案不同，v1 曾規劃擴充成 9 態，現已取消）：

```ts
export enum AttendanceStatus { PRESENT="present", ABSENT="absent", LATE="late", EXCUSE="excuse" }

export interface TutionAttendance {
  attendance_id: string;
  class_id: string;
  student_id: string;
  class_date: string;       // YYYY-MM-DD，對應 GeneratedScheduleRow.actual_date
  status: AttendanceStatus;
  absence_reason?: string;  // 僅 status = EXCUSE 時必填；其餘狀態不填
  recorded_at: number;
  recorded_by?: string;     // 記錄人（申請人/老師）
  updated_at?: number;      // 支援事後覆寫更新
}
```

`absence_reason` 欄位儲存的內容為理由選單的**中文文字**（例如「事假」「其他：塞車改道」），不需要额外欄位，前端下拉選單負責把「預設 7 選項 + 其他自由文字」組合成單一字串存入這個既有欄位。

> ✅ 因為**不擴充 enum**，這次改動**不會影響** `teacher-management` / `teacher-management-portal`（它們若有引用 `AttendanceStatus`，看到的值不會變），我仍會在動工前 grep 一次確認目前有沒有引用，純粹是保險，不會因此卡住進度。

---

## 四、後端 API 設計

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/v1/attendance?class={id}` | 既有，唯讀查詢整班點名記錄（`ScheduleManagement` 已在用）。維持不變。 |
| `POST` | `/api/v1/attendance/bulk` | **新增**：批次寫入（直接覆寫，不留歷史）某班某日期全體學生的點名結果。Body: `{ class_id, class_date, records: [{ student_id, status, absence_reason? }] }`。寫入前驗證：`class_date` 不可為已停課日期（比對 `TUTION_SCHEDULE_KV` 例外記錄）；`status = "excuse"` 時 `absence_reason` 為必填，否則拒絕請求。 |

實作方式：把 `tution-service.ts` 裡已寫好但未接線的 `recordAttendance` / `updateAttendanceRecord` 邏輯，正式接上 `index.ts` 路由並擴充為批次版本；同時移除 `/api/attendance`（無 `/v1`）那個占位樁，避免兩套並存造成混淆。

寫入採**直接覆寫（upsert）語意，不記錄修改歷史**（已確認）。

---

## 五、前端規劃（v2 — 沿用既有 grid 骨架改造）

### 5.1 整併策略（v3 — 主畫面改為單日期點名，矩陣改為點擊才展開的總覽）

> 2026-08-10 補充確認：矩陣格子（學生 × 日期）**不常駐於點名頁面**，只作為「總覽」，需另外點擊才展開；點名頁面預設呈現的是**單一日期**的點名操作畫面。格子尺寸等視覺細節留到微調階段再處理，本階段先以「可運作」為主。

- **保留**：`pages/AttendanceStats/`（唯讀統計，不動）。
- **改造**（非重寫）：`pages/AttendanceSheet/AttendanceSheet.tsx`（路由 `/classes/:id/attendance` 不變），拆成兩個顯示模式：
  1. **預設模式：單日期點名表**（主要操作介面）
     - 日期來源：`scheduleGenerator.generateScheduleRows()` 篩出「非停課且已到期」的日期，提供日期選擇器（下拉或列表），標示已點名／未點名徽章，預設選中最新一個未點名日期。
     - 選定日期後，列出該班全體學生，每人一列：狀態下拉選單（到課/缺席/遲到/請假，預設到課）＋（僅請假時顯示）理由下拉選單（7 選項＋其他，選其他才出現文字輸入框，必填）。
     - 提供「全部到課」快速按鈕。
     - 「儲存」按鈕呼叫 `POST /api/v1/attendance/bulk`，整包送出當前日期全班的點名結果（覆寫語意）。
     - 支援「事後更改」：重新選回已點名的日期，會載入既有紀錄並可直接修改後再儲存。
     - 儲存成功後，該日期出現在 `attendedDates`，`ScheduleTable.tsx` 的鎖定邏輯自動生效（不需改 `ScheduleTable.tsx`）。
  2. **選擇性模式：總覽矩陣**（沿用既有 grid 骨架，改為按鈕觸發顯示/隱藏，例如「查看總覽表格」）
     - 顯示「學生 × 日期」格子表（欄＝所有已到期非停課日期，列＝學生），格子顯示代號字母＋色塊（依 2.3 色彩表）。
     - 主要供快速檢視全班/整期出勤概況使用（例如管理員查核），非日常點名操作入口；本階段格子先用固定尺寸實作即可，格子大小/密度等視覺微調留到後續再處理。
     - 是否允許在總覽格子上直接點擊修改，或僅作唯讀展示：**本階段先做唯讀展示**（點名操作一律回到單日期模式進行），避免同一份資料有兩套編輯入口造成狀態不同步。
- **移除**（已確認直接刪除，見 5.2）：`AttendanceManagement.tsx`、`components/attendance/AttendanceSheet.tsx`/`AttendanceRow.tsx`/`AttendanceTable.tsx`、`services/attendanceService.ts`、`hooks/useAttendance.ts`。
- **擴充**：`services/attendanceQueryService.ts` 新增 `saveBulk()` 寫入方法（沿用其現有的型別，與 `TutionAttendance` 對齊，不需另建新 service 檔）。

### 5.2 孤兒檔案清理（已確認：直接刪除）

刪除以下 6 個檔案：
```
src/pages/AttendanceSheet/AttendanceManagement.tsx
src/components/attendance/AttendanceSheet.tsx
src/components/attendance/AttendanceRow.tsx
src/components/attendance/AttendanceTable.tsx
src/services/attendanceService.ts
src/hooks/useAttendance.ts
```
（`components/attendance/AttendanceStats.tsx`、`StatsSummary.tsx`、`AttendanceChart.tsx`、`AttendanceHistory.tsx` 是 `AttendanceStats` 頁在用，**保留不動**。）

刪除後會同步移除 `hooks/index.ts`、`components/attendance/index.ts` 內對應的 export。

**您要求的「完整專案檔案架構」**：待本次點名系統開發完成（含刪除孤兒檔案）後，我會額外輸出一份當時最新的完整目錄結構文件（例如 `PROJECT_STRUCTURE.md`），方便您與 GitHub 上的版本對接，屆時會列在交付項目中，現在先記錄這個待辦，不影響本次點名功能開發本身。

### 5.3 CSS
沿用並修改 `pages/AttendanceSheet/attendance-sheet.css`；因對應元件一併刪除，`components/attendance/attendance.css` 也一併移除。

---

## 六、共用型別補充說明（回覆您的第 4 點提問）

`packages/kv-utils` 是一個獨立的共用套件（不屬於任何單一專案），被 `chhsban-tution`（點名後端）、`tution-portal`（點名前端）等多個專案一起引用，用來定義「KV 資料庫裡的紀錄長什麼樣子」，例如 `AttendanceStatus` 列舉值、`TutionAttendance` 型別的欄位。它的作用是讓**後端寫入的資料格式**跟**前端讀取/顯示的格式**永遠對得上——改一個地方，所有引用它的專案會同步拿到新定義，不用每個專案各自維護一份、時間久了對不齊、出現像本次核實發現的「4 套不一致實作」問題。

因為**本次決定不擴充 enum**（沿用既有 4 態），這次改動對其他專案（`teacher-management` 系列）沒有影響，我仍會在動工前 grep 一次確認引用情形，屬於保險措施，不需要您再決定什麼。

---

## 七、工作拆解與粗估（v2）

| 階段 | 內容 | 預估 |
|------|------|------|
| A | 後端：接上 `recordAttendance`/`updateAttendanceRecord`，新增 `POST /api/v1/attendance/bulk`（含停課日期防呆、EXCUSE 必填理由驗證），移除占位樁路由 | 1.25 hr |
| B | 前端：改造既有 `AttendanceSheet.tsx` 矩陣頁——狀態集合改 4 態、欄位改用 `scheduleGenerator` 日期、代號+色彩格子、E 狀態理由選單（7+其他） | 2.5 hr |
| C | 前端：刪除 6 個孤兒檔案 + 對應 index.ts 匯出清理，`attendanceQueryService.ts` 擴充 `saveBulk()` | 0.5 hr |
| D | 測試驗證：點名 → `ScheduleTable` 鎖定生效 → 修改點名（覆寫）→ 停課日期不可點名 → `AttendanceStats`/PDF 讀取正確 | 0.5 hr |
| E | 交付：輸出完整專案目錄結構文件（供 GitHub 對接） | 0.25 hr |
| **合計** | | **~5 hr** |

---

## 八、已全部確認，開始動工

- 矩陣格子「請假」配色採 #6f42c1（已確認）。
- 格子大小等視覺細節留待微調階段處理，不影響本階段實作。

---

**v3 更動摘要**（相對 v2）：點名頁面預設顯示改為「單日期點名表」（主要操作介面），原本規劃的「學生 × 日期」矩陣改為**另外點擊才展開的唯讀總覽**，不常駐頁面。其餘決策（4 態沿用、理由選單 7+其他且不含遲到、孤兒檔案直接刪除並於完成後補完整目錄結構文件、不擴充共用型別、不留修改歷史）維持 v2 結論不變。

---

## 九、實作完成（2026-08-10）

已依本計劃書完成開發並通過建置驗證：

- 後端 `POST /api/v1/attendance/bulk` 已接上，`GET /api/v1/attendance?class={id}` 維持不變；`esbuild` 打包成功。
- 前端 `AttendanceSheet.tsx` 已改造為單日期點名表＋可展開總覽矩陣；`attendanceQueryService.ts` 已擴充 `saveBulk()`；`vite build` 成功。
- 6 個孤兒檔案（含 `attendance.css`）已刪除，`hooks/index.ts`、`components/attendance/index.ts` 匯出已同步清理。
- 完整目錄結構見同目錄下 `PROJECT_STRUCTURE.md`；進度總表更新見 `📝 文檔 (Markdown)/tution/260807/PROGRESS_REASSESSMENT.md` 的 C 節。

尚待人工驗證（未在本次範圍內自動測試）：實際登入系統以瀏覽器操作點名頁、確認 `ScheduleTable` 鎖定確實生效、確認總覽矩陣顯示與色彩符合預期。

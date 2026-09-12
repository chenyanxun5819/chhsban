# 申請人介面雙語化（中/英）計畫書

- 建立日期：2026-08-26
- 範圍：僅限「申請人」前台介面（非 super_admin 的 Sidebar/AdminPanel 不在本次範圍內）
- 狀態：待實施

## 一、範圍界定

`Layout.tsx` 的 Sidebar 僅提供給 `super_admin` 使用（一般申請人不顯示），故本次雙語化範圍 = 除 `AdminPanel.tsx` 外的所有頁面。`ClassroomManagement.tsx` 雖然路由未加權限守衛，但頁面內部會將非 admin/super_admin 使用者導離，實質上屬管理端頁面，一併排除。

需處理頁面（按文字量粗排）：

| 頁面/元件 | 說明 |
|---|---|
| `ApplicationManagement/ApplicationForm.tsx` | 申請表單，文字量最大 |
| `AttendanceSheet/AttendanceSheet.tsx` | 點名表 |
| `ApplicationManagement/ApplicationDetail.tsx` | 申請詳情 |
| `Welcome/Welcome.tsx` + `ReceiptUploadModal.tsx` | 首頁儀表板、收據上傳 |
| `ApplicationManagement/ApplicationList.tsx` | 申請列表 |
| `Login/Login.tsx` | 登入頁 |
| `AttendanceStats/AttendanceStats.tsx` + `components/attendance/*` | 出席統計 |
| `ScheduleManagement/ScheduleManagement.tsx` + `components/schedule/*`（CancelModal、RescheduleModal） | 排課管理、取消/改期 |
| `RosterManagement/RosterManagement.tsx` + `components/roster/*` | 學生名單 |
| `components/common/Layout.tsx`（Header） | 全站共用，含語言切換入口 |
| `components/form/CSVUploader.tsx`、`StudentListForm.tsx` | 名單匯入相關小元件 |
| `components/class/*`（ClassCard、ClassTable、ClassStatusBadge） | 課程卡片/列表 |
| `App.tsx` 內嵌的 `ClassList`、`Dashboard` | 簡易頁面 |

粗估約 35 個檔案、900+ 處中文字串。專案目前**未引入任何 i18n 套件**，需從零搭建。

## 二、技術方案

- 引入 `react-i18next` + `i18next`。專案本身依賴很輕（無 UI 庫、無狀態管理庫），但 i18n 手搓成本高於直接用成熟套件，故選擇引入。
- 字典採簡單平鋪 `zh.json` / `en.json`，不需要命名空間或複數規則。
- 語言切換狀態存 `localStorage`；預設語言判斷順序：使用者上次選擇 → 瀏覽器 `navigator.language` → 中文兜底。
- Header（`Layout.tsx`）加語言切換按鈕，申請人與管理端共用同一個 Header，此改動會一併影響到管理端的顯示（僅切換語言本身，不代表管理端文字全部翻譯）。

## 三、確認事項與困難點

### 1. 老師姓名 / 後端錯誤訊息 — 不處理
本次僅做「介面文案」層級的雙語化。後端 API 回傳的中文錯誤訊息（`err.response?.data?.error`，約 30 個檔案、101 處）維持中文不變；老師姓名僅有 `teacher_name_cn`、無 `teacher_name_en` 欄位，本次不新增後端欄位。

### 2. 科目 / 年級 — 釐清後範圍縮小

- **科目**：`ApplicationForm.tsx` 中「科目」實際是 `<input type="text">` 自由輸入框（申請人自行打字），`validators.ts` 內的 `SUBJECTS` 常量**未被任何地方引用**（死代碼）。自由輸入的文字前端無法代為翻譯，**本次不處理科目翻譯**，維持申請人輸入原文顯示。
- **年級**：`FORMS = ["初一", "初二", "初三", "高一", "高二", "高三"]`（`validators.ts:113`）為固定 6 值下拉選單，直接建立顯示層對照表：

  | 中文顯示值（既有資料/選單 value，不變動） | 英文顯示 |
  |---|---|
  | 初一 | Form 1 |
  | 初二 | Form 2 |
  | 初三 | Form 3 |
  | 高一 | Form 4 |
  | 高二 | Form 5 |
  | 高三 | Form 6 |

  僅做「顯示層」轉換，選單的實際 value 仍是「初一」～「高三」中文字串，不異動既有資料庫資料、不做資料遷移。

- **星期**：`DAYS_OF_WEEK` 7 個固定值（`validators.ts:123-131`），比照年級做同樣的簡單 label 對照表。

- 附註（不在本次處理範圍，僅供知悉）：`types/index.ts` 中 `TutionClass.form` 的 TS 型別宣告為 `"F1"~"F6"`，但實際執行時存的是「初一」等中文字串，兩者不一致，屬既有程式碼的型別不準確，與本次任務無關。

### 3. 日期格式 — 統一改為 DD/MM/YYYY

不做「依語言切換格式」的設計，中英文一律採馬來西亞通用的 `DD/MM/YYYY` 數字格式（語言中立，不需要 locale-dependent 邏輯）。需將 6 個檔案、11 處寫死的 `toLocaleDateString("zh-TW")` 全部替換為統一的 `formatDate()` 工具函式。

涉及檔案：
- `Welcome/Welcome.tsx`
- `ApplicationManagement/ApplicationDetail.tsx`
- `ApplicationManagement/ApplicationList.tsx`
- `ClassroomManagement/ClassroomManagement.tsx`（管理端，順手一併修正但非本次翻譯範圍）
- `components/attendance/AttendanceHistory.tsx`
- `components/admin/ApprovalList.tsx`（管理端，同上）

### 4. Excel/CSV 匯入匯出、範本檔案 — 待確認是否處理
`validators.ts` 的 `parseXLSX`、`googleSheetsSync.ts` 及申請表範本（如 `Template_tution.pdf`）的欄位標題若也要雙語，工作量會顯著增加，且範本檔案非程式碼改動可覆蓋。**本次暫不處理**，之後如有需要另行評估。

### 5. 版面因文字加長跑版
英文文案通常比中文長（如「審批管理」→「Approval Management」），部分表格欄位、按鈕在英文模式下可能因文字變長而跑版，需要切到英文後逐頁肉眼檢查，尤其是行動版底部導覽與窄欄位表格。

## 四、分階段實施計畫

1. **基礎設施**：安裝 `react-i18next`，建立 `zh.json`/`en.json` 骨架，Header 加語言切換按鈕 + `localStorage` 持久化。
2. **低風險先行**：共用元件文案（Layout、通用按鈕）+ 年級/星期對照表（不動資料庫）。
3. **逐頁翻譯**：Login → Welcome → ApplicationForm → ApplicationList/Detail → ScheduleManagement → RosterManagement → AttendanceSheet/Stats，每頁翻完切中英文各跑一次版面檢查。
4. **日期格式統一**：抽出 `formatDate()` 工具函式，取代 11 處寫死的 `zh-TW`。
5. **QA**：中英文各完整走一次申請人流程（登入 → 交申請 → 查看審批狀態 → 排課/名單/點名/統計），含手機版底部導覽版面檢查。

## 五、本次明確排除範圍

- AdminPanel 及所有 super_admin 專屬頁面/元件
- 後端 API 回傳的中文錯誤訊息
- 老師姓名雙語欄位（`teacher_name_en`）
- 科目（自由輸入文字）翻譯
- Excel/CSV/PDF 匯入匯出與範本檔案雙語化
- 資料庫既有資料遷移

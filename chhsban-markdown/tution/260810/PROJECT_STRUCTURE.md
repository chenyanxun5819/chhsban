# 補習班系統 — 專案目錄結構（點名系統完成後快照）

**建立日期**: 2026-08-10
**用途**: 點名系統開發完成、孤兒檔案清理後的完整目錄快照，供對接 GitHub 版本使用。
**涵蓋範圍**: `tution-portal`（前端）、`chhsban-tution`（後端 Cloudflare Worker）。`packages/kv-utils` 等共用套件未變動，未列出。

---

## 一、tution-portal（前端）

```
tution-portal/
└─ src/
   ├─ App.tsx                                  # 路由設定
   ├─ main.tsx
   ├─ vite-env.d.ts
   │
   ├─ components/
   │  ├─ admin/
   │  │  ├─ ApprovalList.tsx
   │  │  ├─ RejectModal.tsx
   │  │  ├─ admin.css
   │  │  └─ index.ts
   │  ├─ attendance/                           # 出勤統計頁（AttendanceStats）專用元件
   │  │  ├─ AttendanceChart.tsx
   │  │  ├─ AttendanceHistory.tsx
   │  │  ├─ AttendanceStats.tsx
   │  │  ├─ StatsSummary.tsx
   │  │  └─ index.ts
   │  ├─ class/
   │  │  ├─ ClassCard.tsx
   │  │  ├─ ClassStatusBadge.tsx
   │  │  ├─ ClassTable.tsx
   │  │  ├─ class.css
   │  │  └─ index.ts
   │  ├─ common/
   │  │  ├─ Layout.tsx
   │  │  ├─ ResponsiveCard.tsx
   │  │  └─ responsive-components.css
   │  ├─ form/
   │  │  ├─ CSVUploader.tsx
   │  │  ├─ StudentListForm.tsx
   │  │  ├─ form.css
   │  │  └─ index.ts
   │  ├─ roster/
   │  │  ├─ RosterRow.tsx
   │  │  ├─ RosterStats.tsx
   │  │  ├─ RosterTable.tsx
   │  │  ├─ index.ts
   │  │  └─ roster.css
   │  └─ schedule/                             # 開課管理（generator + 例外記錄架構）
   │     ├─ CancelModal.tsx
   │     ├─ RescheduleModal.tsx
   │     ├─ ScheduleStats.tsx
   │     ├─ ScheduleTable.tsx
   │     ├─ index.ts
   │     └─ schedule.css
   │
   ├─ context/
   │  └─ AuthContext.tsx
   │
   ├─ hooks/
   │  ├─ index.ts
   │  ├─ useClasses.ts
   │  └─ useRoster.ts
   │
   ├─ pages/
   │  ├─ AdminPanel/
   │  │  ├─ AdminPanel.tsx
   │  │  └─ admin-panel.css
   │  ├─ ApplicationManagement/
   │  │  ├─ ApplicationDetail.tsx
   │  │  ├─ ApplicationForm.tsx
   │  │  ├─ ApplicationList.tsx
   │  │  ├─ application-detail.css
   │  │  ├─ application-form.css
   │  │  └─ application-list.css
   │  ├─ AttendanceSheet/                      # ★ 點名頁（本次改造）
   │  │  ├─ AttendanceSheet.tsx                #   單日期點名表 + 可展開總覽矩陣，路由 /classes/:id/attendance
   │  │  └─ attendance-sheet.css
   │  ├─ AttendanceStats/                      # 出勤統計頁（唯讀，未變動）
   │  │  ├─ AttendanceStats.tsx
   │  │  └─ attendance-stats.css
   │  ├─ Login/
   │  │  ├─ Login.tsx
   │  │  └─ login.css
   │  ├─ PDFDownload/
   │  │  ├─ PDFDownload.tsx
   │  │  └─ pdf-download.css
   │  ├─ RosterManagement/
   │  │  └─ RosterManagement.tsx
   │  ├─ ScheduleManagement/                   # 開課管理頁（generator + 例外記錄架構）
   │  │  ├─ ScheduleManagement.tsx
   │  │  └─ schedule-management.css
   │  └─ Welcome/
   │     ├─ Welcome.tsx
   │     └─ welcome.css
   │
   ├─ services/
   │  ├─ adminService.ts
   │  ├─ attendanceQueryService.ts              # ★ 點名查詢／寫入服務（本次擴充 saveBulk）
   │  ├─ authService.ts
   │  ├─ classService.ts
   │  ├─ googleSheetsSync.ts
   │  ├─ rosterService.ts
   │  └─ scheduleService.ts
   │
   ├─ styles/
   │  ├─ App.css
   │  ├─ index.css
   │  ├─ layout.css
   │  └─ responsive.css
   │
   ├─ types/
   │  └─ index.ts
   │
   └─ utils/
      ├─ api.ts
      ├─ pdfGenerator.ts
      ├─ scheduleGenerator.ts                   # 排課日期自動推算 + 統計
      └─ validators.ts
```

### 本次點名系統開發的異動摘要

| 動作 | 檔案 |
|------|------|
| 重寫 | `pages/AttendanceSheet/AttendanceSheet.tsx`、`pages/AttendanceSheet/attendance-sheet.css` |
| 擴充 | `services/attendanceQueryService.ts`（新增 `saveBulk()`、狀態代號/顏色對照表、請假理由選項） |
| 刪除 | `pages/AttendanceSheet/AttendanceManagement.tsx`（孤兒頁，未掛路由） |
| 刪除 | `components/attendance/AttendanceSheet.tsx`、`AttendanceRow.tsx`、`AttendanceTable.tsx`、`attendance.css`（未使用或已被取代） |
| 刪除 | `services/attendanceService.ts`、`hooks/useAttendance.ts`（未使用，端點與型別皆與現行後端不一致） |
| 清理 | `hooks/index.ts`（移除 `useAttendance` 匯出）、`components/attendance/index.ts`（移除 `AttendanceSheet`/`AttendanceRow` 匯出，只保留 `AttendanceStats` 統計頁在用的元件） |

---

## 二、chhsban-tution（後端 Cloudflare Worker）

```
chhsban-tution/
└─ src/
   ├─ index.ts              # 入口點：路由分派、各端點 handler（含本次擴充的 handleAttendance）
   ├─ tution-service.ts     # TutionKVService：補習班/名冊/出勤/排課的 KV 操作實作
   ├─ sheets-sync.ts        # Google Sheets 同步
   ├─ pdf-generator.ts      # PDF 生成
   └─ api-documentation.ts  # API 文件（部分端點，未含排課/點名，屬既有缺口）
```

### 本次點名系統開發的異動摘要

| 動作 | 內容 |
|------|------|
| 重寫 | `handleAttendance()`（`src/index.ts`）：原本 `GET /api/v1/attendance` 唯讀查詢 + `POST/GET /api/attendance` 占位樁，整併為單一函式，新增 `POST /api/v1/attendance/bulk` 批次寫入（覆寫語意，含停課日期防呆、請假必填理由驗證） |
| 移除 | `/api/attendance`（無 `/v1`）路由，避免與正式端點並存造成混淆 |

---

## 三、未變動但值得留意的既有缺口（非本次範圍，僅記錄）

- `src/api-documentation.ts` 未涵蓋排課（`/api/v1/schedules`）與點名（`/api/v1/attendance`）端點的正式文件，屬既有缺口。
- `chhsban-tution` 專案的 `npm run type-check`（純 `tsc --noEmit`）在本次修改前即無法乾淨通過（缺少 `@cloudflare/workers-types` 型別環境設定，`pdf-generator.ts`/`sheets-sync.ts`/`tution-service.ts` 亦有多筆既有型別錯誤），與本次點名開發無關；實際部署驗證以 `npm run build`（esbuild）與 `wrangler dev` 為準，本次改動已確認 esbuild 打包成功。
- `pages/AttendanceStats/AttendanceStats.tsx` 呼叫 `/api/v1/attendance?class=`，但 `apiClient` 的 `baseURL` 已包含 `/api`，實際請求會變成 `/api/api/v1/attendance`（雙重 `/api`），推測此頁目前抓不到資料；因不在本次點名系統計劃範圍內，僅記錄於此，未一併修正。

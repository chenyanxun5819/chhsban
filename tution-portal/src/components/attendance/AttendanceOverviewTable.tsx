import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { GeneratedScheduleRow } from "@/utils/scheduleGenerator";
import { ATTENDANCE_STATUS_META, type AttendanceQueryRecord } from "@/services/attendanceQueryService";
import type { ClassRosterEntry } from "@/types";
import { useAttendanceStatusLabel, useExcuseReasonLabel } from "@/i18n/labels";
import { formatDisplayDate } from "@/utils/validators";
import "@/pages/AttendanceSheet/attendance-sheet.css";

/** 學生的加入日期若晚於指定上課日，代表當天該生尚未加入班級，不應被點名。 */
export function isEnrolledByDate(student: ClassRosterEntry, dateStr: string): boolean {
  return student.enrollment_date <= dateStr;
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 總覽表格日期表頭用：拆成「月份英文縮寫」+「日」兩段，方便疊成兩行、縮窄欄寬。 */
function formatMonthDayParts(dateStr: string): { month: string; day: string } {
  const [, m, d] = dateStr.split("-");
  return { month: MONTH_ABBR[Number(m) - 1] || m, day: d };
}

/** 總覽表格手機分頁用：每個月份的完整標籤（月份全拼 + 年），例如 "July 2026"。 */
function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_FULL[m - 1] || m} ${y}`;
}

/** 手機斷點與桌機共用（見 attendance-sheet.css 的 @media max-width: 767px）。 */
const MOBILE_BREAKPOINT = 767;

/** 總覽表格在手機模式下，每個月固定佔用的日期欄數下限——通常一個月 4～5 堂課，欄數不足時
 * 補空白欄湊滿；若某月因為加課超過這個數字，照實際堂數顯示，不裁切資料。 */
const MOBILE_MATRIX_MONTH_COLS = 6;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

interface AttendanceOverviewProps {
  rows: GeneratedScheduleRow[];
  /** 完整排課列表（含停課、未來場次），只用於下方「本月排課紀錄」條列，矩陣本身仍只用 rows。 */
  allRows: GeneratedScheduleRow[];
  roster: ClassRosterEntry[];
  recordsByKey: Map<string, AttendanceQueryRecord>;
}

interface MonthGroup {
  key: string; // "YYYY-MM"
  label: string; // 月份全拼 + 年，例如 "July 2026"
  rows: GeneratedScheduleRow[];
}

/** 「學生 × 日期」矩陣總覽，唯讀，僅供快速檢視整期出勤概況（例如管理員查核）；不在此處編輯。 */
export const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({
  rows,
  allRows,
  roster,
  recordsByKey,
}) => {
  const { t } = useTranslation();
  const statusLabel = useAttendanceStatusLabel();
  const reasonLabel = useExcuseReasonLabel();
  const formatScheduleStatusLine = (row: GeneratedScheduleRow): string => {
    if (row.status === "cancelled") return t("attendanceSheet.scheduleCancelled", { date: row.scheduled_date });
    if (row.status === "rescheduled")
      return t("attendanceSheet.scheduleRescheduled", { date: row.scheduled_date, newDate: row.rescheduled_to });
    return t("attendanceSheet.scheduleHeld", { date: row.scheduled_date });
  };
  const chronological = useMemo(() => [...rows].reverse(), [rows]);
  const isMobile = useIsMobile();

  // 手機模式：以「月」分頁（上/下個月切換），每月欄數鎖死在 MOBILE_MATRIX_MONTH_COLS 以上，
  // 不靠橫向捲動；桌機維持原本一次全部顯示、超出寬度就橫向拉 bar。
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, GeneratedScheduleRow[]>();
    chronological.forEach((row) => {
      const key = row.actual_date.slice(0, 7);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    });
    return Array.from(map.entries()).map(([key, monthRows]) => ({
      key,
      label: formatMonthLabel(key),
      rows: monthRows,
    }));
  }, [chronological]);

  const totalPages = isMobile ? Math.max(1, monthGroups.length) : 1;
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // 預設停在最後一頁（最新月份），沒手動翻頁前一律跟著資料筆數走。
  const currentPageIndex = Math.min(pageIndex ?? totalPages - 1, totalPages - 1);
  const currentMonth = isMobile ? monthGroups[currentPageIndex] : undefined;
  const visibleColumns = isMobile ? currentMonth?.rows ?? [] : chronological;

  // 表格下方的「本月排課紀錄」條列：用完整排課列表（含停課），依「原訂日期」分月分組，
  // 手機模式只顯示當前分頁那個月，桌機因為矩陣本身不分月，改為每個月各自列出。
  const scheduleMonthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, GeneratedScheduleRow[]>();
    allRows.forEach((row) => {
      const key = row.scheduled_date.slice(0, 7);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    });
    return Array.from(map.entries())
      .map(([key, monthRows]) => ({
        key,
        label: formatMonthLabel(key),
        rows: [...monthRows].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1)),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [allRows]);

  const visibleScheduleGroups = isMobile
    ? scheduleMonthGroups.filter((group) => group.key === currentMonth?.key)
    : scheduleMonthGroups;
  // 一個月不滿 MOBILE_MATRIX_MONTH_COLS 欄時（多數月份只有 4～5 堂課），補空白欄湊滿，
  // 讓每個月的表格寬度都一致；若某月加課超過這個欄數，照實際堂數顯示，不裁切資料。
  const totalCols = isMobile ? Math.max(MOBILE_MATRIX_MONTH_COLS, visibleColumns.length) : visibleColumns.length;
  const padCount = isMobile ? Math.max(0, totalCols - visibleColumns.length) : 0;
  const padKeys = Array.from({ length: padCount }, (_, i) => `pad-${i}`);

  // 手機模式下欄寬用百分比算，讓表格永遠佈滿卡片寬度（名字欄加寬，日期欄平分剩餘空間）；
  // 桌機沿用 CSS 裡的固定 px 欄寬，欄數一多就交給外層橫向捲動，不用百分比硬擠。
  const NAME_COL_PERCENT = 26;
  const studentColStyle = isMobile ? { width: `${NAME_COL_PERCENT}%` } : undefined;
  const dateColStyle = isMobile ? { width: `${(100 - NAME_COL_PERCENT) / totalCols}%` } : undefined;

  if (roster.length === 0) {
    return <div className="attendance-empty">{t("attendanceSheet.noActiveStudents")}</div>;
  }

  return (
    <div className="attendance-overview">
      {isMobile && totalPages > 1 && (
        <div className="attendance-matrix-pagination">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
          >
            {t("attendanceSheet.prevMonth")}
          </button>
          <span className="attendance-matrix-page-info">{currentMonth?.label}</span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === totalPages - 1}
          >
            {t("attendanceSheet.nextMonth")}
          </button>
        </div>
      )}

      <div className="attendance-overview-scroll">
        <table className={isMobile ? "attendance-matrix attendance-matrix--fill" : "attendance-matrix"}>
          <thead>
            <tr>
              <th className="attendance-matrix-student-col" style={studentColStyle}>
                {t("attendanceSheet.studentCol")}
              </th>
              {visibleColumns.map((row) => {
                const { month, day } = formatMonthDayParts(row.actual_date);
                return (
                  <th
                    key={row.actual_date}
                    title={row.actual_date}
                    className="attendance-matrix-date-col"
                    style={dateColStyle}
                  >
                    <span className="attendance-date-chip">
                      <span className="attendance-date-month">{month}</span>
                      <span className="attendance-date-day">{day}</span>
                    </span>
                  </th>
                );
              })}
              {padKeys.map((key) => (
                <th
                  key={key}
                  className="attendance-matrix-date-col attendance-matrix-date-col-empty"
                  style={dateColStyle}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.student_id}>
                <td className="attendance-matrix-student-col" style={studentColStyle}>
                  <div className="attendance-matrix-student-name">{student.name_cn}</div>
                  <div className="attendance-matrix-student-meta">
                    <span className="attendance-matrix-student-no">{student.student_no}</span>
                    <span className="attendance-matrix-student-class">{student.real_class_name}</span>
                  </div>
                </td>
                {visibleColumns.map((row) => {
                  if (!isEnrolledByDate(student, row.actual_date)) {
                    return (
                      <td
                        key={row.actual_date}
                        className="attendance-matrix-cell attendance-matrix-cell-not-joined"
                        title={t("attendanceSheet.notJoinedCellTitle", {
                          date: formatDisplayDate(row.actual_date),
                          joinDate: formatDisplayDate(student.enrollment_date),
                        })}
                        style={dateColStyle}
                      >
                        -
                      </td>
                    );
                  }

                  const record = recordsByKey.get(`${student.student_id}|${row.actual_date}`);
                  const meta = record ? ATTENDANCE_STATUS_META[record.status] : null;
                  const title = meta
                    ? `${formatDisplayDate(row.actual_date)} ${statusLabel(meta.label)}${
                        record?.absence_reason ? `：${reasonLabel(record.absence_reason)}` : ""
                      }`
                    : t("attendanceSheet.notMarkedCellTitle", { date: formatDisplayDate(row.actual_date) });
                  return (
                    <td
                      key={row.actual_date}
                      className="attendance-matrix-cell"
                      title={title}
                      style={{
                        background: meta ? meta.color : "#eee",
                        color: meta ? "#fff" : "#999",
                        ...dateColStyle,
                      }}
                    >
                      {meta ? meta.code : "·"}
                    </td>
                  );
                })}
                {padKeys.map((key) => (
                  <td
                    key={key}
                    className="attendance-matrix-cell attendance-matrix-cell-empty"
                    style={dateColStyle}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleScheduleGroups.map((group) => (
        <div className="attendance-schedule-log" key={group.key}>
          <h4 className="attendance-schedule-log-title">
            {isMobile ? t("attendanceSheet.thisMonthScheduleLog") : t("attendanceSheet.monthScheduleLog", { month: group.label })}
          </h4>
          {group.rows.length === 0 ? (
            <p className="attendance-schedule-log-empty">{t("attendanceSheet.noScheduleLog")}</p>
          ) : (
            <ul className="attendance-schedule-log-list">
              {group.rows.map((row) => (
                <li key={row.scheduled_date} className={`attendance-schedule-log-item status-${row.status}`}>
                  {formatScheduleStatusLine(row)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="attendance-legend">
        {(Object.keys(ATTENDANCE_STATUS_META) as Array<keyof typeof ATTENDANCE_STATUS_META>).map((status) => (
          <span className="attendance-legend-item" key={status}>
            <span
              className="attendance-legend-swatch"
              style={{ background: ATTENDANCE_STATUS_META[status].color }}
            >
              {ATTENDANCE_STATUS_META[status].code}
            </span>
            {statusLabel(ATTENDANCE_STATUS_META[status].label)}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AttendanceOverview;

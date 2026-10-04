import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "@/tution/i18n";
import type { GeneratedScheduleRow } from "@/tution/utils/scheduleGenerator";
import { ATTENDANCE_STATUS_META, type AttendanceQueryRecord } from "@/tution/services/attendanceQueryService";
import type { ClassRosterEntry } from "@/tution/types";
import { useAttendanceStatusLabel, useExcuseReasonLabel } from "@/tution/i18n/labels";
import { formatDisplayDate } from "@/tution/utils/validators";
import { getCalendar } from "@/optional/services/calendarService";
import type { SchoolCalendar } from "@/optional/types";

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

/** 奇數月／偶數月交替底色，讓桌機不分頁的總覽也看得出月份分界（樣式同選修課點名總覽）。 */
const monthToneClass = (date: string): string =>
  Number(date.slice(5, 7)) % 2 === 1 ? "attendance-month-odd" : "attendance-month-even";

/** 手機斷點與桌機共用（見 attendance-sheet.css 的 @media max-width: 767px）。 */
const MOBILE_BREAKPOINT = 767;

/** 總覽表格在手機模式下，每個月固定佔用的日期欄數下限——通常一個月 4～5 堂課，欄數不足時
 * 補空白欄湊滿；若某月因為加課超過這個數字，照實際堂數顯示，不裁切資料。 */
const MOBILE_MATRIX_MONTH_COLS = 6;

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}

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

/** 停課／調課原訂日期：整欄合併成一格（同選修課點名總覽的 C／R） */
interface SpecialColumn {
  code: string;
  className: string;
  title: string;
}

/** 矩陣的一欄：一般上課日，或整欄合併的停課／調課原訂日期 */
interface MatrixColumn {
  date: string;
  special?: SpecialColumn;
}

interface ColumnMonthGroup {
  key: string;
  label: string;
  columns: MatrixColumn[];
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
    if (row.status === "extra") {
      return t("attendanceSheet.scheduleExtra", { date: row.scheduled_date, note: row.extra_session_note || "—" });
    }
    return t("attendanceSheet.scheduleHeld", { date: row.scheduled_date });
  };
  const isMobile = useIsMobile();

  // 表格上方的勾選框：預設都不勾，勾了才把調課原訂日期（R）、停課（C）、假期（H）顯示成整欄合併的一格
  const [showRescheduled, setShowRescheduled] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showHoliday, setShowHoliday] = useState(false);

  // 假期沿用學校行事曆（選修課行事曆），勾選「顯示假期」才去讀；讀不到的年份就不標
  const [calendars, setCalendars] = useState<SchoolCalendar[]>([]);
  const yearsKey = useMemo(
    () => Array.from(new Set(rows.map((row) => row.actual_date.slice(0, 4)))).sort().join(","),
    [rows]
  );
  useEffect(() => {
    if (!showHoliday || !yearsKey) {
      setCalendars([]);
      return;
    }
    let cancelled = false;
    Promise.all(yearsKey.split(",").map((y) => getCalendar(Number(y)).catch(() => null))).then((list) => {
      if (!cancelled) setCalendars(list.filter((c): c is SchoolCalendar => !!c));
    });
    return () => {
      cancelled = true;
    };
  }, [showHoliday, yearsKey]);

  // 欄位：rows 的實際上課日，加上今天以前停課／調課的原訂日期（整欄合併顯示 C／R）；
  // 原訂日期若同時是某堂課的實際上課日（例如別堂調課過來），照一般上課日顯示。
  // 假期：落在行事曆假期、且沒有任何點名紀錄的上課日，整欄改顯示 H。
  const columns = useMemo<MatrixColumn[]>(() => {
    const actualDates = new Set(rows.map((row) => row.actual_date));
    const recordedDates = new Set(Array.from(recordsByKey.keys()).map((key) => key.split("|")[1]));
    const holidays = calendars.flatMap((c) => c.holidays);
    const makeupDays = new Set(calendars.flatMap((c) => c.makeup_days.map((m) => m.date)));
    const today = todayStr();
    const list: MatrixColumn[] = Array.from(actualDates).map((date) => {
      if (!showHoliday || recordedDates.has(date) || makeupDays.has(date)) return { date };
      const holiday = holidays.find((h) => date >= h.start_date && date <= h.end_date);
      if (!holiday) return { date };
      return {
        date,
        special: {
          code: "H",
          className: "attendance-matrix-cell-holiday",
          title: t("attendanceSheet.holidayCellTitle", { date: formatDisplayDate(date), name: holiday.name }),
        },
      };
    });
    allRows.forEach((row) => {
      const d = row.scheduled_date;
      if (row.status === "held" || row.status === "extra" || d > today || actualDates.has(d)) return;
      if (row.status === "cancelled" && !showCancelled) return;
      if (row.status === "rescheduled" && !showRescheduled) return;
      const special: SpecialColumn =
        row.status === "cancelled"
          ? {
              code: "C",
              className: "attendance-matrix-cell-cancelled",
              title: `${t("attendanceSheet.cancelledCellTitle", { date: formatDisplayDate(d) })}${
                row.cancellation_reason ? `：${row.cancellation_reason}` : ""
              }`,
            }
          : {
              code: "R",
              className: "attendance-matrix-cell-rescheduled",
              title: `${t("attendanceSheet.rescheduledCellTitle", {
                date: formatDisplayDate(d),
                newDate: row.rescheduled_to ? formatDisplayDate(row.rescheduled_to) : "-",
              })}${row.rescheduled_venue ? `（${row.rescheduled_venue}）` : ""}${
                row.reschedule_reason ? `：${row.reschedule_reason}` : ""
              }`,
            };
      list.push({ date: d, special });
    });
    return list.sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [rows, allRows, recordsByKey, calendars, showHoliday, showCancelled, showRescheduled, t]);

  // 手機模式：以「月」分頁（上/下個月切換），每月欄數鎖死在 MOBILE_MATRIX_MONTH_COLS 以上，
  // 不靠橫向捲動；桌機維持原本一次全部顯示、超出寬度就橫向拉 bar。
  const monthGroups = useMemo<ColumnMonthGroup[]>(() => {
    const map = new Map<string, MatrixColumn[]>();
    columns.forEach((col) => {
      const key = col.date.slice(0, 7);
      const bucket = map.get(key);
      if (bucket) bucket.push(col);
      else map.set(key, [col]);
    });
    return Array.from(map.entries()).map(([key, monthColumns]) => ({
      key,
      label: formatMonthLabel(key),
      columns: monthColumns,
    }));
  }, [columns]);

  const totalPages = isMobile ? Math.max(1, monthGroups.length) : 1;
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // 預設停在最後一頁（最新月份），沒手動翻頁前一律跟著資料筆數走。
  const currentPageIndex = Math.min(pageIndex ?? totalPages - 1, totalPages - 1);
  const currentMonth = isMobile ? monthGroups[currentPageIndex] : undefined;
  const visibleColumns = isMobile ? currentMonth?.columns ?? [] : columns;

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
      <div className="attendance-overview-toggles">
        <label>
          <input type="checkbox" checked={showRescheduled} onChange={(e) => setShowRescheduled(e.target.checked)} />
          {t("attendanceSheet.showRescheduled")}
        </label>
        <label>
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
          {t("attendanceSheet.showCancelled")}
        </label>
        <label>
          <input type="checkbox" checked={showHoliday} onChange={(e) => setShowHoliday(e.target.checked)} />
          {t("attendanceSheet.showHoliday")}
        </label>
      </div>

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
              {visibleColumns.map((col) => {
                const { month, day } = formatMonthDayParts(col.date);
                return (
                  <th
                    key={col.date}
                    title={col.special ? col.special.title : formatDisplayDate(col.date)}
                    className={`attendance-matrix-date-col ${monthToneClass(col.date)}`}
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
            {roster.map((student, rowIndex) => (
              <tr key={student.student_id}>
                <td className="attendance-matrix-student-col" style={studentColStyle}>
                  <div className="attendance-matrix-student-line">
                    <div
                      className={`attendance-matrix-student-name${
                        student.is_active ? "" : " attendance-matrix-student-name--withdrawn"
                      }`}
                    >
                      {student.name_cn}
                    </div>
                    <div className="attendance-matrix-student-meta">
                      <span className="attendance-matrix-student-no">{student.student_no}</span>
                      <span className="attendance-matrix-student-class">{student.real_class_name}</span>
                    </div>
                  </div>
                  {!student.is_active && (
                    <div className="attendance-matrix-withdrawn">
                      {student.withdrawal_date
                        ? `${formatDisplayDate(student.withdrawal_date)} 退出`
                        : t("roster.statusWithdrawn")}
                    </div>
                  )}
                </td>
                {visibleColumns.map((col) => {
                  const date = col.date;
                  if (col.special) {
                    // 停課／調課原訂日期整欄合併成一格，只在第一列輸出
                    if (rowIndex > 0) return null;
                    return (
                      <td
                        key={date}
                        rowSpan={roster.length}
                        className={`attendance-matrix-cell ${col.special.className}`}
                        title={col.special.title}
                        style={dateColStyle}
                      >
                        {col.special.code}
                      </td>
                    );
                  }
                  if (!isEnrolledByDate(student, date)) {
                    return (
                      <td
                        key={date}
                        className={`attendance-matrix-cell attendance-matrix-cell-not-joined ${monthToneClass(date)}`}
                        title={t("attendanceSheet.notJoinedCellTitle", {
                          date: formatDisplayDate(date),
                          joinDate: formatDisplayDate(student.enrollment_date),
                        })}
                        style={dateColStyle}
                      >
                        -
                      </td>
                    );
                  }

                  const record = recordsByKey.get(`${student.student_id}|${date}`);
                  // 退出日期（含）之後沒有紀錄：反灰，不算未點名
                  if (!record && !student.is_active && student.withdrawal_date && student.withdrawal_date <= date) {
                    return (
                      <td
                        key={date}
                        className={`attendance-matrix-cell attendance-matrix-cell-not-joined ${monthToneClass(date)}`}
                        title={`${formatDisplayDate(date)} 已退出（${formatDisplayDate(student.withdrawal_date)} 退出${
                          student.withdrawal_reason ? `：${student.withdrawal_reason}` : ""
                        }）`}
                        style={dateColStyle}
                      >
                        -
                      </td>
                    );
                  }
                  const meta = record ? ATTENDANCE_STATUS_META[record.status] : null;
                  if (!meta) {
                    return (
                      <td
                        key={date}
                        className={`attendance-matrix-cell attendance-matrix-cell-unmarked ${monthToneClass(date)}`}
                        title={t("attendanceSheet.notMarkedCellTitle", { date: formatDisplayDate(date) })}
                        style={dateColStyle}
                      >
                        ·
                      </td>
                    );
                  }
                  return (
                    <td
                      key={date}
                      className="attendance-matrix-cell"
                      title={`${formatDisplayDate(date)} ${statusLabel(meta.label)}${
                        record?.absence_reason ? `：${reasonLabel(record.absence_reason)}` : ""
                      }`}
                      style={{ background: meta.color, color: "#fff", ...dateColStyle }}
                    >
                      {meta.code}
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
        {showHoliday && (
          <span className="attendance-legend-item">
            <span className="attendance-legend-swatch attendance-matrix-cell-holiday">H</span>
            {t("attendanceSheet.legendHoliday")}
          </span>
        )}
        {showCancelled && (
          <span className="attendance-legend-item">
            <span className="attendance-legend-swatch attendance-matrix-cell-cancelled">C</span>
            {t("attendanceSheet.legendCancelled")}
          </span>
        )}
        {showRescheduled && (
          <span className="attendance-legend-item">
            <span className="attendance-legend-swatch attendance-matrix-cell-rescheduled">R</span>
            {t("attendanceSheet.legendRescheduled")}
          </span>
        )}
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-unmarked">·</span>
          {t("attendanceSheet.legendUnmarked")}
        </span>
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-not-joined">-</span>
          {t("attendanceSheet.legendNotJoined")}
        </span>
      </div>
    </div>
  );
};

export default AttendanceOverview;

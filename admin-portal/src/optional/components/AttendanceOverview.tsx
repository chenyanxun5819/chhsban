import React, { useEffect, useMemo, useState } from "react";
import type { CourseAttendanceStatus, CourseSessionsInfo, OptionalCourseAttendance, OptionalCourseRoster, Weekday } from "@/optional/types";
import { formatDate, weekdayOf } from "@/optional/utils/calendar";
import "@/optional/optional.css";

// 版面沿用 tution-portal 的 AttendanceOverviewTable（學生 × 日期矩陣，手機依月份分頁）

export const ATTENDANCE_STATUS_META: Record<CourseAttendanceStatus, { label: string; code: string; color: string }> = {
  present: { label: "到課", code: "P", color: "#28a745" },
  absent: { label: "缺課", code: "A", color: "#dc3545" },
  late: { label: "遲到", code: "L", color: "#fd7e14" },
  excuse: { label: "有理由缺席", code: "E", color: "#6f42c1" },
};

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MOBILE_BREAKPOINT = 767;
/** 手機模式每月至少佔的日期欄數，不足補空白欄，讓每個月的表格寬度一致 */
const MOBILE_MATRIX_MONTH_COLS = 6;
const NAME_COL_PERCENT = 26;
const DAY_MS = 24 * 60 * 60 * 1000;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

const addDays = (date: string, days: number): string =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** 奇數月／偶數月交替底色，讓不分頁的總覽也看得出月份分界 */
const monthToneClass = (date: string): string =>
  Number(date.slice(5, 7)) % 2 === 1 ? "oc-att-month-odd" : "oc-att-month-even";

/** 推算假期用到的行事曆欄位（與 SchoolCalendar 相容） */
export interface OverviewCalendar {
  term_start?: string;
  term_end?: string;
  holidays: Array<{ start_date: string; end_date: string; name: string }>;
  makeup_days: Array<{ date: string }>;
}

export interface OverviewCourse {
  day_of_week?: Weekday;
  start_date?: string;
  end_date?: string;
}

/**
 * 「本來該上課、但遇到假期」的日期（到 today 為止）→ 假期名稱。
 * 規則與 optional-course/worker/src/calendar.ts 的 resolveDay 一致：學期內、補課日優先於假期、星期幾符合這門課。
 */
function listHolidaySessions(calendar: OverviewCalendar, course: OverviewCourse, today: string): Map<string, string> {
  const result = new Map<string, string>();
  if (!calendar.term_start || !calendar.term_end || !course.day_of_week) return result;
  const from = course.start_date && course.start_date > calendar.term_start ? course.start_date : calendar.term_start;
  let to = course.end_date && course.end_date < calendar.term_end ? course.end_date : calendar.term_end;
  if (today < to) to = today;
  const makeup = new Set(calendar.makeup_days.map((m) => m.date));
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (weekdayOf(d) !== course.day_of_week || makeup.has(d)) continue;
    const holiday = calendar.holidays.find((h) => d >= h.start_date && d <= h.end_date);
    if (holiday) result.set(d, holiday.name);
  }
  return result;
}

/** 課程級停課／調課（與 OptionalCourseSchedule 相容） */
export interface OverviewSchedule {
  scheduled_date: string;
  status: "cancelled" | "rescheduled";
  cancellation_reason?: string;
  rescheduled_to?: string;
  rescheduled_venue?: string;
  reschedule_reason?: string;
}

/** 整欄合併成一格的特殊日（假期／停課／調課） */
interface SpecialDay {
  code: string;
  className: string;
  title: string;
}

interface AttendanceOverviewProps {
  info: CourseSessionsInfo;
  roster: OptionalCourseRoster[]; // 含已退選學生，有點名紀錄的才會顯示
  records: OptionalCourseAttendance[];
  /** 有給才會列出假期欄（H）；行事曆讀不到時省略即可 */
  calendar?: OverviewCalendar | null;
  course?: OverviewCourse | null;
  /** 課程級停課／調課；原訂日期整欄合併顯示 C／R */
  schedules?: OverviewSchedule[] | null;
}

/** 「學生 × 日期」唯讀總覽：欄位是今天以前的上課日、遇到假期／停課／調課的原訂日期，以及任何已有點名紀錄的日期 */
export const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ info, roster, records, calendar, course, schedules }) => {
  const isMobile = useIsMobile();

  // 表格上方的勾選框：預設都不勾，勾了才把調課原訂日期（R）、停課（C）、假期（H）顯示成整欄合併的一格
  const [showRescheduled, setShowRescheduled] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showHoliday, setShowHoliday] = useState(false);

  const recordsByKey = useMemo(() => {
    const map = new Map<string, OptionalCourseAttendance>();
    for (const r of records) map.set(`${r.student_id}|${r.class_date}`, r);
    return map;
  }, [records]);

  // 假期、停課、調課（原訂日期）：整欄合併一格。
  // 已有點名紀錄或仍是上課日的日期一律當一般上課日顯示（例如行事曆事後才改成假期）
  const specialDays = useMemo(() => {
    const map = new Map<string, SpecialDay>();
    if (showHoliday && calendar && course) {
      listHolidaySessions(calendar, course, info.today).forEach((name, d) =>
        map.set(d, { code: "H", className: "oc-att-matrix-cell-holiday", title: `${formatDate(d)} 假期：${name}` }),
      );
    }
    for (const s of schedules ?? []) {
      const d = s.scheduled_date;
      if (d > info.today) continue;
      if (s.status === "cancelled" ? !showCancelled : !showRescheduled) continue;
      if (s.status === "cancelled") {
        map.set(d, {
          code: "C",
          className: "oc-att-matrix-cell-cancelled",
          title: `${formatDate(d)} 停課${s.cancellation_reason ? `：${s.cancellation_reason}` : ""}`,
        });
      } else {
        map.set(d, {
          code: "R",
          className: "oc-att-matrix-cell-rescheduled",
          title:
            `${formatDate(d)} 調課至 ${s.rescheduled_to ? formatDate(s.rescheduled_to) : "（未指定）"}` +
            `${s.rescheduled_venue ? `（${s.rescheduled_venue}）` : ""}${s.reschedule_reason ? `：${s.reschedule_reason}` : ""}`,
        });
      }
    }
    const recorded = new Set(records.map((r) => r.class_date));
    const sessionDates = new Set(info.sessions.map((s) => s.date));
    for (const d of Array.from(map.keys())) {
      if (recorded.has(d) || sessionDates.has(d)) map.delete(d);
    }
    return map;
  }, [calendar, course, schedules, info, records, showHoliday, showCancelled, showRescheduled]);

  // 調課後的新日期：表頭提示原訂日期
  const rescheduledFrom = useMemo(
    () => new Map(info.sessions.filter((s) => s.rescheduled_from).map((s) => [s.date, s.rescheduled_from!])),
    [info],
  );

  // 行事曆未建立時 sessions 是空的，退回用已點名的日期當欄位
  const dates = useMemo(() => {
    const set = new Set(info.sessions.filter((s) => s.date <= info.today).map((s) => s.date));
    for (const r of records) set.add(r.class_date);
    for (const d of Array.from(specialDays.keys())) set.add(d);
    return Array.from(set).sort();
  }, [info, records, specialDays]);

  const students = useMemo(() => {
    const withRecords = new Set(records.map((r) => r.student_id));
    return roster.filter((s) => s.is_active || withRecords.has(s.student_id));
  }, [roster, records]);

  const monthGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const d of dates) {
      const key = d.slice(0, 7);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [y, m] = key.split("-").map(Number);
      return { key, label: `${MONTH_FULL[m - 1]} ${y}`, dates: list };
    });
  }, [dates]);

  const totalPages = isMobile ? Math.max(1, monthGroups.length) : 1;
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // 沒手動翻頁前停在最新月份
  const currentPageIndex = Math.min(pageIndex ?? totalPages - 1, totalPages - 1);
  const currentMonth = isMobile ? monthGroups[currentPageIndex] : undefined;
  const visibleDates = isMobile ? currentMonth?.dates ?? [] : dates;

  const totalCols = isMobile ? Math.max(MOBILE_MATRIX_MONTH_COLS, visibleDates.length) : visibleDates.length;
  const padKeys = Array.from({ length: isMobile ? totalCols - visibleDates.length : 0 }, (_, i) => `pad-${i}`);
  const studentColStyle = isMobile ? { width: `${NAME_COL_PERCENT}%` } : undefined;
  const dateColStyle = isMobile ? { width: `${(100 - NAME_COL_PERCENT) / totalCols}%` } : undefined;

  if (students.length === 0) {
    return <p>名冊裡沒有學生。</p>;
  }

  const toggles = (
    <div className="oc-att-toggles">
      <label>
        <input type="checkbox" checked={showRescheduled} onChange={(e) => setShowRescheduled(e.target.checked)} />
        顯示調課
      </label>
      <label>
        <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
        顯示停課
      </label>
      <label>
        <input type="checkbox" checked={showHoliday} onChange={(e) => setShowHoliday(e.target.checked)} />
        顯示假期
      </label>
    </div>
  );

  if (dates.length === 0) {
    return (
      <>
        {toggles}
        <p style={{ color: "#888" }}>目前還沒有到上課日，也沒有任何點名紀錄。</p>
      </>
    );
  }

  return (
    <div className="oc-att-overview">
      {toggles}
      {isMobile && totalPages > 1 && (
        <div className="oc-att-matrix-pagination">
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
          >
            ← 上個月
          </button>
          <span className="oc-att-matrix-page-info">{currentMonth?.label}</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === totalPages - 1}
          >
            下個月 →
          </button>
        </div>
      )}

      <div className="oc-att-overview-scroll">
        <table className={isMobile ? "oc-att-matrix oc-att-matrix--fill" : "oc-att-matrix"}>
          <thead>
            <tr>
              <th className="oc-att-matrix-student-col" style={studentColStyle}>
                學生
              </th>
              {visibleDates.map((d) => {
                const [, m, day] = d.split("-");
                const special = specialDays.get(d);
                const movedFrom = rescheduledFrom.get(d);
                return (
                  <th
                    key={d}
                    title={
                      special
                        ? special.title
                        : movedFrom
                          ? `${formatDate(d)}（由 ${formatDate(movedFrom)} 調課）`
                          : formatDate(d)
                    }
                    className={`oc-att-matrix-date-col ${monthToneClass(d)}`}
                    style={dateColStyle}
                  >
                    <span className="oc-att-date-chip">
                      <span className="oc-att-date-month">{MONTH_ABBR[Number(m) - 1]}</span>
                      <span className="oc-att-date-day">{day}</span>
                    </span>
                  </th>
                );
              })}
              {padKeys.map((key) => (
                <th key={key} className="oc-att-matrix-date-col oc-att-matrix-cell-empty" style={dateColStyle} />
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, rowIndex) => (
              <tr key={student.roster_id}>
                <td className="oc-att-matrix-student-col" style={studentColStyle}>
                  <div className="oc-att-matrix-student-name">
                    {student.student_name_cn || student.student_name_en}
                    {!student.is_active && <span className="oc-att-matrix-withdrawn">已退出</span>}
                  </div>
                  <div className="oc-att-matrix-student-meta">
                    <span className="oc-att-matrix-student-no">{student.student_no}</span>
                    {student.student_class && (
                      <span className="oc-att-matrix-student-class">{student.student_class}</span>
                    )}
                  </div>
                </td>
                {visibleDates.map((d) => {
                  const special = specialDays.get(d);
                  if (special) {
                    // 假期／停課／調課整欄合併成一格，只在第一列輸出
                    if (rowIndex > 0) return null;
                    return (
                      <td
                        key={d}
                        rowSpan={students.length}
                        className={`oc-att-matrix-cell ${special.className}`}
                        title={special.title}
                        style={dateColStyle}
                      >
                        {special.code}
                      </td>
                    );
                  }
                  const record = recordsByKey.get(`${student.student_id}|${d}`);
                  // 退出日期（含）之後：反灰，不算未點名。加入日期不看（選修課名冊常在開課後才建立）
                  const outOfRoster =
                    !record && !student.is_active && !!student.withdrawal_date && student.withdrawal_date <= d;
                  if (outOfRoster) {
                    return (
                      <td
                        key={d}
                        className={`oc-att-matrix-cell oc-att-matrix-cell-not-joined ${monthToneClass(d)}`}
                        title={`${formatDate(d)} 已退出（${formatDate(student.withdrawal_date!)} 退出${
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
                        key={d}
                        className={`oc-att-matrix-cell oc-att-matrix-cell-unmarked ${monthToneClass(d)}`}
                        title={`${formatDate(d)} 未點名`}
                        style={dateColStyle}
                      >
                        ·
                      </td>
                    );
                  }
                  return (
                    <td
                      key={d}
                      className="oc-att-matrix-cell"
                      title={`${formatDate(d)} ${meta.label}${record?.absence_reason ? `：${record.absence_reason}` : ""}`}
                      style={{ background: meta.color, color: "#fff", ...dateColStyle }}
                    >
                      {meta.code}
                    </td>
                  );
                })}
                {padKeys.map((key) => (
                  <td key={key} className="oc-att-matrix-cell oc-att-matrix-cell-empty" style={dateColStyle} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="oc-att-legend">
        {(Object.keys(ATTENDANCE_STATUS_META) as CourseAttendanceStatus[]).map((status) => (
          <span className="oc-att-legend-item" key={status}>
            <span className="oc-att-legend-swatch" style={{ background: ATTENDANCE_STATUS_META[status].color }}>
              {ATTENDANCE_STATUS_META[status].code}
            </span>
            {ATTENDANCE_STATUS_META[status].label}
          </span>
        ))}
        {showHoliday && (
          <span className="oc-att-legend-item">
            <span className="oc-att-legend-swatch oc-att-matrix-cell-holiday">H</span>
            假期
          </span>
        )}
        {showCancelled && (
          <span className="oc-att-legend-item">
            <span className="oc-att-legend-swatch oc-att-matrix-cell-cancelled">C</span>
            停課
          </span>
        )}
        {showRescheduled && (
          <span className="oc-att-legend-item">
            <span className="oc-att-legend-swatch oc-att-matrix-cell-rescheduled">R</span>
            調課（原訂日期）
          </span>
        )}
        <span className="oc-att-legend-item">
          <span className="oc-att-legend-swatch oc-att-matrix-cell-unmarked">·</span>
          未點名
        </span>
        <span className="oc-att-legend-item">
          <span className="oc-att-legend-swatch oc-att-matrix-cell-not-joined">-</span>
          已退出
        </span>
      </div>
    </div>
  );
};

export default AttendanceOverview;

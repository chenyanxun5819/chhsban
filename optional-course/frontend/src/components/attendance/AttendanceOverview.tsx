import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CourseAttendanceStatus, CourseSessionsInfo, OptionalCourseAttendance, OptionalCourseRoster, Weekday } from "@/types";
import { formatDate, weekdayOf } from "@/utils/calendar";

// 版面沿用 tution-portal 的 AttendanceOverviewTable（學生 × 日期矩陣，手機依月份分頁）

// 顯示文字由 i18n 的 attendanceStatus.<status> 提供
export const ATTENDANCE_STATUS_META: Record<CourseAttendanceStatus, { code: string; color: string }> = {
  present: { code: "P", color: "#28a745" },
  absent: { code: "A", color: "#dc3545" },
  late: { code: "L", color: "#fd7e14" },
  excuse: { code: "E", color: "#6f42c1" },
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
  Number(date.slice(5, 7)) % 2 === 1 ? "attendance-month-odd" : "attendance-month-even";

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
 * 規則與 worker/src/calendar.ts 的 resolveDay 一致：學期內、補課日優先於假期、星期幾符合這門課。
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
  const { t, i18n } = useTranslation();

  const recordsByKey = useMemo(() => {
    const map = new Map<string, OptionalCourseAttendance>();
    for (const r of records) map.set(`${r.student_id}|${r.class_date}`, r);
    return map;
  }, [records]);

  // 假期、停課、調課（原訂日期）：整欄合併一格。
  // 已有點名紀錄或仍是上課日的日期一律當一般上課日顯示（例如行事曆事後才改成假期）
  const specialDays = useMemo(() => {
    const map = new Map<string, SpecialDay>();
    if (calendar && course) {
      listHolidaySessions(calendar, course, info.today).forEach((name, d) =>
        map.set(d, { code: "H", className: "attendance-matrix-cell-holiday", title: t("overview.holidayTitle", { date: formatDate(d), name }) }),
      );
    }
    for (const s of schedules ?? []) {
      const d = s.scheduled_date;
      if (d > info.today) continue;
      if (s.status === "cancelled") {
        map.set(d, {
          code: "C",
          className: "attendance-matrix-cell-cancelled",
          title: t("overview.cancelledTitle", { date: formatDate(d) }) + (s.cancellation_reason ? `: ${s.cancellation_reason}` : ""),
        });
      } else {
        map.set(d, {
          code: "R",
          className: "attendance-matrix-cell-rescheduled",
          title:
            t("overview.rescheduledTitle", {
              date: formatDate(d),
              to: s.rescheduled_to ? formatDate(s.rescheduled_to) : t("overview.unspecified"),
            }) + `${s.rescheduled_venue ? ` (${s.rescheduled_venue})` : ""}${s.reschedule_reason ? `: ${s.reschedule_reason}` : ""}`,
        });
      }
    }
    const recorded = new Set(records.map((r) => r.class_date));
    const sessionDates = new Set(info.sessions.map((s) => s.date));
    for (const d of Array.from(map.keys())) {
      if (recorded.has(d) || sessionDates.has(d)) map.delete(d);
    }
    return map;
    // i18n.language：切換語言時重算提示文字
  }, [calendar, course, schedules, info, records, i18n.language]);

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
    return <p>{t("overview.noStudents")}</p>;
  }
  if (dates.length === 0) {
    return <p style={{ color: "#888" }}>{t("overview.noDates")}</p>;
  }

  return (
    <div className="attendance-overview">
      {isMobile && totalPages > 1 && (
        <div className="attendance-matrix-pagination">
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
          >
            {t("overview.prevMonth")}
          </button>
          <span className="attendance-matrix-page-info">{currentMonth?.label}</span>
          <button
            type="button"
            className="btn btn--small"
            onClick={() => setPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === totalPages - 1}
          >
            {t("overview.nextMonth")}
          </button>
        </div>
      )}

      <div className="attendance-overview-scroll">
        <table className={isMobile ? "attendance-matrix attendance-matrix--fill" : "attendance-matrix"}>
          <thead>
            <tr>
              <th className="attendance-matrix-student-col" style={studentColStyle}>
                {t("overview.student")}
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
                          ? t("overview.movedFromTitle", { date: formatDate(d), from: formatDate(movedFrom) })
                          : formatDate(d)
                    }
                    className={`attendance-matrix-date-col ${monthToneClass(d)}`}
                    style={dateColStyle}
                  >
                    <span className="attendance-date-chip">
                      <span className="attendance-date-month">{MONTH_ABBR[Number(m) - 1]}</span>
                      <span className="attendance-date-day">{day}</span>
                    </span>
                  </th>
                );
              })}
              {padKeys.map((key) => (
                <th key={key} className="attendance-matrix-date-col attendance-matrix-cell-empty" style={dateColStyle} />
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, rowIndex) => (
              <tr key={student.roster_id}>
                <td className="attendance-matrix-student-col" style={studentColStyle}>
                  <div className="attendance-matrix-student-name">
                    {student.student_name_cn || student.student_name_en}
                    {!student.is_active && <span className="attendance-matrix-withdrawn">{t("overview.withdrawn")}</span>}
                  </div>
                  <div className="attendance-matrix-student-meta">
                    <span className="attendance-matrix-student-no">{student.student_no}</span>
                    {student.student_class && (
                      <span className="attendance-matrix-student-class">{student.student_class}</span>
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
                        className={`attendance-matrix-cell ${special.className}`}
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
                        className={`attendance-matrix-cell attendance-matrix-cell-not-joined ${monthToneClass(d)}`}
                        title={t("overview.withdrawnTitle", {
                          date: formatDate(d),
                          withdrawDate: formatDate(student.withdrawal_date!),
                          reason: student.withdrawal_reason ? `: ${student.withdrawal_reason}` : "",
                        })}
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
                        className={`attendance-matrix-cell attendance-matrix-cell-unmarked ${monthToneClass(d)}`}
                        title={t("overview.unmarkedTitle", { date: formatDate(d) })}
                        style={dateColStyle}
                      >
                        ·
                      </td>
                    );
                  }
                  return (
                    <td
                      key={d}
                      className="attendance-matrix-cell"
                      title={`${formatDate(d)} ${t(`attendanceStatus.${record!.status}`)}${record?.absence_reason ? `: ${record.absence_reason}` : ""}`}
                      style={{ background: meta.color, color: "#fff", ...dateColStyle }}
                    >
                      {meta.code}
                    </td>
                  );
                })}
                {padKeys.map((key) => (
                  <td key={key} className="attendance-matrix-cell attendance-matrix-cell-empty" style={dateColStyle} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="attendance-legend">
        {(Object.keys(ATTENDANCE_STATUS_META) as CourseAttendanceStatus[]).map((status) => (
          <span className="attendance-legend-item" key={status}>
            <span className="attendance-legend-swatch" style={{ background: ATTENDANCE_STATUS_META[status].color }}>
              {ATTENDANCE_STATUS_META[status].code}
            </span>
            {t(`attendanceStatus.${status}`)}
          </span>
        ))}
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-holiday">H</span>
          {t("overview.holiday")}
        </span>
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-cancelled">C</span>
          {t("overview.cancelled")}
        </span>
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-rescheduled">R</span>
          {t("overview.rescheduled")}
        </span>
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-unmarked">·</span>
          {t("overview.unmarked")}
        </span>
        <span className="attendance-legend-item">
          <span className="attendance-legend-swatch attendance-matrix-cell-not-joined">-</span>
          {t("overview.withdrawn")}
        </span>
      </div>
    </div>
  );
};

export default AttendanceOverview;

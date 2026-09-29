import React, { useEffect, useMemo, useState } from "react";
import type { CourseAttendanceStatus, CourseSessionsInfo, OptionalCourseAttendance, OptionalCourseRoster } from "@/optional/types";
import { formatDate } from "@/optional/utils/calendar";
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

interface AttendanceOverviewProps {
  info: CourseSessionsInfo;
  roster: OptionalCourseRoster[]; // 含已退選學生，有點名紀錄的才會顯示
  records: OptionalCourseAttendance[];
}

/** 「學生 × 日期」唯讀總覽：欄位是今天以前的上課日（再加上任何已有點名紀錄的日期） */
export const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ info, roster, records }) => {
  const isMobile = useIsMobile();

  const recordsByKey = useMemo(() => {
    const map = new Map<string, OptionalCourseAttendance>();
    for (const r of records) map.set(`${r.student_id}|${r.class_date}`, r);
    return map;
  }, [records]);

  // 行事曆未建立時 sessions 是空的，退回用已點名的日期當欄位
  const dates = useMemo(() => {
    const set = new Set(info.sessions.filter((s) => s.date <= info.today).map((s) => s.date));
    for (const r of records) set.add(r.class_date);
    return Array.from(set).sort();
  }, [info, records]);

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
  if (dates.length === 0) {
    return <p style={{ color: "#888" }}>目前還沒有到上課日，也沒有任何點名紀錄。</p>;
  }

  return (
    <div className="oc-att-overview">
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
                return (
                  <th key={d} title={formatDate(d)} className="oc-att-matrix-date-col" style={dateColStyle}>
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
            {students.map((student) => (
              <tr key={student.roster_id}>
                <td className="oc-att-matrix-student-col" style={studentColStyle}>
                  <div className="oc-att-matrix-student-name">
                    {student.student_name_cn || student.student_name_en}
                    {!student.is_active && <span className="oc-att-matrix-withdrawn">已退選</span>}
                  </div>
                  <div className="oc-att-matrix-student-meta">
                    <span className="oc-att-matrix-student-no">{student.student_no}</span>
                    {student.student_class && (
                      <span className="oc-att-matrix-student-class">{student.student_class}</span>
                    )}
                  </div>
                </td>
                {visibleDates.map((d) => {
                  const record = recordsByKey.get(`${student.student_id}|${d}`);
                  // 加入前／退選後的日期：反灰，不算未點名
                  const outOfRoster =
                    !record &&
                    ((student.enrollment_date && student.enrollment_date > d) ||
                      (!student.is_active && student.withdrawal_date && student.withdrawal_date <= d));
                  if (outOfRoster) {
                    return (
                      <td
                        key={d}
                        className="oc-att-matrix-cell oc-att-matrix-cell-not-joined"
                        title={`${formatDate(d)} 不在名冊內`}
                        style={dateColStyle}
                      >
                        -
                      </td>
                    );
                  }
                  const meta = record ? ATTENDANCE_STATUS_META[record.status] : null;
                  const title = meta
                    ? `${formatDate(d)} ${meta.label}${record?.absence_reason ? `：${record.absence_reason}` : ""}`
                    : `${formatDate(d)} 未點名`;
                  return (
                    <td
                      key={d}
                      className="oc-att-matrix-cell"
                      title={title}
                      style={{ background: meta ? meta.color : "#eee", color: meta ? "#fff" : "#999", ...dateColStyle }}
                    >
                      {meta ? meta.code : "·"}
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
        <span className="oc-att-legend-item">
          <span className="oc-att-legend-swatch" style={{ background: "#eee", color: "#999" }}>
            ·
          </span>
          未點名
        </span>
      </div>
    </div>
  );
};

export default AttendanceOverview;

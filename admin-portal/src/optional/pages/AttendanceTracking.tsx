import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { getAttendanceSummary } from "@/optional/services/calendarService";
import type { AttendanceSummary, CourseAttendanceSummary } from "@/optional/types";
import { WEEKDAY_LABEL, formatDate } from "@/optional/utils/calendar";
import { currentYear, selectableYears } from "@/shared/utils/year";

type ViewMode = "course" | "date";

const AttendanceTracking: React.FC = () => {
  const [year, setYear] = useState(currentYear());
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("course");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getAttendanceSummary(year)
      .then(setSummary)
      .catch((err) => setError(err.response?.data?.error || "載入失敗"))
      .finally(() => setLoading(false));
  }, [year]);

  const courses = summary?.courses ?? [];
  const noWeekday = courses.filter((c) => !c.day_of_week);
  const totalMissing = courses.reduce((n, c) => n + c.missing_dates.length, 0);

  // 依日期分組（新到舊），方便逐日追問老師
  const byDate = useMemo(() => {
    const map = new Map<string, CourseAttendanceSummary[]>();
    for (const c of courses) {
      for (const d of c.missing_dates) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(c);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [courses]);

  return (
    <Layout title="選修課點名追蹤">
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
        <label htmlFor="viewYear">年份：</label>
        <select id="viewYear" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {selectableYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          <button className={`btn btn--small${view === "course" ? " btn--primary" : ""}`} onClick={() => setView("course")}>
            依課程
          </button>
          <button className={`btn btn--small${view === "date" ? " btn--primary" : ""}`} onClick={() => setView("date")}>
            依日期
          </button>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      {loading || !summary ? (
        <p>載入中...</p>
      ) : (
        <>
          {!summary.calendar_ready && (
            <div className="card notice">
              {year} 年的學校行事曆尚未建立（未設定開學日與結業日），無法推算應點名日期。
              請先到 <Link to="/optional/calendar">選修課行事曆</Link> 設定。
            </div>
          )}
          {noWeekday.length > 0 && (
            <div className="card notice">
              有 {noWeekday.length} 門課尚未設定上課星期（{noWeekday.map((c) => c.subject).join("、")}），
              無法推算應點名日期，請到 <Link to="/optional/courses">選修課總覽</Link> 設定。
            </div>
          )}

          <p>
            截至 {formatDate(summary.today)}，共 <strong style={{ color: totalMissing ? "#b91c1c" : undefined }}>{totalMissing}</strong>{" "}
            堂未點名。（只計算課程窗口開放之後、今天以前的上課日）
          </p>

          {view === "course" ? (
            courses.length === 0 ? (
              <p>{year} 年沒有已開放的課程。</p>
            ) : (
              <div className="card">
                <table className="table">
                  <thead>
                    <tr>
                      <th>課程</th>
                      <th>老師</th>
                      <th>上課星期</th>
                      <th>已點名 / 應點名</th>
                      <th>未點名</th>
                      <th>全年堂數</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((c) => (
                      <React.Fragment key={c.course_id}>
                        <tr>
                          <td>
                            <span style={{ color: "#888", marginRight: 6 }}>{c.course_no}</span>
                            <Link to={`/optional/courses/${c.course_id}/attendance`}>{c.subject}</Link>
                          </td>
                          <td>{c.teacher_name_cn || "-"}</td>
                          <td>{c.day_of_week ? WEEKDAY_LABEL[c.day_of_week] : <em style={{ color: "#b45309" }}>未設定</em>}</td>
                          <td>
                            {c.recorded_count} / {c.due_count}
                          </td>
                          <td>
                            {c.missing_dates.length > 0 ? (
                              <button
                                className="btn btn--small btn--danger"
                                onClick={() => setExpanded(expanded === c.course_id ? null : c.course_id)}
                              >
                                {c.missing_dates.length} 堂 {expanded === c.course_id ? "▲" : "▼"}
                              </button>
                            ) : (
                              <span style={{ color: "#166534" }}>—</span>
                            )}
                          </td>
                          <td>{c.total_sessions}</td>
                        </tr>
                        {expanded === c.course_id && (
                          <tr>
                            <td colSpan={6} style={{ background: "#fef2f2" }}>
                              {c.missing_dates.map((d) => (
                                <span key={d} className="badge badge--missing" style={{ marginRight: 6 }}>
                                  {formatDate(d)}
                                </span>
                              ))}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : byDate.length === 0 ? (
            <p style={{ color: "#166534" }}>沒有未點名的課堂。</p>
          ) : (
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>未點名課程</th>
                  </tr>
                </thead>
                <tbody>
                  {byDate.map(([date, list]) => (
                    <tr key={date}>
                      <td style={{ whiteSpace: "nowrap", verticalAlign: "top" }}>{formatDate(date)}</td>
                      <td>
                        {list.map((c) => (
                          <div key={c.course_id}>
                            <span style={{ color: "#888", marginRight: 6 }}>{c.course_no}</span>
                            <Link to={`/optional/courses/${c.course_id}/attendance`}>{c.subject}</Link>
                            <span style={{ color: "#666" }}>（{c.teacher_name_cn || "-"}）</span>
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default AttendanceTracking;

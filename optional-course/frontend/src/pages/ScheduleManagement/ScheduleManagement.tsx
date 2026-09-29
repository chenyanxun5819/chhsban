import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CoursePageHeader, Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listSchedules } from "@/services/scheduleService";
import { getCourseSessions } from "@/services/calendarService";
import type { CourseSessionsInfo, OptionalCourse, OptionalCourseSchedule } from "@/types";
import { WEEKDAY_LABEL, courseSubtitle, formatDate } from "@/utils/calendar";

/**
 * 上課日期表（老師端唯讀）：應點名日期由學校行事曆＋課程上課星期推算。
 * 選修課跟學校統一排課，停課／調課只有行政人員能在管理站（admin-portal）登記。
 */
const ScheduleManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [schedules, setSchedules] = useState<OptionalCourseSchedule[]>([]);
  const [info, setInfo] = useState<CourseSessionsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([getCourse(id), listSchedules(id), getCourseSessions(id)])
      .then(([c, s, i]) => {
        setCourse(c);
        setSchedules(s);
        setInfo(i);
      })
      .catch((err) => setError(err.response?.data?.error || "载入失败 / Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout title="上课日期 / Class Dates">
      {course && <CoursePageHeader subject={course.subject} subtitle={courseSubtitle(course)} />}
      {error && <p className="error-text">{error}</p>}

      {loading || !info ? (
        <p>载入中... / Loading...</p>
      ) : (
        <>
          {course?.window_status === "closed" && (
            <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
              此课程窗口已关闭，资料仅供查看。 / This course is closed and view-only.
            </p>
          )}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>上课日期表 / Class Dates</h3>
            {!info.calendar_ready ? (
              <p style={{ color: "#b45309" }}>学校行事历尚未建立，暂时无法推算上课日期。 / The school calendar is not set up yet.</p>
            ) : !info.day_of_week ? (
              <p style={{ color: "#b45309" }}>这门课尚未设定上课星期，请联络行政人员。 / No class day is set for this course, please contact the administrator.</p>
            ) : (
              <>
                <p style={{ color: "#666", marginTop: 0 }}>
                  每{WEEKDAY_LABEL[info.day_of_week]}上课，依学校行事历全年共 {info.sessions.length} 堂
                  （已扣除假期；补课日按指定课表加入）。停课或调课请联络行政人员。
                  <br />
                  Every {info.day_of_week}, {info.sessions.length} sessions this year (holidays excluded). Contact the administrator for cancellations or rescheduling.
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>日期/Date</th>
                      <th>说明/Note</th>
                      <th>点名/Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.sessions.map((s) => (
                      <tr key={s.date} style={s.date === info.today ? { background: "#eff6ff" } : undefined}>
                        <td>{formatDate(s.date)}</td>
                        <td>
                          {s.rescheduled_from ? `由 ${formatDate(s.rescheduled_from)} 调课 / Moved from ${formatDate(s.rescheduled_from)}` : ""}
                          {s.venue ? `（地点/Venue：${s.venue}）` : ""}
                        </td>
                        <td>
                          {s.recorded ? (
                            <span style={{ color: "#166534" }}>✓ 已点名 / Marked</span>
                          ) : s.missing ? (
                            <span className="badge badge--missing">未点名 / Not marked</span>
                          ) : (
                            <span style={{ color: "#999" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {schedules.length > 0 && (
            <div className="card">
              <h3>停课／调课记录 / Cancellations &amp; Reschedules</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>原订日期/Original Date</th>
                    <th>状态/Status</th>
                    <th>说明/Note</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id}>
                      <td>{formatDate(s.scheduled_date)}</td>
                      <td>{s.status === "cancelled" ? "停课 / Cancelled" : `调至 / Moved to ${s.rescheduled_to ? formatDate(s.rescheduled_to) : "-"}`}</td>
                      <td>{s.cancellation_reason || s.reschedule_reason || "-"}</td>
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

export default ScheduleManagement;

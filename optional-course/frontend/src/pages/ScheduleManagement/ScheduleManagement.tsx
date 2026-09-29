import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listSchedules } from "@/services/scheduleService";
import { getCourseSessions } from "@/services/calendarService";
import type { CourseSessionsInfo, OptionalCourse, OptionalCourseSchedule } from "@/types";
import { WEEKDAY_LABEL, formatDate } from "@/utils/calendar";

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
      .catch((err) => setError(err.response?.data?.error || "載入失敗"))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout title={course ? `上課日期 - ${course.subject}` : "上課日期"}>
      {error && <p className="error-text">{error}</p>}

      {loading || !info ? (
        <p>載入中...</p>
      ) : (
        <>
          {course?.window_status === "closed" && (
            <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
              此課程窗口已關閉，資料僅供查看。
            </p>
          )}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>上課日期表</h3>
            {!info.calendar_ready ? (
              <p style={{ color: "#b45309" }}>學校行事曆尚未建立，暫時無法推算上課日期。</p>
            ) : !info.day_of_week ? (
              <p style={{ color: "#b45309" }}>這門課尚未設定上課星期，請聯絡行政人員。</p>
            ) : (
              <>
                <p style={{ color: "#666", marginTop: 0 }}>
                  每{WEEKDAY_LABEL[info.day_of_week]}上課，依學校行事曆全年共 {info.sessions.length} 堂
                  （已扣除假期；補課日按指定課表加入）。停課或調課請聯絡行政人員。
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>說明</th>
                      <th>點名</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.sessions.map((s) => (
                      <tr key={s.date} style={s.date === info.today ? { background: "#eff6ff" } : undefined}>
                        <td>{formatDate(s.date)}</td>
                        <td>
                          {s.rescheduled_from ? `由 ${formatDate(s.rescheduled_from)} 調課` : ""}
                          {s.venue ? `（地點：${s.venue}）` : ""}
                        </td>
                        <td>
                          {s.recorded ? (
                            <span style={{ color: "#166534" }}>✓ 已點名</span>
                          ) : s.missing ? (
                            <span className="badge badge--missing">未點名</span>
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
              <h3>停課／調課記錄</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>原訂日期</th>
                    <th>狀態</th>
                    <th>說明</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id}>
                      <td>{formatDate(s.scheduled_date)}</td>
                      <td>{s.status === "cancelled" ? "停課" : `調至 ${s.rescheduled_to ? formatDate(s.rescheduled_to) : "-"}`}</td>
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

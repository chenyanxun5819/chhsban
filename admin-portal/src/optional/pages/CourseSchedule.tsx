import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { useAuth } from "@/shared/auth/AuthContext";
import { getCourse } from "@/optional/services/courseService";
import { listSchedules, createSchedule, deleteSchedule } from "@/optional/services/scheduleService";
import { getCourseSessions } from "@/optional/services/calendarService";
import type { CourseScheduleStatus, CourseSessionsInfo, OptionalCourse, OptionalCourseSchedule } from "@/optional/types";
import { WEEKDAY_LABEL, formatDate } from "@/optional/utils/calendar";

const ERROR_LABEL: Record<string, string> = {
  NOT_A_SESSION_DATE: "原訂日期不是這門課依行事曆的上課日",
  SCHEDULE_ALREADY_EXISTS: "這一天已經登記過停課或調課",
  Forbidden: "只有超級管理員可以登記停課／調課",
};

/**
 * 單一課程的上課日期表＋課程級停課／調課。
 * 全校性的假期在「選修課行事曆」設定；這裡只處理單一課程的例外（例如老師請假、場地衝突）。
 */
const CourseSchedule: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = user?.permission === "super_admin";

  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [schedules, setSchedules] = useState<OptionalCourseSchedule[]>([]);
  const [info, setInfo] = useState<CourseSessionsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [status, setStatus] = useState<CourseScheduleStatus>("cancelled");
  const [reason, setReason] = useState("");
  const [rescheduledTo, setRescheduledTo] = useState("");
  const [rescheduledVenue, setRescheduledVenue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, s, i] = await Promise.all([getCourse(id), listSchedules(id), getCourseSessions(id)]);
      setCourse(c);
      setSchedules(s);
      setInfo(i);
    } catch (err: any) {
      setError(err.response?.data?.error || "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !date) return;
    try {
      setSaving(true);
      setError(null);
      await createSchedule(id, {
        scheduled_date: date,
        status,
        cancellation_reason: status === "cancelled" ? reason : undefined,
        rescheduled_to: status === "rescheduled" ? rescheduledTo : undefined,
        rescheduled_venue: status === "rescheduled" ? rescheduledVenue : undefined,
        reschedule_reason: status === "rescheduled" ? reason : undefined,
      });
      setDate("");
      setReason("");
      setRescheduledTo("");
      setRescheduledVenue("");
      await load();
    } catch (err: any) {
      const code = err.response?.data?.error;
      setError(ERROR_LABEL[code] || code || "登記失敗");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: OptionalCourseSchedule) => {
    if (!id || !window.confirm(`確定要取消 ${formatDate(schedule.scheduled_date)} 的停課／調課登記？`)) return;
    try {
      setError(null);
      await deleteSchedule(id, schedule.schedule_id);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "刪除失敗");
    }
  };

  // 可登記停課／調課的日期：原本就要上課、還沒有例外記錄的日子
  const exceptionDates = new Set(schedules.map((s) => s.scheduled_date));
  const regularDates = (info?.sessions ?? []).filter((s) => !s.rescheduled_from && !exceptionDates.has(s.date));

  return (
    <Layout title={course ? `上課日期 - ${course.course_no} ${course.subject}` : "上課日期"}>
      <p style={{ marginTop: 0 }}>
        <Link to="/optional/courses">← 回選修課總覽</Link>
      </p>
      {error && <p className="error-text">{error}</p>}

      {loading || !info ? (
        <p>載入中...</p>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>上課日期表</h3>
            {!info.calendar_ready ? (
              <p style={{ color: "#b45309" }}>
                選修課行事曆尚未建立，暫時無法推算上課日期。請先到 <Link to="/optional/calendar">選修課行事曆</Link> 設定。
              </p>
            ) : !info.day_of_week ? (
              <p style={{ color: "#b45309" }}>這門課尚未設定上課星期，請到選修課總覽設定。</p>
            ) : (
              <>
                <p style={{ color: "#666", marginTop: 0 }}>
                  每{WEEKDAY_LABEL[info.day_of_week]}上課，依行事曆全年共 {info.sessions.length} 堂
                  （已扣除假期；補課日按指定課表加入）。
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
                            <span className="success-text">✓ 已點名</span>
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

          {canManage && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>登記停課／調課</h3>
              <p style={{ color: "#666", marginTop: 0 }}>
                全校性的假期請到「選修課行事曆」設定；這裡只處理單一課程的例外（例如老師請假、場地衝突）。
              </p>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <label>原訂日期</label>
                  {info.calendar_ready && info.day_of_week ? (
                    <select value={date} onChange={(e) => setDate(e.target.value)} required>
                      <option value="">選擇上課日...</option>
                      {regularDates.map((s) => (
                        <option key={s.date} value={s.date}>
                          {formatDate(s.date)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                  )}
                </div>
                <div className="form-row">
                  <label>狀態</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value as CourseScheduleStatus)}>
                    <option value="cancelled">停課</option>
                    <option value="rescheduled">調課</option>
                  </select>
                </div>
                {status === "rescheduled" && (
                  <>
                    <div className="form-row">
                      <label>調至日期</label>
                      <input type="date" value={rescheduledTo} onChange={(e) => setRescheduledTo(e.target.value)} required />
                    </div>
                    <div className="form-row">
                      <label>調課地點</label>
                      <input value={rescheduledVenue} onChange={(e) => setRescheduledVenue(e.target.value)} />
                    </div>
                  </>
                )}
                <div className="form-row">
                  <label>原因</label>
                  <input value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? "登記中..." : "登記"}
                </button>
              </form>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginTop: 0 }}>停課／調課記錄</h3>
            {schedules.length === 0 ? (
              <p>目前沒有停課或調課記錄。</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>原訂日期</th>
                    <th>狀態</th>
                    <th>說明</th>
                    {canManage && <th />}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id}>
                      <td>{formatDate(s.scheduled_date)}</td>
                      <td>{s.status === "cancelled" ? "停課" : `調至 ${s.rescheduled_to ? formatDate(s.rescheduled_to) : "-"}`}</td>
                      <td>{s.cancellation_reason || s.reschedule_reason || "-"}</td>
                      {canManage && (
                        <td style={{ textAlign: "right" }}>
                          <button className="btn btn--danger btn--small" onClick={() => handleDelete(s)}>
                            取消登記
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </Layout>
  );
};

export default CourseSchedule;

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listSchedules, createSchedule } from "@/services/scheduleService";
import type { OptionalCourse, OptionalCourseSchedule, CourseScheduleStatus } from "@/types";

const ScheduleManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [schedules, setSchedules] = useState<OptionalCourseSchedule[]>([]);
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
      const [c, s] = await Promise.all([getCourse(id), listSchedules(id)]);
      setCourse(c);
      setSchedules(s);
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
      setError(err.response?.data?.error || "登記失敗");
    } finally {
      setSaving(false);
    }
  };

  // 窗口未開放（已關閉）時只能查看，後端也會拒絕任何修改
  const readOnly = !loading && course?.window_status !== "open";

  return (
    <Layout title={course ? `排課管理 - ${course.subject}` : "排課管理"}>
      {error && <p className="error-text">{error}</p>}
      {readOnly && (
        <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          此課程窗口已關閉，資料僅供查看，無法修改。如需修改請聯絡行政人員重新開放。
        </p>
      )}
      {!readOnly && (
      <div className="card">
        <h3>登記停課／調課（沒有登記的上課日一律視為正常上課）</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <label>原訂日期</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
        <h3>已登記的例外記錄</h3>
        {loading ? (
          <p>載入中...</p>
        ) : schedules.length === 0 ? (
          <p>目前沒有停課或調課記錄。</p>
        ) : (
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
                  <td>{s.scheduled_date}</td>
                  <td>{s.status === "cancelled" ? "停課" : `調至 ${s.rescheduled_to}`}</td>
                  <td>{s.cancellation_reason || s.reschedule_reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

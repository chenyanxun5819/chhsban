import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster } from "@/services/rosterService";
import { recordAttendance, listAttendance } from "@/services/attendanceService";
import type { OptionalCourse, OptionalCourseRoster, CourseAttendanceStatus } from "@/types";

const STATUS_OPTIONS: Array<{ value: CourseAttendanceStatus; label: string }> = [
  { value: "present", label: "到課" },
  { value: "absent", label: "缺課" },
  { value: "late", label: "遲到" },
  { value: "excuse", label: "有理由缺席" },
];

const AttendanceSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [roster, setRoster] = useState<OptionalCourseRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [classDate, setClassDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusMap, setStatusMap] = useState<Record<string, CourseAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r] = await Promise.all([getCourse(id), listRoster(id)]);
      setCourse(c);
      const active = r.filter((entry) => entry.is_active);
      setRoster(active);
      setStatusMap((prev) => {
        const next: Record<string, CourseAttendanceStatus> = {};
        for (const entry of active) {
          next[entry.student_id] = prev[entry.student_id] || "present";
        }
        return next;
      });
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
    if (!id || roster.length === 0) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const records = roster.map((entry) => ({
        student_id: entry.student_id,
        status: statusMap[entry.student_id] || "present",
      }));
      await recordAttendance(id, classDate, records);
      setSuccess(`已儲存 ${classDate} 的點名紀錄`);
      await listAttendance(id);
    } catch (err: any) {
      setError(err.response?.data?.error || "點名儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title={course ? `點名 - ${course.subject}` : "點名"}>
      {error && <p className="error-text">{error}</p>}
      {success && <p style={{ color: "#166534" }}>{success}</p>}
      {loading ? (
        <p>載入中...</p>
      ) : roster.length === 0 ? (
        <p>名冊裡沒有學生，請先到名冊管理加入學生。</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          <div className="form-row">
            <label>上課日期</label>
            <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} required />
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>學號</th>
                <th>姓名</th>
                <th>出勤狀態</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.roster_id}>
                  <td>{entry.student_no || entry.student_id}</td>
                  <td>{entry.student_name_cn}</td>
                  <td>
                    <select
                      value={statusMap[entry.student_id] || "present"}
                      onChange={(e) =>
                        setStatusMap((prev) => ({
                          ...prev,
                          [entry.student_id]: e.target.value as CourseAttendanceStatus,
                        }))
                      }
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="submit" className="btn btn--primary" disabled={saving} style={{ marginTop: 12 }}>
            {saving ? "儲存中..." : "儲存點名紀錄"}
          </button>
        </form>
      )}
    </Layout>
  );
};

export default AttendanceSheet;

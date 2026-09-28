import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster } from "@/services/rosterService";
import { recordAttendance, listAttendance } from "@/services/attendanceService";
import type {
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseAttendance,
  CourseAttendanceStatus,
} from "@/types";

const STATUS_OPTIONS: Array<{ value: CourseAttendanceStatus; label: string }> = [
  { value: "present", label: "到課" },
  { value: "absent", label: "缺課" },
  { value: "late", label: "遲到" },
  { value: "excuse", label: "有理由缺席" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  CourseAttendanceStatus,
  string
>;

const AttendanceSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [roster, setRoster] = useState<OptionalCourseRoster[]>([]);
  // 後端已依 course+student+date 取最新一筆，這裡拿到的就是每人每天的目前狀態
  const [records, setRecords] = useState<OptionalCourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [classDate, setClassDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusMap, setStatusMap] = useState<Record<string, CourseAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  // 窗口未開放（已關閉）時只能查看，後端也會拒絕任何修改
  const readOnly = !loading && course?.window_status !== "open";

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r, a] = await Promise.all([getCourse(id), listRoster(id), listAttendance(id)]);
      setCourse(c);
      setRoster(r.filter((entry) => entry.is_active));
      setRecords(a);
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

  const recordsForDate = useMemo(
    () => records.filter((rec) => rec.class_date === classDate),
    [records, classDate],
  );

  const recordedDates = useMemo(
    () => Array.from(new Set(records.map((rec) => rec.class_date))).sort().reverse(),
    [records],
  );

  // 切換日期時，已點過名的日期帶入已儲存的狀態，沒點過的預設「到課」
  useEffect(() => {
    const saved = new Map(recordsForDate.map((rec) => [rec.student_id, rec.status]));
    const next: Record<string, CourseAttendanceStatus> = {};
    for (const entry of roster) {
      next[entry.student_id] = saved.get(entry.student_id) || "present";
    }
    setStatusMap(next);
  }, [roster, recordsForDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || roster.length === 0 || readOnly) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload = roster.map((entry) => ({
        student_id: entry.student_id,
        status: statusMap[entry.student_id] || "present",
      }));
      await recordAttendance(id, classDate, payload);
      setSuccess(`已儲存 ${classDate} 的點名紀錄`);
      setRecords(await listAttendance(id));
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
      {readOnly && (
        <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          此課程窗口已關閉，資料僅供查看，無法修改。如需修改請聯絡行政人員重新開放。
        </p>
      )}
      {loading ? (
        <p>載入中...</p>
      ) : roster.length === 0 ? (
        <p>{readOnly ? "名冊裡沒有學生。" : "名冊裡沒有學生，請先到名冊管理加入學生。"}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          <div className="form-row">
            <label>上課日期</label>
            <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} required />
          </div>
          {recordedDates.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>已點名的日期：</span>
              {recordedDates.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={d === classDate ? "btn btn--primary" : "btn"}
                  style={{ padding: "2px 8px", fontSize: 13 }}
                  onClick={() => setClassDate(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          )}
          {recordsForDate.length === 0 && (
            <p style={{ color: "#888", fontSize: 13 }}>
              {readOnly ? "這個日期沒有點名紀錄。" : "這個日期尚未點名，預設全部「到課」。"}
            </p>
          )}
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
                    {readOnly ? (
                      recordsForDate.length > 0 ? STATUS_LABEL[statusMap[entry.student_id] || "present"] : "-"
                    ) : (
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
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!readOnly && (
            <button type="submit" className="btn btn--primary" disabled={saving} style={{ marginTop: 12 }}>
              {saving ? "儲存中..." : "儲存點名紀錄"}
            </button>
          )}
        </form>
      )}
    </Layout>
  );
};

export default AttendanceSheet;

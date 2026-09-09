import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster, lookupStudent, addRosterEntry, withdrawRosterEntry } from "@/services/rosterService";
import type { OptionalCourse, OptionalCourseRoster, StudentRecord } from "@/types";

const RosterManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [roster, setRoster] = useState<OptionalCourseRoster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [studentQuery, setStudentQuery] = useState("");
  const [foundStudent, setFoundStudent] = useState<StudentRecord | null>(null);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r] = await Promise.all([getCourse(id), listRoster(id)]);
      setCourse(c);
      setRoster(r);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentQuery.trim()) return;
    try {
      setSearching(true);
      setError(null);
      setFoundStudent(null);
      const student = await lookupStudent(studentQuery.trim());
      setFoundStudent(student);
    } catch (err: any) {
      setError(err.response?.data?.error === "Student not found" ? "查無此學生，請確認學號" : "查詢失敗");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!id || !foundStudent) return;
    try {
      setAdding(true);
      setError(null);
      // 直接把新增回來的 entry 加進本地名冊狀態，不要重新呼叫 listRoster() 整包重載——
      // Cloudflare KV 的 list() 是最終一致性，剛寫入的 key 可能要等一段時間才會出現在
      // list() 結果裡，若在這裡重新整包讀取，畫面反而會看起來像「這筆新增被蓋掉了」。
      const entry = await addRosterEntry(id, foundStudent.student_id);
      setRoster((prev) => [...prev, entry]);
      setFoundStudent(null);
      setStudentQuery("");
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "STUDENT_ALREADY_IN_ROSTER") {
        setError("這位學生已經在名冊裡了");
      } else {
        setError(code || "加入名冊失敗");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleWithdraw = async (rosterId: string) => {
    if (!id) return;
    const reason = window.prompt("請輸入退出原因（可留空）") || "";
    try {
      setError(null);
      const updated = await withdrawRosterEntry(id, rosterId, reason);
      setRoster((prev) => prev.map((r) => (r.roster_id === rosterId ? updated : r)));
    } catch (err: any) {
      setError(err.response?.data?.error || "退出名冊失敗");
    }
  };

  const activeRoster = roster.filter((r) => r.is_active);

  return (
    <Layout title={course ? `名冊管理 - ${course.subject}` : "名冊管理"}>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>載入中...</p>
      ) : (
        <>
          <div className="card">
            <h3>加入學生</h3>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="輸入學號（例如：21342）"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                style={{ flex: 1, padding: 8, border: "1px solid #d0d3d8", borderRadius: 6 }}
              />
              <button type="submit" className="btn" disabled={searching}>
                查詢
              </button>
            </form>
            {foundStudent && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {foundStudent.student_no || foundStudent.student_id} - {foundStudent.name_cn}（{foundStudent.class}）
                </span>
                <button className="btn btn--primary" disabled={adding} onClick={handleAdd}>
                  加入名冊
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <h3>目前名冊（{activeRoster.length} 人）</h3>
            {activeRoster.length === 0 ? (
              <p>尚未有學生加入。</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>姓名</th>
                    <th>班級</th>
                    <th>報名日期</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoster.map((r) => (
                    <tr key={r.roster_id}>
                      <td>{r.student_no || r.student_id}</td>
                      <td>{r.student_name_cn}</td>
                      <td>{r.student_class}</td>
                      <td>{r.enrollment_date}</td>
                      <td>
                        <button className="btn btn--danger" onClick={() => handleWithdraw(r.roster_id)}>
                          退出
                        </button>
                      </td>
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

export default RosterManagement;

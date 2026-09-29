import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CoursePageHeader, Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster, lookupStudent, addRosterEntry, withdrawRosterEntry } from "@/services/rosterService";
import type { OptionalCourse, OptionalCourseRoster, StudentRecord } from "@/types";
import { courseSubtitle, todayMYT } from "@/utils/calendar";
import RosterBatchImport from "./RosterBatchImport";

const WITHDRAW_ERROR_LABEL: Record<string, string> = {
  MISSING_WITHDRAWAL_REASON: "请输入退出原因 / Please enter a reason",
  INVALID_WITHDRAWAL_DATE: "退出日期不正确（不能晚于今天） / Invalid withdrawal date (cannot be later than today)",
};

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
  // 正在填寫退出資料的那一列；退出日期可事後補登，預設今天
  const [withdrawing, setWithdrawing] = useState<{ rosterId: string; date: string; reason: string } | null>(null);
  const [withdrawSaving, setWithdrawSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r] = await Promise.all([getCourse(id), listRoster(id)]);
      setCourse(c);
      setRoster(r);
    } catch (err: any) {
      setError(err.response?.data?.error || "载入失败 / Failed to load");
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
      setError(err.response?.data?.error === "Student not found" ? "查无此学生，请确认学号 / Student not found, please check the student ID" : "查询失败 / Search failed");
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
      const entry = await addRosterEntry(id, foundStudent.student_no);
      setRoster((prev) => [...prev, entry]);
      setFoundStudent(null);
      setStudentQuery("");
    } catch (err: any) {
      const code = err.response?.data?.error;
      if (code === "STUDENT_ALREADY_IN_ROSTER") {
        setError("这位学生已经在名册里了 / This student is already in the roster");
      } else {
        setError(code || "加入名册失败 / Failed to add to roster");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !withdrawing) return;
    const reason = withdrawing.reason.trim();
    if (!reason) {
      setError("请输入退出原因 / Please enter a reason");
      return;
    }
    if (!withdrawing.date || withdrawing.date > todayMYT()) {
      setError("退出日期不正确（不能晚于今天） / Invalid withdrawal date (cannot be later than today)");
      return;
    }
    try {
      setWithdrawSaving(true);
      setError(null);
      const updated = await withdrawRosterEntry(id, withdrawing.rosterId, reason, withdrawing.date);
      setRoster((prev) => prev.map((r) => (r.roster_id === updated.roster_id ? updated : r)));
      setWithdrawing(null);
    } catch (err: any) {
      const code = err.response?.data?.error;
      setError(WITHDRAW_ERROR_LABEL[code] || code || "退出名册失败 / Failed to withdraw");
    } finally {
      setWithdrawSaving(false);
    }
  };

  const activeRoster = roster
    .filter((r) => r.is_active)
    .sort(
      (a, b) =>
        (a.student_class || "").localeCompare(b.student_class || "", "zh-Hant", { numeric: true }) ||
        String(a.student_no || a.student_id).localeCompare(String(b.student_no || b.student_id), "zh-Hant", { numeric: true })
    );
  const withdrawingEntry = withdrawing ? roster.find((r) => r.roster_id === withdrawing.rosterId) : undefined;
  // 窗口未開放（已關閉）時只能查看，後端也會拒絕任何修改
  const readOnly = course?.window_status !== "open";

  return (
    <Layout title={course && readOnly ? "查看名册 / View Roster" : "名册管理 / Roster"}>
      {course && <CoursePageHeader subject={course.subject} subtitle={courseSubtitle(course)} />}
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>载入中... / Loading...</p>
      ) : (
        <>
          {readOnly && (
            <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          此课程窗口已关闭，资料仅供查看，无法修改。如需修改请联络行政人员重新开放。
          <br />
          This course is closed and view-only. Please contact the administrator to reopen it if changes are needed.
        </p>
          )}
          {!readOnly && (
          <div className="card">
            <h3>加入学生 / Add Student</h3>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input
                placeholder="输入学号 / Student ID（例如 e.g. 21342）"
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                style={{ flex: 1, padding: 8, border: "1px solid #d0d3d8", borderRadius: 6 }}
              />
              <button type="submit" className="btn" disabled={searching}>
                查询 / Search
              </button>
            </form>
            {foundStudent && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {foundStudent.student_no} - {foundStudent.name_cn}（{foundStudent.class}）
                </span>
                <button className="btn btn--primary" disabled={adding} onClick={handleAdd}>
                  加入名册 / Add
                </button>
              </div>
            )}
          </div>

          )}

          {id && !readOnly && (
            <RosterBatchImport courseId={id} onAdded={(entries) => setRoster((prev) => [...prev, ...entries])} />
          )}

          <div className="card">
            <h3>目前名册 / Current Roster（{activeRoster.length} 人 / students）</h3>
            {activeRoster.length === 0 ? (
              <p>尚未有学生加入。 / No students yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>学号/Student ID</th>
                    <th>姓名/Name</th>
                    <th>班级/Class</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoster.map((r) => (
                    <tr
                      key={r.roster_id}
                      className={readOnly ? undefined : "table__row--clickable"}
                      title={readOnly ? undefined : "点击以办理退出 / Click to withdraw"}
                      onClick={
                        readOnly
                          ? undefined
                          : () => {
                              setError(null);
                              setWithdrawing({ rosterId: r.roster_id, date: todayMYT(), reason: "" });
                            }
                      }
                    >
                      <td>{r.student_no || r.student_id}</td>
                      <td>
                        <div>{r.student_name_cn}</div>
                        <div className="name-en">{r.student_name_en}</div>
                      </td>
                      <td>{r.student_class}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {withdrawing && withdrawingEntry && (
            <div className="modal-overlay" onClick={() => !withdrawSaving && setWithdrawing(null)}>
              <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleWithdraw}>
                <h3 style={{ marginTop: 0 }}>确定要让这位学生退出名册吗？ / Withdraw this student from the roster?</h3>
                <table className="modal__info">
                  <tbody>
                    <tr>
                      <th>学号 / Student ID</th>
                      <td>{withdrawingEntry.student_no || withdrawingEntry.student_id}</td>
                    </tr>
                    <tr>
                      <th>中文姓名 / Chinese Name</th>
                      <td>{withdrawingEntry.student_name_cn}</td>
                    </tr>
                    <tr>
                      <th>英文姓名 / English Name</th>
                      <td>{withdrawingEntry.student_name_en}</td>
                    </tr>
                    <tr>
                      <th>班级 / Class</th>
                      <td>{withdrawingEntry.student_class}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="form-row">
                  <label>退出日期 / Withdrawal Date</label>
                  <input
                    type="date"
                    value={withdrawing.date}
                    max={todayMYT()}
                    onChange={(e) => setWithdrawing({ ...withdrawing, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>原因 / Reason</label>
                  <input
                    value={withdrawing.reason}
                    onChange={(e) => setWithdrawing({ ...withdrawing, reason: e.target.value })}
                    placeholder="必填 / Required"
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <div className="modal__actions">
                  <button type="button" className="btn" onClick={() => setWithdrawing(null)} disabled={withdrawSaving}>
                    取消 / Cancel
                  </button>
                  <button type="submit" className="btn btn--danger" disabled={withdrawSaving}>
                    {withdrawSaving ? "处理中... / Processing..." : "确认退出 / Confirm"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default RosterManagement;

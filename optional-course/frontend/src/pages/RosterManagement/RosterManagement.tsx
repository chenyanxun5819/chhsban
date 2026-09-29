import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CoursePageHeader, Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster, lookupStudent, addRosterEntry, withdrawRosterEntry } from "@/services/rosterService";
import type { OptionalCourse, OptionalCourseRoster, StudentRecord } from "@/types";
import { courseSubtitle, todayMYT } from "@/utils/calendar";
import RosterBatchImport from "./RosterBatchImport";

const WITHDRAW_ERROR_KEY: Record<string, string> = {
  MISSING_WITHDRAWAL_REASON: "roster.reasonRequired",
  INVALID_WITHDRAWAL_DATE: "roster.invalidWithdrawDate",
};

const RosterManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
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
      setError(err.response?.data?.error || t("common.loadFailed"));
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
      setError(err.response?.data?.error === "Student not found" ? t("roster.studentNotFound") : t("roster.searchFailed"));
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
        setError(t("roster.alreadyInRoster"));
      } else {
        setError(code || t("roster.addFailed"));
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
      setError(t("roster.reasonRequired"));
      return;
    }
    if (!withdrawing.date || withdrawing.date > todayMYT()) {
      setError(t("roster.invalidWithdrawDate"));
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
      setError(WITHDRAW_ERROR_KEY[code] ? t(WITHDRAW_ERROR_KEY[code]) : code || t("roster.withdrawFailed"));
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
    <Layout title={course && readOnly ? t("roster.viewTitle") : t("roster.manageTitle")}>
      {course && <CoursePageHeader subject={course.subject} subtitle={courseSubtitle(course)} />}
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          {readOnly && (
            <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          {t("common.closedNotice")}
        </p>
          )}
          {!readOnly && (
          <div className="card">
            <h3>{t("roster.addStudent")}</h3>
            <form onSubmit={handleSearch} style={{ display: "flex", gap: 8 }}>
              <input
                placeholder={t("roster.studentNoPlaceholder")}
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                style={{ flex: 1, padding: 8, border: "1px solid #d0d3d8", borderRadius: 6 }}
              />
              <button type="submit" className="btn" disabled={searching}>
                {t("roster.search")}
              </button>
            </form>
            {foundStudent && (
              <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {foundStudent.student_no} - {foundStudent.name_cn}（{foundStudent.class}）
                </span>
                <button className="btn btn--primary" disabled={adding} onClick={handleAdd}>
                  {t("roster.addToRoster")}
                </button>
              </div>
            )}
          </div>

          )}

          {id && !readOnly && (
            <RosterBatchImport courseId={id} onAdded={(entries) => setRoster((prev) => [...prev, ...entries])} />
          )}

          <div className="card">
            <h3>{t("roster.currentRoster", { count: activeRoster.length })}</h3>
            {activeRoster.length === 0 ? (
              <p>{t("roster.empty")}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("roster.studentNo")}</th>
                    <th>{t("roster.name")}</th>
                    <th>{t("roster.class")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoster.map((r) => (
                    <tr
                      key={r.roster_id}
                      className={readOnly ? undefined : "table__row--clickable"}
                      title={readOnly ? undefined : t("roster.clickToWithdraw")}
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
                <h3 style={{ marginTop: 0 }}>{t("roster.withdrawConfirm")}</h3>
                <table className="modal__info">
                  <tbody>
                    <tr>
                      <th>{t("roster.studentNo")}</th>
                      <td>{withdrawingEntry.student_no || withdrawingEntry.student_id}</td>
                    </tr>
                    <tr>
                      <th>{t("roster.nameCn")}</th>
                      <td>{withdrawingEntry.student_name_cn}</td>
                    </tr>
                    <tr>
                      <th>{t("roster.nameEn")}</th>
                      <td>{withdrawingEntry.student_name_en}</td>
                    </tr>
                    <tr>
                      <th>{t("roster.class")}</th>
                      <td>{withdrawingEntry.student_class}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="form-row">
                  <label>{t("roster.withdrawDate")}</label>
                  <input
                    type="date"
                    value={withdrawing.date}
                    max={todayMYT()}
                    onChange={(e) => setWithdrawing({ ...withdrawing, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <label>{t("roster.reason")}</label>
                  <input
                    value={withdrawing.reason}
                    onChange={(e) => setWithdrawing({ ...withdrawing, reason: e.target.value })}
                    placeholder={t("roster.required")}
                    required
                    autoFocus
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <div className="modal__actions">
                  <button type="button" className="btn" onClick={() => setWithdrawing(null)} disabled={withdrawSaving}>
                    {t("common.cancel")}
                  </button>
                  <button type="submit" className="btn btn--danger" disabled={withdrawSaving}>
                    {withdrawSaving ? t("common.processing") : t("roster.confirmWithdraw")}
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

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TutionPage } from "@/tution/components/TutionPage";
import { useGradeLabel, useWeekdayShort } from "@/tution/i18n/labels";
import {
  boardingService,
  type BoardingAttendanceResult,
  type BoardingClassGroup,
} from "@/tution/services/boardingService";
import {
  AttendanceStatusTag,
  localToday,
  shortDate,
  weekdayIndex,
  type EmptyStatusKind,
} from "@/tution/components/boarding/AttendanceStatusTag";
import "@/tution/styles/boarding.css";

/** 課程當天不上課時，學生狀態欄顯示的文字 */
function emptyStatusFor(group: BoardingClassGroup, isFuture: boolean): EmptyStatusKind {
  if (group.session === "cancelled") return "cancelled";
  if (group.session === "rescheduled_out") return "rescheduled";
  return isFuture ? "upcoming" : "unmarked";
}

/**
 * 住宿生點名控管：列出某日有課的補習班裡，住宿生（LH / PH）的點名狀態，依課程分組、年級排序；
 * 組內學生依真實班級、學號排序。預設今天，可選日期查歷史。督察員、超級管理員、舍監可查看。
 */
const BoardingAttendance: React.FC = () => {
  const gradeLabel = useGradeLabel();
  const weekdayShort = useWeekdayShort();
  const [date, setDate] = useState(localToday);
  const [result, setResult] = useState<BoardingAttendanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    boardingService
      .getBoardingAttendance(date)
      .then((data) => {
        if (!cancelled) setResult(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err?.response?.data?.error || err?.message || "載入點名資料失敗");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  // 當天實際有上課的課程才統計（停課、調離的不算）
  const summary = useMemo(() => {
    const counts = { total: 0, present: 0, late: 0, absent: 0, excuse: 0, unmarked: 0 };
    for (const group of result?.classes || []) {
      if (group.session === "cancelled" || group.session === "rescheduled_out") continue;
      for (const s of group.students) {
        counts.total++;
        counts[s.status ?? "unmarked"]++;
      }
    }
    return counts;
  }, [result]);

  const isToday = date === localToday();
  const isFuture = date > localToday();

  return (
    <TutionPage title="住宿生點名控管" error={error}>
      <div className="course-list-toolbar">
        <label className="course-list-toolbar__sort">
          <span>日期：</span>
          <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        </label>
        <span className="ba-weekday">（星期{weekdayShort(weekdayIndex(date))}）</span>
        {!isToday && (
          <button type="button" className="btn btn--secondary btn--small" onClick={() => setDate(localToday())}>
            回到今天
          </button>
        )}
      </div>

      <p className="ba-hint">只列出住宿生（LH、PH）。老師尚未點名的顯示「未點名」。</p>

      {loading && <p className="ba-empty">載入中...</p>}

      {!loading && result && result.classes.length === 0 && (
        <p className="ba-empty">這一天沒有住宿生需要上補習課。</p>
      )}

      {!loading && result && result.classes.length > 0 && (
        <>
          <div className="ba-summary">
            <span>住宿生共 <strong>{summary.total}</strong> 人次</span>
            <span className="ba-summary__item ba-summary__item--present">到課 {summary.present}</span>
            <span className="ba-summary__item ba-summary__item--late">遲到 {summary.late}</span>
            <span className="ba-summary__item ba-summary__item--absent">缺席 {summary.absent}</span>
            <span className="ba-summary__item ba-summary__item--excuse">請假 {summary.excuse}</span>
            <span className="ba-summary__item ba-summary__item--unmarked">
              {isFuture ? "尚未上課" : "未點名"} {summary.unmarked}
            </span>
          </div>

          {result.classes.map((group) => (
            <section key={group.class_id} className="ba-group">
              <header className="ba-group__header">
                <h3 className="ba-group__title">
                  {gradeLabel(group.form)}
                  {group.subject}，{group.teacher_name_cn}
                </h3>
                <span className="ba-group__meta">
                  {group.time_start}-{group.time_end}
                  {group.venue ? ` ・ ${group.venue}` : ""}
                </span>
                {group.session === "rescheduled_in" && group.related_date && (
                  <span className="ba-badge ba-badge--info">由 {shortDate(group.related_date)} 調課至今天</span>
                )}
                {group.session === "cancelled" && (
                  <span className="ba-badge ba-badge--muted">停課{group.reason ? `：${group.reason}` : ""}</span>
                )}
                {group.session === "rescheduled_out" && group.related_date && (
                  <span className="ba-badge ba-badge--muted">
                    已調課至 {shortDate(group.related_date)}
                    {group.reason ? `：${group.reason}` : ""}
                  </span>
                )}
              </header>
              <table className="ba-table">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>班級</th>
                    <th>姓名</th>
                    <th>住宿</th>
                    <th className="ba-col-en">英文姓名</th>
                    <th>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students.map((s) => (
                    <tr key={s.student_id}>
                      <td>
                        <Link to={`/tution/student-attendance?no=${encodeURIComponent(s.student_no)}`}>
                          {s.student_no}
                        </Link>
                      </td>
                      <td>{s.real_class_name}</td>
                      <td>{s.name_cn}</td>
                      <td>{s.gender_boarding}</td>
                      <td className="ba-col-en">{s.name_en}</td>
                      <td>
                        <AttendanceStatusTag
                          status={s.status}
                          absenceReason={s.absence_reason}
                          fallback={emptyStatusFor(group, isFuture)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      )}
    </TutionPage>
  );
};

export default BoardingAttendance;

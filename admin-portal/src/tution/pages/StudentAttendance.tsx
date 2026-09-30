import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TutionPage } from "@/tution/components/TutionPage";
import { useDayLabel, useGradeLabel, useWeekdayShort } from "@/tution/i18n/labels";
import {
  boardingService,
  type StudentAttendanceResult,
  type StudentSessionRow,
} from "@/tution/services/boardingService";
import {
  AttendanceStatusTag,
  shortDate,
  weekdayIndex,
  type EmptyStatusKind,
} from "@/tution/components/boarding/AttendanceStatusTag";
import { formatDisplayDate } from "@/tution/utils/validators";
import "@/tution/styles/boarding.css";

function emptyStatusFor(row: StudentSessionRow): EmptyStatusKind {
  if (row.session === "cancelled") return "cancelled";
  if (!row.on_roster) return "off_roster";
  if (!row.is_past) return "upcoming";
  return "unmarked";
}

/**
 * 學號出席查詢：輸入學號，列出該生參加的每個補習班、每堂課的點名狀態與統計（不限住宿生）。
 * 網址帶 ?no=學號 會直接查詢（住宿生點名控管頁的學號連結會帶過來）。
 */
const StudentAttendance: React.FC = () => {
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const weekdayShort = useWeekdayShort();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryNo = (searchParams.get("no") || "").trim();

  const [input, setInput] = useState(queryNo);
  const [result, setResult] = useState<StudentAttendanceResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setInput(queryNo);
    setResult(null);
    setNotFound(false);
    setError(null);
    if (!queryNo) return;

    let cancelled = false;
    setLoading(true);
    boardingService
      .getStudentAttendance(queryNo)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setNotFound(data === null);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.error || err?.message || "查詢失敗");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryNo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const no = input.trim();
    if (no) setSearchParams({ no });
  };

  const student = result?.student;

  return (
    <TutionPage title="學號出席查詢" error={error}>
      <form className="course-list-toolbar" onSubmit={handleSubmit}>
        <label className="course-list-toolbar__sort">
          <span>學號：</span>
          <input
            type="text"
            inputMode="numeric"
            className="ba-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如 21250"
            autoFocus
          />
        </label>
        <button type="submit" className="btn btn--primary btn--small" disabled={!input.trim() || loading}>
          查詢
        </button>
      </form>

      {loading && <p className="ba-empty">查詢中...</p>}
      {!loading && notFound && <p className="ba-empty">查無學號 {queryNo}。</p>}

      {!loading && student && (
        <div className="ba-student">
          <strong>{student.student_no}</strong>
          <span>{student.real_class_name}</span>
          <strong>{student.name_cn}</strong>
          <span>{student.gender_boarding}</span>
          <span>{student.name_en}</span>
        </div>
      )}

      {!loading && result && result.classes.length === 0 && (
        <p className="ba-empty">這位學生沒有參加任何補習班。</p>
      )}

      {!loading &&
        result?.classes.map((cls) => (
          <section key={cls.class_id} className="ba-group">
            <header className="ba-group__header">
              <h3 className="ba-group__title">
                {gradeLabel(cls.form)}
                {cls.subject}，{cls.teacher_name_cn}
              </h3>
              <span className="ba-group__meta">
                {dayLabel(cls.day_of_week)} {cls.time_start}-{cls.time_end}
                {cls.venue ? ` ・ ${cls.venue}` : ""}
                {" ・ "}加入 {formatDisplayDate(cls.enrollment_date)}
                {cls.withdrawal_date ? `，退出 ${formatDisplayDate(cls.withdrawal_date)}` : ""}
              </span>
            </header>

            <div className="ba-summary">
              <span>
                出席率 <strong>{cls.stats.attendance_rate === null ? "—" : `${cls.stats.attendance_rate}%`}</strong>
              </span>
              <span className="ba-summary__item ba-summary__item--present">到課 {cls.stats.present}</span>
              <span className="ba-summary__item ba-summary__item--late">遲到 {cls.stats.late}</span>
              <span className="ba-summary__item ba-summary__item--absent">缺席 {cls.stats.absent}</span>
              <span className="ba-summary__item ba-summary__item--excuse">請假 {cls.stats.excuse}</span>
              <span className="ba-summary__item ba-summary__item--unmarked">未點名 {cls.stats.unmarked}</span>
            </div>

            <table className="ba-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>狀態</th>
                  <th>備註</th>
                </tr>
              </thead>
              <tbody>
                {cls.sessions.map((row) => (
                  <tr
                    key={`${row.scheduled_date}|${row.date}`}
                    className={!row.is_past || !row.on_roster || row.session === "cancelled" ? "ba-row--muted" : ""}
                  >
                    <td>
                      {formatDisplayDate(row.date)}（{weekdayShort(weekdayIndex(row.date))}）
                    </td>
                    <td>
                      <AttendanceStatusTag
                        status={row.status}
                        absenceReason={row.absence_reason}
                        fallback={emptyStatusFor(row)}
                      />
                    </td>
                    <td>
                      {row.session === "rescheduled" && row.scheduled_date !== row.date
                        ? `由 ${shortDate(row.scheduled_date)} 調課`
                        : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
    </TutionPage>
  );
};

export default StudentAttendance;

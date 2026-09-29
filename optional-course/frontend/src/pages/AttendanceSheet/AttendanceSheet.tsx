import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CoursePageHeader, Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster } from "@/services/rosterService";
import { recordAttendance, listAttendance } from "@/services/attendanceService";
import { getCalendar, getCourseSessions } from "@/services/calendarService";
import { listSchedules } from "@/services/scheduleService";
import type {
  CourseSessionsInfo,
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseSchedule,
  OptionalCourseAttendance,
  CourseAttendanceStatus,
} from "@/types";
import { courseSubtitle, formatDate, todayMYT } from "@/utils/calendar";
import { AttendanceOverview, type OverviewCalendar } from "@/components/attendance/AttendanceOverview";

const STATUS_OPTIONS: CourseAttendanceStatus[] = ["present", "absent", "late", "excuse"];

const ERROR_KEY: Record<string, string> = {
  NOT_A_SESSION_DATE: "attendance.notSessionDate",
  COURSE_NOT_OPEN: "attendance.courseNotOpen",
};

/**
 * 預設日期：今天有課就選今天；否則選最近一次未點名的課；都沒有就選今天以前最近的一堂。
 */
function defaultDate(info: CourseSessionsInfo): string {
  const past = info.sessions.filter((s) => s.date <= info.today);
  if (past.some((s) => s.date === info.today)) return info.today;
  const missing = past.filter((s) => s.missing);
  if (missing.length > 0) return missing[missing.length - 1].date;
  return past.length > 0 ? past[past.length - 1].date : info.sessions[0]?.date || "";
}

const AttendanceSheet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [fullRoster, setFullRoster] = useState<OptionalCourseRoster[]>([]); // 含已退選，總覽用
  const [roster, setRoster] = useState<OptionalCourseRoster[]>([]);
  const [showOverview, setShowOverview] = useState(false);
  const [calendar, setCalendar] = useState<OverviewCalendar | null>(null);
  const [schedules, setSchedules] = useState<OptionalCourseSchedule[]>([]);
  const [info, setInfo] = useState<CourseSessionsInfo | null>(null);
  // 後端已依 course+student+date 取最新一筆，這裡拿到的就是每人每天的目前狀態
  const [records, setRecords] = useState<OptionalCourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [classDate, setClassDate] = useState(todayMYT());
  const [statusMap, setStatusMap] = useState<Record<string, CourseAttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  // 窗口未開放（已關閉）時只能查看，後端也會拒絕任何修改
  const readOnly = !loading && course?.window_status !== "open";
  // 行事曆已建立且課程有上課星期時，只能從應點名日期中選；否則退回自由選日期
  const restricted = !!info?.calendar_ready && !!info?.day_of_week;

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r, i, a] = await Promise.all([getCourse(id), listRoster(id), getCourseSessions(id), listAttendance(id)]);
      setCourse(c);
      // 行事曆只用來在總覽標示假期欄，讀不到就不標
      getCalendar(c.year)
        .then(setCalendar)
        .catch(() => setCalendar(null));
      // 停課／調課同樣只用於總覽標示，讀不到就不標
      listSchedules(c.course_id)
        .then(setSchedules)
        .catch(() => setSchedules([]));
      setFullRoster(r);
      setRoster(r.filter((entry) => entry.is_active));
      setInfo(i);
      setRecords(a);
      if (i.calendar_ready && i.day_of_week) {
        setClassDate(defaultDate(i));
      }
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
    if (!id || roster.length === 0 || readOnly || !classDate) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      const payload = roster.map((entry) => ({
        student_id: entry.student_id,
        status: statusMap[entry.student_id] || "present",
      }));
      await recordAttendance(id, classDate, payload);
      setSuccess(t("attendance.saved", { date: formatDate(classDate) }));
      const [a, i] = await Promise.all([listAttendance(id), getCourseSessions(id)]);
      setRecords(a);
      setInfo(i);
    } catch (err: any) {
      const code = err.response?.data?.error;
      setError(ERROR_KEY[code] ? t(ERROR_KEY[code]) : code || t("attendance.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // 只列今天以前的上課日（不能預先點名）
  const sessionOptions = info?.sessions.filter((s) => s.date <= info.today) ?? [];
  const missingCount = sessionOptions.filter((s) => s.missing).length;
  const alreadyRecorded = recordsForDate.length > 0;


  return (
    <Layout title={readOnly ? t("attendance.viewTitle") : t("attendance.title")}>
      {course && (
        <CoursePageHeader
          subject={course.subject}
          subtitle={courseSubtitle(course)}
          actions={
            <button type="button" className="btn" onClick={() => setShowOverview((v) => !v)}>
              {showOverview ? t("attendance.backToSheet") : t("attendance.viewOverview")}
            </button>
          }
        />
      )}
      {error && <p className="error-text">{error}</p>}
      {success && !showOverview && <p style={{ color: "#166534" }}>{success}</p>}
      {readOnly && (
        <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          {t("common.closedNotice")}
        </p>
      )}
      {loading || !info ? (
        <p>{t("common.loading")}</p>
      ) : showOverview ? (
        <AttendanceOverview info={info} roster={fullRoster} records={records} calendar={calendar} course={course} schedules={schedules} />
      ) : roster.length === 0 ? (
        <p>{readOnly ? t("attendance.emptyRosterReadOnly") : t("attendance.emptyRoster")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          {!readOnly && missingCount > 0 && (
            <p style={{ color: "#b91c1c", marginTop: 0 }}>{t("attendance.missingSessions", { count: missingCount })}</p>
          )}
          <div className="form-row">
            <label>{t("attendance.classDate")}</label>
            {restricted ? (
              sessionOptions.length === 0 ? (
                <p style={{ color: "#888", margin: 0 }}>{t("attendance.noSessionYet")}</p>
              ) : (
                <select value={classDate} onChange={(e) => setClassDate(e.target.value)} required>
                  {!sessionOptions.some((s) => s.date === classDate) && <option value="">{t("attendance.selectDate")}</option>}
                  {[...sessionOptions].reverse().map((s) => (
                    <option key={s.date} value={s.date}>
                      {formatDate(s.date)}
                      {s.date === info.today ? t("attendance.today") : ""}
                      {s.rescheduled_from ? t("attendance.movedFrom", { date: formatDate(s.rescheduled_from) }) : ""}
                      {s.recorded ? t("attendance.optionRecorded") : s.missing ? t("attendance.optionMissing") : ""}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <>
                <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} required />
                <small style={{ color: "#b45309" }}>
                  {!info.calendar_ready ? t("attendance.calendarNotReady") : t("attendance.noWeekday")}
                  {t("attendance.freeDate")}
                </small>
              </>
            )}
          </div>
          {!restricted && recordedDates.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>{t("attendance.recordedDates")}</span>
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
          <p style={{ color: "#888", fontSize: 13 }}>
            {alreadyRecorded
              ? readOnly
                ? t("attendance.hintRecordedReadOnly")
                : t("attendance.hintRecorded")
              : readOnly
                ? t("attendance.hintNoRecordReadOnly")
                : t("attendance.hintNoRecord")}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>{t("attendance.studentNo")}</th>
                <th>{t("attendance.name")}</th>
                <th>{t("attendance.status")}</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.roster_id}>
                  <td>{entry.student_no || entry.student_id}</td>
                  <td>{entry.student_name_cn}</td>
                  <td>
                    {readOnly ? (
                      alreadyRecorded ? t(`attendanceStatus.${statusMap[entry.student_id] || "present"}`) : "-"
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
                          <option key={opt} value={opt}>
                            {t(`attendanceStatus.${opt}`)}
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
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !classDate || (restricted && sessionOptions.length === 0)}
              style={{ marginTop: 12 }}
            >
              {saving ? t("attendance.saving") : alreadyRecorded ? t("attendance.update") : t("attendance.save")}
            </button>
          )}
        </form>
      )}
    </Layout>
  );
};

export default AttendanceSheet;

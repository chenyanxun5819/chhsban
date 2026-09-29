import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
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

const STATUS_OPTIONS: Array<{ value: CourseAttendanceStatus; label: string }> = [
  { value: "present", label: "到课 / Present" },
  { value: "absent", label: "缺课 / Absent" },
  { value: "late", label: "迟到 / Late" },
  { value: "excuse", label: "有理由缺席 / Excused" },
];

const STATUS_LABEL = Object.fromEntries(STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  CourseAttendanceStatus,
  string
>;

const ERROR_LABEL: Record<string, string> = {
  NOT_A_SESSION_DATE: "这一天不是这门课的上课日，无法点名 / This date is not a class day",
  COURSE_NOT_OPEN: "课程窗口未开放，无法点名 / Course is not open for attendance",
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
      setError(err.response?.data?.error || "载入失败 / Failed to load");
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
      setSuccess(`已储存 ${formatDate(classDate)} 的点名纪录 / Attendance saved for ${formatDate(classDate)}`);
      const [a, i] = await Promise.all([listAttendance(id), getCourseSessions(id)]);
      setRecords(a);
      setInfo(i);
    } catch (err: any) {
      const code = err.response?.data?.error;
      setError(ERROR_LABEL[code] || code || "点名储存失败 / Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  // 只列今天以前的上課日（不能預先點名）
  const sessionOptions = info?.sessions.filter((s) => s.date <= info.today) ?? [];
  const missingCount = sessionOptions.filter((s) => s.missing).length;
  const alreadyRecorded = recordsForDate.length > 0;


  return (
    <Layout title={readOnly ? "查看点名 / View Attendance" : "点名 / Attendance"}>
      {course && (
        <CoursePageHeader
          subject={course.subject}
          subtitle={courseSubtitle(course)}
          actions={
            <button type="button" className="btn" onClick={() => setShowOverview((v) => !v)}>
              {showOverview ? "返回点名 / Back" : "查看总览 / Overview"}
            </button>
          }
        />
      )}
      {error && <p className="error-text">{error}</p>}
      {success && !showOverview && <p style={{ color: "#166534" }}>{success}</p>}
      {readOnly && (
        <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          此课程窗口已关闭，资料仅供查看，无法修改。如需修改请联络行政人员重新开放。
          <br />
          This course is closed and view-only. Please contact the administrator to reopen it if changes are needed.
        </p>
      )}
      {loading || !info ? (
        <p>载入中... / Loading...</p>
      ) : showOverview ? (
        <AttendanceOverview info={info} roster={fullRoster} records={records} calendar={calendar} course={course} schedules={schedules} />
      ) : roster.length === 0 ? (
        <p>{readOnly ? "名册里没有学生。 / No students in the roster." : "名册里没有学生，请先到名册管理加入学生。 / No students in the roster, please add students first."}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          {!readOnly && missingCount > 0 && (
            <p style={{ color: "#b91c1c", marginTop: 0 }}>尚有 {missingCount} 堂课未点名，请尽快补上。 / {missingCount} session(s) not yet marked, please complete them soon.</p>
          )}
          <div className="form-row">
            <label>上课日期 / Class Date</label>
            {restricted ? (
              sessionOptions.length === 0 ? (
                <p style={{ color: "#888", margin: 0 }}>目前还没有到上课日。 / No class days yet.</p>
              ) : (
                <select value={classDate} onChange={(e) => setClassDate(e.target.value)} required>
                  {!sessionOptions.some((s) => s.date === classDate) && <option value="">选择上课日 / Select date...</option>}
                  {[...sessionOptions].reverse().map((s) => (
                    <option key={s.date} value={s.date}>
                      {formatDate(s.date)}
                      {s.date === info.today ? "（今天/Today）" : ""}
                      {s.rescheduled_from ? `（由 ${formatDate(s.rescheduled_from)} 调课/Moved）` : ""}
                      {s.recorded ? " ✓ 已点名/Marked" : s.missing ? " ⚠ 未点名/Not marked" : ""}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <>
                <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} required />
                <small style={{ color: "#b45309" }}>
                  {!info.calendar_ready ? "学校行事历尚未建立，" : "这门课尚未设定上课星期，"}暂时可自由选择日期。 / Any date can be selected for now.
                </small>
              </>
            )}
          </div>
          {!restricted && recordedDates.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 12 }}>
              <span style={{ color: "#666", fontSize: 13 }}>已点名的日期 / Marked dates：</span>
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
                ? "以下是这一天的点名纪录。 / Attendance record for this date."
                : "这一天已经点过名，以下是目前的纪录；修改后再次储存即可更新。 / Already marked; edit and save again to update."
              : readOnly
                ? "这个日期没有点名纪录。 / No attendance record for this date."
                : "这个日期尚未点名，预设全部「到课」。 / Not marked yet; everyone defaults to Present."}
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>学号/Student ID</th>
                <th>姓名/Name</th>
                <th>出勤状态/Status</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((entry) => (
                <tr key={entry.roster_id}>
                  <td>{entry.student_no || entry.student_id}</td>
                  <td>{entry.student_name_cn}</td>
                  <td>
                    {readOnly ? (
                      alreadyRecorded ? STATUS_LABEL[statusMap[entry.student_id] || "present"] : "-"
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
            <button
              type="submit"
              className="btn btn--primary"
              disabled={saving || !classDate || (restricted && sessionOptions.length === 0)}
              style={{ marginTop: 12 }}
            >
              {saving ? "储存中... / Saving..." : alreadyRecorded ? "更新点名纪录 / Update" : "储存点名纪录 / Save"}
            </button>
          )}
        </form>
      )}
    </Layout>
  );
};

export default AttendanceSheet;

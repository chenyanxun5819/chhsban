import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listRoster } from "@/services/rosterService";
import { recordAttendance, listAttendance } from "@/services/attendanceService";
import { getCalendar, getCourseSessions } from "@/services/calendarService";
import type {
  CourseSessionsInfo,
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseAttendance,
  CourseAttendanceStatus,
} from "@/types";
import { WEEKDAY_LABEL, formatDate, todayMYT } from "@/utils/calendar";
import { AttendanceOverview, type OverviewCalendar } from "@/components/attendance/AttendanceOverview";

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

const ERROR_LABEL: Record<string, string> = {
  NOT_A_SESSION_DATE: "這一天不是這門課的上課日，無法點名",
  COURSE_NOT_OPEN: "課程窗口未開放，無法點名",
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
      setFullRoster(r);
      setRoster(r.filter((entry) => entry.is_active));
      setInfo(i);
      setRecords(a);
      if (i.calendar_ready && i.day_of_week) {
        setClassDate(defaultDate(i));
      }
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
      setSuccess(`已儲存 ${formatDate(classDate)} 的點名紀錄`);
      const [a, i] = await Promise.all([listAttendance(id), getCourseSessions(id)]);
      setRecords(a);
      setInfo(i);
    } catch (err: any) {
      const code = err.response?.data?.error;
      setError(ERROR_LABEL[code] || code || "點名儲存失敗");
    } finally {
      setSaving(false);
    }
  };

  // 只列今天以前的上課日（不能預先點名）
  const sessionOptions = info?.sessions.filter((s) => s.date <= info.today) ?? [];
  const missingCount = sessionOptions.filter((s) => s.missing).length;
  const alreadyRecorded = recordsForDate.length > 0;

  const subtitle = course
    ? [
        course.course_no,
        course.teacher_name_cn && `授課老師：${course.teacher_name_cn}`,
        course.day_of_week &&
          `每${WEEKDAY_LABEL[course.day_of_week]}${
            course.time_start ? ` ${course.time_start}${course.time_end ? `-${course.time_end}` : ""}` : ""
          }`,
        course.venue,
      ]
        .filter(Boolean)
        .join(" ・ ")
    : "";

  return (
    <Layout title="點名">
      {course && (
        <div className="attendance-page-header">
          <div>
            <h2>{course.subject}</h2>
            <p className="attendance-subtitle">{subtitle}</p>
          </div>
          <button type="button" className="btn" onClick={() => setShowOverview((v) => !v)}>
            {showOverview ? "返回點名" : "查看總覽"}
          </button>
        </div>
      )}
      {error && <p className="error-text">{error}</p>}
      {success && !showOverview && <p style={{ color: "#166534" }}>{success}</p>}
      {readOnly && (
        <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
          此課程窗口已關閉，資料僅供查看，無法修改。如需修改請聯絡行政人員重新開放。
        </p>
      )}
      {loading || !info ? (
        <p>載入中...</p>
      ) : showOverview ? (
        <AttendanceOverview info={info} roster={fullRoster} records={records} calendar={calendar} course={course} />
      ) : roster.length === 0 ? (
        <p>{readOnly ? "名冊裡沒有學生。" : "名冊裡沒有學生，請先到名冊管理加入學生。"}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card">
          {!readOnly && missingCount > 0 && (
            <p style={{ color: "#b91c1c", marginTop: 0 }}>尚有 {missingCount} 堂課未點名，請盡快補上。</p>
          )}
          <div className="form-row">
            <label>上課日期</label>
            {restricted ? (
              sessionOptions.length === 0 ? (
                <p style={{ color: "#888", margin: 0 }}>目前還沒有到上課日。</p>
              ) : (
                <select value={classDate} onChange={(e) => setClassDate(e.target.value)} required>
                  {!sessionOptions.some((s) => s.date === classDate) && <option value="">選擇上課日...</option>}
                  {[...sessionOptions].reverse().map((s) => (
                    <option key={s.date} value={s.date}>
                      {formatDate(s.date)}
                      {s.date === info.today ? "（今天）" : ""}
                      {s.rescheduled_from ? `（由 ${formatDate(s.rescheduled_from)} 調課）` : ""}
                      {s.recorded ? " ✓ 已點名" : s.missing ? " ⚠ 未點名" : ""}
                    </option>
                  ))}
                </select>
              )
            ) : (
              <>
                <input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} required />
                <small style={{ color: "#b45309" }}>
                  {!info.calendar_ready ? "學校行事曆尚未建立，" : "這門課尚未設定上課星期，"}暫時可自由選擇日期。
                </small>
              </>
            )}
          </div>
          {!restricted && recordedDates.length > 0 && (
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
          <p style={{ color: "#888", fontSize: 13 }}>
            {alreadyRecorded
              ? readOnly
                ? "以下是這一天的點名紀錄。"
                : "這一天已經點過名，以下是目前的紀錄；修改後再次儲存即可更新。"
              : readOnly
                ? "這個日期沒有點名紀錄。"
                : "這個日期尚未點名，預設全部「到課」。"}
          </p>
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
              {saving ? "儲存中..." : alreadyRecorded ? "更新點名紀錄" : "儲存點名紀錄"}
            </button>
          )}
        </form>
      )}
    </Layout>
  );
};

export default AttendanceSheet;

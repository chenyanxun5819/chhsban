import React, { useState } from "react";
import * as XLSX from "xlsx";
import { Layout } from "@/shared/components/Layout";
import tutionApi from "@/tution/api";
import { generateScheduleRows } from "@/tution/utils/scheduleGenerator";
import { ATTENDANCE_STATUS_META as TUTION_STATUS_META, type AttendanceQueryRecord } from "@/tution/services/attendanceQueryService";
import type { TutionClass, TutionSchedule } from "@/tution/types";
import { listCourses } from "@/optional/services/courseService";
import { getCourseSessions } from "@/optional/services/calendarService";
import { listAttendance, listRoster } from "@/optional/services/attendanceService";
import { listSchedules } from "@/optional/services/scheduleService";
import { ATTENDANCE_STATUS_META as OPTIONAL_STATUS_META } from "@/optional/components/AttendanceOverview";
import { WEEKDAY_LABEL, todayMYT } from "@/optional/utils/calendar";
import type { OptionalCourse, OptionalCourseSchedule, Weekday } from "@/optional/types";
import { currentYear, selectableYears } from "@/shared/utils/year";
import {
  buildArchiveWorkbook,
  mapWithLimit,
  NOT_ON_ROSTER,
  UNMARKED,
  type ArchiveCell,
  type ArchiveCourse,
  type ArchiveStatus,
  type ArchiveStudent,
} from "@/data/utils/archiveSheet";
import "@/data/styles/student-sync.css";

/**
 * 學年封存：把某一年的補習班、選修課各匯出成一份 Excel（一門課一個工作表，版面同點名總覽），
 * 下載到自己電腦保存，不佔 Cloudflare 空間。
 * 學生班級用加入名單當時記下的班級，跨年升班後才匯出也不會錯。
 */

interface TutionArchiveRoster extends ArchiveStudent {
  class_id: string;
  real_class_name: string;
}

interface TutionArchive {
  year: number;
  classes: TutionClass[];
  roster: TutionArchiveRoster[];
  schedules: TutionSchedule[];
  attendance: AttendanceQueryRecord[];
}

const toStatuses = (meta: Record<string, { code: string; label: string }>): ArchiveStatus[] =>
  Object.values(meta).map(({ code, label }) => ({ code, label }));

const weekdayLabel = (day?: string): string => (day && WEEKDAY_LABEL[day as Weekday]) || day || "";

function timeText(day: string | undefined, start?: string, end?: string, from?: string, to?: string): string {
  const slot = [weekdayLabel(day) && `每${weekdayLabel(day)}`, start && `${start}${end ? `-${end}` : ""}`]
    .filter(Boolean)
    .join(" ");
  const period = from ? `（${from} ~ ${to || "未定"}）` : "";
  return `${slot}${period}`;
}

const teacherText = (name?: string, id?: string): string =>
  name ? `${name}${id ? `（${id}）` : ""}` : id || "未綁定老師";

function scheduleLogLines(schedules: Array<TutionSchedule | OptionalCourseSchedule>): string[] {
  return [...schedules]
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .map((s) =>
      s.status === "cancelled"
        ? `${s.scheduled_date} 停課${s.cancellation_reason ? `：${s.cancellation_reason}` : ""}`
        : `${s.scheduled_date} 調課至 ${s.rescheduled_to || "（未指定）"}${s.rescheduled_venue ? `（${s.rescheduled_venue}）` : ""}${
            s.reschedule_reason ? `：${s.reschedule_reason}` : ""
          }`,
    );
}

/** 共用的格子判定：有點名紀錄 → 代碼；未加入或已退出 → -；其餘 → 未點名 */
function makeCell(
  records: Map<string, { status: string; absence_reason?: string }>,
  meta: Record<string, { code: string; label: string }>,
  checkEnrollment: boolean,
) {
  return (student: ArchiveStudent, date: string): ArchiveCell => {
    const record = records.get(`${student.student_id}|${date}`);
    if (record) {
      const m = meta[record.status];
      return { code: m?.code || record.status, note: record.absence_reason ? `${m?.label || ""}：${record.absence_reason}` : undefined };
    }
    if (checkEnrollment && student.enrollment_date && student.enrollment_date > date) return { code: NOT_ON_ROSTER };
    if (!student.is_active && student.withdrawal_date && student.withdrawal_date <= date) return { code: NOT_ON_ROSTER };
    return { code: UNMARKED };
  };
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(item);
  }
  return map;
}

async function buildTutionCourses(year: number): Promise<ArchiveCourse[]> {
  const res = await tutionApi.get(`/v1/reports/archive`, { params: { year }, timeout: 120000 });
  const data: TutionArchive = res.data.data;
  const today = todayMYT();
  const rosterByClass = groupBy(data.roster, (r) => r.class_id);
  const schedulesByClass = groupBy(data.schedules, (s) => s.class_id);
  const attendanceByClass = groupBy(data.attendance, (a) => a.class_id);

  return data.classes.map((cls) => {
    const exceptions = schedulesByClass.get(cls.class_id) || [];
    const records = attendanceByClass.get(cls.class_id) || [];
    const rows = generateScheduleRows({
      dayOfWeek: cls.day_of_week,
      startDate: cls.start_date,
      endDate: cls.end_date,
      exceptions,
    });
    const dates = new Set(rows.filter((r) => r.status !== "cancelled" && r.actual_date <= today).map((r) => r.actual_date));
    records.forEach((r) => dates.add(r.class_date));
    const students = (rosterByClass.get(cls.class_id) || []).map((r) => ({ ...r, class_name: r.real_class_name }));

    return {
      sheetName: `${(cls.application_no || "").replace(/^tution-/, "")} ${cls.subject}`,
      title: `${cls.subject}${cls.form ? `（${cls.form}）` : ""}${cls.application_no ? ` ${cls.application_no}` : ""}`,
      teacher: teacherText(cls.teacher_name_cn, cls.teacher_id),
      time: timeText(cls.day_of_week, cls.time_start, cls.time_end, cls.start_date, cls.end_date),
      venue: cls.venue || "",
      students,
      dates: Array.from(dates).sort(),
      cell: makeCell(new Map(records.map((r) => [`${r.student_id}|${r.class_date}`, r])), TUTION_STATUS_META, true),
      scheduleLog: scheduleLogLines(exceptions),
    };
  });
}

async function buildOptionalCourses(year: number, onProgress: (text: string) => void): Promise<ArchiveCourse[]> {
  // 尚未綁定老師（pending）的課程沒有名冊與點名，不列入
  const courses = (await listCourses(year)).filter((c) => c.window_status !== "pending");
  let done = 0;
  return mapWithLimit(courses, 4, async (course: OptionalCourse): Promise<ArchiveCourse> => {
    const [roster, info, records, schedules] = await Promise.all([
      listRoster(course.course_id),
      getCourseSessions(course.course_id),
      listAttendance(course.course_id),
      listSchedules(course.course_id),
    ]);
    onProgress(`選修課：已讀取 ${++done} / ${courses.length} 門課`);

    const dates = new Set(info.sessions.filter((s) => s.date <= info.today).map((s) => s.date));
    records.forEach((r) => dates.add(r.class_date));
    const sorted = Array.from(dates).sort();
    const students: ArchiveStudent[] = roster.map((r) => ({
      student_id: r.student_id,
      student_no: r.student_no,
      name_cn: r.student_name_cn,
      name_en: r.student_name_en,
      class_name: r.student_class,
      enrollment_date: r.enrollment_date,
      withdrawal_date: r.withdrawal_date || null,
      withdrawal_reason: r.withdrawal_reason || null,
      is_active: r.is_active,
    }));

    return {
      sheetName: `${course.course_no.replace(/^optional-/, "")} ${course.subject}`,
      title: `${course.subject} ${course.course_no}`,
      teacher: teacherText(course.teacher_name_cn, course.teacher_id),
      time: timeText(course.day_of_week, course.time_start, course.time_end, sorted[0], sorted[sorted.length - 1]),
      venue: course.venue || "",
      students,
      dates: sorted,
      // 選修課名冊常在開課後才建立，不看加入日期（與點名總覽一致）
      cell: makeCell(new Map(records.map((r) => [`${r.student_id}|${r.class_date}`, r])), OPTIONAL_STATUS_META, false),
      scheduleLog: scheduleLogLines(schedules),
    };
  });
}

type Kind = "tution" | "optional";

const YearArchive: React.FC = () => {
  const [year, setYear] = useState(currentYear());
  const [running, setRunning] = useState<Kind | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (kind: Kind) => {
    setRunning(kind);
    setError(null);
    setResult(null);
    setProgress(kind === "tution" ? "補習班：讀取資料中..." : "選修課：讀取課程列表中...");
    try {
      const courses = kind === "tution" ? await buildTutionCourses(year) : await buildOptionalCourses(year, setProgress);
      const label = kind === "tution" ? "補習班" : "選修課";
      if (courses.length === 0) {
        setError(`${year} 年沒有${label}課程可以封存。`);
        return;
      }
      const statuses = toStatuses(kind === "tution" ? TUTION_STATUS_META : OPTIONAL_STATUS_META);
      const stamp = new Date().toLocaleDateString("sv-SE");
      XLSX.writeFile(buildArchiveWorkbook(courses, statuses), `${label}學年封存-${year}（${stamp}匯出）.xlsx`);
      const students = courses.reduce((n, c) => n + c.students.length, 0);
      setResult(`已下載 ${label} ${year} 年封存：${courses.length} 門課、名單共 ${students} 人次。`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "匯出失敗");
    } finally {
      setRunning(null);
      setProgress(null);
    }
  };

  return (
    <Layout title="學年封存">
      <div className="ss-page">
        <div className="card">
          <h2 className="ss-card-title">學年封存</h2>
          <p className="ss-muted">
            把一整年的補習班、選修課各匯出成一份 Excel，下載到電腦保存。每門課一個工作表，版面同點名總覽：
          </p>
          <ul className="ss-muted ss-list">
            <li>上方：課堂名稱、老師、上課時間、教室</li>
            <li>左邊幾欄是學生資料（學號、姓名、班級、加入／退出日期），右邊依日期橫向排列點名結果，最後是出席統計</li>
            <li>已退出的學生另外列在表格下方；最下方附停課／調課紀錄</li>
            <li>第一個工作表「課程一覽」列出所有課程</li>
          </ul>
          <p className="ss-muted">
            補習班以「開課日期」所在年份歸年；選修課以建課時的年份歸年。學生班級是加入名單當時的班級。
          </p>
          <div className="ss-actions" style={{ flexWrap: "wrap", gap: 8 }}>
            <label>
              年份：
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={!!running}>
                {selectableYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn btn--primary" onClick={() => download("tution")} disabled={!!running}>
              {running === "tution" ? "產生中..." : "📥 下載補習班封存"}
            </button>
            <button className="btn btn--primary" onClick={() => download("optional")} disabled={!!running}>
              {running === "optional" ? "產生中..." : "📥 下載選修課封存"}
            </button>
          </div>
          {progress && <p className="ss-muted ss-result">{progress}</p>}
          {result && <p className="success-text ss-result">{result}</p>}
          {error && <p className="error-text ss-result">{error}</p>}
        </div>
      </div>
    </Layout>
  );
};

export default YearArchive;

/**
 * 住宿生點名控管 + 學號出席查詢（行政管理站 admin-portal「補習班」類別下的兩個頁面）。
 *
 * GET /api/v1/boarding-attendance?date=YYYY-MM-DD
 *   列出該日期有課（含調課到這天）的補習班裡，住宿生（gender_boarding 含 "H"，即 LH / PH）的點名狀態；
 *   停課、調離這天的課程也列出來，讓舍監知道學生當晚不在課堂。
 * GET /api/v1/student-attendance?student_no=XXXXX
 *   以學號查詢該生參加過的所有補習班、每堂課的點名狀態與統計（不限住宿生）。
 *
 * 上課日推算沿用 course-report.ts 的 generateScheduleRows（與老師排課／點名頁邏輯一致）；
 * 出勤只取同一 class_id+student_id+class_date 最新一筆（dedupeToLatestAttendance）。
 */

import {
  studentStatus,
  type StudentDirectory,
  type StudentStatus,
  type TutionAttendance,
  type TutionClass,
  type TutionRoster,
  type TutionSchedule,
} from "@chhsban/kv-utils";
import { dedupeToLatestAttendance, type TutionKVService } from "./tution-service";
import { generateScheduleRows, type GeneratedScheduleRow } from "./course-report";

/** 可查看這兩個頁面的身分：督察員、超級管理員、舍監 */
export const BOARDING_VIEW_PERMISSIONS = ["admin", "super_admin", "dorm_supervisor"];

// 與「各課程開課報表」一致：審批通過後的課程才算有開課
const RUNNING_STATUSES = new Set(["approved", "active", "ended"]);

// 年級排序：form 目前存中文（初一～高三），舊資料可能是 F1～F6，兩種都認
const FORM_ORDER: Record<string, number> = {
  初一: 1, 初二: 2, 初三: 3, 高一: 4, 高二: 5, 高三: 6,
  F1: 1, F2: 2, F3: 3, F4: 4, F5: 5, F6: 6,
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateString(value: string | null): value is string {
  return !!value && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** 住宿生：gender_boarding 含 "H"（LH、PH） */
export function isBoarder(genderBoarding?: string | null): boolean {
  return !!genderBoarding && genderBoarding.toUpperCase().includes("H");
}

export interface RosterStudentInfo {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  real_class_name: string;
  gender_boarding: string;
  /** 學生名錄的狀態：active 在校／left 離校／excluded 不計入（STAR 班）；名錄查不到為 null */
  student_status: StudentStatus | null;
}

/**
 * 補齊名單學生的學號、真實班級、住宿代碼、在校狀態。
 *
 * 以學生名錄（students_KV 的 students_by_no，student-sync 定期同步＋官方名單核對）為準，
 * 學生調班、住宿變動都會即時反映；名錄查不到（極少數舊資料）才退回名單條目本身與開課時的 initial_roster 快照。
 */
export async function resolveRosterStudentInfo(
  entry: TutionRoster,
  tutionClass: TutionClass | null,
  directory: StudentDirectory,
): Promise<RosterStudentInfo> {
  const initialRoster: any[] = Array.isArray((tutionClass as any)?.initial_roster)
    ? (tutionClass as any).initial_roster
    : [];
  const snapshot = initialRoster.find((s) => s.student_id === entry.student_id);
  const savedNo: string | undefined = (entry as any).student_no || snapshot?.student_no;

  // 名冊的 student_id 通常是 SMS 內部編號；少數舊條目存的是學號，所以兩種都試
  const student =
    (await directory.getById(entry.student_id)) ||
    (savedNo ? await directory.getByNo(savedNo) : null) ||
    (await directory.getStudent(entry.student_id));

  return {
    student_id: entry.student_id,
    student_no: student?.student_no || savedNo || entry.student_id,
    name_cn: entry.student_name_cn,
    name_en: entry.student_name_en,
    real_class_name: student?.real_class_name || snapshot?.real_class_name || entry.student_class || "",
    gender_boarding: student?.gender_boarding || (entry as any).gender_boarding || snapshot?.gender_boarding || "-",
    student_status: studentStatus(student),
  };
}

/** 學生在指定上課日是否在班上：加入日 ≤ 該日，且未退出或退出日晚於該日 */
function isOnRosterAt(entry: TutionRoster, date: string): boolean {
  if (entry.enrollment_date && entry.enrollment_date > date) return false;
  if (entry.withdrawal_date && entry.withdrawal_date <= date) return false;
  return true;
}

function toUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function todayString(): string {
  // 學校在 UTC+8，Worker 時鐘是 UTC；晚上 8 點前後的「今天」要用當地日期判斷
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

function compareStudents(a: RosterStudentInfo, b: RosterStudentInfo): number {
  return (
    a.real_class_name.localeCompare(b.real_class_name) ||
    a.student_no.localeCompare(b.student_no, undefined, { numeric: true })
  );
}

function compareClasses(a: TutionClass, b: TutionClass): number {
  return (
    (FORM_ORDER[a.form] ?? 99) - (FORM_ORDER[b.form] ?? 99) ||
    (a.time_start || "").localeCompare(b.time_start || "") ||
    (a.subject || "").localeCompare(b.subject || "", "zh-Hant")
  );
}

// ================= 住宿生當日點名 =================

/** 該課程在這一天的狀況 */
export type SessionKind =
  | "held" // 正常上課
  | "rescheduled_in" // 從其他日期調課到這天
  | "cancelled" // 停課
  | "rescheduled_out"; // 原本這天上課，已調到別天

export interface BoardingStudentRow extends RosterStudentInfo {
  /** 點名狀態；尚未點名為 null（前端顯示「未點名」）；停課／調離當天不需點名，也為 null */
  status: TutionAttendance["status"] | null;
  absence_reason?: string;
}

export interface BoardingClassGroup {
  class_id: string;
  form: string;
  subject: string;
  teacher_id: string;
  teacher_name_cn: string;
  time_start: string;
  time_end: string;
  venue: string;
  session: SessionKind;
  /** rescheduled_in：原本的上課日；rescheduled_out：調去的新日期 */
  related_date?: string;
  /** 停課原因或調課原因 */
  reason?: string;
  students: BoardingStudentRow[];
}

export interface BoardingAttendanceResult {
  date: string;
  classes: BoardingClassGroup[];
}

function sessionOnDate(
  rows: GeneratedScheduleRow[],
  exceptions: TutionSchedule[],
  date: string,
): { session: SessionKind; related_date?: string; reason?: string; venue?: string } | null {
  // 當天實際上課（正常或調課進來）優先；同一天同時有「調離」與「調入」時以有課為準
  const heldRow = rows.find((r) => r.actual_date === date && r.status !== "cancelled");
  if (heldRow) {
    if (heldRow.status === "rescheduled" && heldRow.scheduled_date !== date) {
      const exception = exceptions.find((e) => e.scheduled_date === heldRow.scheduled_date);
      return {
        session: "rescheduled_in",
        related_date: heldRow.scheduled_date,
        reason: exception?.reschedule_reason,
        venue: exception?.rescheduled_venue,
      };
    }
    return { session: "held" };
  }

  const originalRow = rows.find((r) => r.scheduled_date === date);
  if (!originalRow) return null;
  const exception = exceptions.find((e) => e.scheduled_date === date);
  if (originalRow.status === "cancelled") {
    return { session: "cancelled", reason: exception?.cancellation_reason };
  }
  return { session: "rescheduled_out", related_date: originalRow.actual_date, reason: exception?.reschedule_reason };
}

export async function computeBoardingAttendance(
  kvService: TutionKVService,
  directory: StudentDirectory,
  date: string,
): Promise<BoardingAttendanceResult> {
  const [allClasses, allSchedules] = await Promise.all([
    kvService.listAllClasses(),
    kvService.listAllSchedules(),
  ]);
  const schedulesByClass = groupBy(allSchedules, (s) => s.class_id);

  // 先找出當天有關的課程，再讀名單與出勤，沒課的日子就不必掃這兩張大表
  const candidates: Array<{ cls: TutionClass; info: NonNullable<ReturnType<typeof sessionOnDate>> }> = [];
  for (const cls of allClasses) {
    if (!RUNNING_STATUSES.has(cls.approval_status)) continue;
    const exceptions = schedulesByClass.get(cls.class_id) || [];
    const rows = generateScheduleRows({
      dayOfWeek: cls.day_of_week,
      startDate: cls.start_date,
      endDate: cls.end_date,
      exceptions,
      // 以查詢日期為基準往後多推 60 天，涵蓋「後面的課提前調到這天」的情況
      today: toUTCDate(date),
      horizonDays: 60,
    });
    const info = sessionOnDate(rows, exceptions, date);
    if (info) candidates.push({ cls, info });
  }

  if (candidates.length === 0) return { date, classes: [] };

  const candidateIds = new Set(candidates.map((c) => c.cls.class_id));
  const [allRoster, allAttendance] = await Promise.all([
    kvService.listAllRoster(),
    kvService.listAllAttendanceSummaries(),
  ]);
  const rosterByClass = groupBy(
    allRoster.filter((r) => candidateIds.has(r.class_id)),
    (r) => r.class_id,
  );
  const attendanceByKey = new Map(
    dedupeToLatestAttendance(
      allAttendance.filter((a) => a.class_date === date && candidateIds.has(a.class_id)),
    ).map((a) => [`${a.class_id}|${a.student_id}`, a]),
  );

  const groups = await Promise.all(
    candidates.map(async ({ cls, info }): Promise<BoardingClassGroup> => {
      const needsMarking = info.session === "held" || info.session === "rescheduled_in";
      const entries = (rosterByClass.get(cls.class_id) || []).filter(
        (entry) =>
          isOnRosterAt(entry, date) || attendanceByKey.has(`${cls.class_id}|${entry.student_id}`),
      );
      // 同一學生可能因退出再加入而有多筆名單條目，只留一筆
      const uniqueEntries = Array.from(new Map(entries.map((e) => [e.student_id, e])).values());

      const students = (
        await Promise.all(uniqueEntries.map((entry) => resolveRosterStudentInfo(entry, cls, directory)))
      )
        .filter((s) => isBoarder(s.gender_boarding))
        .sort(compareStudents)
        .map((s): BoardingStudentRow => {
          const record = needsMarking ? attendanceByKey.get(`${cls.class_id}|${s.student_id}`) : undefined;
          return {
            ...s,
            status: record?.status ?? null,
            ...(record?.absence_reason ? { absence_reason: record.absence_reason } : {}),
          };
        });

      return {
        class_id: cls.class_id,
        form: cls.form,
        subject: cls.subject,
        teacher_id: cls.teacher_id,
        teacher_name_cn: (cls as any).teacher_name_cn || "",
        time_start: cls.time_start,
        time_end: cls.time_end,
        venue: info.venue || cls.venue,
        session: info.session,
        ...(info.related_date ? { related_date: info.related_date } : {}),
        ...(info.reason ? { reason: info.reason } : {}),
        students,
      };
    }),
  );

  const sortedGroups = groups
    .filter((g) => g.students.length > 0)
    .sort((a, b) => {
      const ca = candidates.find((c) => c.cls.class_id === a.class_id)!.cls;
      const cb = candidates.find((c) => c.cls.class_id === b.class_id)!.cls;
      return compareClasses(ca, cb);
    });

  return { date, classes: sortedGroups };
}

// ================= 學號出席查詢 =================

export interface StudentSessionRow {
  /** 實際上課日（調課時為新日期） */
  date: string;
  /** 原本排定的上課日 */
  scheduled_date: string;
  session: "held" | "rescheduled" | "cancelled";
  status: TutionAttendance["status"] | null;
  absence_reason?: string;
  /** 當天是否已過（未來的課不算「未點名」） */
  is_past: boolean;
  /** 當天學生是否在名單上（加入前／退出後的課不需點名） */
  on_roster: boolean;
}

export interface StudentClassSummary {
  class_id: string;
  form: string;
  subject: string;
  teacher_id: string;
  teacher_name_cn: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  venue: string;
  start_date: string;
  end_date?: string;
  enrollment_date: string;
  withdrawal_date?: string;
  sessions: StudentSessionRow[];
  stats: {
    present: number;
    late: number;
    absent: number;
    excuse: number;
    unmarked: number;
    /** 百分比 0-100（到課+遲到 / 已點名），與「各課程開課報表」同一算法；尚無點名為 null */
    attendance_rate: number | null;
  };
}

export interface StudentAttendanceResult {
  student: RosterStudentInfo | null;
  classes: StudentClassSummary[];
}

export async function computeStudentAttendance(
  kvService: TutionKVService,
  directory: StudentDirectory,
  studentNo: string,
): Promise<StudentAttendanceResult> {
  // 學號 → SMS 內部編號（名冊的 student_id）；名單條目有的存 student_id、有的也存了 student_no，兩者都比對
  const dirStudent = await directory.getByNo(studentNo);
  const matchIds = new Set([studentNo, ...(dirStudent?.student_id ? [String(dirStudent.student_id)] : [])]);

  const allRoster = await kvService.listAllRoster();
  const entries = allRoster.filter(
    (r) => matchIds.has(r.student_id) || (r as any).student_no === studentNo,
  );

  if (entries.length === 0) {
    // 沒參加任何補習班：仍回傳學生基本資料，讓前端顯示「查無補習紀錄」而不是「查無此學號」
    return {
      student: dirStudent
        ? {
            student_id: String(dirStudent.student_id || studentNo),
            student_no: dirStudent.student_no || studentNo,
            name_cn: dirStudent.name_cn || "",
            name_en: dirStudent.name_en || "",
            real_class_name: dirStudent.real_class_name || "",
            gender_boarding: dirStudent.gender_boarding || "-",
            student_status: studentStatus(dirStudent),
          }
        : null,
      classes: [],
    };
  }

  const classIds = new Set(entries.map((e) => e.class_id));
  const studentIds = new Set(entries.map((e) => e.student_id));
  const [classes, allSchedules, allAttendance] = await Promise.all([
    Promise.all(Array.from(classIds).map((id) => kvService.getClass(id))),
    kvService.listAllSchedules(),
    kvService.listAllAttendanceSummaries(),
  ]);
  const classById = new Map(
    classes.filter((c): c is TutionClass => c !== null).map((c) => [c.class_id, c]),
  );
  const schedulesByClass = groupBy(
    allSchedules.filter((s) => classIds.has(s.class_id)),
    (s) => s.class_id,
  );
  const attendanceByKey = new Map(
    dedupeToLatestAttendance(
      allAttendance.filter((a) => classIds.has(a.class_id) && studentIds.has(a.student_id)),
    ).map((a) => [`${a.class_id}|${a.class_date}`, a]),
  );

  // 學生基本資料取最新一筆名單條目來補齊
  const latestEntry = [...entries].sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0))[0];
  const student = await resolveRosterStudentInfo(
    latestEntry,
    classById.get(latestEntry.class_id) || null,
    directory,
  );

  const today = todayString();
  const entriesByClass = groupBy(entries, (e) => e.class_id);

  const summaries: StudentClassSummary[] = [];
  for (const [classId, classEntries] of entriesByClass) {
    const cls = classById.get(classId);
    if (!cls) continue;

    const rows = generateScheduleRows({
      dayOfWeek: cls.day_of_week,
      startDate: cls.start_date,
      endDate: cls.end_date,
      exceptions: schedulesByClass.get(classId) || [],
      today: toUTCDate(today),
    });

    const onRoster = (date: string) => classEntries.some((e) => isOnRosterAt(e, date));
    const stats = { present: 0, late: 0, absent: 0, excuse: 0, unmarked: 0, attendance_rate: null as number | null };

    const sessions: StudentSessionRow[] = rows.map((row) => {
      const record = row.status === "cancelled" ? undefined : attendanceByKey.get(`${classId}|${row.actual_date}`);
      const isPast = row.actual_date <= today;
      const inClass = onRoster(row.actual_date);
      if (record) {
        stats[record.status as "present" | "late" | "absent" | "excuse"]++;
      } else if (row.status !== "cancelled" && isPast && inClass) {
        stats.unmarked++;
      }
      return {
        date: row.actual_date,
        scheduled_date: row.scheduled_date,
        session: row.status,
        status: record?.status ?? null,
        ...(record?.absence_reason ? { absence_reason: record.absence_reason } : {}),
        is_past: isPast,
        on_roster: inClass || !!record,
      };
    });

    // 有點名紀錄、但不在推算出的上課日裡（例如課程事後改了上課星期）也照列，不讓紀錄消失
    const coveredDates = new Set(sessions.filter((s) => s.session !== "cancelled").map((s) => s.date));
    for (const [key, record] of attendanceByKey) {
      if (!key.startsWith(`${classId}|`) || coveredDates.has(record.class_date)) continue;
      stats[record.status as "present" | "late" | "absent" | "excuse"]++;
      sessions.push({
        date: record.class_date,
        scheduled_date: record.class_date,
        session: "held",
        status: record.status,
        ...(record.absence_reason ? { absence_reason: record.absence_reason } : {}),
        is_past: record.class_date <= today,
        on_roster: true,
      });
    }
    sessions.sort((a, b) => a.date.localeCompare(b.date));

    const marked = stats.present + stats.late + stats.absent + stats.excuse;
    stats.attendance_rate = marked > 0 ? Math.round(((stats.present + stats.late) / marked) * 100) : null;

    // 顯示用：最早的加入日、最後一筆條目的退出日（仍在讀則無）
    const sortedEntries = [...classEntries].sort((a, b) =>
      (a.enrollment_date || "").localeCompare(b.enrollment_date || ""),
    );
    const lastEntry = sortedEntries[sortedEntries.length - 1];

    summaries.push({
      class_id: classId,
      form: cls.form,
      subject: cls.subject,
      teacher_id: cls.teacher_id,
      teacher_name_cn: (cls as any).teacher_name_cn || "",
      day_of_week: cls.day_of_week,
      time_start: cls.time_start,
      time_end: cls.time_end,
      venue: cls.venue,
      start_date: cls.start_date,
      ...(cls.end_date ? { end_date: cls.end_date } : {}),
      enrollment_date: sortedEntries[0].enrollment_date,
      ...(lastEntry.withdrawal_date ? { withdrawal_date: lastEntry.withdrawal_date } : {}),
      sessions,
      stats,
    });
  }

  summaries.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return { student, classes: summaries };
}

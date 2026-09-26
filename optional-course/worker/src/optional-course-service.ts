// ============================================
// 選修課點名系統 - KV 操作層
//
// KV key 設計（2026-09 改版）：一律依「課程」分組，查詢時只讀需要的資料，
// 不再列出整個 namespace 再過濾（資料一多就會超過 Worker 單次請求的 KV 操作上限，
// 且 list() 單次最多 1000 筆會悄悄漏資料）。
//
// - OPTIONAL_COURSE_KV            course_{year}_{ts}_{rand}      單一課程；依年份 prefix 列出當年課程
// - OPTIONAL_COURSE_ROSTER_KV     roster:{course_id}             整門課的名冊（陣列）
// - OPTIONAL_COURSE_SCHEDULE_KV   schedule:{course_id}           整門課的排課例外（陣列）
// - OPTIONAL_COURSE_ATTENDANCE_KV attendance:{course_id}:{date}  一堂課的點名紀錄（陣列）
//
// 同一個值由同一門課的授課老師（或行政）修改，同時編輯的機會很低，接受「後寫覆蓋」的風險。
// ============================================

import {
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseSchedule,
  OptionalCourseAttendance,
  CourseWindowStatus,
} from "./types";
import { oldestRetainedYear, yearFromCourseId } from "./year";

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomSuffix()}`;
}

const rosterKey = (courseId: string) => `roster:${courseId}`;
const scheduleKey = (courseId: string) => `schedule:${courseId}`;
const attendancePrefix = (courseId: string) => `attendance:${courseId}:`;
const attendanceKey = (courseId: string, classDate: string) => `${attendancePrefix(courseId)}${classDate}`;

/** 依 cursor 分頁列出某 prefix 下的所有 key 名稱 */
async function listAllKeys(kv: KVNamespace, prefix: string): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  do {
    const result: any = await kv.list({ prefix, cursor });
    for (const k of result.keys) names.push(k.name);
    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);
  return names;
}

async function getJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const data = await kv.get(key);
  return data ? (JSON.parse(data) as T) : null;
}

export class OptionalCourseService {
  constructor(
    private courseKV: KVNamespace,
    private rosterKV: KVNamespace,
    private scheduleKV: KVNamespace,
    private attendanceKV: KVNamespace,
  ) {}

  // ===== 課程主表 =====

  async createCourse(
    data: Omit<
      OptionalCourse,
      "course_id" | "course_no" | "year" | "window_status" | "created_at" | "updated_at"
    >,
    year: number,
  ): Promise<OptionalCourse> {
    // 編號序號 = 該年已有課程數 + 1。只列 key、不讀內容，一次 list 即可；
    // 課程只由行政人員建立、一年約 25 門，同時建課撞號的機會可忽略。
    const sameYear = await listAllKeys(this.courseKV, `course_${year}_`);
    const now = Date.now();
    const course: OptionalCourse = {
      ...data,
      course_id: `course_${year}_${now}_${randomSuffix()}`,
      course_no: `optional-${String(year).slice(-2)}-${String(sameYear.length + 1).padStart(2, "0")}`,
      year,
      window_status: CourseWindowStatus.PENDING,
      created_at: now,
      updated_at: now,
    };
    await this.courseKV.put(course.course_id, JSON.stringify(course));
    return course;
  }

  async getCourse(courseId: string): Promise<OptionalCourse | null> {
    return getJson<OptionalCourse>(this.courseKV, courseId);
  }

  async updateCourse(
    courseId: string,
    updates: Partial<OptionalCourse>,
  ): Promise<OptionalCourse> {
    const existing = await this.getCourse(courseId);
    if (!existing) throw new Error(`Course ${courseId} not found`);

    const updated: OptionalCourse = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
    };
    await this.courseKV.put(courseId, JSON.stringify(updated));
    return updated;
  }

  async listCoursesByYear(year: number): Promise<OptionalCourse[]> {
    const keys = await listAllKeys(this.courseKV, `course_${year}_`);
    const courses = await Promise.all(keys.map((k) => this.getCourse(k)));
    return courses
      .filter((c): c is OptionalCourse => c !== null)
      .sort((a, b) => a.course_no.localeCompare(b.course_no));
  }

  async listCoursesByTeacher(teacherId: string, year: number): Promise<OptionalCourse[]> {
    const courses = await this.listCoursesByYear(year);
    return courses.filter((c) => c.teacher_id === teacherId);
  }

  // ===== 名冊 =====

  async getRoster(courseId: string): Promise<OptionalCourseRoster[]> {
    return (await getJson<OptionalCourseRoster[]>(this.rosterKV, rosterKey(courseId))) || [];
  }

  /** 一次加入多位學生，只讀寫各 1 次 KV（批量匯入也是同一個路徑） */
  async addRosterEntries(
    courseId: string,
    items: Array<Omit<OptionalCourseRoster, "roster_id" | "course_id" | "is_active" | "created_at" | "updated_at">>,
  ): Promise<OptionalCourseRoster[]> {
    const roster = await this.getRoster(courseId);
    const now = Date.now();
    const added = items.map((item) => ({
      ...item,
      roster_id: generateId("roster"),
      course_id: courseId,
      is_active: !item.withdrawal_date,
      created_at: now,
      updated_at: now,
    }));
    await this.rosterKV.put(rosterKey(courseId), JSON.stringify([...roster, ...added]));
    return added;
  }

  async withdrawRosterEntry(
    courseId: string,
    rosterId: string,
    withdrawalReason: string,
  ): Promise<OptionalCourseRoster | null> {
    const roster = await this.getRoster(courseId);
    const idx = roster.findIndex((r) => r.roster_id === rosterId);
    if (idx < 0) return null;

    const updated: OptionalCourseRoster = {
      ...roster[idx],
      withdrawal_date: new Date().toISOString().split("T")[0],
      withdrawal_reason: withdrawalReason,
      is_active: false,
      updated_at: Date.now(),
    };
    roster[idx] = updated;
    await this.rosterKV.put(rosterKey(courseId), JSON.stringify(roster));
    return updated;
  }

  // ===== 排課例外記錄 =====

  async listSchedulesByCourse(courseId: string): Promise<OptionalCourseSchedule[]> {
    return (await getJson<OptionalCourseSchedule[]>(this.scheduleKV, scheduleKey(courseId))) || [];
  }

  async createSchedule(
    data: Omit<OptionalCourseSchedule, "schedule_id" | "created_at" | "updated_at">,
  ): Promise<OptionalCourseSchedule> {
    const schedules = await this.listSchedulesByCourse(data.course_id);
    const now = Date.now();
    const schedule: OptionalCourseSchedule = {
      ...data,
      schedule_id: generateId("schedule"),
      created_at: now,
      updated_at: now,
    };
    await this.scheduleKV.put(scheduleKey(data.course_id), JSON.stringify([...schedules, schedule]));
    return schedule;
  }

  // ===== 出勤紀錄 =====
  // 沿用 tution 系統「新增制」：每次點名都追加新紀錄、不覆寫舊的（保留修改歷史），同一
  // course_id+student_id+class_date 只有 recorded_at 最新的一筆代表目前狀態。
  // 一堂課存成一個值：老師按一次「儲存」只寫 1 次 KV，而不是每位學生各寫 1 次。

  async recordAttendance(
    courseId: string,
    classDate: string,
    items: Array<Omit<OptionalCourseAttendance, "attendance_id" | "course_id" | "class_date">>,
  ): Promise<OptionalCourseAttendance[]> {
    const key = attendanceKey(courseId, classDate);
    const existing = (await getJson<OptionalCourseAttendance[]>(this.attendanceKV, key)) || [];
    const saved = items.map((item) => ({
      ...item,
      attendance_id: generateId("attendance"),
      course_id: courseId,
      class_date: classDate,
    }));
    await this.attendanceKV.put(key, JSON.stringify([...existing, ...saved]));
    return saved;
  }

  async listAttendanceByCourse(courseId: string): Promise<OptionalCourseAttendance[]> {
    const keys = await listAllKeys(this.attendanceKV, attendancePrefix(courseId));
    const perDate = await Promise.all(
      keys.map((k) => getJson<OptionalCourseAttendance[]>(this.attendanceKV, k)),
    );
    return dedupeToLatestAttendance(perDate.flatMap((r) => r || [])).sort(
      (a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime(),
    );
  }

  // ===== 過期資料清理 =====

  /**
   * 刪除保留年限之前的課程及其名冊／排課／點名。每門課約 40 次 KV 操作，
   * 一次最多處理 maxCourses 門，避免超過 Worker 單次執行的 KV 操作上限；
   * 由每日排程呼叫，剩下的隔天繼續。回傳本次刪除的 course_id。
   */
  async purgeExpiredCourses(maxCourses: number): Promise<string[]> {
    const minYear = oldestRetainedYear();
    const expired = (await listAllKeys(this.courseKV, "course_"))
      .filter((id) => {
        const year = yearFromCourseId(id);
        return year !== null && year < minYear;
      })
      .slice(0, maxCourses);

    for (const courseId of expired) {
      const attendanceKeys = await listAllKeys(this.attendanceKV, attendancePrefix(courseId));
      await Promise.all([
        ...attendanceKeys.map((k) => this.attendanceKV.delete(k)),
        this.rosterKV.delete(rosterKey(courseId)),
        this.scheduleKV.delete(scheduleKey(courseId)),
      ]);
      // 課程本身最後刪：中途失敗的話，下次排程還找得到這門課，會把剩下的關聯資料刪完
      await this.courseKV.delete(courseId);
    }
    return expired;
  }
}

export function dedupeToLatestAttendance(
  records: OptionalCourseAttendance[],
): OptionalCourseAttendance[] {
  const latestByGroup = new Map<string, OptionalCourseAttendance>();
  for (const record of records) {
    const key = `${record.course_id}|${record.student_id}|${record.class_date}`;
    const current = latestByGroup.get(key);
    if (
      !current ||
      record.recorded_at > current.recorded_at ||
      (record.recorded_at === current.recorded_at &&
        record.attendance_id > current.attendance_id)
    ) {
      latestByGroup.set(key, record);
    }
  }
  return Array.from(latestByGroup.values());
}

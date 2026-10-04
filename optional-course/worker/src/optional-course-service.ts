// ============================================
// 選修課點名系統 - KV 操作層
//
// KV key 設計（2026-09 改版）：一律依「課程」分組，查詢時只讀需要的資料，
// 不再列出整個 namespace 再過濾（資料一多就會超過 Worker 單次請求的 KV 操作上限，
// 且 list() 單次最多 1000 筆會悄悄漏資料）。
//
// - OPTIONAL_COURSE_KV            course_{year}_{ts}_{rand}      單一課程；依年份 prefix 列出當年課程
//                                 counter:course_no:{year}       該年最後發出的編號序號（只增不減）
// - OPTIONAL_COURSE_ROSTER_KV     roster:{course_id}             整門課的名冊（陣列）
// - OPTIONAL_COURSE_SCHEDULE_KV   schedule:{course_id}           整門課的排課例外（陣列）
//                                 calendar:{year}                該年度的學校行事曆（SchoolCalendar）
// - OPTIONAL_COURSE_ATTENDANCE_KV attendance:{course_id}:{date}  一堂課的點名紀錄（陣列）
//                                 stats:{course_id}              整門課各日的出勤統計（AttendanceStats），
//                                                                老師儲存點名時一併更新，開課報表只讀這一筆
//
// 同一個值由同一門課的授課老師（或行政）修改，同時編輯的機會很低，接受「後寫覆蓋」的風險。
// ============================================

import {
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseSchedule,
  OptionalCourseAttendance,
  CourseWindowStatus,
  SchoolCalendar,
} from "./types";
import { emptyCalendar, normalizeCourseWeekdays } from "./calendar";
import { oldestRetainedYear, yearFromCourseId } from "./year";

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomSuffix()}`;
}

const rosterKey = (courseId: string) => `roster:${courseId}`;
const scheduleKey = (courseId: string) => `schedule:${courseId}`;
const calendarKey = (year: number) => `calendar:${year}`;
const attendancePrefix = (courseId: string) => `attendance:${courseId}:`;
const attendanceKey = (courseId: string, classDate: string) => `${attendancePrefix(courseId)}${classDate}`;
const attendanceStatsKey = (courseId: string) => `stats:${courseId}`;
const maintenanceNoticeKey = "maintenance:notices";

export interface MaintenanceNotice {
  notice_id: string;
  created_at: string;
  title: string;
  detail: string;
}

export interface DayAttendanceCounts {
  present: number;
  absent: number;
  late: number;
  excuse: number;
}

/** 整門課的出勤統計：每個有點名紀錄的日期一筆（已收斂成每位學生最新狀態後的計數） */
export interface AttendanceStats {
  by_date: Record<string, DayAttendanceCounts>;
}

function countByDate(records: OptionalCourseAttendance[]): Record<string, DayAttendanceCounts> {
  const byDate: Record<string, DayAttendanceCounts> = {};
  for (const record of dedupeToLatestAttendance(records)) {
    const counts = (byDate[record.class_date] ??= { present: 0, absent: 0, late: 0, excuse: 0 });
    if (record.status in counts) counts[record.status as keyof DayAttendanceCounts]++;
  }
  return byDate;
}
const courseNoCounterKey = (year: number) => `counter:course_no:${year}`;
const COURSE_NO_PATTERN = /^optional-\d{2}-(\d+)$/;

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

  private normalizeCourse(course: OptionalCourse): OptionalCourse {
    const weeklyDays = normalizeCourseWeekdays(course.weekly_days, course.day_of_week);
    return {
      ...course,
      weekly_days: weeklyDays.length > 0 ? weeklyDays : undefined,
      day_of_week: weeklyDays[0],
    };
  }

  async createCourse(
    data: Omit<
      OptionalCourse,
      "course_id" | "course_no" | "year" | "window_status" | "created_at" | "updated_at"
    >,
    year: number,
  ): Promise<OptionalCourse> {
    const seq = await this.nextCourseNoSeq(year);
    const now = Date.now();
    const weeklyDays = normalizeCourseWeekdays(data.weekly_days, data.day_of_week);
    const course: OptionalCourse = {
      ...data,
      weekly_days: weeklyDays.length > 0 ? weeklyDays : undefined,
      day_of_week: weeklyDays[0],
      course_id: `course_${year}_${now}_${randomSuffix()}`,
      course_no: `optional-${String(year).slice(-2)}-${String(seq).padStart(2, "0")}`,
      year,
      window_status: CourseWindowStatus.PENDING,
      created_at: now,
      updated_at: now,
    };
    await this.courseKV.put(course.course_id, JSON.stringify(course));
    return this.normalizeCourse(course);
  }

  /**
   * 發出該年下一個編號序號。用計數器只增不減，課程刪除後號碼空著不再使用
   * （不能用「現有課程數或最大編號 + 1」，刪掉最後一號就會被重複發出）。
   * 計數器不存在時（改版前建的課），以現有課程的最大編號起算。
   * 課程只由行政人員建立、一年約 25 門，同時建課撞號的機會可忽略。
   */
  private async nextCourseNoSeq(year: number): Promise<number> {
    const key = courseNoCounterKey(year);
    let last = Number(await this.courseKV.get(key));
    if (!Number.isInteger(last) || last <= 0) {
      const existing = await this.listCoursesByYear(year);
      last = Math.max(
        0,
        ...existing.map((c) => Number(COURSE_NO_PATTERN.exec(c.course_no)?.[1] || 0)),
      );
    }
    const next = last + 1;
    await this.courseKV.put(key, String(next));
    return next;
  }

  async getCourse(courseId: string): Promise<OptionalCourse | null> {
    const course = await getJson<OptionalCourse>(this.courseKV, courseId);
    return course ? this.normalizeCourse(course) : null;
  }

  async updateCourse(
    courseId: string,
    updates: Partial<OptionalCourse>,
  ): Promise<OptionalCourse> {
    const existing = await this.getCourse(courseId);
    if (!existing) throw new Error(`Course ${courseId} not found`);

    const normalizedDays = normalizeCourseWeekdays(
      "weekly_days" in updates || "day_of_week" in updates ? updates.weekly_days : existing.weekly_days,
      "weekly_days" in updates || "day_of_week" in updates ? updates.day_of_week : existing.day_of_week,
    );

    const updated = this.normalizeCourse({
      ...existing,
      ...updates,
      weekly_days: normalizedDays.length > 0 ? normalizedDays : undefined,
      day_of_week: normalizedDays[0],
      updated_at: Date.now(),
    });
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
    withdrawalDate: string,
  ): Promise<OptionalCourseRoster | null> {
    const roster = await this.getRoster(courseId);
    const idx = roster.findIndex((r) => r.roster_id === rosterId);
    if (idx < 0) return null;

    const updated: OptionalCourseRoster = {
      ...roster[idx],
      withdrawal_date: withdrawalDate,
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

  async deleteSchedule(courseId: string, scheduleId: string): Promise<boolean> {
    const schedules = await this.listSchedulesByCourse(courseId);
    const remaining = schedules.filter((s) => s.schedule_id !== scheduleId);
    if (remaining.length === schedules.length) return false;
    await this.scheduleKV.put(scheduleKey(courseId), JSON.stringify(remaining));
    return true;
  }

  // ===== 學校行事曆 =====

  async getCalendar(year: number): Promise<SchoolCalendar> {
    return (await getJson<SchoolCalendar>(this.scheduleKV, calendarKey(year))) || emptyCalendar(year);
  }

  async putCalendar(calendar: SchoolCalendar): Promise<void> {
    await this.scheduleKV.put(calendarKey(calendar.year), JSON.stringify(calendar));
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
    const merged = [...existing, ...saved];
    await this.attendanceKV.put(key, JSON.stringify(merged));

    // 順便更新整門課的出勤統計（只改這一天），開課報表就不用逐日讀點名紀錄
    const stats = await getJson<AttendanceStats>(this.attendanceKV, attendanceStatsKey(courseId));
    const byDate = stats ? stats.by_date : await this.countOtherDates(courseId, classDate);
    byDate[classDate] = countByDate(merged)[classDate] ?? { present: 0, absent: 0, late: 0, excuse: 0 };
    await this.attendanceKV.put(attendanceStatsKey(courseId), JSON.stringify({ by_date: byDate }));
    return saved;
  }

  /** 從點名紀錄重算統計（略過 skipDate：剛寫入的那天由呼叫端以記憶體中的資料補上） */
  private async countOtherDates(courseId: string, skipDate?: string): Promise<Record<string, DayAttendanceCounts>> {
    const records = await this.listAttendanceByCourse(courseId);
    return countByDate(records.filter((r) => r.class_date !== skipDate));
  }

  /**
   * 整門課的出勤統計（1 次 KV 讀取）。舊課程還沒有統計時，從點名紀錄重算一次並存起來，
   * 之後由 recordAttendance 維護。
   */
  async getAttendanceStats(courseId: string): Promise<AttendanceStats> {
    const stats = await getJson<AttendanceStats>(this.attendanceKV, attendanceStatsKey(courseId));
    if (stats) return stats;
    const rebuilt: AttendanceStats = { by_date: await this.countOtherDates(courseId) };
    await this.attendanceKV.put(attendanceStatsKey(courseId), JSON.stringify(rebuilt));
    return rebuilt;
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

  /** 這門課已有點名紀錄的日期（只列 key、不讀內容，1 次 list） */
  async listAttendanceDates(courseId: string): Promise<string[]> {
    const prefix = attendancePrefix(courseId);
    return (await listAllKeys(this.attendanceKV, prefix)).map((k) => k.slice(prefix.length));
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
      await this.deleteCourse(courseId);
    }

    // 過期年份的編號計數器也一併清掉
    const expiredCounters = (await listAllKeys(this.courseKV, "counter:course_no:")).filter(
      (k) => Number(k.split(":").pop()) < minYear,
    );
    await Promise.all(expiredCounters.map((k) => this.courseKV.delete(k)));

    return expired;
  }

  /** 刪除課程及其名冊／排課／點名（行政人員手動刪除、過期清理共用） */
  async deleteCourse(courseId: string): Promise<void> {
    const attendanceKeys = await listAllKeys(this.attendanceKV, attendancePrefix(courseId));
    await Promise.all([
      ...attendanceKeys.map((k) => this.attendanceKV.delete(k)),
      this.attendanceKV.delete(attendanceStatsKey(courseId)),
      this.rosterKV.delete(rosterKey(courseId)),
      this.scheduleKV.delete(scheduleKey(courseId)),
    ]);
    // 課程本身最後刪：中途失敗的話課程還在，可以再刪一次把剩下的關聯資料清完
    await this.courseKV.delete(courseId);
  }

  /** 刪除保留年限之前的行事曆（一年一個 key，數量很少，一次清完） */
  async purgeExpiredCalendars(): Promise<number[]> {
    const minYear = oldestRetainedYear();
    const expired = (await listAllKeys(this.scheduleKV, "calendar:"))
      .map((k) => Number(k.slice("calendar:".length)))
      .filter((year) => Number.isInteger(year) && year < minYear);
    await Promise.all(expired.map((year) => this.scheduleKV.delete(calendarKey(year))));
    return expired;
  }

  async getMaintenanceNotices(): Promise<MaintenanceNotice[]> {
    return (await getJson<MaintenanceNotice[]>(this.courseKV, maintenanceNoticeKey)) || [];
  }

  async appendMaintenanceNotice(notice: Omit<MaintenanceNotice, "notice_id">): Promise<void> {
    const current = await this.getMaintenanceNotices();
    await this.courseKV.put(
      maintenanceNoticeKey,
      JSON.stringify([{ notice_id: generateId("notice"), ...notice }, ...current].slice(0, 30)),
    );
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

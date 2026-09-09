// ============================================
// 選修課點名系統 - KV 操作層
// 結構比照 chhsban-tution/src/tution-service.ts 的 TutionKVService，
// 去掉收費/簽核相關邏輯（本系統不收費、不需要老師個人申請書）。
// ============================================

import {
  OptionalCourse,
  OptionalCourseRoster,
  OptionalCourseSchedule,
  OptionalCourseAttendance,
  CourseWindowStatus,
} from "./types";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
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
      "course_id" | "window_status" | "created_at" | "updated_at"
    >,
  ): Promise<OptionalCourse> {
    const now = Date.now();
    const course: OptionalCourse = {
      ...data,
      course_id: generateId("course"),
      window_status: CourseWindowStatus.PENDING,
      created_at: now,
      updated_at: now,
    };
    await this.courseKV.put(course.course_id, JSON.stringify(course));
    return course;
  }

  async getCourse(courseId: string): Promise<OptionalCourse | null> {
    const data = await this.courseKV.get(courseId);
    return data ? JSON.parse(data) : null;
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

  async listAllCourses(): Promise<OptionalCourse[]> {
    const result = await this.courseKV.list({ prefix: "course_" });
    const courses = await Promise.all(
      result.keys.map((item: any) => this.getCourse(item.name)),
    );
    return courses.filter((c: any): c is OptionalCourse => c !== null);
  }

  async listCoursesByTeacher(teacherId: string): Promise<OptionalCourse[]> {
    const all = await this.listAllCourses();
    return all.filter((c) => c.teacher_id === teacherId);
  }

  // ===== 名冊 =====

  async addRosterEntry(
    data: Omit<
      OptionalCourseRoster,
      "roster_id" | "is_active" | "created_at" | "updated_at"
    >,
  ): Promise<OptionalCourseRoster> {
    const now = Date.now();
    const roster: OptionalCourseRoster = {
      ...data,
      roster_id: generateId("roster"),
      is_active: !data.withdrawal_date,
      created_at: now,
      updated_at: now,
    };
    await this.rosterKV.put(roster.roster_id, JSON.stringify(roster));
    return roster;
  }

  async getRosterEntry(rosterId: string): Promise<OptionalCourseRoster | null> {
    const data = await this.rosterKV.get(rosterId);
    return data ? JSON.parse(data) : null;
  }

  async listRosterByCourse(courseId: string): Promise<OptionalCourseRoster[]> {
    const result = await this.rosterKV.list({ prefix: "roster_" });
    const roster = await Promise.all(
      result.keys.map((item: any) => this.getRosterEntry(item.name)),
    );
    return roster.filter(
      (r: any): r is OptionalCourseRoster => r !== null && r.course_id === courseId,
    );
  }

  async withdrawRosterEntry(
    rosterId: string,
    withdrawalReason: string,
  ): Promise<OptionalCourseRoster> {
    const existing = await this.getRosterEntry(rosterId);
    if (!existing) throw new Error(`Roster entry ${rosterId} not found`);

    const updated: OptionalCourseRoster = {
      ...existing,
      withdrawal_date: new Date().toISOString().split("T")[0],
      withdrawal_reason: withdrawalReason,
      is_active: false,
      updated_at: Date.now(),
    };
    await this.rosterKV.put(rosterId, JSON.stringify(updated));
    return updated;
  }

  // ===== 排課例外記錄 =====

  async createSchedule(
    data: Omit<OptionalCourseSchedule, "schedule_id" | "created_at" | "updated_at">,
  ): Promise<OptionalCourseSchedule> {
    const now = Date.now();
    const schedule: OptionalCourseSchedule = {
      ...data,
      schedule_id: generateId("schedule"),
      created_at: now,
      updated_at: now,
    };
    await this.scheduleKV.put(schedule.schedule_id, JSON.stringify(schedule));
    return schedule;
  }

  async getSchedule(scheduleId: string): Promise<OptionalCourseSchedule | null> {
    const data = await this.scheduleKV.get(scheduleId);
    return data ? JSON.parse(data) : null;
  }

  async listSchedulesByCourse(courseId: string): Promise<OptionalCourseSchedule[]> {
    const result = await this.scheduleKV.list({ prefix: "schedule_" });
    const schedules = await Promise.all(
      result.keys.map((item: any) => this.getSchedule(item.name)),
    );
    return schedules.filter(
      (s: any): s is OptionalCourseSchedule => s !== null && s.course_id === courseId,
    );
  }

  // ===== 出勤紀錄 =====
  // 沿用 tution 系統「新增制」：每次點名都新增一筆，不覆寫舊紀錄，同一
  // course_id+student_id+class_date 只有 recorded_at 最新的一筆代表目前狀態。

  async recordAttendance(
    data: Omit<OptionalCourseAttendance, "attendance_id">,
  ): Promise<OptionalCourseAttendance> {
    const attendance: OptionalCourseAttendance = {
      ...data,
      attendance_id: generateId("attendance"),
    };
    await this.attendanceKV.put(
      attendance.attendance_id,
      JSON.stringify(attendance),
    );
    return attendance;
  }

  async getAttendanceRecord(
    attendanceId: string,
  ): Promise<OptionalCourseAttendance | null> {
    const data = await this.attendanceKV.get(attendanceId);
    return data ? JSON.parse(data) : null;
  }

  async listAttendanceByCourse(
    courseId: string,
  ): Promise<OptionalCourseAttendance[]> {
    const result = await this.attendanceKV.list({ prefix: "attendance_" });
    const records = await Promise.all(
      result.keys.map((item: any) => this.getAttendanceRecord(item.name)),
    );
    const filtered = records.filter(
      (a: any): a is OptionalCourseAttendance =>
        a !== null && a.course_id === courseId,
    );
    return dedupeToLatestAttendance(filtered).sort(
      (a, b) => new Date(a.class_date).getTime() - new Date(b.class_date).getTime(),
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

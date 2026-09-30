// ============================================
// 補習班系統資料層（Cloudflare D1）
// ============================================
//
// 2026-09-30 由 KV 遷移到 D1（資料表見 migrations/0001_init.sql）。
// 遷移原因：KV 版每次查詢都要 list 整個 namespace 再逐筆 get、list 不翻頁超過 1000 筆會漏資料，
// 點名每位學生各寫一次 KV，很快會碰到免費版每日 1000 次寫入與單次請求 1000 次操作的上限。
//
// D1 免費版限制（寫程式時要注意）：
// - 單次 Worker 請求最多 50 次查詢 → 批次寫入用 json_each 把整批資料當成一個參數，不要一行一個查詢
// - 單一 SQL 最多 100 個綁定參數 → 同上
// - 讀取額度以「掃描過的行數」計算 → 查詢條件一定要走索引（見 migration）

import type {
  TutionClass,
  TutionRoster,
  TutionAttendance,
  TutionSchedule,
  AttendanceStatus,
} from "@chhsban/kv-utils";

const LAST_TEACHING_DATE_KEY = "last_teaching_date";
// 「各課程開課報表」快取，每日凌晨由 Cron Trigger 重新計算並存入，前端一律讀這份快照
const COURSE_REPORT_SUMMARY_KEY = "course_report_summary";

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8);
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${randomSuffix()}`;
}

function parseData<T>(row: { data: string } | null): T | null {
  return row ? (JSON.parse(row.data) as T) : null;
}

/** 解析多筆 data 欄位；有一筆壞資料只略過並記錄，不讓整個列表失敗 */
function parseRows<T>(rows: Array<{ data: string }>): T[] {
  const parsed: T[] = [];
  for (const row of rows) {
    try {
      parsed.push(JSON.parse(row.data) as T);
    } catch (error) {
      console.error("[DB] Skipping row with invalid JSON data:", row.data?.slice(0, 200), error);
    }
  }
  return parsed;
}

/** 名單的 is_active 一律由 withdrawal_date 推算，不信任存下來的值 */
function normalizeRoster(entry: TutionRoster): TutionRoster {
  return { ...entry, is_active: !entry.withdrawal_date };
}

interface AttendanceRow {
  attendance_id: string;
  class_id: string;
  student_id: string;
  class_date: string;
  status: string;
  absence_reason: string | null;
  recorded_at: number;
  recorded_by: string | null;
}

function toAttendance(row: AttendanceRow): TutionAttendance {
  return {
    attendance_id: row.attendance_id,
    class_id: row.class_id,
    student_id: row.student_id,
    class_date: row.class_date,
    status: row.status as AttendanceStatus,
    ...(row.absence_reason ? { absence_reason: row.absence_reason } : {}),
    recorded_at: row.recorded_at,
    ...(row.recorded_by ? { recorded_by: row.recorded_by } : {}),
  };
}

/** 某班某日期各狀態的人數（開課報表用） */
export interface ClassDateStatusCount {
  class_id: string;
  class_date: string;
  status: string;
  count: number;
}

export class TutionService {
  constructor(private db: D1Database) {}

  // ===== 補習班主表 =====

  async createClass(
    classData: Omit<TutionClass, "class_id" | "created_at" | "updated_at">,
  ): Promise<TutionClass> {
    const now = Date.now();
    const tutionClass: TutionClass = {
      ...classData,
      class_id: generateId("class"),
      created_at: now,
      updated_at: now,
    };
    await this.db
      .prepare(
        `INSERT INTO tution_classes (class_id, teacher_id, approval_status, start_date, created_at, data)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        tutionClass.class_id,
        tutionClass.teacher_id,
        tutionClass.approval_status,
        tutionClass.start_date ?? null,
        tutionClass.created_at,
        JSON.stringify(tutionClass),
      )
      .run();
    return tutionClass;
  }

  async getClass(classId: string): Promise<TutionClass | null> {
    const row = await this.db
      .prepare(`SELECT data FROM tution_classes WHERE class_id = ?`)
      .bind(classId)
      .first<{ data: string }>();
    return parseData<TutionClass>(row);
  }

  async updateClass(classId: string, updates: Partial<TutionClass>): Promise<TutionClass> {
    const existing = await this.getClass(classId);
    if (!existing) throw new Error(`Class ${classId} not found`);

    const updated: TutionClass = { ...existing, ...updates, updated_at: Date.now() };
    await this.db
      .prepare(
        `UPDATE tution_classes SET teacher_id = ?, approval_status = ?, start_date = ?, data = ?
         WHERE class_id = ?`,
      )
      .bind(
        updated.teacher_id,
        updated.approval_status,
        updated.start_date ?? null,
        JSON.stringify(updated),
        classId,
      )
      .run();
    return updated;
  }

  /** 刪除班級，連同名單、排課例外、點名（含歷史）一起刪；R2 檔案由呼叫端刪 */
  async deleteClass(classId: string): Promise<void> {
    await this.db.batch(
      [
        `DELETE FROM tution_attendance WHERE class_id = ?`,
        `DELETE FROM tution_attendance_log WHERE class_id = ?`,
        `DELETE FROM tution_schedules WHERE class_id = ?`,
        `DELETE FROM tution_roster WHERE class_id = ?`,
        `DELETE FROM tution_classes WHERE class_id = ?`,
      ].map((sql) => this.db.prepare(sql).bind(classId)),
    );
  }

  async listClassesByTeacher(teacherId: string): Promise<TutionClass[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_classes WHERE teacher_id = ? ORDER BY created_at`)
      .bind(teacherId)
      .all<{ data: string }>();
    return parseRows<TutionClass>(results);
  }

  async listAllClasses(): Promise<TutionClass[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_classes ORDER BY created_at`)
      .all<{ data: string }>();
    return parseRows<TutionClass>(results);
  }

  async getClassesByIds(classIds: string[]): Promise<TutionClass[]> {
    if (classIds.length === 0) return [];
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_classes WHERE class_id IN (SELECT value FROM json_each(?))`)
      .bind(JSON.stringify(classIds))
      .all<{ data: string }>();
    return parseRows<TutionClass>(results);
  }

  /**
   * 發出下一個申請編號 tution-{年份後兩碼}-{序號}。計數器只增不減，刪除申請後號碼空著不再使用。
   * 計數器不存在時（遷移前沒有），以該年現有申請的最大序號起算。
   */
  async nextApplicationNo(year: number): Promise<string> {
    const name = `application_no:${year}`;
    const yy = String(year).slice(-2);
    const existing = await this.db
      .prepare(`SELECT value FROM tution_counters WHERE name = ?`)
      .bind(name)
      .first<{ value: number }>();
    if (!existing) {
      const { results } = await this.db
        .prepare(`SELECT json_extract(data, '$.application_no') AS no FROM tution_classes`)
        .all<{ no: string | null }>();
      const pattern = new RegExp(`^tution-${yy}-(\\d+)$`);
      const maxSeq = Math.max(0, ...results.map((r) => Number(pattern.exec(r.no || "")?.[1] || 0)));
      await this.db
        .prepare(`INSERT OR IGNORE INTO tution_counters (name, value) VALUES (?, ?)`)
        .bind(name, maxSeq)
        .run();
    }
    const row = await this.db
      .prepare(`UPDATE tution_counters SET value = value + 1 WHERE name = ? RETURNING value`)
      .bind(name)
      .first<{ value: number }>();
    return `tution-${yy}-${String(row!.value).padStart(2, "0")}`;
  }

  // ===== 系統設定 =====

  private async getSetting(key: string): Promise<string | null> {
    const row = await this.db
      .prepare(`SELECT value FROM tution_settings WHERE key = ?`)
      .bind(key)
      .first<{ value: string }>();
    return row?.value ?? null;
  }

  private async setSetting(key: string, value: string): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO tution_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      )
      .bind(key, value, Date.now())
      .run();
  }

  /** 管理員設定的「最後上課日期」，供申請人沒自行設定 end_date 的課程當預設終止日 */
  async getLastTeachingDate(): Promise<string | null> {
    return this.getSetting(LAST_TEACHING_DATE_KEY);
  }

  async setLastTeachingDate(date: string): Promise<void> {
    await this.setSetting(LAST_TEACHING_DATE_KEY, date);
  }

  async getCourseReportSummary(): Promise<any | null> {
    const value = await this.getSetting(COURSE_REPORT_SUMMARY_KEY);
    return value ? JSON.parse(value) : null;
  }

  async setCourseReportSummary(summary: unknown): Promise<void> {
    await this.setSetting(COURSE_REPORT_SUMMARY_KEY, JSON.stringify(summary));
  }

  // ===== 學生名單 =====

  private rosterInsert(entries: TutionRoster[]): D1PreparedStatement {
    return this.db
      .prepare(
        `INSERT INTO tution_roster (roster_id, class_id, student_id, student_no, updated_at, data)
         SELECT json_extract(value, '$.roster_id'), json_extract(value, '$.class_id'),
                json_extract(value, '$.student_id'), json_extract(value, '$.student_no'),
                json_extract(value, '$.updated_at'), value
         FROM json_each(?)`,
      )
      .bind(JSON.stringify(entries));
  }

  private buildRosterEntries(
    items: Array<Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">>,
  ): TutionRoster[] {
    const now = Date.now();
    return items.map((item) =>
      normalizeRoster({ ...item, roster_id: generateId("roster"), created_at: now, updated_at: now } as TutionRoster),
    );
  }

  async addRosterEntry(
    rosterData: Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">,
  ): Promise<TutionRoster> {
    const [entry] = await this.addRosterEntries([rosterData]);
    return entry;
  }

  /** 一次新增多筆名單（1 次查詢） */
  async addRosterEntries(
    items: Array<Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">>,
  ): Promise<TutionRoster[]> {
    if (items.length === 0) return [];
    const entries = this.buildRosterEntries(items);
    await this.rosterInsert(entries).run();
    return entries;
  }

  /** 整份名單換掉（待審批階段重新提交名單用），刪除與新增在同一個交易內 */
  async replaceRoster(
    classId: string,
    items: Array<Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">>,
  ): Promise<TutionRoster[]> {
    const entries = this.buildRosterEntries(items);
    const statements = [this.db.prepare(`DELETE FROM tution_roster WHERE class_id = ?`).bind(classId)];
    if (entries.length > 0) statements.push(this.rosterInsert(entries));
    await this.db.batch(statements);
    return entries;
  }

  async getRosterEntry(rosterId: string): Promise<TutionRoster | null> {
    const row = await this.db
      .prepare(`SELECT data FROM tution_roster WHERE roster_id = ?`)
      .bind(rosterId)
      .first<{ data: string }>();
    const entry = parseData<TutionRoster>(row);
    return entry ? normalizeRoster(entry) : null;
  }

  async listRosterByClass(classId: string): Promise<TutionRoster[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_roster WHERE class_id = ?`)
      .bind(classId)
      .all<{ data: string }>();
    return parseRows<TutionRoster>(results).map(normalizeRoster);
  }

  async listRosterByClasses(classIds: string[]): Promise<TutionRoster[]> {
    if (classIds.length === 0) return [];
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_roster WHERE class_id IN (SELECT value FROM json_each(?))`)
      .bind(JSON.stringify(classIds))
      .all<{ data: string }>();
    return parseRows<TutionRoster>(results).map(normalizeRoster);
  }

  /** 某位學生的所有名單條目（名冊的 student_id 通常是 SMS 內部編號，少數舊條目存學號，兩種都比對） */
  async listRosterByStudent(studentIds: string[], studentNo: string): Promise<TutionRoster[]> {
    const { results } = await this.db
      .prepare(
        `SELECT data FROM tution_roster
         WHERE student_id IN (SELECT value FROM json_each(?)) OR student_no = ?`,
      )
      .bind(JSON.stringify(studentIds), studentNo)
      .all<{ data: string }>();
    return parseRows<TutionRoster>(results).map(normalizeRoster);
  }

  async listAllRoster(): Promise<TutionRoster[]> {
    const { results } = await this.db.prepare(`SELECT data FROM tution_roster`).all<{ data: string }>();
    return parseRows<TutionRoster>(results).map(normalizeRoster);
  }

  async updateRosterEntry(rosterId: string, updates: Partial<TutionRoster>): Promise<TutionRoster> {
    const existing = await this.getRosterEntry(rosterId);
    if (!existing) throw new Error(`Roster entry ${rosterId} not found`);

    const updated = normalizeRoster({ ...existing, ...updates, updated_at: Date.now() });
    await this.db
      .prepare(`UPDATE tution_roster SET student_no = ?, updated_at = ?, data = ? WHERE roster_id = ?`)
      .bind((updated as any).student_no ?? null, updated.updated_at, JSON.stringify(updated), rosterId)
      .run();
    return updated;
  }

  async removeStudentFromRoster(rosterId: string, withdrawalReason: string, withdrawalDate: string): Promise<void> {
    await this.updateRosterEntry(rosterId, {
      withdrawal_date: withdrawalDate,
      withdrawal_reason: withdrawalReason,
    });
  }

  // ===== 出勤紀錄 =====
  // 新增制：每次點名都寫一筆歷史（tution_attendance_log），同時更新目前狀態（tution_attendance）。
  // 查詢一律讀 tution_attendance，天然就是每位學生每堂課最新的一筆。

  /** 批次寫入某班某日的點名結果（1 次 batch、2 個查詢，不論學生人數） */
  async recordAttendanceBatch(
    classId: string,
    classDate: string,
    records: Array<{ student_id: string; status: AttendanceStatus; absence_reason?: string }>,
    recordedBy: string,
    recordedAt: number = Date.now(),
  ): Promise<TutionAttendance[]> {
    const saved: TutionAttendance[] = records.map((record) => ({
      attendance_id: generateId("attendance"),
      class_id: classId,
      student_id: record.student_id,
      class_date: classDate,
      status: record.status,
      ...(record.absence_reason ? { absence_reason: record.absence_reason } : {}),
      recorded_at: recordedAt,
      recorded_by: recordedBy,
    }));
    if (saved.length === 0) return saved;

    const payload = JSON.stringify(saved);
    const columns = `json_extract(value, '$.class_id'), json_extract(value, '$.student_id'),
      json_extract(value, '$.class_date'), json_extract(value, '$.attendance_id'),
      json_extract(value, '$.status'), json_extract(value, '$.absence_reason'),
      json_extract(value, '$.recorded_at'), json_extract(value, '$.recorded_by')`;

    await this.db.batch([
      this.db
        .prepare(
          `INSERT INTO tution_attendance_log
             (class_id, student_id, class_date, attendance_id, status, absence_reason, recorded_at, recorded_by)
           SELECT ${columns} FROM json_each(?)`,
        )
        .bind(payload),
      this.db
        .prepare(
          `INSERT INTO tution_attendance
             (class_id, student_id, class_date, attendance_id, status, absence_reason, recorded_at, recorded_by)
           SELECT ${columns} FROM json_each(?) WHERE true
           ON CONFLICT (class_id, student_id, class_date) DO UPDATE SET
             attendance_id = excluded.attendance_id, status = excluded.status,
             absence_reason = excluded.absence_reason, recorded_at = excluded.recorded_at,
             recorded_by = excluded.recorded_by`,
        )
        .bind(payload),
    ]);
    return saved;
  }

  /** 整班的目前出勤狀態（每位學生每堂課一筆），依日期排序 */
  async listAttendanceByClass(classId: string): Promise<TutionAttendance[]> {
    const { results } = await this.db
      .prepare(`SELECT * FROM tution_attendance WHERE class_id = ? ORDER BY class_date`)
      .bind(classId)
      .all<AttendanceRow>();
    return results.map(toAttendance);
  }

  /** 某日期的目前出勤狀態（住宿生點名控管用），可限定班級 */
  async listAttendanceByDate(classDate: string, classIds: string[]): Promise<TutionAttendance[]> {
    if (classIds.length === 0) return [];
    const { results } = await this.db
      .prepare(
        `SELECT * FROM tution_attendance
         WHERE class_date = ? AND class_id IN (SELECT value FROM json_each(?))`,
      )
      .bind(classDate, JSON.stringify(classIds))
      .all<AttendanceRow>();
    return results.map(toAttendance);
  }

  /** 某些學生在某些班級的目前出勤狀態（學號查詢用） */
  async listAttendanceByStudents(studentIds: string[], classIds: string[]): Promise<TutionAttendance[]> {
    if (studentIds.length === 0 || classIds.length === 0) return [];
    const { results } = await this.db
      .prepare(
        `SELECT * FROM tution_attendance
         WHERE student_id IN (SELECT value FROM json_each(?))
           AND class_id IN (SELECT value FROM json_each(?))
         ORDER BY class_date`,
      )
      .bind(JSON.stringify(studentIds), JSON.stringify(classIds))
      .all<AttendanceRow>();
    return results.map(toAttendance);
  }

  /** 各班各日期各狀態人數（開課報表用，1 次查詢） */
  async countAttendanceByClassDate(): Promise<ClassDateStatusCount[]> {
    const { results } = await this.db
      .prepare(
        `SELECT class_id, class_date, status, COUNT(*) AS count
         FROM tution_attendance GROUP BY class_id, class_date, status`,
      )
      .all<ClassDateStatusCount>();
    return results;
  }

  // ===== 排課例外記錄 =====
  // 只存「例外」：老師標記過無開課／調課的日期。沒有例外記錄的上課日一律視為「有開課」
  // （依 day_of_week + start_date 推算，不寫入資料庫）。

  async createSchedule(
    scheduleData: Omit<TutionSchedule, "schedule_id" | "created_at" | "updated_at">,
  ): Promise<TutionSchedule> {
    const now = Date.now();
    const schedule: TutionSchedule = {
      ...scheduleData,
      schedule_id: generateId("schedule"),
      created_at: now,
      updated_at: now,
    };
    await this.db
      .prepare(`INSERT INTO tution_schedules (schedule_id, class_id, scheduled_date, data) VALUES (?, ?, ?, ?)`)
      .bind(schedule.schedule_id, schedule.class_id, schedule.scheduled_date, JSON.stringify(schedule))
      .run();
    return schedule;
  }

  async getSchedule(scheduleId: string): Promise<TutionSchedule | null> {
    const row = await this.db
      .prepare(`SELECT data FROM tution_schedules WHERE schedule_id = ?`)
      .bind(scheduleId)
      .first<{ data: string }>();
    return parseData<TutionSchedule>(row);
  }

  async listSchedulesByClass(classId: string): Promise<TutionSchedule[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_schedules WHERE class_id = ? ORDER BY scheduled_date`)
      .bind(classId)
      .all<{ data: string }>();
    return parseRows<TutionSchedule>(results);
  }

  async listSchedulesByClasses(classIds: string[]): Promise<TutionSchedule[]> {
    if (classIds.length === 0) return [];
    const { results } = await this.db
      .prepare(
        `SELECT data FROM tution_schedules WHERE class_id IN (SELECT value FROM json_each(?)) ORDER BY scheduled_date`,
      )
      .bind(JSON.stringify(classIds))
      .all<{ data: string }>();
    return parseRows<TutionSchedule>(results);
  }

  /** 全系統排課例外記錄（管理員／教室管理員的每日教室使用總覽用） */
  async listAllSchedules(): Promise<TutionSchedule[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_schedules ORDER BY scheduled_date`)
      .all<{ data: string }>();
    return parseRows<TutionSchedule>(results);
  }

  async updateSchedule(scheduleId: string, updates: Partial<TutionSchedule>): Promise<TutionSchedule> {
    const existing = await this.getSchedule(scheduleId);
    if (!existing) throw new Error(`Schedule ${scheduleId} not found`);

    const updated: TutionSchedule = { ...existing, ...updates, updated_at: Date.now() };
    await this.db
      .prepare(`UPDATE tution_schedules SET scheduled_date = ?, data = ? WHERE schedule_id = ?`)
      .bind(updated.scheduled_date, JSON.stringify(updated), scheduleId)
      .run();
    return updated;
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.db.prepare(`DELETE FROM tution_schedules WHERE schedule_id = ?`).bind(scheduleId).run();
  }

  // ===== 過期資料清理 =====

  /**
   * 找出開課日期早於 minYear 的班級（保留年限之前），一次最多 limit 班。
   * 刪除由呼叫端逐班呼叫 deleteClass（並刪 R2 檔案），避免單次請求查詢數超過上限。
   */
  async listExpiredClasses(minYear: number, limit: number): Promise<TutionClass[]> {
    const { results } = await this.db
      .prepare(`SELECT data FROM tution_classes WHERE start_date < ? ORDER BY start_date LIMIT ?`)
      .bind(`${minYear}-01-01`, limit)
      .all<{ data: string }>();
    return parseRows<TutionClass>(results);
  }
}

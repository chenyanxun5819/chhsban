// ============================================
// Tution Worker 後端實現模板
// ============================================

import {
  TutionKVManager,
  TutionClass,
  TutionRoster,
  TutionAttendance,
  TutionSchedule,
  TutionPDFFieldMap,
  TutionClassStatus,
  AttendanceStatus,
} from "@chhsban/kv-utils";

/**
 * Tution KV Manager 實現
 * 負責所有補習班系統的 KV 操作
 * 
 * ⚠️ 警告：此檔案中所有 .put() 操作都消耗帳號級 KV PUT 額度
 * 限制: 1,000 PUT/天（所有系統共享）
 * 詳見: /memories/repo/PUT操作成本清單.md
 */
export class TutionKVService implements TutionKVManager {
  private classKV: KVNamespace;
  private rosterKV: KVNamespace;
  private attendanceKV: KVNamespace;
  private scheduleKV?: KVNamespace;

  constructor(
    classKV: KVNamespace,
    rosterKV: KVNamespace,
    attendanceKV: KVNamespace,
    scheduleKV?: KVNamespace,
  ) {
    this.classKV = classKV;
    this.rosterKV = rosterKV;
    this.attendanceKV = attendanceKV;
    this.scheduleKV = scheduleKV;
  }

  // ===== 補習班主表操作 =====

  async createClass(
    classData: Omit<TutionClass, "class_id" | "created_at" | "updated_at">,
  ): Promise<TutionClass> {
    const classId = `class_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const tutionClass: TutionClass = {
      ...classData,
      class_id: classId,
      created_at: now,
      updated_at: now,
    };

    await this.classKV.put(classId, JSON.stringify(tutionClass));
    return tutionClass;
  }

  async getClass(classId: string): Promise<TutionClass | null> {
    const data = await this.classKV.get(classId);
    return data ? JSON.parse(data) : null;
  }

  async updateClass(
    classId: string,
    updates: Partial<TutionClass>,
  ): Promise<TutionClass> {
    const existing = await this.getClass(classId);
    if (!existing) throw new Error(`Class ${classId} not found`);

    const updated = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
    };

    await this.classKV.put(classId, JSON.stringify(updated));
    return updated;
  }

  async deleteClass(classId: string): Promise<void> {
    await this.classKV.delete(classId);
  }

  async listClassesByTeacher(teacherId: string): Promise<TutionClass[]> {
    const result = await this.classKV.list({ prefix: "class_" });
    const classes = await Promise.all(result.keys.map((item: any) => this.getClass(item.name)));
    return classes.filter((c: any): c is TutionClass => c !== null && c.teacher_id === teacherId);
  }

  async listClassesByStatus(status: TutionClassStatus): Promise<TutionClass[]> {
    const result = await this.classKV.list({ prefix: "class_" });
    const classes = await Promise.all(result.keys.map((item: any) => this.getClass(item.name)));
    return classes.filter((c: any): c is TutionClass => c !== null && c.approval_status === status);
  }

  async listAllClasses(): Promise<TutionClass[]> {
    const result = await this.classKV.list({ prefix: "class_" });
    const classes = await Promise.all(result.keys.map((item: any) => this.getClass(item.name)));
    return classes.filter((c: any): c is TutionClass => c !== null);
  }

  async listAllRoster(): Promise<TutionRoster[]> {
    const result = await this.rosterKV.list({ prefix: "roster_" });
    const roster = await Promise.all(result.keys.map((item: any) => this.getRosterEntry(item.name)));
    return roster.filter((r: any): r is TutionRoster => r !== null);
  }

  // ===== 學生名單操作 =====

  async addRosterEntry(
    rosterData: Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">,
  ): Promise<TutionRoster> {
    const rosterId = `roster_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const roster: TutionRoster = {
      ...rosterData,
      roster_id: rosterId,
      is_active: !rosterData.withdrawal_date,
      created_at: now,
      updated_at: now,
    };

    await this.rosterKV.put(rosterId, JSON.stringify(roster));
    return roster;
  }

  async getRosterEntry(rosterId: string): Promise<TutionRoster | null> {
    const data = await this.rosterKV.get(rosterId);
    return data ? JSON.parse(data) : null;
  }

  async listRosterByClass(classId: string): Promise<TutionRoster[]> {
    const result = await this.rosterKV.list({ prefix: "roster_" });
    const roster = await Promise.all(result.keys.map((item: any) => this.getRosterEntry(item.name)));
    return roster.filter((r: any): r is TutionRoster => r !== null && r.class_id === classId);
  }

  async updateRosterEntry(
    rosterId: string,
    updates: Partial<TutionRoster>,
  ): Promise<TutionRoster> {
    const existing = await this.getRosterEntry(rosterId);
    if (!existing) throw new Error(`Roster entry ${rosterId} not found`);

    const updated = {
      ...existing,
      ...updates,
      is_active: !updates.withdrawal_date && !existing.withdrawal_date,
      updated_at: Date.now(),
    };

    await this.rosterKV.put(rosterId, JSON.stringify(updated));
    return updated;
  }

  async removeStudentFromRoster(
    rosterId: string,
    withdrawalReason: string,
  ): Promise<void> {
    await this.updateRosterEntry(rosterId, {
      withdrawal_date: new Date().toISOString().split("T")[0],
      withdrawal_reason: withdrawalReason,
    });
  }

  async deleteRosterEntry(rosterId: string): Promise<void> {
    await this.rosterKV.delete(rosterId);
  }

  // ===== 出勤紀錄操作 =====

  async recordAttendance(
    attendanceData: Omit<TutionAttendance, "attendance_id">,
  ): Promise<TutionAttendance> {
    const attendanceId = `attendance_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const attendance: TutionAttendance = {
      ...attendanceData,
      attendance_id: attendanceId,
    };

    await this.attendanceKV.put(attendanceId, JSON.stringify(attendance));
    return attendance;
  }

  async getAttendanceRecord(
    attendanceId: string,
  ): Promise<TutionAttendance | null> {
    const data = await this.attendanceKV.get(attendanceId);
    return data ? JSON.parse(data) : null;
  }

  async listAttendanceByStudent(
    studentId: string,
    classId: string,
  ): Promise<TutionAttendance[]> {
    const result = await this.attendanceKV.list({ prefix: "attendance_" });
    const attendanceRecords = await Promise.all(
      result.keys.map((item: any) => this.getAttendanceRecord(item.name)),
    );
    const records = attendanceRecords.filter(
      (a: any): a is TutionAttendance =>
        a !== null && a.student_id === studentId && a.class_id === classId,
    );

    return records.sort(
      (a: TutionAttendance, b: TutionAttendance) =>
        new Date(a.class_date).getTime() - new Date(b.class_date).getTime(),
    );
  }

  async listAttendanceByClass(classId: string): Promise<TutionAttendance[]> {
    const result = await this.attendanceKV.list({ prefix: "attendance_" });
    const attendanceRecords = await Promise.all(
      result.keys.map((item: any) => this.getAttendanceRecord(item.name)),
    );
    const records = attendanceRecords.filter(
      (a: any): a is TutionAttendance => a !== null && a.class_id === classId,
    );

    return records.sort(
      (a: TutionAttendance, b: TutionAttendance) =>
        new Date(a.class_date).getTime() - new Date(b.class_date).getTime(),
    );
  }

  async updateAttendanceRecord(
    attendanceId: string,
    updates: Partial<TutionAttendance>,
  ): Promise<TutionAttendance> {
    const existing = await this.getAttendanceRecord(attendanceId);
    if (!existing)
      throw new Error(`Attendance record ${attendanceId} not found`);

    const updated = { ...existing, ...updates };
    await this.attendanceKV.put(attendanceId, JSON.stringify(updated));
    return updated;
  }

  async getAttendanceStats(studentId: string, classId: string): Promise<any> {
    const records = await this.listAttendanceByStudent(studentId, classId);

    const stats = {
      total_classes: records.length,
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      excuse_count: 0,
      attendance_rate: 0,
    };

    for (const record of records) {
      switch (record.status) {
        case AttendanceStatus.PRESENT:
          stats.present_count++;
          break;
        case AttendanceStatus.ABSENT:
          stats.absent_count++;
          break;
        case AttendanceStatus.LATE:
          stats.late_count++;
          break;
        case AttendanceStatus.EXCUSE:
          stats.excuse_count++;
          break;
      }
    }

    stats.attendance_rate =
      stats.total_classes > 0
        ? Math.round(
            ((stats.present_count + stats.late_count) / stats.total_classes) *
              100,
          )
        : 0;

    return stats;
  }

  // ===== 排課例外記錄操作 =====
  // 只存「例外」：老師標記過無開課/調課的日期。沒有例外記錄的上課日一律視為「有開課」
  // （由前端依 day_of_week + start_date 推算，不寫入 KV）。

  private requireScheduleKV(): KVNamespace {
    if (!this.scheduleKV) {
      throw new Error("TutionKVService: scheduleKV not configured");
    }
    return this.scheduleKV;
  }

  async createSchedule(
    scheduleData: Omit<TutionSchedule, "schedule_id" | "created_at" | "updated_at">,
  ): Promise<TutionSchedule> {
    const scheduleId = `schedule_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const now = Date.now();

    const schedule: TutionSchedule = {
      ...scheduleData,
      schedule_id: scheduleId,
      created_at: now,
      updated_at: now,
    };

    await this.requireScheduleKV().put(scheduleId, JSON.stringify(schedule));
    return schedule;
  }

  async getSchedule(scheduleId: string): Promise<TutionSchedule | null> {
    const data = await this.requireScheduleKV().get(scheduleId);
    return data ? JSON.parse(data) : null;
  }

  async listSchedulesByClass(classId: string): Promise<TutionSchedule[]> {
    const result = await this.requireScheduleKV().list({ prefix: "schedule_" });
    const schedules = await Promise.all(
      result.keys.map((item: any) => this.getSchedule(item.name)),
    );
    return schedules.filter(
      (s: any): s is TutionSchedule => s !== null && s.class_id === classId,
    );
  }

  async updateSchedule(
    scheduleId: string,
    updates: Partial<TutionSchedule>,
  ): Promise<TutionSchedule> {
    const existing = await this.getSchedule(scheduleId);
    if (!existing) throw new Error(`Schedule ${scheduleId} not found`);

    const updated = {
      ...existing,
      ...updates,
      updated_at: Date.now(),
    };

    await this.requireScheduleKV().put(scheduleId, JSON.stringify(updated));
    return updated;
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    await this.requireScheduleKV().delete(scheduleId);
  }

  // ===== PDF 欄位映射操作 =====

  async getPDFFieldMaps(): Promise<TutionPDFFieldMap[]> {
    // 注：PDF 欄位映射應該從配置文件或 Google Sheet 讀取
    // 這是一個佔位符實現
    return [];
  }

  async getPDFFieldMap(fieldId: string): Promise<TutionPDFFieldMap | null> {
    const maps = await this.getPDFFieldMaps();
    return maps.find((m) => m.field_id === fieldId) || null;
  }

  // ===== 通用操作 =====

  async search(
    query: string,
    type: "class" | "student" | "attendance",
  ): Promise<any[]> {
    // 注：搜索邏輯應該實現全文搜索或模糊匹配
    // 這是一個佔位符實現
    return [];
  }
}

// ============================================
// Worker 路由和端點定義
// ============================================

export async function handleTutionRequest(
  request: Request,
  classKV: KVNamespace,
  rosterKV: KVNamespace,
  attendanceKV: KVNamespace,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const service = new TutionKVService(classKV, rosterKV, attendanceKV);

  try {
    // 補習班主表相關端點
    if (path.startsWith("/api/v1/classes")) {
      if (method === "POST") {
        const data = await request.json();
        const tutionClass = await service.createClass(data);
        return new Response(JSON.stringify(tutionClass), { status: 201 });
      }

      const classId = path.split("/")[4];
      if (classId) {
        if (method === "GET") {
          const tutionClass = await service.getClass(classId);
          return tutionClass
            ? new Response(JSON.stringify(tutionClass))
            : new Response("Not found", { status: 404 });
        }

        if (method === "PUT") {
          const updates = await request.json();
          const updated = await service.updateClass(classId, updates);
          return new Response(JSON.stringify(updated));
        }

        if (method === "DELETE") {
          await service.deleteClass(classId);
          return new Response(null, { status: 204 });
        }
      }
    }

    // 學生名單相關端點
    if (path.startsWith("/api/v1/roster")) {
      if (method === "POST") {
        const data = await request.json();
        const roster = await service.addRosterEntry(data);
        return new Response(JSON.stringify(roster), { status: 201 });
      }

      const rosterId = path.split("/")[4];
      if (rosterId && method === "GET") {
        const roster = await service.getRosterEntry(rosterId);
        return roster
          ? new Response(JSON.stringify(roster))
          : new Response("Not found", { status: 404 });
      }
    }

    // 出勤紀錄相關端點
    if (path.startsWith("/api/v1/attendance")) {
      if (method === "POST") {
        const data = await request.json();
        const attendance = await service.recordAttendance(data);
        return new Response(JSON.stringify(attendance), { status: 201 });
      }

      const attendanceId = path.split("/")[4];
      if (attendanceId && method === "GET") {
        const attendance = await service.getAttendanceRecord(attendanceId);
        return attendance
          ? new Response(JSON.stringify(attendance))
          : new Response("Not found", { status: 404 });
      }
    }

    return new Response("Not found", { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
}

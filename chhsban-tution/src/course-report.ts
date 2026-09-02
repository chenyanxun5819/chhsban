/**
 * 「各課程開課報表」批次計算。
 *
 * 每日由 Cron Trigger 呼叫一次（見 index.ts 的 scheduled handler），結果整批存進 KV
 * （TutionKVService.setCourseReportSummary），前端一律讀快照，不即時計算——課程一多，
 * 逐課程即時抓排課/名單/出勤三份資料會很慢，改成後端一次全表掃描、分組後在記憶體算完。
 *
 * 排課的「應開課數／實際開課數／停課數／未點名」演算法，是從
 * tution-portal/src/utils/scheduleGenerator.ts 移植過來的（純日期運算，沒有前端依賴），
 * 兩邊刻意保持邏輯一致，這樣報表數字才會跟老師自己排課管理頁面看到的一致。
 */

import type { TeacherKVManager } from "@chhsban/kv-utils";
import type { TutionClass, TutionSchedule, TutionRoster, TutionAttendance } from "@chhsban/kv-utils";
import type { TutionKVService } from "./tution-service";
import { dedupeToLatestAttendance } from "./tution-service";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

interface GeneratedScheduleRow {
  scheduled_date: string;
  actual_date: string;
  status: "held" | "cancelled" | "rescheduled";
}

function parseYMD(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y, m, d };
}

function toUTCDate(dateStr: string): Date {
  const { y, m, d } = parseYMD(dateStr);
  return new Date(Date.UTC(y, m - 1, d));
}

function toDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 依 day_of_week + start_date 產生完整的上課日清單，並套用例外記錄（見 scheduleGenerator.ts 同名函式）。 */
function generateScheduleRows(params: {
  dayOfWeek: string;
  startDate: string;
  endDate?: string;
  exceptions: TutionSchedule[];
  today: Date;
  horizonDays?: number;
}): GeneratedScheduleRow[] {
  const { dayOfWeek, startDate, endDate, exceptions, today, horizonDays = 7 } = params;

  const targetDayIndex = DAY_NAME_TO_INDEX[dayOfWeek.trim().toLowerCase()];
  if (targetDayIndex === undefined || !startDate) {
    return [];
  }

  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const horizonLimit = new Date(todayUTC);
  horizonLimit.setUTCDate(horizonLimit.getUTCDate() + horizonDays);

  const upperBound = endDate
    ? new Date(Math.min(toUTCDate(endDate).getTime(), horizonLimit.getTime()))
    : horizonLimit;

  const start = toUTCDate(startDate);
  if (upperBound.getTime() < start.getTime()) {
    return [];
  }

  const firstOccurrence = new Date(start);
  const diff = (targetDayIndex - start.getUTCDay() + 7) % 7;
  firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + diff);

  const exceptionsByDate = new Map<string, TutionSchedule>();
  for (const exception of exceptions) {
    exceptionsByDate.set(exception.scheduled_date, exception);
  }

  const rows: GeneratedScheduleRow[] = [];
  const cursor = new Date(firstOccurrence);
  while (cursor.getTime() <= upperBound.getTime()) {
    const dateStr = toDateString(cursor);
    const exception = exceptionsByDate.get(dateStr);

    if (exception) {
      rows.push({
        scheduled_date: dateStr,
        actual_date: exception.status === "rescheduled" ? exception.rescheduled_to || dateStr : dateStr,
        status: exception.status,
      });
    } else {
      rows.push({ scheduled_date: dateStr, actual_date: dateStr, status: "held" });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return rows;
}

/** 排課表格上方的彙總統計（見 scheduleGenerator.ts 的 summarizeSchedule）。 */
function summarizeSchedule(rows: GeneratedScheduleRow[], attendedDates: Set<string>, today: Date) {
  const todayStr = toDateString(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())));

  let actualHeldCount = 0;
  let cancelledCount = 0;
  let unconfirmedAttendanceCount = 0;

  for (const row of rows) {
    if (row.status === "cancelled") {
      cancelledCount++;
      continue;
    }

    actualHeldCount++;

    const hasHappened = row.actual_date <= todayStr;
    if (hasHappened && !attendedDates.has(row.actual_date)) {
      unconfirmedAttendanceCount++;
    }
  }

  return {
    expectedCount: rows.length,
    actualHeldCount,
    cancelledCount,
    unconfirmedAttendanceCount,
  };
}

export interface CourseReportRow {
  class_id: string;
  teacher_id: string;
  teacher_name_cn: string;
  form: string;
  subject: string;
  approval_status: string;
  start_date: string;
  end_date?: string;
  expected_count: number;
  actual_held_count: number;
  cancelled_count: number;
  unconfirmed_attendance_count: number;
  active_roster_count: number;
  withdrawn_roster_count: number;
  /** 百分比 0-100（到課+遲到 / 已點名總筆數）；尚無任何點名紀錄時為 null */
  attendance_rate: number | null;
  absent_count: number;
  excuse_count: number;
  late_count: number;
}

export interface CourseReportSummary {
  generated_at: number;
  rows: CourseReportRow[];
}

const REPORT_STATUSES = new Set(["approved", "active", "ended"]);

function groupByClassId<T extends { class_id: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const bucket = map.get(item.class_id);
    if (bucket) bucket.push(item);
    else map.set(item.class_id, [item]);
  }
  return map;
}

export async function computeCourseReport(
  kvService: TutionKVService,
  teacherManager: TeacherKVManager,
): Promise<CourseReportSummary> {
  const [allClasses, allSchedules, allRoster, allAttendance, allTeachers] = await Promise.all([
    kvService.listAllClasses(),
    kvService.listAllSchedules(),
    kvService.listAllRoster(),
    kvService.listAllAttendance(),
    teacherManager.getAllTeachers(),
  ]);

  const teacherNameById = new Map(allTeachers.map((t) => [t.teacher_id, t.name_cn || t.name_en || ""]));
  const schedulesByClass = groupByClassId(allSchedules);
  const rosterByClass = groupByClassId(allRoster as unknown as Array<TutionRoster & { class_id: string }>);
  // 出勤新增制下 allAttendance 可能含同一 class_id+student_id+class_date 的多筆歷史紀錄，
  // 先收斂成每組最新一筆，避免出席率/各狀態計數被歷史版本重複計入。
  const dedupedAttendance = dedupeToLatestAttendance(allAttendance);
  const attendanceByClass = groupByClassId(dedupedAttendance as unknown as Array<TutionAttendance & { class_id: string }>);

  const today = new Date();

  const rows: CourseReportRow[] = (allClasses as TutionClass[])
    .filter((cls) => REPORT_STATUSES.has(cls.approval_status))
    .map((cls) => {
      const exceptions = schedulesByClass.get(cls.class_id) || [];
      const rosterEntries = rosterByClass.get(cls.class_id) || [];
      const attendanceRecords = attendanceByClass.get(cls.class_id) || [];

      const scheduleRows = generateScheduleRows({
        dayOfWeek: cls.day_of_week,
        startDate: cls.start_date,
        endDate: cls.end_date,
        exceptions,
        today,
      });

      const attendedDates = new Set(attendanceRecords.map((a) => a.class_date));
      const summary = summarizeSchedule(scheduleRows, attendedDates, today);

      const activeRosterCount = rosterEntries.filter((r) => r.is_active).length;
      const withdrawnRosterCount = rosterEntries.filter((r) => !r.is_active).length;

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excuseCount = 0;
      for (const record of attendanceRecords) {
        switch (record.status) {
          case "present":
            presentCount++;
            break;
          case "absent":
            absentCount++;
            break;
          case "late":
            lateCount++;
            break;
          case "excuse":
            excuseCount++;
            break;
        }
      }
      const totalMarked = presentCount + absentCount + lateCount + excuseCount;
      const attendanceRate =
        totalMarked > 0 ? Math.round(((presentCount + lateCount) / totalMarked) * 100) : null;

      return {
        class_id: cls.class_id,
        teacher_id: cls.teacher_id,
        teacher_name_cn: (cls as any).teacher_name_cn || teacherNameById.get(cls.teacher_id) || "",
        form: cls.form,
        subject: cls.subject,
        approval_status: cls.approval_status,
        start_date: cls.start_date,
        end_date: cls.end_date,
        expected_count: summary.expectedCount,
        actual_held_count: summary.actualHeldCount,
        cancelled_count: summary.cancelledCount,
        unconfirmed_attendance_count: summary.unconfirmedAttendanceCount,
        active_roster_count: activeRosterCount,
        withdrawn_roster_count: withdrawnRosterCount,
        attendance_rate: attendanceRate,
        absent_count: absentCount,
        excuse_count: excuseCount,
        late_count: lateCount,
      };
    });

  return { generated_at: Date.now(), rows };
}

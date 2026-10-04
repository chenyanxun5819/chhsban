/**
 * 「各課程開課報表」批次計算。
 *
 * 每日由 Cron Trigger 呼叫一次（見 index.ts 的 scheduled handler），結果存進 D1
 * （TutionService.setCourseReportSummary），前端一律讀快照。
 * 出勤數字由 D1 直接 GROUP BY 算出各班各日期各狀態人數（每位學生每堂課只算最新一筆）。
 *
 * 排課的「應開課數／實際開課數／停課數／未點名」演算法，是從
 * tution-portal/src/utils/scheduleGenerator.ts 移植過來的（純日期運算，沒有前端依賴），
 * 兩邊刻意保持邏輯一致，這樣報表數字才會跟老師自己排課管理頁面看到的一致。
 */

import type { TeacherKVManager } from "@chhsban/kv-utils";
import type { TutionClass, TutionSchedule } from "@chhsban/kv-utils";
import type { TutionService } from "./tution-service";
import { defaultTutionEndDate, effectiveTutionEndDate } from "./retention";

const DAY_NAME_TO_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface GeneratedScheduleRow {
  scheduled_date: string;
  actual_date: string;
  status: "held" | "cancelled" | "rescheduled" | "extra";
  extra_session_note?: string;
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

/**
 * 依 day_of_week + start_date 產生完整的上課日清單，並套用例外記錄（見 scheduleGenerator.ts 同名函式）。
 * 住宿生點名控管、學號查詢（boarding-attendance.ts）也共用這個函式。
 */
export function generateScheduleRows(params: {
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

  const effectiveEndDate = endDate || defaultTutionEndDate(startDate);
  const upperBound = effectiveEndDate
    ? new Date(Math.min(toUTCDate(effectiveEndDate).getTime(), horizonLimit.getTime()))
    : horizonLimit;

  const start = toUTCDate(startDate);
  if (upperBound.getTime() < start.getTime()) {
    return [];
  }

  const firstOccurrence = new Date(start);
  const diff = (targetDayIndex - start.getUTCDay() + 7) % 7;
  firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + diff);

  const exceptionsByDate = new Map<string, TutionSchedule>();
  const extraRows: GeneratedScheduleRow[] = [];
  for (const exception of exceptions) {
    if (exception.status === "extra") {
      extraRows.push({
        scheduled_date: exception.scheduled_date,
        actual_date: exception.scheduled_date,
        status: "extra",
        extra_session_note: exception.extra_session_note,
      });
      continue;
    }
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

  return [...rows, ...extraRows].sort((a, b) =>
    a.scheduled_date === b.scheduled_date ? a.actual_date.localeCompare(b.actual_date) : a.scheduled_date.localeCompare(b.scheduled_date),
  );
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
  service: TutionService,
  teacherManager: TeacherKVManager,
): Promise<CourseReportSummary> {
  const lastTeachingDate = await service.getLastTeachingDate();
  const [allClasses, allSchedules, allRoster, attendanceCounts, allTeachers] = await Promise.all([
    service.listAllClasses(),
    service.listAllSchedules(),
    service.listAllRoster(),
    service.countAttendanceByClassDate(),
    teacherManager.getAllTeachers(),
  ]);

  const teacherNameById = new Map(allTeachers.map((t) => [t.teacher_id, t.name_cn || t.name_en || ""]));
  const schedulesByClass = groupByClassId(allSchedules);
  const rosterByClass = groupByClassId(allRoster);
  const countsByClass = groupByClassId(attendanceCounts);

  const today = new Date();

  const rows: CourseReportRow[] = (allClasses as TutionClass[])
    .filter((cls) => REPORT_STATUSES.has(cls.approval_status))
    .map((cls) => {
      const exceptions: TutionSchedule[] = schedulesByClass.get(cls.class_id) || [];
      const rosterEntries = rosterByClass.get(cls.class_id) || [];
      const counts = countsByClass.get(cls.class_id) || [];

      const scheduleRows = generateScheduleRows({
        dayOfWeek: cls.day_of_week,
        startDate: cls.start_date,
        endDate: effectiveTutionEndDate(cls.start_date, cls.end_date, lastTeachingDate),
        exceptions,
        today,
      });

      const attendedDates = new Set(counts.map((c) => c.class_date));
      const summary = summarizeSchedule(scheduleRows, attendedDates, today);

      const activeRosterCount = rosterEntries.filter((r) => r.is_active).length;
      const withdrawnRosterCount = rosterEntries.filter((r) => !r.is_active).length;

      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excuseCount = 0;
      for (const { status, count } of counts) {
        switch (status) {
          case "present":
            presentCount += count;
            break;
          case "absent":
            absentCount += count;
            break;
          case "late":
            lateCount += count;
            break;
          case "excuse":
            excuseCount += count;
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

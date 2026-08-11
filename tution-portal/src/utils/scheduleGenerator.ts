import type { TutionSchedule } from "@/types/index";

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
  /** 這堂課「原本」該上課的日期（YYYY-MM-DD） */
  scheduled_date: string;
  /** 實際上課日期：held/cancelled 時等於 scheduled_date；rescheduled 時等於 rescheduled_to */
  actual_date: string;
  status: "held" | "cancelled" | "rescheduled";
  cancellation_reason?: string;
  rescheduled_to?: string;
  rescheduled_venue?: string;
  reschedule_reason?: string;
  /** 若為例外記錄（無開課/調課），帶出其 KV id，供更新/刪除操作使用；「有開課」的預設列沒有 id */
  schedule_id?: string;
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

export interface GenerateScheduleRowsParams {
  dayOfWeek: string; // 例如 "Monday"
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD，管理員設定的課程結束日（可選）
  exceptions: TutionSchedule[]; // 從後端取得的例外記錄（cancelled/rescheduled）
  today?: Date; // 方便測試，預設現在時間
  horizonDays?: number; // 未來最多顯示幾天，預設 7
}

/**
 * 依 day_of_week + start_date 產生完整的上課日清單，並套用例外記錄。
 *
 * 範圍：下限 = start_date；上限 = min(今天 + horizonDays, end_date ?? 今天 + horizonDays)。
 * 沒有例外記錄的日期一律視為「有開課」（held），不需要對應的 KV 記錄。
 * 輸出依日期新到舊排序。
 */
export function generateScheduleRows(
  params: GenerateScheduleRowsParams
): GeneratedScheduleRow[] {
  const { dayOfWeek, startDate, endDate, exceptions, horizonDays = 7 } = params;

  const targetDayIndex = DAY_NAME_TO_INDEX[dayOfWeek.trim().toLowerCase()];
  if (targetDayIndex === undefined || !startDate) {
    return [];
  }

  const today = params.today ?? new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  const horizonLimit = new Date(todayUTC);
  horizonLimit.setUTCDate(horizonLimit.getUTCDate() + horizonDays);

  const upperBound = endDate
    ? new Date(Math.min(toUTCDate(endDate).getTime(), horizonLimit.getTime()))
    : horizonLimit;

  const start = toUTCDate(startDate);
  if (upperBound.getTime() < start.getTime()) {
    return [];
  }

  // 找出從 start_date 起第一個符合 day_of_week 的日期
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
        actual_date:
          exception.status === "rescheduled"
            ? exception.rescheduled_to || dateStr
            : dateStr,
        status: exception.status,
        cancellation_reason: exception.cancellation_reason,
        rescheduled_to: exception.rescheduled_to,
        rescheduled_venue: exception.rescheduled_venue,
        reschedule_reason: exception.reschedule_reason,
        schedule_id: exception.schedule_id,
      });
    } else {
      rows.push({
        scheduled_date: dateStr,
        actual_date: dateStr,
        status: "held",
      });
    }

    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return rows.sort((a, b) => (a.scheduled_date < b.scheduled_date ? 1 : -1));
}

export interface ScheduleSummaryStats {
  expectedCount: number; // 應開課數
  actualHeldCount: number; // 實際開課數（含調課）
  cancelledCount: number; // 停課數
  unconfirmedAttendanceCount: number; // 未確實點名數
}

/**
 * 計算排課表格上方的彙總統計。
 *
 * attendedDates：已經有出勤記錄的「實際上課日期」集合（來自唯讀出勤查詢），
 * 用來判斷「未確實點名數」——只計算實際上課日期已經過去、狀態為 held/rescheduled、
 * 但查無出勤記錄的列。
 */
export function summarizeSchedule(
  rows: GeneratedScheduleRow[],
  attendedDates: Set<string>,
  today: Date = new Date()
): ScheduleSummaryStats {
  const todayStr = toDateString(
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  );

  let actualHeldCount = 0;
  let cancelledCount = 0;
  let unconfirmedAttendanceCount = 0;

  for (const row of rows) {
    if (row.status === "cancelled") {
      cancelledCount++;
      continue;
    }

    // held 或 rescheduled 都算「實際開課」
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

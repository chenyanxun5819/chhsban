/**
 * 學校行事曆判定邏輯（純函式，不碰 KV）。
 * 前端 frontend/src/utils/calendar.ts 有一份相同的 resolveDay，兩邊規則要一致。
 *
 * 日期一律以 "YYYY-MM-DD" 字串處理，用 UTC 計算星期幾，避免時區造成差一天；
 * 「今天」則以馬來西亞時間（UTC+8）判定，與 year.ts 一致。
 */

import type {
  OptionalCourse,
  OptionalCourseSchedule,
  SchoolCalendar,
  Weekday,
} from "./types";
import { CourseScheduleStatus, CourseWindowStatus } from "./types";

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAYS: Weekday[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function todayMYT(now: number = Date.now()): string {
  return new Date(now + MYT_OFFSET_MS).toISOString().slice(0, 10);
}

/** 馬來西亞時間的日期（用於把 opened_at/closed_at 等時間戳轉成日期） */
export function dateOfTimestampMYT(ts: number): string {
  return todayMYT(ts);
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
}

function addDays(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export function emptyCalendar(year: number): SchoolCalendar {
  return { year, holidays: [], makeup_days: [], updated_at: 0 };
}

/** 行事曆是否已建立（有學期起訖）；尚未建立時不推算上課日、也不擋點名 */
export function isCalendarReady(calendar: SchoolCalendar): boolean {
  return !!calendar.term_start && !!calendar.term_end;
}

export interface DayResolution {
  is_school_day: boolean;
  follows_weekday?: Weekday; // is_school_day 時，當天按星期幾的課表上課
  reason: "out_of_term" | "makeup" | "holiday" | "sunday" | "saturday" | "normal";
  holiday_name?: string;
}

/**
 * 判定某天是否上課，依序：
 * 1. 不在學期內 → 休
 * 2. 補課日 → 上課，按 follows_weekday
 * 3. 落在假期區間 → 休
 * 4. 星期日、星期六 → 休
 * 5. 其他 → 上課，按當天星期幾
 */
export function resolveDay(calendar: SchoolCalendar, date: string): DayResolution {
  if (!calendar.term_start || !calendar.term_end || date < calendar.term_start || date > calendar.term_end) {
    return { is_school_day: false, reason: "out_of_term" };
  }
  const makeup = calendar.makeup_days.find((m) => m.date === date);
  if (makeup) {
    return { is_school_day: true, follows_weekday: makeup.follows_weekday, reason: "makeup" };
  }
  const holiday = calendar.holidays.find((h) => date >= h.start_date && date <= h.end_date);
  if (holiday) {
    return { is_school_day: false, reason: "holiday", holiday_name: holiday.name };
  }
  const weekday = weekdayOf(date);
  if (weekday === "Sunday") return { is_school_day: false, reason: "sunday" };
  if (weekday === "Saturday") return { is_school_day: false, reason: "saturday" };
  return { is_school_day: true, follows_weekday: weekday, reason: "normal" };
}

export interface CourseSession {
  date: string; // 實際上課（應點名）日期
  rescheduled_from?: string; // 由課程級調課移過來時，原訂日期
  venue?: string; // 調課時指定的地點
}

/**
 * 某門課的應點名日期（由舊到新）：
 * 行事曆中按 course.day_of_week 上課的日子，限縮在課程自訂起訖（有設定時）內，
 * 扣掉課程級停課、把調課的原訂日期換成調至日期。
 * 行事曆尚未建立或課程沒有設定上課星期時，回傳空陣列。
 */
export function listCourseSessions(
  calendar: SchoolCalendar,
  course: Pick<OptionalCourse, "day_of_week" | "start_date" | "end_date">,
  schedules: OptionalCourseSchedule[],
): CourseSession[] {
  if (!isCalendarReady(calendar) || !course.day_of_week) return [];

  const from = course.start_date && course.start_date > calendar.term_start! ? course.start_date : calendar.term_start!;
  const to = course.end_date && course.end_date < calendar.term_end! ? course.end_date : calendar.term_end!;

  const exceptionByDate = new Map(schedules.map((s) => [s.scheduled_date, s]));
  const sessions: CourseSession[] = [];

  for (let date = from; date <= to; date = addDays(date, 1)) {
    const day = resolveDay(calendar, date);
    if (!day.is_school_day || day.follows_weekday !== course.day_of_week) continue;

    const exception = exceptionByDate.get(date);
    if (!exception) {
      sessions.push({ date });
    } else if (exception.status === CourseScheduleStatus.RESCHEDULED && exception.rescheduled_to) {
      sessions.push({
        date: exception.rescheduled_to,
        rescheduled_from: date,
        venue: exception.rescheduled_venue,
      });
    }
    // CANCELLED：這天不上課
  }

  return sessions.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 「應該已經點名」的期間：課程窗口開放之後、到今天（或窗口關閉那天）為止。
 * 窗口開放前老師無法點名，關閉後也無法點名，這兩段不算漏點名。
 */
export function dueRange(
  course: Pick<OptionalCourse, "window_status" | "opened_at" | "closed_at">,
  now: number = Date.now(),
): { from: string; to: string } | null {
  if (course.window_status === CourseWindowStatus.PENDING || !course.opened_at) return null;
  const today = todayMYT(now);
  const closed = course.window_status === CourseWindowStatus.CLOSED && course.closed_at ? dateOfTimestampMYT(course.closed_at) : null;
  return {
    from: dateOfTimestampMYT(course.opened_at),
    to: closed && closed < today ? closed : today,
  };
}

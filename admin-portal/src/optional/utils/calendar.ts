// 與 worker/src/calendar.ts 的 resolveDay 規則一致（前端只用來畫行事曆，應點名日期以 worker 的 API 為準）
import type { HolidayType, SchoolCalendar, SchoolHoliday, Weekday } from "@/optional/types";

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

/** 選修課可排的上課星期（星期日一律休息） */
export const SCHOOL_WEEKDAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  Sunday: "星期日",
  Monday: "星期一",
  Tuesday: "星期二",
  Wednesday: "星期三",
  Thursday: "星期四",
  Friday: "星期五",
  Saturday: "星期六",
};

export const HOLIDAY_TYPE_LABEL: Record<HolidayType, string> = {
  public: "國定假日",
  school_break: "學校假期",
  event: "活動停課",
};

export const todayMYT = (): string => new Date(Date.now() + MYT_OFFSET_MS).toISOString().slice(0, 10);

export const weekdayOf = (date: string): Weekday => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

export const addDays = (date: string, days: number): string =>
  new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, 10);

export const toDateString = (year: number, monthIndex: number, day: number): string =>
  new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);

/** 顯示用：2026-09-28 → 9/28（一） */
export const formatDate = (date: string): string => {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}（${WEEKDAY_LABEL[weekdayOf(date)].slice(-1)}）`;
};

export interface CourseWeekdayInfo {
  weekly_days?: Weekday[] | null;
  day_of_week?: Weekday | null;
}

export const courseWeekdays = (course: CourseWeekdayInfo): Weekday[] => {
  const picked = Array.isArray(course.weekly_days) ? course.weekly_days : [];
  const days = picked.length > 0 ? picked : course.day_of_week ? [course.day_of_week] : [];
  return SCHOOL_WEEKDAYS.filter((day) => days.includes(day));
};

export const weekdayListLabel = (days: Weekday[]): string => days.map((day) => WEEKDAY_LABEL[day]).join("、");

export type DayKind = "out_of_term" | "makeup" | "holiday" | "sunday" | "saturday" | "normal";

export interface DayResolution {
  is_school_day: boolean;
  follows_weekday?: Weekday;
  kind: DayKind;
  holiday?: SchoolHoliday;
}

export function resolveDay(calendar: SchoolCalendar, date: string): DayResolution {
  if (!calendar.term_start || !calendar.term_end || date < calendar.term_start || date > calendar.term_end) {
    return { is_school_day: false, kind: "out_of_term" };
  }
  const makeup = calendar.makeup_days.find((m) => m.date === date);
  if (makeup) {
    return { is_school_day: true, follows_weekday: makeup.follows_weekday, kind: "makeup" };
  }
  const holiday = calendar.holidays.find((h) => date >= h.start_date && date <= h.end_date);
  if (holiday) {
    return { is_school_day: false, kind: "holiday", holiday };
  }
  const weekday = weekdayOf(date);
  if (weekday === "Sunday") return { is_school_day: false, kind: "sunday" };
  if (weekday === "Saturday") return { is_school_day: false, kind: "saturday" };
  return { is_school_day: true, follows_weekday: weekday, kind: "normal" };
}

/** 全年上課日統計：總天數，以及按星期幾課表上課的天數（核對官方行事曆用） */
export function countSchoolDays(calendar: SchoolCalendar): { total: number; byWeekday: Record<Weekday, number> } {
  const byWeekday = Object.fromEntries(WEEKDAYS.map((w) => [w, 0])) as Record<Weekday, number>;
  let total = 0;
  if (!calendar.term_start || !calendar.term_end) return { total, byWeekday };
  for (let d = calendar.term_start; d <= calendar.term_end; d = addDays(d, 1)) {
    const r = resolveDay(calendar, d);
    if (r.is_school_day && r.follows_weekday) {
      total += 1;
      byWeekday[r.follows_weekday] += 1;
    }
  }
  return { total, byWeekday };
}

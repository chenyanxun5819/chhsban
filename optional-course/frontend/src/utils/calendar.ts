// 老師端只需要顯示日期；應點名日期的判定一律以 worker（worker/src/calendar.ts）的 API 為準
import type { Weekday } from "@/types";
import i18n from "@/i18n";

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

const WEEKDAYS: Weekday[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** 星期幾依目前語言顯示（星期一／Monday）；呼叫端元件需透過 useTranslation 訂閱語言切換 */
export const weekdayLabel = (day: Weekday): string => i18n.t(`weekday.${day}`);

/** 馬來西亞時間（UTC+8）的今天 */
export const todayMYT = (): string => new Date(Date.now() + MYT_OFFSET_MS).toISOString().slice(0, 10);

export const weekdayOf = (date: string): Weekday => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** 顯示用：2026-09-28 → 9/28（一）／9/28 (Mon) */
export const formatDate = (date: string): string => {
  const [, m, d] = date.split("-").map(Number);
  return i18n.t("calendar.dateFormat", { m, d, w: i18n.t(`weekdayShort.${weekdayOf(date)}`) });
};

// 各頁上半部的課程資訊：編號・授課老師・每週X 時間・地點
export const courseSubtitle = (course: {
  course_no?: string;
  teacher_name_cn?: string;
  day_of_week?: Weekday;
  time_start?: string;
  time_end?: string;
  venue?: string;
}): string =>
  [
    course.course_no,
    course.teacher_name_cn && i18n.t("calendar.teacher", { name: course.teacher_name_cn }),
    course.day_of_week &&
      `${i18n.t("calendar.everyDay", { day: weekdayLabel(course.day_of_week) })}${
        course.time_start ? ` ${course.time_start}${course.time_end ? `-${course.time_end}` : ""}` : ""
      }`,
    course.venue,
  ]
    .filter(Boolean)
    .join(" ・ ");

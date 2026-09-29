// 老師端只需要顯示日期；應點名日期的判定一律以 worker（worker/src/calendar.ts）的 API 為準
import type { Weekday } from "@/types";

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

const WEEKDAYS: Weekday[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const WEEKDAY_LABEL: Record<Weekday, string> = {
  Sunday: "星期日",
  Monday: "星期一",
  Tuesday: "星期二",
  Wednesday: "星期三",
  Thursday: "星期四",
  Friday: "星期五",
  Saturday: "星期六",
};

/** 馬來西亞時間（UTC+8）的今天 */
export const todayMYT = (): string => new Date(Date.now() + MYT_OFFSET_MS).toISOString().slice(0, 10);

export const weekdayOf = (date: string): Weekday => WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];

/** 顯示用：2026-09-28 → 9/28（一） */
export const formatDate = (date: string): string => {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}（${WEEKDAY_LABEL[weekdayOf(date)].slice(-1)}）`;
};

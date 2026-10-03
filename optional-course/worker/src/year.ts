/**
 * 選修課以「日曆年」為單位管理，年份一律以學校所在的馬來西亞時間（UTC+8）判定，
 * 避免 1/1 凌晨（UTC 仍是前一年）建的課被歸到前一年。
 */

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 學年重置：只保留今年（跨年後 1/1 起，上一年的課程由每日排程自動刪除；年底前請先到行政管理站「學年封存」下載 Excel） */
export const RETAINED_YEARS = 1;

export function currentYear(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCFullYear();
}

export function oldestRetainedYear(now: number = Date.now()): number {
  return currentYear(now) - (RETAINED_YEARS - 1);
}

/** 查詢時允許的年份：保留範圍內，加上明年（年底先建好下一年的課） */
export function isQueryableYear(year: number, now: number = Date.now()): boolean {
  return Number.isInteger(year) && year >= oldestRetainedYear(now) && year <= currentYear(now) + 1;
}

/** 從 course_id（course_{year}_{ts}_{rand}）解析年份，舊格式或無法解析時回傳 null */
export function yearFromCourseId(courseId: string): number | null {
  const match = /^course_(\d{4})_/.exec(courseId);
  return match ? Number(match[1]) : null;
}

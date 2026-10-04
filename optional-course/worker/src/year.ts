/**
 * 選修課以「日曆年」為單位管理，年份一律以學校所在的馬來西亞時間（UTC+8）判定，
 * 避免 1/1 凌晨（UTC 仍是前一年）建的課被歸到前一年。
 */

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const PURGE_START_MONTH = 12;
const PURGE_START_DAY = 1;

export function currentYear(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCFullYear();
}

function currentMonth(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCMonth() + 1;
}

function currentDay(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCDate();
}

/**
 * 舊資料保留到隔年 11/30，於隔年 12/1 起開始分批刪除前一年的資料：
 * - 2027-11-30 前：保留 2026、2027
 * - 2027-12-01 起：刪除 2026，只保留 2027（查詢仍可先建 2028）
 */
export function purgeWindowOpen(now: number = Date.now()): boolean {
  return currentMonth(now) === PURGE_START_MONTH && currentDay(now) >= PURGE_START_DAY;
}

export function oldestRetainedYear(now: number = Date.now()): number {
  return purgeWindowOpen(now) ? currentYear(now) : currentYear(now) - 1;
}

/** 查詢時允許的年份：保留範圍內，加上明年（年底先建好下一年的課） */
export function isQueryableYear(year: number, now: number = Date.now()): boolean {
  return Number.isInteger(year) && year >= oldestRetainedYear(now) && year <= currentYear(now) + 1;
}

export function nextPurgeStartDate(now: number = Date.now()): string {
  const year = purgeWindowOpen(now) ? currentYear(now) + 1 : currentYear(now);
  return `${year}-12-01`;
}

export function currentPurgeTargetYear(now: number = Date.now()): number | null {
  return purgeWindowOpen(now) ? currentYear(now) - 1 : null;
}

/** 從 course_id（course_{year}_{ts}_{rand}）解析年份，舊格式或無法解析時回傳 null */
export function yearFromCourseId(courseId: string): number | null {
  const match = /^course_(\d{4})_/.exec(courseId);
  return match ? Number(match[1]) : null;
}

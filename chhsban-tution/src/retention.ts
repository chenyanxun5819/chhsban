const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;

export function currentTutionYear(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCFullYear();
}

function currentMonth(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCMonth() + 1;
}

function currentDay(now: number = Date.now()): number {
  return new Date(now + MYT_OFFSET_MS).getUTCDate();
}

/**
 * 舊資料保留到隔年 11/30，於隔年 12/1 起開始分批刪除前一年的歷史資料。
 */
export function tutionPurgeWindowOpen(now: number = Date.now()): boolean {
  return currentMonth(now) === 12 && currentDay(now) >= 1;
}

export function oldestRetainedTutionYear(now: number = Date.now()): number {
  return tutionPurgeWindowOpen(now) ? currentTutionYear(now) : currentTutionYear(now) - 1;
}

export function nextTutionPurgeStartDate(now: number = Date.now()): string {
  const year = tutionPurgeWindowOpen(now) ? currentTutionYear(now) + 1 : currentTutionYear(now);
  return `${year}-12-01`;
}

export function currentTutionPurgeTargetYear(now: number = Date.now()): number | null {
  return tutionPurgeWindowOpen(now) ? currentTutionYear(now) - 1 : null;
}

export function defaultTutionEndDate(startDate: string): string {
  return `${startDate.slice(0, 4)}-12-31`;
}

/**
 * 課程沒自行設定 end_date 時，優先使用管理員設定的最後上課日期；
 * 但若該日期已經早於這門課的 start_date（例如新學年尚未更新設定），
 * 就退回當年的 12/31，避免整門課被誤判為已結束。
 */
export function effectiveTutionEndDate(
  startDate: string,
  endDate?: string,
  lastTeachingDate?: string | null,
): string {
  if (endDate) return endDate;
  if (lastTeachingDate && lastTeachingDate >= startDate) return lastTeachingDate;
  return defaultTutionEndDate(startDate);
}

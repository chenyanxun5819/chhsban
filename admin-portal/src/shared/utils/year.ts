// 與 optional-course worker/src/year.ts 一致：以馬來西亞時間（UTC+8）判定日曆年，只保留今年（學年重置）
const MYT_OFFSET_MS = 8 * 60 * 60 * 1000;
const RETAINED_YEARS = 1;

export const currentYear = (): number => new Date(Date.now() + MYT_OFFSET_MS).getUTCFullYear();

/** 年份下拉選單：明年、今年（由新到舊） */
export const selectableYears = (): number[] => {
  const y = currentYear();
  return Array.from({ length: RETAINED_YEARS + 1 }, (_, i) => y + 1 - i);
};

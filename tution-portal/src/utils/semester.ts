/**
 * 學年切分：每年以 7/1 為界，分「上學年」(1-6月) / 「下學年」(7-12月)。
 * 場地費收據、每年最多 2 堂課的申請名額，都以此為單位分開計算。
 * 與後端 chhsban-tution/src/semester.ts 邏輯保持一致。
 */

export type SemesterHalf = "h1" | "h2";

export interface SemesterInfo {
  year: number;
  half: SemesterHalf;
  key: string; // 如 "2026-h1"
  label: string; // 如 "2026年上學年"
}

export function getSemesterInfo(date: string | number | Date): SemesterInfo {
  const d = new Date(date);
  const year = d.getFullYear();
  const half: SemesterHalf = d.getMonth() < 6 ? "h1" : "h2";
  const key = `${year}-${half}`;
  const label = `${year}年${half === "h1" ? "上" : "下"}學年`;
  return { year, half, key, label };
}

export function getCurrentSemesterInfo(): SemesterInfo {
  return getSemesterInfo(new Date());
}

/**
 * 收據上傳鈕目前該收哪一學期的收據：7/31 前只收上學年，8/1 起只收下學年。
 * 比學年切分（7/1）晚一個月才切換，讓上學年收據有緩衝期可以上傳。
 * 純粹是 Welcome 頁「顯示哪個上傳鈕」的 UI 判斷，跟 getSemesterInfo 的學年歸屬邏輯是兩回事。
 */
export function getActiveReceiptHalf(date: Date = new Date()): SemesterHalf {
  return date.getMonth() <= 6 ? "h1" : "h2"; // 0=1月...6=7月 → 上學年；7=8月...11=12月 → 下學年
}

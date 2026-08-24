/**
 * 學年切分：每年以 6/1 為界，分「上學年」(1-5月) / 「下學年」(6-12月)。
 * 場地費收據、每年最多 2 堂課的申請名額，都以此為單位分開計算。
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
  const half: SemesterHalf = d.getMonth() < 5 ? "h1" : "h2"; // 0-4月(1-5月)=上學年，5-11月(6-12月)=下學年
  const key = `${year}-${half}`;
  const label = `${year}年${half === "h1" ? "上" : "下"}學年`;
  return { year, half, key, label };
}

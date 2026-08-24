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

/**
 * CSV 解析器
 */
export function parseCSV(content: string): string[] {
  return content
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * 驗證學生 ID 格式
 */
export function isValidStudentId(id: string): boolean {
  return /^\d+$/.test(id) && id.length > 0;
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 獲取最小開課日期 (今天)
 */
export function getMinDate(): string {
  return formatDate(new Date());
}

/**
 * 常用常數
 */
export const FORMS = ["F1", "F2", "F3", "F4", "F5", "F6"];
export const SUBJECTS = [
  "數學",
  "英文",
  "中文",
  "科學",
  "歷史",
  "地理",
  "道德教育",
];
export const DAYS_OF_WEEK = [
  { label: "星期一", value: "Monday" },
  { label: "星期二", value: "Tuesday" },
  { label: "星期三", value: "Wednesday" },
  { label: "星期四", value: "Thursday" },
  { label: "星期五", value: "Friday" },
  { label: "星期六", value: "Saturday" },
  { label: "星期日", value: "Sunday" },
];

export const FIXED_TIME_START = "19:00";
export const FIXED_TIME_END = "21:00";

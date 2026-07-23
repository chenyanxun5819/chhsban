import * as XLSX from "xlsx";

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
 * XLSX 解析器
 */
export async function parseXLSX(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
        }) as any[];

        // 提取第一列作为学生学号
        const studentIds = jsonData
          .map((row) => String(row[0] || "").trim())
          .filter((id) => id.length > 0);

        resolve(studentIds);
      } catch (error) {
        reject(new Error("XLSX 解析失敗"));
      }
    };
    reader.onerror = () => reject(new Error("讀取檔案失敗"));
    reader.readAsArrayBuffer(file);
  });
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
export const FORMS = ["初一", "初二", "初三", "高一", "高二", "高三"];
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

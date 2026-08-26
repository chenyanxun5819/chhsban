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
        // 配置 XLSX 以正確處理 UTF-8 和中文字符
        const workbook = XLSX.read(data, {
          type: "array",
          cellFormula: false,
        });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];

        if (!worksheet) {
          reject(new Error("工作表為空"));
          return;
        }

        // 使用 sheet_to_json 解析數據
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        }) as any[];

        // 提取第一列作為學生學號（跳過標題行如果存在）
        const studentIds = jsonData
          .slice(1) // 跳過第一行（通常是標題）
          .map((row) => {
            if (!row || !row[0]) return "";
            const val = String(row[0]).trim();
            // 如果是數字，保持原樣；如果不是數字則過濾
            return /^\d+$/.test(val) ? val : "";
          })
          .filter((id) => id.length > 0);

        if (studentIds.length === 0) {
          // 如果跳過第一行後沒有數據，嘗試直接解析（可能沒有標題行）
          const allIds = jsonData
            .map((row) => {
              if (!row || !row[0]) return "";
              const val = String(row[0]).trim();
              return /^\d+$/.test(val) ? val : "";
            })
            .filter((id) => id.length > 0);

          if (allIds.length > 0) {
            resolve(allIds);
          } else {
            reject(new Error("沒有找到有效的學生 ID"));
          }
        } else {
          resolve(studentIds);
        }
      } catch (error) {
        console.error("XLSX 解析錯誤:", error);
        reject(
          new Error(
            "XLSX 解析失敗: " +
              (error instanceof Error ? error.message : "未知錯誤"),
          ),
        );
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
 * 格式化日期為顯示用的 DD/MM/YYYY（馬來西亞通用格式，中英文介面一致，不隨語言切換）
 */
export function formatDisplayDate(date: string | number | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
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

/**
 * 年級中文顯示值 -> 對照代碼，供 i18n 依語言顯示（不影響既有儲存值，"form" 欄位仍存中文字串）
 */
export const GRADE_CODE_MAP: Record<string, string> = {
  "初一": "F1",
  "初二": "F2",
  "初三": "F3",
  "高一": "F4",
  "高二": "F5",
  "高三": "F6",
};

/**
 * 依日期 (YYYY-MM-DD) 換算對應的星期幾 (與 DAYS_OF_WEEK.value 對應)
 */
export function getDayOfWeekFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return DAYS_OF_WEEK[(date.getUTCDay() + 6) % 7].value;
}

export const FIXED_TIME_START = "19:00";
export const FIXED_TIME_END = "21:00";

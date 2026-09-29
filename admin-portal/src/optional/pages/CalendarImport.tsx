import React, { useRef, useState } from "react";
import readXlsxFile from "read-excel-file";
import type { HolidayType, SchoolHoliday, SchoolMakeupDay, Weekday } from "@/optional/types";
import { SCHOOL_WEEKDAYS, WEEKDAY_LABEL, weekdayOf } from "@/optional/utils/calendar";

const cellText = (v: unknown): string => (v === null || v === undefined ? "" : String(v).trim());

/** Excel 日期格讀出來是 Date（UTC 午夜），文字格則接受 2026-01-01、2026/1/1 */
function toDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(cellText(v));
  if (!match) return null;
  const date = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
  const d = new Date(`${date}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === date ? date : null;
}

const TYPE_BY_LABEL: Record<string, HolidayType | "makeup"> = {
  國定假日: "public",
  国定假日: "public",
  公共假期: "public",
  学校假期: "school_break",
  學校假期: "school_break",
  活動停課: "event",
  活动停课: "event",
  補課日: "makeup",
  补课日: "makeup",
};

function toWeekday(v: unknown): Weekday | null {
  const text = cellText(v).replace("星期", "").replace("週", "").replace("周", "");
  const byChar: Record<string, Weekday> = { 一: "Monday", 二: "Tuesday", 三: "Wednesday", 四: "Thursday", 五: "Friday", 六: "Saturday" };
  if (byChar[text]) return byChar[text];
  const en = SCHOOL_WEEKDAYS.find((w) => w.toLowerCase() === text.toLowerCase());
  return en || null;
}

export interface ImportResult {
  holidays: SchoolHoliday[];
  makeupDays: SchoolMakeupDay[];
}

interface ParsedRow {
  row: number;
  name: string;
  typeLabel: string;
  start: string;
  end: string;
  weekday: string;
  error?: string;
}

/**
 * 讀取範本第一個工作表：以含「名稱」的那一列當標題列，
 * 欄位：名稱／類型／開始日期／結束日期／按星期幾上課（僅補課日需要）
 */
async function parseSheet(file: File, year: number): Promise<{ rows: ParsedRow[]; result: ImportResult }> {
  const raw = await readXlsxFile(file);
  const headerIdx = raw.findIndex((r) => r.some((c) => cellText(c) === "名稱" || cellText(c) === "名称"));
  if (headerIdx < 0) throw new Error("找不到標題列（需要有「名稱」欄），請使用範本格式");
  const header = raw[headerIdx].map(cellText);
  const col = (...names: string[]) => header.findIndex((c) => names.includes(c));
  const nameCol = col("名稱", "名称");
  const typeCol = col("類型", "类型");
  const startCol = col("開始日期", "开始日期", "日期");
  const endCol = col("結束日期", "结束日期");
  const weekdayCol = col("按星期幾上課", "按星期几上课");

  const rows: ParsedRow[] = [];
  const result: ImportResult = { holidays: [], makeupDays: [] };

  raw.slice(headerIdx + 1).forEach((r, i) => {
    const name = cellText(r[nameCol]);
    const typeLabel = typeCol >= 0 ? cellText(r[typeCol]) : "";
    const startRaw = startCol >= 0 ? r[startCol] : null;
    if (!name && !cellText(startRaw)) return; // 空白列

    const start = toDate(startRaw);
    const end = endCol >= 0 && cellText(r[endCol]) ? toDate(r[endCol]) : start;
    const type = TYPE_BY_LABEL[typeLabel];
    const weekdayRaw = weekdayCol >= 0 ? r[weekdayCol] : null;
    const row: ParsedRow = {
      row: headerIdx + i + 2,
      name,
      typeLabel,
      start: start || cellText(startRaw),
      end: end || "",
      weekday: cellText(weekdayRaw),
    };

    if (!name) row.error = "缺少名稱";
    else if (!type) row.error = "類型需為：國定假日／學校假期／活動停課／補課日";
    else if (!start || !end) row.error = "日期格式錯誤";
    else if (start > end) row.error = "開始日期晚於結束日期";
    else if (!start.startsWith(`${year}-`)) row.error = `日期不在 ${year} 年`;
    else if (type === "makeup") {
      const weekday = toWeekday(weekdayRaw) || (weekdayOf(start) !== "Sunday" ? weekdayOf(start) : null);
      if (weekdayOf(start) === "Sunday") row.error = "補課日不能是星期日";
      else if (!weekday) row.error = "補課日需填「按星期幾上課」";
      else {
        row.weekday = WEEKDAY_LABEL[weekday];
        result.makeupDays.push({ date: start, follows_weekday: weekday, note: name });
      }
    } else {
      result.holidays.push({ holiday_id: "", start_date: start, end_date: end, name, type });
    }
    rows.push(row);
  });

  return { rows, result };
}

interface Props {
  year: number;
  disabled: boolean;
  onImport: (result: ImportResult) => void;
}

const CalendarImport: React.FC<Props> = ({ year, disabled, onImport }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ rows: ParsedRow[]; result: ImportResult } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPreview(null);
    try {
      const parsed = await parseSheet(file, year);
      if (parsed.rows.length === 0) {
        setError("檔案裡沒有讀到任何資料");
        return;
      }
      setPreview(parsed);
    } catch (err: any) {
      setError(err.message || "讀取檔案失敗，請確認是 .xlsx 格式");
    }
  };

  const okCount = preview ? preview.result.holidays.length + preview.result.makeupDays.length : 0;

  return (
    <div className="card">
      <h3>批量匯入假期（Excel）</h3>
      <p style={{ margin: "4px 0 12px", color: "#666" }}>
        國定假日各州不同、伊斯蘭節日每年日期也會變動，建議每年初依學校公布的行事曆整批匯入。
        匯入後會加到下方的編輯內容，確認無誤再按「儲存行事曆」。
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a className="btn" href="/calendar-template.xlsx" download="學校行事曆範本.xlsx">
          下載範本
        </a>
        <input ref={fileRef} type="file" accept=".xlsx" onChange={handleFile} disabled={disabled} />
      </div>
      {error && <p className="error-text">{error}</p>}

      {preview && (
        <div style={{ marginTop: 12 }}>
          <p>
            共 {preview.rows.length} 筆，可匯入 {okCount} 筆
            {preview.rows.some((r) => r.error) && <span style={{ color: "#c62828" }}>；有錯誤的資料（紅字）不會匯入</span>}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>列</th>
                  <th>名稱</th>
                  <th>類型</th>
                  <th>開始</th>
                  <th>結束</th>
                  <th>按星期幾上課</th>
                  <th>狀態</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.row} style={r.error ? { color: "#c62828" } : undefined}>
                    <td>{r.row}</td>
                    <td>{r.name}</td>
                    <td>{r.typeLabel}</td>
                    <td>{r.start}</td>
                    <td>{r.end}</td>
                    <td>{r.weekday}</td>
                    <td>{r.error || "可匯入"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              className="btn btn--primary"
              disabled={okCount === 0}
              onClick={() => {
                onImport(preview.result);
                reset();
              }}
            >
              加入 {okCount} 筆到行事曆
            </button>
            <button className="btn" onClick={reset}>
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarImport;

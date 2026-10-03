import * as XLSX from "xlsx";

/**
 * 學年封存 Excel：補習班、選修課共用的「一門課一個工作表」版面，仿點名總覽（學生 × 日期矩陣）。
 *
 *   課程資料（課堂名稱、老師、上課時間、教室）
 *   表頭：序、學號、姓名、班級、加入／退出日期、各上課日、出席統計
 *   在讀學生
 *   已退出學生（另起一段，放在下方）
 *   停課／調課紀錄、圖例
 */

export interface ArchiveStudent {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  class_name: string;
  enrollment_date: string;
  withdrawal_date: string | null;
  withdrawal_reason: string | null;
  is_active: boolean;
}

/** 一格的內容：代碼（P/A/L/E/·/-）與滑鼠移上去看的註解（請假理由等） */
export interface ArchiveCell {
  code: string;
  note?: string;
}

export interface ArchiveStatus {
  code: string;
  label: string;
}

export interface ArchiveCourse {
  /** 工作表名稱的基礎（會自動截短、去除 Excel 不允許的字元、避免重複） */
  sheetName: string;
  title: string;
  teacher: string;
  time: string;
  venue: string;
  students: ArchiveStudent[];
  /** 上課日（YYYY-MM-DD，由舊到新） */
  dates: string[];
  cell: (student: ArchiveStudent, date: string) => ArchiveCell;
  /** 停課／調課等文字紀錄，列在表格下方 */
  scheduleLog: string[];
}

export const UNMARKED = "·";
export const NOT_ON_ROSTER = "-";

const INFO_COLS = ["序", "學號", "中文姓名", "英文姓名", "班級", "加入日期", "退出日期"];

/** 日期欄表頭：同一年只顯示月/日，跨年的課程才帶年份 */
function dateHeaders(dates: string[]): string[] {
  const multiYear = new Set(dates.map((d) => d.slice(0, 4))).size > 1;
  return dates.map((d) => {
    const [y, m, day] = d.split("-");
    return multiYear ? `${y}/${m}/${day}` : `${m}/${day}`;
  });
}

export function sortStudents(list: ArchiveStudent[]): ArchiveStudent[] {
  return [...list].sort(
    (a, b) =>
      (a.class_name || "").localeCompare(b.class_name || "", "zh-Hant", { numeric: true }) ||
      a.student_no.localeCompare(b.student_no, undefined, { numeric: true }),
  );
}

function buildCourseSheet(course: ArchiveCourse, statuses: ArchiveStatus[]): XLSX.WorkSheet {
  const active = sortStudents(course.students.filter((s) => s.is_active));
  const withdrawn = sortStudents(course.students.filter((s) => !s.is_active));
  const statHeaders = statuses.map((s) => `${s.label}(${s.code})`);
  const header = [...INFO_COLS, ...dateHeaders(course.dates), ...statHeaders, "備註"];
  const width = header.length;

  const aoa: (string | number)[][] = [
    [`課堂名稱：${course.title}`],
    [`老師：${course.teacher || "-"}`],
    [`上課時間：${course.time || "-"}`],
    [`教室：${course.venue || "-"}`],
    [],
  ];
  // 有註解的格子：[列, 欄, 文字]
  const notes: Array<[number, number, string]> = [];

  const pushStudentRows = (list: ArchiveStudent[]) => {
    list.forEach((student, index) => {
      const counts = new Map<string, number>();
      const cells = course.dates.map((date, i) => {
        const cell = course.cell(student, date);
        counts.set(cell.code, (counts.get(cell.code) || 0) + 1);
        if (cell.note) notes.push([aoa.length, INFO_COLS.length + i, cell.note]);
        return cell.code;
      });
      aoa.push([
        index + 1,
        student.student_no,
        student.name_cn,
        student.name_en,
        student.class_name,
        student.enrollment_date || "",
        student.withdrawal_date || "",
        ...cells,
        ...statuses.map((s) => counts.get(s.code) || 0),
        student.withdrawal_reason ? `退出原因：${student.withdrawal_reason}` : "",
      ]);
    });
  };

  aoa.push(header);
  if (active.length === 0) aoa.push(["（沒有在讀學生）"]);
  pushStudentRows(active);

  if (withdrawn.length > 0) {
    aoa.push([]);
    aoa.push([`已退出學生（${withdrawn.length} 人）`]);
    aoa.push(header);
    pushStudentRows(withdrawn);
  }

  aoa.push([]);
  aoa.push([
    "圖例：" +
      [...statuses.map((s) => `${s.code} ${s.label}`), `${UNMARKED} 未點名`, `${NOT_ON_ROSTER} 未加入／已退出`].join("　"),
  ]);
  if (course.scheduleLog.length > 0) {
    aoa.push([]);
    aoa.push(["停課／調課紀錄"]);
    course.scheduleLog.forEach((line) => aoa.push([line]));
  }

  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  for (const [r, c, text] of notes) {
    const ref = XLSX.utils.encode_cell({ r, c });
    const target = sheet[ref];
    if (!target) continue;
    target.c = [{ a: "", t: text }];
    target.c.hidden = true;
  }
  sheet["!cols"] = [
    { wch: 4 },
    { wch: 8 },
    { wch: 10 },
    { wch: 24 },
    { wch: 9 },
    { wch: 11 },
    { wch: 11 },
    ...course.dates.map(() => ({ wch: 6 })),
    ...statuses.map(() => ({ wch: 8 })),
    { wch: 30 },
  ];
  // 課程資料四列橫跨整個表格寬度，避免長字串被下一格擋住
  sheet["!merges"] = [0, 1, 2, 3].map((r) => ({ s: { r, c: 0 }, e: { r, c: Math.max(width - 1, 6) } }));
  return sheet;
}

/** Excel 工作表名稱：最多 31 字、不可有 : \ / ? * [ ]、不可重複 */
function uniqueSheetName(base: string, used: Set<string>): string {
  const clean = base.replace(/[:\\/?*[\]]/g, " ").trim() || "課程";
  let name = clean.slice(0, 31);
  for (let i = 2; used.has(name); i++) {
    const suffix = `(${i})`;
    name = `${clean.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name);
  return name;
}

/** 整份封存檔：第一個工作表是課程一覽，之後一門課一個工作表 */
export function buildArchiveWorkbook(courses: ArchiveCourse[], statuses: ArchiveStatus[]): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  const used = new Set<string>(["課程一覽"]);
  const named = courses.map((course) => ({ course, name: uniqueSheetName(course.sheetName, used) }));

  const index = XLSX.utils.aoa_to_sheet([
    ["工作表", "課堂名稱", "老師", "上課時間", "教室", "在讀", "已退出", "上課次數"],
    ...named.map(({ course, name }) => [
      name,
      course.title,
      course.teacher,
      course.time,
      course.venue,
      course.students.filter((s) => s.is_active).length,
      course.students.filter((s) => !s.is_active).length,
      course.dates.length,
    ]),
  ]);
  index["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 36 }, { wch: 14 }, { wch: 6 }, { wch: 7 }, { wch: 9 }];
  XLSX.utils.book_append_sheet(workbook, index, "課程一覽");

  for (const { course, name } of named) {
    XLSX.utils.book_append_sheet(workbook, buildCourseSheet(course, statuses), name);
  }
  return workbook;
}

/** 依序執行非同步工作，同時最多 limit 個（避免一次對 Worker 送出上百個請求） */
export async function mapWithLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

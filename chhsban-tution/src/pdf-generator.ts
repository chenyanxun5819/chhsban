/**
 * PDF 生成服務
 * 將申請資料套印到 Template_tution.pdf 上，供管理員在「審核中」階段
 * 列印紙本申請表，交付上級簽核（簽核通過後才會在系統按「批准」）。
 *
 * 座標是直接量測 Template_tution.pdf 各儲存格位置得出（見 extract_pdf_coordinates.py
 * 的量測結果），不是估計值。
 *
 * 中文字型：pdf-lib 內建字型不支援中文，套印中文字需要額外內嵌字型（見
 * scripts/build-font-subset.py 的說明）。字型子集存在 ASSETS_KV，執行時讀取，
 * 不隨程式碼一起打包部署（完整中文字型太大，會撐爆 Worker 程式大小限制）。
 * 注意：embedFont 必須帶 { subset: false }——已測試確認 fontkit 對這種
 * CID-keyed CFF 字型的執行時子集化會靜默漏字（中文完全消失）。
 */

import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TEMPLATE_TUTION_PDF_BASE64 } from "./template-tution-base64";

const FONT_KV_KEY = "noto-sans-tc-subset";
const PAGE_HEIGHT = 792;

interface RosterEntryForPdf {
  student_no?: string;
  student_id?: string;
  name_cn?: string;
  name_en?: string;
  real_class_name?: string;
  input_class_name?: string;
  gender_boarding?: string;
}

export interface TutionClassForPdf {
  class_id: string;
  application_no?: string;
  teacher_id?: string;
  teacher_name_cn?: string;
  form?: string;
  subject?: string;
  day_of_week?: string;
  start_date?: string;
  fees?: number | string;
  venue?: string;
  initial_roster?: RosterEntryForPdf[];
}

interface Cell {
  left: number;
  top: number; // 距頁面頂端的距離
  bottom: number;
}

// 申請資料表格各填寫欄位的儲存格座標（單位 pt，量測自 Template_tution.pdf 第 1 頁）
const FIELD_CELLS: Record<string, Cell> = {
  teacher_name_cn: { left: 136, top: 295.7, bottom: 322.6 },
  form: { left: 313, top: 295.7, bottom: 322.6 },
  subject: { left: 482, top: 295.7, bottom: 322.6 },
  day_of_week: { left: 136, top: 323.1, bottom: 350.0 },
  start_date: { left: 482, top: 323.1, bottom: 350.0 },
  fees: { left: 136, top: 350.4, bottom: 377.4 },
  venue: { left: 401, top: 350.4, bottom: 377.4 },
};

// 學生來源統計（附名單）區塊：整個空白框
const ROSTER_BOX = { left: 32, right: 580, top: 400.6, bottom: 644.0 };

function cellBaselineY(cell: Cell, fontSize: number): number {
  const cellHeight = cell.bottom - cell.top;
  const baselineFromTop = cell.top + (cellHeight + fontSize * 0.7) / 2;
  return PAGE_HEIGHT - baselineFromTop;
}

async function loadFontBytes(assetsKv: KVNamespace): Promise<ArrayBuffer> {
  const bytes = await assetsKv.get(FONT_KV_KEY, "arrayBuffer");
  if (!bytes) {
    throw new Error(
      `找不到中文字型（ASSETS_KV key "${FONT_KV_KEY}"），請先執行 scripts/build-font-subset.py 並上傳到 KV`,
    );
  }
  return bytes;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const BOARDING_CODES = ["L", "LH", "P", "PH", "-"];

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

function drawRoster(
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  roster: RosterEntryForPdf[],
) {
  const headerFontSize = 8;
  const rowFontSize = 7.5;
  const rowHeight = 12.5;
  const gap = 8;
  const colWidth = (ROSTER_BOX.right - ROSTER_BOX.left - gap) / 2;

  // 各欄位相對於該欄位群組起點（x0）的偏移量
  const FIELD_OFFSETS = { no: 0, sid: 19, nameCn: 48, nameEn: 88, className: 168, boarding: 198 };
  const columns = [
    { x0: ROSTER_BOX.left },
    { x0: ROSTER_BOX.left + colWidth + gap },
  ];

  const gray = rgb(0.35, 0.35, 0.35);
  const black = rgb(0, 0, 0);

  // 最上層：走/宿各代碼統計數值及總數
  const statsTop = ROSTER_BOX.top + 4;
  const statsY = PAGE_HEIGHT - (statsTop + headerFontSize * 0.8);
  const counts: Record<string, number> = {};
  for (const code of BOARDING_CODES) counts[code] = 0;
  for (const student of roster) {
    const code = (student.gender_boarding || "").trim();
    if (code in counts) counts[code] += 1;
  }
  const statsText =
    BOARDING_CODES.map((code) => `${code} ${counts[code]}`).join("　") + `　｜　總人數 ${roster.length}`;
  page.drawText(statsText, { x: ROSTER_BOX.left, y: statsY, size: headerFontSize, font, color: black });

  // 欄位標題往下移 2 行，讓出上面的統計列空間
  const headerTop = statsTop + 2 * rowHeight;
  const headerY = PAGE_HEIGHT - (headerTop + headerFontSize * 0.8);

  for (const col of columns) {
    page.drawText("編號", { x: col.x0 + FIELD_OFFSETS.no, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("學號", { x: col.x0 + FIELD_OFFSETS.sid, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("中文姓名", { x: col.x0 + FIELD_OFFSETS.nameCn, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("英文姓名", { x: col.x0 + FIELD_OFFSETS.nameEn, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("班級", { x: col.x0 + FIELD_OFFSETS.className, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("走/宿", { x: col.x0 + FIELD_OFFSETS.boarding, y: headerY, size: headerFontSize, font, color: gray });
  }

  const rowsPerCol = Math.ceil(roster.length / 2);
  const maxRowsPerCol = Math.floor((ROSTER_BOX.bottom - headerTop - 16) / rowHeight);

  roster.forEach((student, index) => {
    const colIndex = Math.floor(index / rowsPerCol);
    const rowIndex = index % rowsPerCol;
    if (colIndex >= columns.length || rowIndex >= maxRowsPerCol) return; // 超出版面容量，不再繪製

    const col = columns[colIndex];
    const rowTop = headerTop + 16 + rowIndex * rowHeight;
    const y = PAGE_HEIGHT - (rowTop + rowFontSize * 0.8);
    const className = student.real_class_name || student.input_class_name || "";

    page.drawText(String(index + 1), { x: col.x0 + FIELD_OFFSETS.no, y, size: rowFontSize, font, color: black });
    page.drawText(student.student_no || student.student_id || "", {
      x: col.x0 + FIELD_OFFSETS.sid,
      y,
      size: rowFontSize,
      font,
      color: black,
    });
    page.drawText(student.name_cn || "", { x: col.x0 + FIELD_OFFSETS.nameCn, y, size: rowFontSize, font, color: black });
    page.drawText(truncate(student.name_en || "", 15), {
      x: col.x0 + FIELD_OFFSETS.nameEn,
      y,
      size: rowFontSize,
      font,
      color: black,
    });
    page.drawText(className, { x: col.x0 + FIELD_OFFSETS.className, y, size: rowFontSize, font, color: black });
    page.drawText(student.gender_boarding || "", {
      x: col.x0 + FIELD_OFFSETS.boarding,
      y,
      size: rowFontSize,
      font,
      color: black,
    });
  });
}

/**
 * 套印申請表 PDF
 */
export async function fillTutionPDF(
  tutionClass: TutionClassForPdf,
  assetsKv: KVNamespace,
): Promise<Uint8Array> {
  const templateBytes = base64ToBytes(TEMPLATE_TUTION_PDF_BASE64);
  const fontBytes = await loadFontBytes(assetsKv);

  const pdfDoc = await PDFDocument.load(templateBytes);
  pdfDoc.registerFontkit(fontkit);
  // subset: false — fontkit 對這份 CID-keyed CFF 字型的執行時子集化會漏字，見檔案頂部說明
  const font = await pdfDoc.embedFont(fontBytes, { subset: false });

  const page = pdfDoc.getPage(0);
  const fontSize = 10;
  const black = rgb(0, 0, 0);

  const values: Record<string, string> = {
    teacher_name_cn: tutionClass.teacher_id
      ? `${tutionClass.teacher_name_cn || ""}（${tutionClass.teacher_id}）`
      : tutionClass.teacher_name_cn || "",
    form: tutionClass.form || "",
    subject: tutionClass.subject || "",
    day_of_week: tutionClass.day_of_week || "",
    start_date: tutionClass.start_date || "",
    fees: tutionClass.fees !== undefined && tutionClass.fees !== "" ? `RM ${tutionClass.fees}` : "",
    venue: tutionClass.venue || "",
  };

  for (const [key, value] of Object.entries(values)) {
    if (!value) continue;
    const cell = FIELD_CELLS[key];
    page.drawText(value, {
      x: cell.left,
      y: cellBaselineY(cell, fontSize),
      size: fontSize,
      font,
      color: black,
    });
  }

  drawRoster(page, font, tutionClass.initial_roster || []);

  return pdfDoc.save();
}

// 與 index.ts 的 getCorsHeaders() 保持一致——這支 Response 是自己組的，
// 不會經過 jsonResponse()，必須自己補上 CORS 標頭，否則瀏覽器會擋下這個
// 跨網域回應（即使伺服器端是 200 成功，前端也讀不到內容）。
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
};

/**
 * 生成 PDF 並回傳為下載用的 Response
 */
export async function generatePDFResponse(
  tutionClass: TutionClassForPdf,
  assetsKv: KVNamespace,
): Promise<Response> {
  try {
    const pdfBytes = await fillTutionPDF(tutionClass, assetsKv);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="application_${tutionClass.application_no || tutionClass.class_id}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (error) {
    console.error("Error generating PDF response:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate PDF",
        message: String(error),
      }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
}

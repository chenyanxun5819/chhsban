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
}

export interface TutionClassForPdf {
  class_id: string;
  application_no?: string;
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

function drawRoster(
  page: import("pdf-lib").PDFPage,
  font: import("pdf-lib").PDFFont,
  roster: RosterEntryForPdf[],
) {
  const headerFontSize = 8.5;
  const rowFontSize = 8;
  const rowHeight = 12.5;
  const gap = 10;
  const colWidth = (ROSTER_BOX.right - ROSTER_BOX.left - gap) / 2;

  const columns = [
    { x0: ROSTER_BOX.left, no: 0, sid: 20, nameCn: 65, nameEn: 140 },
    { x0: ROSTER_BOX.left + colWidth + gap, no: 0, sid: 20, nameCn: 65, nameEn: 140 },
  ];

  const headerTop = ROSTER_BOX.top + 4;
  const headerY = PAGE_HEIGHT - (headerTop + headerFontSize * 0.8);
  const gray = rgb(0.35, 0.35, 0.35);

  for (const col of columns) {
    page.drawText("編號", { x: col.x0 + col.no, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("學號", { x: col.x0 + col.sid, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("中文姓名", { x: col.x0 + col.nameCn, y: headerY, size: headerFontSize, font, color: gray });
    page.drawText("英文姓名", { x: col.x0 + col.nameEn, y: headerY, size: headerFontSize, font, color: gray });
  }

  const rowsPerCol = Math.ceil(roster.length / 2);
  const maxRowsPerCol = Math.floor((ROSTER_BOX.bottom - headerTop - 16) / rowHeight);
  const black = rgb(0, 0, 0);

  roster.forEach((student, index) => {
    const colIndex = Math.floor(index / rowsPerCol);
    const rowIndex = index % rowsPerCol;
    if (colIndex >= columns.length || rowIndex >= maxRowsPerCol) return; // 超出版面容量，不再繪製

    const col = columns[colIndex];
    const rowTop = headerTop + 16 + rowIndex * rowHeight;
    const y = PAGE_HEIGHT - (rowTop + rowFontSize * 0.8);

    page.drawText(String(index + 1), { x: col.x0 + col.no, y, size: rowFontSize, font, color: black });
    page.drawText(student.student_no || student.student_id || "", {
      x: col.x0 + col.sid,
      y,
      size: rowFontSize,
      font,
      color: black,
    });
    page.drawText(student.name_cn || "", { x: col.x0 + col.nameCn, y, size: rowFontSize, font, color: black });
    page.drawText(student.name_en || "", { x: col.x0 + col.nameEn, y, size: rowFontSize, font, color: black });
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
    teacher_name_cn: tutionClass.teacher_name_cn || "",
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
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

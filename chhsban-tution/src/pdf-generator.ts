/**
 * PDF 生成服務
 * 使用 pdf-lib 填充 Template_tution.pdf
 */

import { PDFDocument, rgb } from "pdf-lib";
import { TutionClass } from "@chhsban/kv-utils";

// PDF 座標映射配置
const PDF_CONFIG = {
  template_version: "1.0",
  template_name: "Template_tution",
  page_dimensions: { width: 612, height: 792 },
  fields: [
    {
      field_id: "teacher_name_cn",
      x: 50,
      y: 620,
      width: 160,
      height: 20,
      source_field: "teacher_name_cn",
    },
    {
      field_id: "form",
      x: 250,
      y: 620,
      width: 100,
      height: 20,
      source_field: "form",
    },
    {
      field_id: "subject",
      x: 400,
      y: 620,
      width: 150,
      height: 20,
      source_field: "subject",
    },
    {
      field_id: "day_of_week",
      x: 50,
      y: 590,
      width: 160,
      height: 20,
      source_field: "day_of_week",
    },
    {
      field_id: "start_date",
      x: 400,
      y: 590,
      width: 150,
      height: 20,
      source_field: "start_date",
    },
    {
      field_id: "fees",
      x: 50,
      y: 560,
      width: 160,
      height: 20,
      source_field: "fees",
    },
    {
      field_id: "venue",
      x: 250,
      y: 560,
      width: 300,
      height: 20,
      source_field: "venue",
    },
  ],
};

/**
 * 從 URL 讀取 PDF 模板
 */
async function loadPDFTemplate(): Promise<ArrayBuffer> {
  // 在實際部署中，應該從 Cloudflare R2 或其他存儲讀取
  // 此處為演示代碼
  try {
    const response = await fetch("https://your-domain.com/Template_tution.pdf");
    if (!response.ok) throw new Error("Failed to fetch PDF template");
    return response.arrayBuffer();
  } catch (error) {
    console.error("Error loading PDF template:", error);
    throw new Error("PDF template not available");
  }
}

/**
 * 填充 PDF 欄位
 */
export async function fillTutionPDF(tutionClass: TutionClass): Promise<Uint8Array> {
  try {
    // 1. 讀取 PDF 模板
    const pdfBytes = await loadPDFTemplate();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const page = pdfDoc.getPage(0);
    const pageHeight = page.getHeight();

    // 2. 填充每個欄位
    for (const field of PDF_CONFIG.fields) {
      let value: string;

      switch (field.source_field) {
        case "teacher_name_cn":
          value = tutionClass.teacher_name_cn || "";
          break;
        case "form":
          value = tutionClass.form || "";
          break;
        case "subject":
          value = tutionClass.subject || "";
          break;
        case "day_of_week":
          value = tutionClass.day_of_week || "";
          break;
        case "start_date":
          value = tutionClass.start_date || "";
          break;
        case "fees":
          value = String(tutionClass.fees || "");
          break;
        case "venue":
          value = tutionClass.venue || "";
          break;
        default:
          value = "";
      }

      // 坐標轉換：PDF 座標系 → pdf-lib 座標系
      // pdf-lib 原點在左下，但 Y 軸向上
      const yPdfLib = pageHeight - field.y;

      // 繪製文本
      page.drawText(value, {
        x: field.x,
        y: yPdfLib - 15, // 向下調整以適應行高
        size: 10,
        color: rgb(0, 0, 0),
        maxWidth: field.width,
      });
    }

    // 3. 添加時間戳標記（可選）
    page.drawText(`Generated: ${new Date().toLocaleString()}`, {
      x: 50,
      y: 50,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });

    // 4. 保存 PDF
    const pdfBytes_output = await pdfDoc.save();
    return pdfBytes_output;
  } catch (error) {
    console.error("Error filling PDF:", error);
    throw error;
  }
}

/**
 * 生成 PDF 並返回為下載
 */
export async function generatePDFResponse(
  tutionClass: TutionClass
): Promise<Response> {
  try {
    const pdfBytes = await fillTutionPDF(tutionClass);

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="tution_${tutionClass.class_id}.pdf"`,
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
      }
    );
  }
}

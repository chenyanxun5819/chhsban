/**
 * 用 Google Cloud Vision API（OCR）讀出收據照片上的 Receipt No.、RECEIVED FROM（工號+姓名）、
 * Description（收費項目說明）。收據編號辨識準確度夠高，不再開放申請人手動輸入/修改——
 * 上傳端會用同一支函式重新對圖片跑一次 OCR，把結果直接寫入資料，不信任前端回傳的任何文字。
 *
 * 免費額度：TEXT_DETECTION 每月 1000 次，本校一學期收據量遠低於此。
 */

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

// Receipt No. 格式：大寫 R + 4 位數 + "-" + 4 位數（如 R2607-0224）
function extractReceiptNo(rawText: string): string | null {
  const match = rawText.match(/\bR\d{4}-\d{4}\b/i);
  return match ? match[0].toUpperCase() : null;
}

// 工號格式：S 或 T + 3 位數字（如 S309）。只在「RECEIVED FROM」後面一小段範圍內找，
// 避免抓到收據下方的 Cashier ID 等其他同樣是 S/T+3碼格式的欄位。
function extractTeacherNo(rawText: string): string | null {
  const idx = rawText.search(/RECEIVED\s*FROM/i);
  if (idx === -1) return null;
  const window = rawText.slice(idx, idx + 120);
  const match = window.match(/\b([ST]\d{3})\b/i);
  return match ? match[1].toUpperCase() : null;
}

// 「RECEIVED FROM」後面完整的一段文字（工號+姓名），供管理員審核時參考
function extractReceivedFrom(rawText: string): string | null {
  const match = rawText.match(/RECEIVED\s*FROM\s*:?\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

// Description 表頭下方的收費項目說明（如「2026年7-10月校內補習維持費-初三-英文」）
function extractDescription(rawText: string): string | null {
  const idx = rawText.search(/Description/i);
  if (idx === -1) return null;
  const after = rawText.slice(idx + "Description".length);
  const lines = after.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^amount$/i.test(line)) continue; // 跳過表頭另一欄「Amount」本身
    return line;
  }
  return null;
}

export interface ReceiptOcrResult {
  raw_text: string;
  extracted_receipt_no: string | null;
  extracted_teacher_no: string | null;
  extracted_received_from: string | null;
  extracted_description: string | null;
}

export async function ocrReceiptImage(
  imageBytes: ArrayBuffer,
  apiKey: string,
): Promise<ReceiptOcrResult> {
  const base64 = arrayBufferToBase64(imageBytes);

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64 },
            features: [{ type: "TEXT_DETECTION" }],
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Google Vision API error (${response.status}): ${errText}`);
  }

  const data = (await response.json()) as any;
  const visionError = data?.responses?.[0]?.error;
  if (visionError) {
    throw new Error(`Google Vision API error: ${visionError.message || JSON.stringify(visionError)}`);
  }

  const rawText: string = data?.responses?.[0]?.fullTextAnnotation?.text || "";

  return {
    raw_text: rawText,
    extracted_receipt_no: rawText ? extractReceiptNo(rawText) : null,
    extracted_teacher_no: rawText ? extractTeacherNo(rawText) : null,
    extracted_received_from: rawText ? extractReceivedFrom(rawText) : null,
    extracted_description: rawText ? extractDescription(rawText) : null,
  };
}

/**
 * 用 Google Cloud Vision API（OCR）讀出收據照片上的「Receipt No.」跟「RECEIVED FROM」
 * 後面的申請人工號，純粹輔助辨識用——排版亂、辨識錯了也不影響資料正確性，欄位一律讓
 * 申請人可手動修正，最終管理員審核時再次把關。
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

export interface ReceiptOcrResult {
  raw_text: string;
  extracted_receipt_no: string | null;
  extracted_teacher_no: string | null;
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
  };
}

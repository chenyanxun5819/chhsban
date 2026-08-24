/**
 * 用 Google Cloud Vision API（OCR）讀出收據照片上的「Receipt No.」欄位，
 * 純粹輔助辨識用——最終編號是否正確一律由申請人上傳前確認、管理員審核時再次把關，
 * 這裡辨識錯了也不影響資料正確性，只是少了自動預填。
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

// 從 OCR 全文中找「Receipt No.」後面的號碼，容忍中英文冒號、空白、OCR 斷行造成的雜訊
function extractReceiptNo(rawText: string): string | null {
  const match = rawText.match(/Receipt\s*No\.?\s*[:.：]?\s*([A-Za-z0-9][A-Za-z0-9-]{3,20})/i);
  return match ? match[1].toUpperCase() : null;
}

export interface ReceiptOcrResult {
  raw_text: string;
  extracted_receipt_no: string | null;
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
  };
}

/**
 * 場地維持費收據上傳／審核
 * 申請人每學年（上/下學年，以 6/1 為界）需為已批准的課程繳付場地費，
 * 在該課程列上傳收據照片後由管理員審核「收據正確／不正確」，通過後收據編號等
 * 已記錄在該課程 tution-class 的 receipt_h1 / receipt_h2 欄位中。
 *
 * 收據編號、RECEIVED FROM、Description 一律由後端對上傳的圖片跑 Google Vision OCR
 * 直接取得（見 google-vision.ts），不接受前端傳來的文字——避免被竄改，且不再開放
 * 申請人手動輸入/修改收據編號。若 OCR 讀不到收據編號則直接拒絕上傳。
 * 上傳後即進入「審核中」狀態，不可再更改（要改必須先被管理員退回）。
 */
import type { SemesterHalf } from "./semester";

export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface ReceiptRecord {
  key?: string;
  filename?: string;
  content_type?: string;
  receipt_no?: string;
  received_from?: string; // OCR 讀到的「RECEIVED FROM」內容（工號+姓名），僅供管理員審核參考
  description?: string; // OCR 讀到的收費項目說明，僅供管理員審核參考
  status?: ReceiptStatus;
  uploaded_at?: number;
  uploaded_by?: string;
  reviewed_at?: number;
  reviewed_by?: string;
  rejection_reason?: string;
}

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function isAllowedReceiptContentType(contentType: string): boolean {
  return contentType in ALLOWED_CONTENT_TYPES;
}

export function buildReceiptKey(
  classId: string,
  half: SemesterHalf,
  year: number,
  contentType: string,
): string {
  const ext = ALLOWED_CONTENT_TYPES[contentType] || "bin";
  return `receipts/${year}/${classId}-${half}.${ext}`;
}

export function isSemesterHalf(value: unknown): value is SemesterHalf {
  return value === "h1" || value === "h2";
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Filename",
};

export async function getReceiptResponse(
  bucket: R2Bucket,
  key: string,
  filename?: string,
): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: "Receipt not found" }), {
      status: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(object.body, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename || key.split("/").pop()}"`,
    },
  });
}

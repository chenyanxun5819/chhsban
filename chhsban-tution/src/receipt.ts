/**
 * 場地維持費收據上傳／審核
 * 申請人每學年（上/下學年，以 6/1 為界）需為已批准的課程繳付場地費，
 * 上傳收據照片後由管理員審核「收據正確／不正確」，通過後將收據編號記錄在
 * 該課程 tution-class 的 receipt_h1 / receipt_h2 欄位中。
 *
 * 一張收據可能同時涵蓋申請人當學期的 1~2 堂課，因此上傳時由申請人勾選
 * 要套用的課程，各自呼叫一次上傳，各自存一份檔案在 R2（用量小，不做去重複雜化）。
 * 上傳後即進入「審核中」狀態，不可再更改（要改必須先被管理員退回）。
 */
import type { SemesterHalf } from "./semester";

export type ReceiptStatus = "pending" | "approved" | "rejected";

export interface ReceiptRecord {
  key?: string;
  filename?: string;
  content_type?: string;
  receipt_no?: string;
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
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Filename, X-Receipt-No",
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

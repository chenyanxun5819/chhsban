/**
 * 簽核紙本申請表掃描檔存檔備份
 * 管理員把紙本申請表列印、拿去給上級簽核後，掃描/拍照上傳存進 R2，
 * 跟該筆課程記錄關聯起來，方便日後查閱、備份。
 *
 * 不做另外的年份/申請人索引頁——現有的申請/課程列表本來就能用教師姓名、
 * 日期搜尋篩選，這裡的 R2 物件路徑（signed-forms/{year}/{class_id}.{ext}）
 * 只是內部整理用，方便直接去 R2 面板照年份翻找，不影響前端功能。
 */

export interface SignedFormMeta {
  signed_form_key?: string;
  signed_form_filename?: string;
  signed_form_content_type?: string;
  signed_form_uploaded_at?: number;
  signed_form_uploaded_by?: string;
}

const ALLOWED_CONTENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function isAllowedContentType(contentType: string): boolean {
  return contentType in ALLOWED_CONTENT_TYPES;
}

export function buildSignedFormKey(classId: string, createdAt: number, contentType: string): string {
  const year = new Date(createdAt).getFullYear();
  const ext = ALLOWED_CONTENT_TYPES[contentType] || "bin";
  return `signed-forms/${year}/${classId}.${ext}`;
}

// 與 index.ts 的 getCorsHeaders() 保持一致——這支 Response 是自己組的，
// 不會經過 jsonResponse()，必須自己補上 CORS 標頭，否則瀏覽器會擋下這個
// 跨網域回應。
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Filename",
};

export async function getSignedFormResponse(
  bucket: R2Bucket,
  key: string,
  filename?: string,
): Promise<Response> {
  const object = await bucket.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: "Signed form not found" }), {
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

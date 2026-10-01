/**
 * 驗證 Google 登入（Google Identity Services）回傳的 ID token。
 *
 * 前端用 Google 按鈕登入後拿到的 credential 是一個 RS256 簽章的 JWT。後端必須自己驗證簽章與內容，
 * 不能只解開 payload 取 email——那樣任何人都能偽造一個寫著別人 email 的 token。
 *
 * 檢查項目：簽章（Google 公鑰）、iss（Google）、aud（我們自己的 OAuth 用戶端 ID）、exp（未過期）、
 * email_verified（Google 已驗證此 email）。
 */

const GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];
// 容許伺服器與 Google 之間的時鐘誤差
const CLOCK_SKEW_SECONDS = 60;

export interface GoogleIdentity {
  email: string; // 小寫
  sub: string; // Google 帳號的固定 ID
  name?: string;
}

interface GoogleJwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

// Google 公鑰快取（同一個 Worker isolate 內共用），依回應的 Cache-Control max-age 過期
let certsCache: { keys: GoogleJwk[]; expiresAt: number } | null = null;

async function getGoogleKeys(forceRefresh = false): Promise<GoogleJwk[]> {
  if (!forceRefresh && certsCache && certsCache.expiresAt > Date.now()) {
    return certsCache.keys;
  }
  const response = await fetch(GOOGLE_CERTS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google certs: ${response.status}`);
  }
  const body = (await response.json()) as { keys: GoogleJwk[] };
  const maxAge = Number(/max-age=(\d+)/.exec(response.headers.get("Cache-Control") || "")?.[1] || 3600);
  certsCache = { keys: body.keys, expiresAt: Date.now() + maxAge * 1000 };
  return body.keys;
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function decodeJsonPart(part: string): any {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part)));
}

/**
 * 驗證成功回傳登入者的 Google 身分；任何一項不符合都回傳 null（不丟例外，呼叫端直接回 401）。
 * 只有抓不到 Google 公鑰這類系統問題才會丟例外。
 */
export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleIdentity | null> {
  const parts = String(idToken || "").split(".");
  if (parts.length !== 3 || !clientId) return null;

  let header: any;
  let payload: any;
  try {
    header = decodeJsonPart(parts[0]);
    payload = decodeJsonPart(parts[1]);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || !header.kid) return null;

  // Google 會輪替公鑰：快取裡找不到這個 kid 時重新抓一次
  let jwk = (await getGoogleKeys()).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getGoogleKeys(true)).find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  if (!valid) return null;

  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!GOOGLE_ISSUERS.includes(payload.iss)) return null;
  if (!audiences.includes(clientId)) return null;
  if (typeof payload.exp !== "number" || payload.exp + CLOCK_SKEW_SECONDS < now) return null;
  if (typeof payload.iat === "number" && payload.iat - CLOCK_SKEW_SECONDS > now) return null;
  if (payload.email_verified !== true && payload.email_verified !== "true") return null;
  if (!payload.email || !payload.sub) return null;

  return {
    email: String(payload.email).trim().toLowerCase(),
    sub: String(payload.sub),
    ...(payload.name ? { name: String(payload.name) } : {}),
  };
}

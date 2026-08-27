/**
 * 两阶段登入用的 pending token（HMAC-SHA256 签名，无状态、不写入 KV）
 *
 * 格式：base64url(JSON payload) + "." + base64url(HMAC-SHA256 签名)
 * 这个 token 的形态跟 AuthKVManager 的 session token（32-byte 随机 hex，存在 AUTH_KV 里）
 * 完全不同，就算被当成 Authorization: Bearer 塞进受保护 API 也绝不会通过 verifySession()。
 *
 * 仅供后端 Worker 使用（需要 crypto.subtle 与 AUTH_PENDING_SECRET）。
 */

import type { PendingTokenPayload } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function createPendingToken(
  payload: Omit<PendingTokenPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds: number = KV_CONFIG.PENDING_TOKEN_TTL_SECONDS,
): Promise<string> {
  if (!secret) {
    throw new Error("AUTH_PENDING_SECRET is not configured");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const fullPayload: PendingTokenPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const payloadBytes = new TextEncoder().encode(JSON.stringify(fullPayload));
  const encodedPayload = base64UrlEncode(payloadBytes);

  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encodedPayload));
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${encodedPayload}.${encodedSignature}`;
}

export async function verifyPendingToken(
  token: string,
  secret: string,
): Promise<PendingTokenPayload | null> {
  if (!secret) {
    throw new Error("AUTH_PENDING_SECRET is not configured");
  }

  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;

  try {
    const key = await importHmacKey(secret);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(encodedSignature),
      new TextEncoder().encode(encodedPayload),
    );
    if (!signatureValid) return null;

    const payload: PendingTokenPayload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload)),
    );

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) return null;

    return payload;
  } catch {
    return null;
  }
}

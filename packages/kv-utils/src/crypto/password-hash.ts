/**
 * 密码哈希 / 生成（仅供后端 Worker 使用）
 * 使用 Web Crypto API（crypto.subtle）做 PBKDF2-SHA256，Cloudflare Workers 运行时原生支援，
 * 不依赖任何 Node 原生模块（bcrypt 等在 Workers 里跑不了）。
 *
 * 注意：本文件不应被前端 import（前端只应 import "../validation" 子路径）。
 */

import type { HashedPassword } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

const SALT_BYTE_LENGTH = 16;
const DERIVED_KEY_BIT_LENGTH = 256;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveBits(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    DERIVED_KEY_BIT_LENGTH,
  );
}

/**
 * 常量时间字符串比较，避免时序攻击（Workers 没有 Node 的 crypto.timingSafeEqual）
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function hashPassword(
  password: string,
  iterations: number = KV_CONFIG.PBKDF2_ITERATIONS,
): Promise<HashedPassword> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const bits = await deriveBits(password, salt, iterations);
  return {
    hash: bufferToBase64(bits),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    algorithm: "PBKDF2-SHA256",
    iterations,
  };
}

export async function verifyPassword(password: string, stored: HashedPassword): Promise<boolean> {
  const salt = base64ToBytes(stored.salt);
  const bits = await deriveBits(password, salt, stored.iterations);
  return timingSafeEqual(bufferToBase64(bits), stored.hash);
}

function randomInt(maxExclusive: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % maxExclusive;
}

// 排除易混淆字符：I/O/l/0/1
const LOWER_CHARS = "abcdefghjkmnpqrstuvwxyz";
const UPPER_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ";
const DIGIT_CHARS = "23456789";
const SYMBOL_CHARS = "!@#$%^&*()-_=+";
const ALL_POOLS = [LOWER_CHARS, UPPER_CHARS, DIGIT_CHARS, SYMBOL_CHARS];

/**
 * 生成一组符合强度规则的随机密码（保证四类字符各至少一个）
 */
export function generateStrongPassword(length: number = KV_CONFIG.GENERATED_PASSWORD_LENGTH): string {
  const allChars = ALL_POOLS.join("");
  const chars: string[] = ALL_POOLS.map((pool) => pool[randomInt(pool.length)]);

  while (chars.length < length) {
    chars.push(allChars[randomInt(allChars.length)]);
  }

  // Fisher-Yates 洗牌，用 crypto.getRandomValues 驱动（不用 Math.random）
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
}

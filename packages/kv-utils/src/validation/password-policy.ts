/**
 * 密码强度校验规则
 * 纯函数，零依赖（不使用 crypto.subtle），前后端共用同一份规则实现
 */

import type { PasswordValidationResult, PasswordRuleError } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

const SYMBOL_REGEX = /[!@#$%^&*()\-_=+\[\]{};:,.<>/?]/;

export function validatePasswordStrength(
  password: string,
  minLength: number = KV_CONFIG.PASSWORD_MIN_LENGTH,
): PasswordValidationResult {
  const errors: PasswordRuleError[] = [];

  if (password.length < minLength) {
    errors.push("TOO_SHORT");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("MISSING_LOWERCASE");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("MISSING_UPPERCASE");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("MISSING_DIGIT");
  }
  if (!SYMBOL_REGEX.test(password)) {
    errors.push("MISSING_SYMBOL");
  }

  return { valid: errors.length === 0, errors };
}

export { SYMBOL_REGEX };

/**
 * Auth KV 操作层
 * 处理会话令牌的创建、验证和删除
 */

import type { SessionToken, AuthSessionData, KVNamespace, LockoutStatus } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

export * from "./pending-token.js";

/**
 * Auth KV 管理类
 * 用于 Cloudflare Worker 环境中的认证数据操作
 */
export class AuthKVManager {
  constructor(private kv: KVNamespace) {}

  /**
   * 生成随机会话令牌
   */
  private generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  /**
   * 创建新的会话令牌
   * @param teacherId 教师 ID
   * @param teacherName 教师名称
   * @param permission 教师权限等级（teacher | viewer | admin | super_admin）
   * @param redirectUrl 登入后的重定向 URL
   * @returns SessionToken
   */
  async createSession(
    teacherId: string,
    teacherName: string,
    permission: "teacher" | "viewer" | "admin" | "super_admin",
    redirectUrl?: string
  ): Promise<SessionToken> {
    const token = this.generateToken();
    const now = Date.now();
    const expiresAt = now + KV_CONFIG.SESSION_TOKEN_EXPIRE;

    const sessionData: AuthSessionData = {
      teacher_id: teacherId,
      teacher_name_cn: teacherName,
      permission,
      redirect_url: redirectUrl,
      expires_at: expiresAt,
    };

    const key = `${KV_CONFIG.SESSION_PREFIX}${token}`;
    await this.kv.put(key, JSON.stringify(sessionData), {
      expirationTtl: Math.floor(KV_CONFIG.SESSION_TOKEN_EXPIRE / 1000), // 转换为秒
    });

    return {
      token,
      teacherId,
      teacherName,
      permission,
      redirectUrl,
      expiresAt,
      createdAt: now,
    };
  }

  /**
   * 验证并获取会话信息
   * @param token 会话令牌
   * @returns AuthSessionData 或 null
   */
  async verifySession(token: string): Promise<AuthSessionData | null> {
    const key = `${KV_CONFIG.SESSION_PREFIX}${token}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    try {
      const sessionData: AuthSessionData = JSON.parse(data);

      // 检查是否过期
      if (sessionData.expires_at < Date.now()) {
        await this.kv.delete(key);
        return null;
      }

      return sessionData;
    } catch (error) {
      console.error("Failed to parse session data:", error);
      return null;
    }
  }

  /**
   * 删除会话令牌
   * @param token 会话令牌
   */
  async deleteSession(token: string): Promise<void> {
    const key = `${KV_CONFIG.SESSION_PREFIX}${token}`;
    await this.kv.delete(key);
  }

  /**
   * 获取教师 ID（便捷方法）
   * @param token 会话令牌
   * @returns 教师 ID 或 null
   */
  async getTeacherId(token: string): Promise<string | null> {
    const session = await this.verifySession(token);
    return session?.teacher_id ?? null;
  }

  /**
   * 检查教师是否为管理员（兼容旧代码）
   * @param token 会话令牌
   * @returns 是否为管理员
   */
  async isAdmin(token: string): Promise<boolean> {
    const session = await this.verifySession(token);
    return session?.permission === "admin" || session?.permission === "super_admin";
  }

  /**
   * 检查教师权限等级
   * @param token 会话令牌
   * @returns 权限等级或 null
   */
  async getPermission(token: string): Promise<"teacher" | "viewer" | "admin" | "super_admin" | null> {
    const session = await this.verifySession(token);
    return session?.permission ?? null;
  }

  /**
   * 检查教师是否拥有特定权限
   * @param token 会话令牌
   * @param requiredPermission 所需权限
   * @returns 是否拥有权限
   */
  async hasPermission(token: string, requiredPermission: "teacher" | "viewer" | "admin" | "super_admin"): Promise<boolean> {
    const session = await this.verifySession(token);
    if (!session) return false;

    // 权限优先级：super_admin > admin > viewer > teacher
    const permissionLevels: Record<string, number> = {
      "super_admin": 4,
      "admin": 3,
      "viewer": 2,
      "teacher": 1,
    };

    return (permissionLevels[session.permission] ?? 0) >= (permissionLevels[requiredPermission] ?? 0);
  }

  /**
   * 检查该教师是否因密码连续输错而被暂时锁定
   * @param teacherId 教师 ID
   */
  async checkLockout(teacherId: string): Promise<LockoutStatus> {
    const key = `${KV_CONFIG.LOCKOUT_PREFIX}${teacherId}`;
    const data = await this.kv.get(key);
    if (!data) {
      return { locked: false, remainingAttempts: KV_CONFIG.LOCKOUT_MAX_ATTEMPTS };
    }

    try {
      const { count } = JSON.parse(data) as { count: number };
      if (count >= KV_CONFIG.LOCKOUT_MAX_ATTEMPTS) {
        return { locked: true, remainingAttempts: 0, retryAfterSeconds: KV_CONFIG.LOCKOUT_WINDOW_SECONDS };
      }
      return { locked: false, remainingAttempts: KV_CONFIG.LOCKOUT_MAX_ATTEMPTS - count };
    } catch {
      return { locked: false, remainingAttempts: KV_CONFIG.LOCKOUT_MAX_ATTEMPTS };
    }
  }

  /**
   * 记录一次密码验证失败，达到上限则视为锁定（TTL 到期自动解除）
   * @param teacherId 教师 ID
   */
  async recordFailedAttempt(teacherId: string): Promise<LockoutStatus> {
    const key = `${KV_CONFIG.LOCKOUT_PREFIX}${teacherId}`;
    const data = await this.kv.get(key);
    let count = 1;
    if (data) {
      try {
        count = (JSON.parse(data) as { count: number }).count + 1;
      } catch {
        count = 1;
      }
    }

    await this.kv.put(key, JSON.stringify({ count }), {
      expirationTtl: KV_CONFIG.LOCKOUT_WINDOW_SECONDS,
    });

    if (count >= KV_CONFIG.LOCKOUT_MAX_ATTEMPTS) {
      return { locked: true, remainingAttempts: 0, retryAfterSeconds: KV_CONFIG.LOCKOUT_WINDOW_SECONDS };
    }
    return { locked: false, remainingAttempts: KV_CONFIG.LOCKOUT_MAX_ATTEMPTS - count };
  }

  /**
   * 清除锁定计数（登入成功后可选调用）
   * @param teacherId 教师 ID
   */
  async clearLockout(teacherId: string): Promise<void> {
    const key = `${KV_CONFIG.LOCKOUT_PREFIX}${teacherId}`;
    await this.kv.delete(key);
  }
}

/**
 * 工厂函数：创建 AuthKVManager 实例
 * @param kv Cloudflare KV 绑定
 * @returns AuthKVManager 实例
 */
export function createAuthKVManager(kv: KVNamespace): AuthKVManager {
  return new AuthKVManager(kv);
}

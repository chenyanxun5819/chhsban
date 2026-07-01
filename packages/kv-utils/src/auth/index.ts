/**
 * Auth KV 操作层
 * 处理会话令牌的创建、验证和删除
 */

import type { SessionToken, AuthSessionData } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

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
   * @param role 教师角色
   * @returns SessionToken
   */
  async createSession(
    teacherId: string,
    teacherName: string,
    role: "teacher" | "admin"
  ): Promise<SessionToken> {
    const token = this.generateToken();
    const now = Date.now();
    const expiresAt = now + KV_CONFIG.SESSION_TOKEN_EXPIRE;

    const sessionData: AuthSessionData = {
      teacher_id: teacherId,
      teacher_name_cn: teacherName,
      role,
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
      role,
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
   * 检查教师是否为管理员
   * @param token 会话令牌
   * @returns 是否为管理员
   */
  async isAdmin(token: string): Promise<boolean> {
    const session = await this.verifySession(token);
    return session?.role === "admin";
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

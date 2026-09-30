/**
 * Teacher KV 操作层
 * 处理教师数据的查询、存储和管理
 */

import type { TeacherRecord, KVNamespace } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

// 全部教師的「email → teacher_id」對照表，整份存成一個 key（登入查詢用，見 findTeacherByEmail）
const EMAIL_DIRECTORY_KEY = "email_directory";
// 查無此 email 時，對照表超過這個時間才重建一次，避免有人亂打 email 就一直觸發全表掃描
const EMAIL_DIRECTORY_REBUILD_MS = 30 * 60 * 1000;

interface EmailDirectory {
  built_at: number;
  emails: Record<string, string>;
}

/**
 * Teacher KV 管理类
 */
export class TeacherKVManager {
  constructor(private kv: KVNamespace) {}

  /**
   * 依 email 找教師（登入用）。
   *
   * 讀整份 email 對照表（1 次 KV 讀取）而不是掃描全部教師；對照表不存在、或查不到／email 已改過
   * 且對照表超過 30 分鐘沒重建時才重建一次（掃描全部教師 + 1 次寫入）。所以不管外面怎麼亂打 email，
   * 最多每 30 分鐘全表掃描一次；新增的老師最晚 30 分鐘後就能登入。
   * 找到後一律比對教師資料裡現在的 email，教師改過 email 就不能再用舊 email 登入。
   */
  async findTeacherByEmail(email: string): Promise<TeacherRecord | null> {
    const normalized = email.trim().toLowerCase();
    const lookup = async (directory: EmailDirectory): Promise<TeacherRecord | null> => {
      const teacherId = directory.emails[normalized];
      if (!teacherId) return null;
      const teacher = await this.getTeacher(teacherId);
      return teacher && teacher.email?.trim().toLowerCase() === normalized ? teacher : null;
    };

    const raw = await this.kv.get(EMAIL_DIRECTORY_KEY);
    const cached: EmailDirectory | null = raw ? JSON.parse(raw) : null;
    if (cached) {
      const teacher = await lookup(cached);
      if (teacher || Date.now() - cached.built_at < EMAIL_DIRECTORY_REBUILD_MS) {
        return teacher;
      }
    }

    const emails: Record<string, string> = {};
    for (const teacher of await this.getAllTeachers()) {
      const key = teacher.email?.trim().toLowerCase();
      if (key) emails[key] = teacher.teacher_id;
    }
    const rebuilt: EmailDirectory = { built_at: Date.now(), emails };
    await this.kv.put(EMAIL_DIRECTORY_KEY, JSON.stringify(rebuilt));
    return lookup(rebuilt);
  }

  /**
   * 获取单个教师信息
   * @param teacherId 教师 ID
   * @returns TeacherRecord 或 null
   */
  async getTeacher(teacherId: string): Promise<TeacherRecord | null> {
    const key = `${KV_CONFIG.TEACHER_PREFIX}${teacherId}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as TeacherRecord;
    } catch (error) {
      console.error(`Failed to parse teacher data for ${teacherId}:`, error);
      return null;
    }
  }

  /**
   * 获取某部门的所有教师
   * @param department 部门名称，如 "中文系", "数学系"
   * @returns TeacherRecord[]
   */
  async getTeachersByDepartment(department: string): Promise<TeacherRecord[]> {
    const teachers: TeacherRecord[] = [];
    let cursor: string | undefined;

    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.TEACHER_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const teacher = await this.getTeacher(item.name.replace(KV_CONFIG.TEACHER_PREFIX, ""));
        // trim 比對：教師資料裡的舊 department 字串可能帶有前後多餘空白（歷史匯入資料常見），
        // 嚴格相等會漏掉這些記錄，導致部門刪除/改名時誤判「沒有教師在用」
        if (teacher && teacher.department?.trim() === department.trim()) {
          teachers.push(teacher);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return teachers;
  }

  /**
   * 获取所有管理员
   * @returns TeacherRecord[]
   */
  async getAdmins(): Promise<TeacherRecord[]> {
    const admins: TeacherRecord[] = [];
    let cursor: string | undefined;

    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.TEACHER_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const teacher = await this.getTeacher(item.name.replace(KV_CONFIG.TEACHER_PREFIX, ""));
        if (teacher && teacher.permission === "admin") {
          admins.push(teacher);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return admins;
  }

  /**
   * 保存教师信息
   * @param teacher TeacherRecord
   */
  async saveTeacher(teacher: TeacherRecord): Promise<void> {
    const key = `${KV_CONFIG.TEACHER_PREFIX}${teacher.teacher_id}`;
    await this.kv.put(key, JSON.stringify(teacher));
  }

  /**
   * 批量保存教师信息
   * @param teachers TeacherRecord[]
   */
  async saveTeachers(teachers: TeacherRecord[]): Promise<void> {
    for (const teacher of teachers) {
      await this.saveTeacher(teacher);
    }
  }

  /**
   * 删除教师信息
   * @param teacherId 教师 ID
   */
  async deleteTeacher(teacherId: string): Promise<void> {
    const key = `${KV_CONFIG.TEACHER_PREFIX}${teacherId}`;
    await this.kv.delete(key);
  }

  /**
   * 获取所有教师
   * @returns TeacherRecord[]
   */
  async getAllTeachers(): Promise<TeacherRecord[]> {
    const teachers: TeacherRecord[] = [];
    let cursor: string | undefined;

    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.TEACHER_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const teacher = await this.getTeacher(item.name.replace(KV_CONFIG.TEACHER_PREFIX, ""));
        if (teacher) {
          teachers.push(teacher);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return teachers;
  }

  /**
   * 验证教师密码（简单实现，建议使用更安全的方法）
   * 注意：此方法需要配合前端的身份验证服务
   * @param teacherId 教师 ID
   * @returns 教师信息或 null
   */
  async verifyTeacher(teacherId: string): Promise<TeacherRecord | null> {
    return this.getTeacher(teacherId);
  }
}

/**
 * 工厂函数：创建 TeacherKVManager 实例
 * @param kv Cloudflare KV 绑定
 * @returns TeacherKVManager 实例
 */
export function createTeacherKVManager(kv: KVNamespace): TeacherKVManager {
  return new TeacherKVManager(kv);
}

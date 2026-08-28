/**
 * Teacher KV 操作层
 * 处理教师数据的查询、存储和管理
 */

import type { TeacherRecord, KVNamespace } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

/**
 * Teacher KV 管理类
 */
export class TeacherKVManager {
  constructor(private kv: KVNamespace) {}

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

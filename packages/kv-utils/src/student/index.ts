/**
 * Student KV 操作层
 * 处理学生数据的查询、存储和管理
 */

import type { StudentRecord, KVNamespace } from "../types/index.js";
import { KV_CONFIG } from "../types/index.js";

/**
 * Student KV 管理类
 */
export class StudentKVManager {
  constructor(private kv: KVNamespace) {}

  /**
   * 获取单个学生信息
   * @param studentId 学生 ID
   * @returns StudentRecord 或 null
   */
  async getStudent(studentId: string): Promise<StudentRecord | null> {
    const key = `${KV_CONFIG.STUDENT_PREFIX}${studentId}`;
    const data = await this.kv.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as StudentRecord;
    } catch (error) {
      console.error(`Failed to parse student data for ${studentId}:`, error);
      return null;
    }
  }

  /**
   * 获取某班级的所有学生
   * @param className 班级名称，如 "J1A", "J1B"
   * @returns StudentRecord[]
   */
  async getStudentsByClass(className: string): Promise<StudentRecord[]> {
    const students: StudentRecord[] = [];
    let cursor: string | undefined;

    // 使用 KV list API 遍历所有学生数据
    // 注意：KV list API 的使用可能需要在实际环境中调整
    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.STUDENT_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const student = await this.getStudent(item.name.replace(KV_CONFIG.STUDENT_PREFIX, ""));
        if (student && student.class === className) {
          students.push(student);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return students;
  }

  /**
   * 保存学生信息
   * @param student StudentRecord
   */
  async saveStudent(student: StudentRecord): Promise<void> {
    const key = `${KV_CONFIG.STUDENT_PREFIX}${student.student_id}`;
    await this.kv.put(key, JSON.stringify(student));
  }

  /**
   * 批量保存学生信息
   * @param students StudentRecord[]
   */
  async saveStudents(students: StudentRecord[]): Promise<void> {
    for (const student of students) {
      await this.saveStudent(student);
    }
  }

  /**
   * 删除学生信息
   * @param studentId 学生 ID
   */
  async deleteStudent(studentId: string): Promise<void> {
    const key = `${KV_CONFIG.STUDENT_PREFIX}${studentId}`;
    await this.kv.delete(key);
  }

  /**
   * 获取所有学生
   * @returns StudentRecord[]
   */
  async getAllStudents(): Promise<StudentRecord[]> {
    const students: StudentRecord[] = [];
    let cursor: string | undefined;

    const listOptions: Parameters<typeof this.kv.list>[0] = {
      prefix: KV_CONFIG.STUDENT_PREFIX,
    };

    do {
      const result = await this.kv.list(listOptions);

      for (const item of result.keys) {
        const student = await this.getStudent(item.name.replace(KV_CONFIG.STUDENT_PREFIX, ""));
        if (student) {
          students.push(student);
        }
      }

      cursor = result.list_complete ? undefined : result.cursor;
      if (cursor) {
        listOptions.cursor = cursor;
      }
    } while (cursor);

    return students;
  }
}

/**
 * 工厂函数：创建 StudentKVManager 实例
 * @param kv Cloudflare KV 绑定
 * @returns StudentKVManager 实例
 */
export function createStudentKVManager(kv: KVNamespace): StudentKVManager {
  return new StudentKVManager(kv);
}

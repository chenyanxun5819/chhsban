/**
 * 认证相关类型定义
 */

export interface SessionToken {
  token: string;
  teacherId: string;
  teacherName: string;
  role: "teacher" | "admin";
  expiresAt: number; // Unix 时间戳（毫秒）
  createdAt: number;
}

export interface AuthSessionData {
  teacher_id: string;
  teacher_name_cn?: string;
  teacher_name_en?: string;
  role: "teacher" | "admin";
  expires_at: number;
}

/**
 * 学生数据类型
 */
export interface StudentRecord {
  student_id: string;
  name_cn: string;
  name_en: string;
  class: string; // 如 "J1A", "J1B"
  email?: string;
  phone?: string;
}

/**
 * 教师数据类型
 */
export interface TeacherRecord {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  department: string; // 如 "中文系", "数学系"
  email: string;
  phone?: string;
  role: "teacher" | "admin";
}

/**
 * 共用常量
 */
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000, // 24 小时（毫秒）
  SESSION_PREFIX: "session:",
  STUDENT_PREFIX: "student:",
  TEACHER_PREFIX: "teacher:",
} as const;

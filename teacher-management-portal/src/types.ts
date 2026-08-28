export interface TeacherRecord {
  teacher_id: string;
  name_cn: string;
  name_en?: string;
  department: string;
  email: string;
  google_email?: string; // 可選: 用於 Google OAuth 登入的個人 email
  phone?: string;
  permission: "teacher" | "admin" | "super_admin" | "classroom_manager";
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export type Permission = "teacher" | "admin" | "super_admin" | "classroom_manager";

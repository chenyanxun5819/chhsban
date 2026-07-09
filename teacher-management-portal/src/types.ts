export interface TeacherRecord {
  teacher_id: string;
  name_cn: string;
  name_en?: string;
  department: string;
  email: string;
  phone?: string;
  permission: "teacher" | "admin" | "super_admin";
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export type Permission = "teacher" | "admin" | "super_admin";

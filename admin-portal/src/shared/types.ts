// 登入身分：與 tution-portal、optional-course 前端一致（三站共用同一套登入，AUTH_KV）
export type Permission = "teacher" | "viewer" | "admin" | "super_admin" | "classroom_manager";

export interface AuthUser {
  teacherId: string;
  teacherName: string;
  permission: Permission;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * 可以進入管理站的身分：super_admin（全部）、admin（督察員，只能查看）、classroom_manager（教室管理員）。
 * 各自能進哪些頁面見 shared/access.ts。
 */
export const ADMIN_PERMISSIONS: Permission[] = ["super_admin", "admin", "classroom_manager"];

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

/** 可以進入管理站的身分：super_admin 可修改，admin（督察員）只能查看 */
export const ADMIN_PERMISSIONS: Permission[] = ["super_admin", "admin"];

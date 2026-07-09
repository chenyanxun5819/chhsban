export type Permission = "teacher" | "viewer" | "admin" | "super_admin";

export interface AuthUser {
  teacherId: string;
  teacherName: string;
  permission: Permission;
  email: string;
  department?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  token: string;
  permission: Permission;
  redirectUrl?: string;
}

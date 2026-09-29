import axios from "axios";
import authApi from "@/shared/api/authApi";
import type { Permission } from "@/shared/types";

export interface AuthVerifyResponse {
  token: string;
  teacher_id: string;
  teacher_name: string;
  permission: Permission;
  email: string;
}

export interface IdentifyResponse {
  stage: "password_setup" | "password_login";
  pendingToken: string;
  teacherName: string;
  email: string;
  expiresIn: number;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      throw new Error("無法連線到登入服務，請檢查網路後再試");
    }
    const apiError = error.response.data as
      | { error?: string; message?: string }
      | undefined;
    return apiError?.error || apiError?.message || fallback;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export const identifyTeacher = async (email: string): Promise<IdentifyResponse> => {
  try {
    const response = await authApi.post<{
      success: boolean;
      data: {
        stage: "password_setup" | "password_login";
        pendingToken: string;
        teacher_name: string;
        email: string;
        expiresIn: number;
      };
    }>("/auth/verify", { email });

    const data = response.data.data;
    return {
      stage: data.stage,
      pendingToken: data.pendingToken,
      teacherName: data.teacher_name,
      email: data.email,
      expiresIn: data.expiresIn,
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new Error("Email 未在系統中註冊，請檢查輸入是否正確");
    }
    throw new Error(extractErrorMessage(error, "驗證失敗，請稍後再試"));
  }
};

function persistSession(authData: AuthVerifyResponse): void {
  localStorage.setItem("auth_token", authData.token);
  localStorage.setItem(
    "auth_user",
    JSON.stringify({
      teacherId: authData.teacher_id,
      teacherName: authData.teacher_name,
      email: authData.email,
      permission: authData.permission,
    }),
  );
}

export const generateSystemPassword = async (pendingToken: string): Promise<string> => {
  try {
    const response = await authApi.post<{ success: boolean; data: { password: string } }>(
      "/auth/generate-password",
      { pendingToken },
    );
    return response.data.data.password;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "產生密碼失敗，請稍後再試"));
  }
};

export const setPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await authApi.post<{ success: boolean; data: AuthVerifyResponse }>(
      "/auth/set-password",
      { pendingToken, password },
    );
    const authData = response.data.data;
    persistSession(authData);
    return authData;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "設定密碼失敗，請稍後再試"));
  }
};

export const loginWithPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await authApi.post<{ success: boolean; data: AuthVerifyResponse }>(
      "/auth/login-password",
      { pendingToken, password },
    );
    const authData = response.data.data;
    persistSession(authData);
    return authData;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as
        | { error?: string; remainingAttempts?: number; retryAfterSeconds?: number }
        | undefined;
      if (error.response?.status === 401) {
        const err = new Error("密碼錯誤") as Error & { remainingAttempts?: number };
        err.remainingAttempts = data?.remainingAttempts;
        throw err;
      }
      if (error.response?.status === 429) {
        const err = new Error("嘗試次數過多，請稍後再試") as Error & {
          retryAfterSeconds?: number;
        };
        err.retryAfterSeconds = data?.retryAfterSeconds;
        throw err;
      }
    }
    throw new Error(extractErrorMessage(error, "登入失敗，請稍後再試"));
  }
};

export const clearSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

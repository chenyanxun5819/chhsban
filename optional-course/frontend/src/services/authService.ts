import axios from "axios";
import apiClient from "@/utils/api";
import type { Permission } from "@/types";

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
      throw new Error("无法连线到登入服务，请检查网路后再试 / Cannot reach login service, please check your network");
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
    const response = await apiClient.post<{
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
      throw new Error("Email 未在系统中注册，请检查输入是否正确 / Email is not registered, please check your input");
    }
    throw new Error(extractErrorMessage(error, "验证失败，请稍后再试 / Verification failed, please try again later"));
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
    const response = await apiClient.post<{ success: boolean; data: { password: string } }>(
      "/auth/generate-password",
      { pendingToken },
    );
    return response.data.data.password;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "产生密码失败，请稍后再试 / Failed to generate password, please try again later"));
  }
};

export const setPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: AuthVerifyResponse }>(
      "/auth/set-password",
      { pendingToken, password },
    );
    const authData = response.data.data;
    persistSession(authData);
    return authData;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "设定密码失败，请稍后再试 / Failed to set password, please try again later"));
  }
};

export const loginWithPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: AuthVerifyResponse }>(
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
        const err = new Error("密码错误 / Incorrect password") as Error & { remainingAttempts?: number };
        err.remainingAttempts = data?.remainingAttempts;
        throw err;
      }
      if (error.response?.status === 429) {
        const err = new Error("尝试次数过多，请稍后再试 / Too many attempts, please try again later") as Error & {
          retryAfterSeconds?: number;
        };
        err.retryAfterSeconds = data?.retryAfterSeconds;
        throw err;
      }
    }
    throw new Error(extractErrorMessage(error, "登入失败，请稍后再试 / Login failed, please try again later"));
  }
};

export const clearSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

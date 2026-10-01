import axios from "axios";
import apiClient from "@/utils/api";
import i18n from "@/i18n";
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
      throw new Error(i18n.t("login.loginServiceUnreachable"));
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
      throw new Error(i18n.t("login.emailNotRegistered"));
    }
    throw new Error(extractErrorMessage(error, i18n.t("login.verifyFailed")));
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

/** 私人 Google 帳號登入：把 Google 按鈕取得的 ID token 交給後端驗證，成功直接建立 session */
export const loginWithGoogle = async (credential: string): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: AuthVerifyResponse }>(
      "/auth/google",
      { credential },
    );
    const authData = response.data.data;
    persistSession(authData);
    return authData;
  } catch (error) {
    throw new Error(extractErrorMessage(error, i18n.t("login.googleFailed")));
  }
};

export const generateSystemPassword = async (pendingToken: string): Promise<string> => {
  try {
    const response = await apiClient.post<{ success: boolean; data: { password: string } }>(
      "/auth/generate-password",
      { pendingToken },
    );
    return response.data.data.password;
  } catch (error) {
    throw new Error(extractErrorMessage(error, i18n.t("login.generateFailed")));
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
    throw new Error(extractErrorMessage(error, i18n.t("login.setPasswordFailed")));
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
        const err = new Error(i18n.t("login.wrongPassword")) as Error & { remainingAttempts?: number };
        err.remainingAttempts = data?.remainingAttempts;
        throw err;
      }
      if (error.response?.status === 429) {
        const err = new Error(i18n.t("login.tooManyAttempts")) as Error & {
          retryAfterSeconds?: number;
        };
        err.retryAfterSeconds = data?.retryAfterSeconds;
        throw err;
      }
    }
    throw new Error(extractErrorMessage(error, i18n.t("login.loginFailed")));
  }
};

export const clearSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

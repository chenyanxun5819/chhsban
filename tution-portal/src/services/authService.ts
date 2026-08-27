import axios from "axios";
import apiClient from "@/utils/api";

export interface AuthVerifyResponse {
  token: string;
  teacher_id: string;
  teacher_name: string;
  permission: "teacher" | "viewer" | "admin" | "super_admin";
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

/**
 * 第一步：驗證教師 Email（手動輸入或 Google 解碼皆走這裡），
 * 不會直接登入，而是回傳下一步該走「設定密碼」還是「輸入密碼」
 */
export const identifyTeacher = async (
  email: string,
): Promise<IdentifyResponse> => {
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

    if (!response.data || !response.data.data) {
      throw new Error("無效的響應");
    }

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

/**
 * 讓系統產生一組符合強度規則的密碼，顯示給使用者一次
 */
export const generateSystemPassword = async (
  pendingToken: string,
): Promise<string> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: { password: string };
    }>("/auth/generate-password", { pendingToken });
    return response.data.data.password;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "產生密碼失敗，請稍後再試"));
  }
};

/**
 * 首次登入：設定密碼（自訂或系統產生皆走這個端點），成功後直接完成登入
 */
export const setPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthVerifyResponse;
    }>("/auth/set-password", { pendingToken, password });
    const authData = response.data.data;
    persistSession(authData);
    return authData;
  } catch (error) {
    throw new Error(extractErrorMessage(error, "設定密碼失敗，請稍後再試"));
  }
};

/**
 * 已設定密碼的教師：輸入密碼完成登入
 */
export const loginWithPassword = async (
  pendingToken: string,
  password: string,
): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<{
      success: boolean;
      data: AuthVerifyResponse;
    }>("/auth/login-password", { pendingToken, password });
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

/**
 * 從 localStorage 恢復認證會話
 * @returns 認證用戶信息或 null
 */
export const restoreSession = () => {
  try {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("auth_user");

    if (token && userStr) {
      return {
        token,
        user: JSON.parse(userStr),
      };
    }

    return null;
  } catch (error) {
    console.error("Failed to restore session:", error);
    clearSession();
    return null;
  }
};

/**
 * 清除認證會話
 */
export const clearSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

/**
 * 獲取當前認證狀態
 */
export const getAuthStatus = () => {
  const token = localStorage.getItem("auth_token");
  const userStr = localStorage.getItem("auth_user");

  if (!token || !userStr) {
    return null;
  }

  try {
    return {
      token,
      user: JSON.parse(userStr),
      isAuthenticated: true,
    };
  } catch {
    return null;
  }
};

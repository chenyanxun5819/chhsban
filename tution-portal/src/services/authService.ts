import axios from "axios";
import apiClient from "@/utils/api";

export interface AuthVerifyResponse {
  token: string;
  teacher_id: string;
  teacher_name: string;
  permission: "teacher" | "viewer" | "admin" | "super_admin" | "classroom_manager" | "dorm_supervisor";
  email: string;
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
 * 私人 Google 帳號登入（唯一的登入方式）：把 Google 按鈕取得的 ID token 交給後端驗證，成功直接建立 session。
 * 尚未綁定或尚未開放登入時，後端會回傳說明訊息（顯示給使用者）。
 */
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
    throw new Error(extractErrorMessage(error, "Google 登入失敗，請稍後再試"));
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

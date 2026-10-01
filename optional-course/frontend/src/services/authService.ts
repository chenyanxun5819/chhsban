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
    throw new Error(extractErrorMessage(error, i18n.t("login.googleFailed")));
  }
};

export const clearSession = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
};

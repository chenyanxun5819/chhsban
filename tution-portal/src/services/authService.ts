import apiClient from "@/utils/api";

export interface AuthVerifyResponse {
  token: string;
  teacher_id: string;
  teacher_name: string;
  permission: "teacher" | "viewer" | "admin" | "super_admin";
  email: string;
}

/**
 * 驗證教師 Email 並取得認證 Token
 * @param email 教師 Email 地址
 * @returns 認證響應 (token, teacher_id, permission)
 */
export const verifyTeacherEmail = async (
  email: string
): Promise<AuthVerifyResponse> => {
  try {
    const response = await apiClient.post<AuthVerifyResponse>(
      "/auth/verify",
      { email }
    );

    if (!response.data) {
      throw new Error("無效的響應");
    }

    // 保存認證信息到 localStorage
    localStorage.setItem("auth_token", response.data.token);
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        teacher_id: response.data.teacher_id,
        teacher_name: response.data.teacher_name,
        email: response.data.email,
        permission: response.data.permission,
      })
    );

    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      // 檢查是否是 401 (未找到教師)
      if (error.message.includes("401")) {
        throw new Error("Email 未在系統中註冊，請檢查輸入是否正確");
      }
      throw error;
    }
    throw new Error("驗證失敗，請重試");
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

import axios, { AxiosInstance } from "axios";
import i18n from "@/i18n";

// 根據環境變數設定 API 基礎 URL（與 tution-portal 的 utils/api.ts 完全相同的模式）
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8788/api";

// 登入請求本身回 401 時（Google 驗證失敗）要顯示錯誤訊息，不要當成 token 失效而跳回登入頁
const AUTH_FLOW_PATHS = ["/auth/google"];

function isAuthFlowRequest(url?: string): boolean {
  const target = url || "";
  return AUTH_FLOW_PATHS.some((path) => target.includes(path));
}

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isAuthFlowRequest(error.config?.url)
    ) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }

    if (!error.response) {
      return Promise.reject(new Error(i18n.t("common.serverUnreachable", { url: API_BASE_URL })));
    }

    return Promise.reject(error);
  },
);

export default apiClient;

import axios, { AxiosInstance } from "axios";

// 根據環境變數設定 API 基礎 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8787/api";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 請求攔截器：添加授權令牌
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.info("API request", {
      method: config.method,
      url: `${config.baseURL || ""}${config.url || ""}`,
    });
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 響應攔截器：處理認證錯誤
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期或無效，清除本地存儲並重定向到登入頁
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }

    if (!error.response) {
      console.error("API network error", {
        baseURL: API_BASE_URL,
        message: error.message,
        code: error.code,
      });
      return Promise.reject(
        new Error(`無法連線到伺服器：${API_BASE_URL}`)
      );
    }

    console.error("API response error", {
      baseURL: API_BASE_URL,
      status: error.response.status,
      data: error.response.data,
    });

    return Promise.reject(error);
  }
);

export default apiClient;

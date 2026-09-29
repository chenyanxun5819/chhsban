import axios, { AxiosInstance } from "axios";

/**
 * 各系統 Worker 的 API client：自動帶登入 token；token 失效（401）就清掉登入狀態回登入頁。
 * 第一期只有選修課（optional/api.ts），第二期補習班也用同一個工廠建立。
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 30000,
    headers: { "Content-Type": "application/json" },
  });

  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
        window.location.href = "/login";
      }
      if (!error.response) {
        return Promise.reject(new Error(`無法連線到伺服器：${baseURL}`));
      }
      return Promise.reject(error);
    },
  );

  return client;
}

import axios, { AxiosInstance } from "axios";

const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.VITE_API_BASE_URL || "/",
  timeout: 10000,
});

// 添加響應攔截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 過期或無效，清除本地存儲並重定向到登入頁
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default apiClient;

import axios, { AxiosInstance } from "axios";

// 選修課系統是獨立的 Worker（optional-course-system），但與補習系統共用同一套登入
// （同一個 AUTH_KV），所以直接沿用補習系統登入後的 token，不需要另外登入。
const OPTIONAL_COURSE_API_BASE_URL =
  import.meta.env.VITE_OPTIONAL_COURSE_API_BASE_URL ||
  "https://optional-course-system.astcws.workers.dev/api";

const optionalCourseApi: AxiosInstance = axios.create({
  baseURL: OPTIONAL_COURSE_API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

optionalCourseApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

optionalCourseApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // 與 utils/api.ts 一致：token 失效就清掉登入狀態回首頁
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

export default optionalCourseApi;

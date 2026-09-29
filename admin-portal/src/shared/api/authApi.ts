import axios, { AxiosInstance } from "axios";

// 登入走補習系統的 Worker（tution-system，登入身分的主要擁有者）；
// 登入後的 token 存在共用的 AUTH_KV，選修課 Worker 也認得，不需要另外登入。
const AUTH_API_BASE_URL =
  import.meta.env.VITE_AUTH_API_BASE_URL || "https://tution-system.astcws.workers.dev/api";

const authApi: AxiosInstance = axios.create({
  baseURL: AUTH_API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export default authApi;

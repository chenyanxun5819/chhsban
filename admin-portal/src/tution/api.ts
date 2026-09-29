import { createApiClient } from "@/shared/api/createApiClient";

// 補習系統 Worker（tution-system）：補習班管理與共用設定（老師、教室）都走這裡
const tutionApi = createApiClient(
  import.meta.env.VITE_TUTION_API_BASE_URL || "https://tution-system.astcws.workers.dev/api",
);

export default tutionApi;

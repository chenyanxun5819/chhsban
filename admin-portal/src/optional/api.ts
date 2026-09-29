import { createApiClient } from "@/shared/api/createApiClient";

// 選修課 Worker（optional-course-system）
const optionalApi = createApiClient(
  import.meta.env.VITE_OPTIONAL_COURSE_API_BASE_URL || "https://optional-course-system.astcws.workers.dev/api",
);

export default optionalApi;

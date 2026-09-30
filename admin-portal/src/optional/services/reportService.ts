import optionalApi from "@/optional/api";
import type { CourseReportSummary } from "@/optional/types";

type ApiResponse<T> = { success: boolean; data: T };

/**
 * 各課程開課報表（即時計算）。出勤數字由 worker 在老師儲存點名時先統計好，
 * 這裡一次請求就拿到整年所有課程，不需要像補習班那樣每日存快照。
 */
export const getCourseReport = async (year: number): Promise<CourseReportSummary> => {
  const res = await optionalApi.get<ApiResponse<CourseReportSummary>>("/v1/reports/course-summary", {
    params: { year },
  });
  return res.data.data;
};

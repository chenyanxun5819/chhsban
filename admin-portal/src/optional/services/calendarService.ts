import optionalApi from "@/optional/api";
import type { AttendanceSummary, CourseSessionsInfo, SchoolCalendar } from "@/optional/types";

type ApiResponse<T> = { success: boolean; data: T };

export const getCalendar = async (year: number): Promise<SchoolCalendar> => {
  const res = await optionalApi.get<ApiResponse<SchoolCalendar>>("/v1/calendar", { params: { year } });
  return res.data.data;
};

/**
 * 整份覆寫行事曆（僅 super_admin）。calendar.updated_at 要帶讀到時的版本（樂觀鎖）；
 * 會影響已點名日期時 worker 回 409 CALENDAR_AFFECTS_ATTENDANCE，確認後帶 force=true 再送。
 */
export const saveCalendar = async (calendar: SchoolCalendar, force = false): Promise<SchoolCalendar> => {
  const res = await optionalApi.put<ApiResponse<SchoolCalendar>>(`/v1/calendar/${calendar.year}`, { ...calendar, force });
  return res.data.data;
};

export const getCourseSessions = async (courseId: string): Promise<CourseSessionsInfo> => {
  const res = await optionalApi.get<ApiResponse<CourseSessionsInfo>>(`/v1/courses/${courseId}/sessions`);
  return res.data.data;
};

export const getAttendanceSummary = async (year: number): Promise<AttendanceSummary> => {
  const res = await optionalApi.get<ApiResponse<AttendanceSummary>>("/v1/attendance/summary", { params: { year } });
  return res.data.data;
};

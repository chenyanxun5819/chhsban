import apiClient from "@/utils/api";
import type { CourseSessionsInfo } from "@/types";
import type { OverviewCalendar } from "@/components/attendance/AttendanceOverview";

/** 這門課的應點名日期（由學校行事曆＋上課星期推算），附每天是否已點名 */
export const getCourseSessions = async (courseId: string): Promise<CourseSessionsInfo> => {
  const res = await apiClient.get<{ success: boolean; data: CourseSessionsInfo }>(
    `/v1/courses/${courseId}/sessions`,
  );
  return res.data.data;
};

/** 學校行事曆（點名總覽用來標示遇到假期的上課日） */
export const getCalendar = async (year: number): Promise<OverviewCalendar> => {
  const res = await apiClient.get<{ success: boolean; data: OverviewCalendar }>("/v1/calendar", { params: { year } });
  return res.data.data;
};

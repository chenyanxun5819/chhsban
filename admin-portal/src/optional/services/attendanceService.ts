import optionalApi from "@/optional/api";
import type { OptionalCourseAttendance, OptionalCourseRoster } from "@/optional/types";

type ApiResponse<T> = { success: boolean; data: T };

/** 名冊（含已退選），點名總覽用；行政端只讀 */
export const listRoster = async (courseId: string): Promise<OptionalCourseRoster[]> => {
  const res = await optionalApi.get<ApiResponse<OptionalCourseRoster[]>>(`/v1/courses/${courseId}/roster`);
  return res.data.data;
};

export const listAttendance = async (courseId: string): Promise<OptionalCourseAttendance[]> => {
  const res = await optionalApi.get<ApiResponse<OptionalCourseAttendance[]>>(`/v1/courses/${courseId}/attendance`);
  return res.data.data;
};

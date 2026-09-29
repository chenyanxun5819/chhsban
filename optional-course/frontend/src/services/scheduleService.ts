import apiClient from "@/utils/api";
import type { OptionalCourseSchedule } from "@/types";

export const listSchedules = async (courseId: string): Promise<OptionalCourseSchedule[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourseSchedule[] }>(
    `/v1/courses/${courseId}/schedules`,
  );
  return res.data.data;
};

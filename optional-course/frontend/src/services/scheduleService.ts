import apiClient from "@/utils/api";
import type { OptionalCourseSchedule, CourseScheduleStatus } from "@/types";

export const listSchedules = async (courseId: string): Promise<OptionalCourseSchedule[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourseSchedule[] }>(
    `/v1/courses/${courseId}/schedules`,
  );
  return res.data.data;
};

export const createSchedule = async (
  courseId: string,
  data: {
    scheduled_date: string;
    status: CourseScheduleStatus;
    cancellation_reason?: string;
    rescheduled_to?: string;
    rescheduled_venue?: string;
    reschedule_reason?: string;
  },
): Promise<OptionalCourseSchedule> => {
  const res = await apiClient.post<{ success: boolean; data: OptionalCourseSchedule }>(
    `/v1/courses/${courseId}/schedules`,
    data,
  );
  return res.data.data;
};

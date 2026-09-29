import optionalApi from "@/optional/api";
import type { CourseScheduleStatus, OptionalCourseSchedule } from "@/optional/types";

type ApiResponse<T> = { success: boolean; data: T };

export const listSchedules = async (courseId: string): Promise<OptionalCourseSchedule[]> => {
  const res = await optionalApi.get<ApiResponse<OptionalCourseSchedule[]>>(`/v1/courses/${courseId}/schedules`);
  return res.data.data;
};

/** 課程級停課／調課（僅 super_admin） */
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
  const res = await optionalApi.post<ApiResponse<OptionalCourseSchedule>>(`/v1/courses/${courseId}/schedules`, data);
  return res.data.data;
};

export const deleteSchedule = async (courseId: string, scheduleId: string): Promise<void> => {
  await optionalApi.delete(`/v1/courses/${courseId}/schedules/${scheduleId}`);
};

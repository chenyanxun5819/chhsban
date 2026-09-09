import apiClient from "@/utils/api";
import type { OptionalCourseAttendance, CourseAttendanceStatus } from "@/types";

export const listAttendance = async (courseId: string): Promise<OptionalCourseAttendance[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourseAttendance[] }>(
    `/v1/courses/${courseId}/attendance`,
  );
  return res.data.data;
};

export const recordAttendance = async (
  courseId: string,
  classDate: string,
  records: Array<{ student_id: string; status: CourseAttendanceStatus; absence_reason?: string }>,
): Promise<OptionalCourseAttendance[]> => {
  const res = await apiClient.post<{ success: boolean; data: OptionalCourseAttendance[] }>(
    `/v1/courses/${courseId}/attendance`,
    { class_date: classDate, records },
  );
  return res.data.data;
};

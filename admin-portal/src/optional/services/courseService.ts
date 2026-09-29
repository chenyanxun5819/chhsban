import optionalApi from "@/optional/api";
import type { OptionalCourse, TeacherOption, Weekday } from "@/optional/types";

type ApiResponse<T> = { success: boolean; data: T };

export const listCourses = async (year: number): Promise<OptionalCourse[]> => {
  const res = await optionalApi.get<ApiResponse<OptionalCourse[]>>("/v1/courses", { params: { year } });
  return res.data.data;
};

export const getCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await optionalApi.get<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}`);
  return res.data.data;
};

export const createCourse = async (data: { subject: string; year: number; day_of_week?: Weekday }): Promise<OptionalCourse> => {
  const res = await optionalApi.post<ApiResponse<OptionalCourse>>("/v1/courses", data);
  return res.data.data;
};

/** 設定上課星期（空字串代表清除）；上課星期決定這門課的應點名日期 */
export const updateCourseWeekday = async (courseId: string, dayOfWeek: Weekday | ""): Promise<OptionalCourse> => {
  const res = await optionalApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}`, { day_of_week: dayOfWeek });
  return res.data.data;
};

export const bindTeacher = async (courseId: string, teacherId: string): Promise<OptionalCourse> => {
  const res = await optionalApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/bind-teacher`, {
    teacher_id: teacherId,
  });
  return res.data.data;
};

export const openCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await optionalApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/open`, {});
  return res.data.data;
};

export const closeCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await optionalApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/close`, {});
  return res.data.data;
};

/** 刪除課程（連同名冊／排課／點名，無法復原），僅 super_admin */
export const deleteCourse = async (courseId: string): Promise<void> => {
  await optionalApi.delete(`/v1/courses/${courseId}`);
};

export const listTeachers = async (): Promise<TeacherOption[]> => {
  const res = await optionalApi.get<ApiResponse<TeacherOption[]>>("/v1/teachers");
  return res.data.data;
};

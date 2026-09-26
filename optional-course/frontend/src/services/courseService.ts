import apiClient from "@/utils/api";
import type { OptionalCourse, TeacherOption } from "@/types";

export const listAllCourses = async (year: number): Promise<OptionalCourse[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourse[] }>("/v1/courses", {
    params: { year },
  });
  return res.data.data;
};

export const listMyCourses = async (year: number): Promise<OptionalCourse[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourse[] }>("/v1/my/courses", {
    params: { year },
  });
  return res.data.data;
};

export const getCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourse }>(`/v1/courses/${courseId}`);
  return res.data.data;
};

export const createCourse = async (data: {
  subject: string;
  form?: string;
  day_of_week?: string;
  time_start?: string;
  time_end?: string;
  venue?: string;
  max_students?: number;
  year?: number;
}): Promise<OptionalCourse> => {
  const res = await apiClient.post<{ success: boolean; data: OptionalCourse }>("/v1/courses", data);
  return res.data.data;
};

export const bindTeacher = async (courseId: string, teacherId: string): Promise<OptionalCourse> => {
  const res = await apiClient.put<{ success: boolean; data: OptionalCourse }>(
    `/v1/courses/${courseId}/bind-teacher`,
    { teacher_id: teacherId },
  );
  return res.data.data;
};

export const openCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await apiClient.put<{ success: boolean; data: OptionalCourse }>(
    `/v1/courses/${courseId}/open`,
    {},
  );
  return res.data.data;
};

export const closeCourse = async (courseId: string): Promise<OptionalCourse> => {
  const res = await apiClient.put<{ success: boolean; data: OptionalCourse }>(
    `/v1/courses/${courseId}/close`,
    {},
  );
  return res.data.data;
};

export const listTeachers = async (): Promise<TeacherOption[]> => {
  const res = await apiClient.get<{ success: boolean; data: TeacherOption[] }>("/v1/teachers");
  return res.data.data;
};

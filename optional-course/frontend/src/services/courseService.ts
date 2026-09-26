import apiClient from "@/utils/api";
import type { OptionalCourse } from "@/types";

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

import optionalCourseApi from "@/utils/optionalCourseApi";

export type OptionalCourseWindowStatus = "pending" | "open" | "closed";

export interface OptionalCourse {
  course_id: string;
  course_no: string; // 如 optional-26-01
  year: number;
  subject: string;
  teacher_id?: string;
  teacher_name_cn?: string;
  window_status: OptionalCourseWindowStatus;
  created_at: number;
}

export interface OptionalCourseTeacherOption {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  email: string;
  department: string;
}

type ApiResponse<T> = { success: boolean; data: T };

export const optionalCourseService = {
  async listCourses(year: number): Promise<OptionalCourse[]> {
    const res = await optionalCourseApi.get<ApiResponse<OptionalCourse[]>>("/v1/courses", { params: { year } });
    return res.data.data;
  },

  async createCourse(subject: string, year: number): Promise<OptionalCourse> {
    const res = await optionalCourseApi.post<ApiResponse<OptionalCourse>>("/v1/courses", { subject, year });
    return res.data.data;
  },

  async bindTeacher(courseId: string, teacherId: string): Promise<OptionalCourse> {
    const res = await optionalCourseApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/bind-teacher`, {
      teacher_id: teacherId,
    });
    return res.data.data;
  },

  async openCourse(courseId: string): Promise<OptionalCourse> {
    const res = await optionalCourseApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/open`, {});
    return res.data.data;
  },

  async closeCourse(courseId: string): Promise<OptionalCourse> {
    const res = await optionalCourseApi.put<ApiResponse<OptionalCourse>>(`/v1/courses/${courseId}/close`, {});
    return res.data.data;
  },

  async listTeachers(): Promise<OptionalCourseTeacherOption[]> {
    const res = await optionalCourseApi.get<ApiResponse<OptionalCourseTeacherOption[]>>("/v1/teachers");
    return res.data.data;
  },
};

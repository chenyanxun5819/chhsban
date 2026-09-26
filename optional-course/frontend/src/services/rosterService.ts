import apiClient from "@/utils/api";
import type { OptionalCourseRoster, StudentRecord } from "@/types";

export const listRoster = async (courseId: string): Promise<OptionalCourseRoster[]> => {
  const res = await apiClient.get<{ success: boolean; data: OptionalCourseRoster[] }>(
    `/v1/courses/${courseId}/roster`,
  );
  return res.data.data;
};

export const lookupStudent = async (identifier: string): Promise<StudentRecord> => {
  const res = await apiClient.get<{ success: boolean; data: StudentRecord }>(
    `/v1/students/${encodeURIComponent(identifier)}`,
  );
  return res.data.data;
};

export const addRosterEntry = async (
  courseId: string,
  studentNo: string,
): Promise<OptionalCourseRoster> => {
  const res = await apiClient.post<{ success: boolean; data: OptionalCourseRoster }>(
    `/v1/courses/${courseId}/roster`,
    { student_no: studentNo },
  );
  return res.data.data;
};

export const withdrawRosterEntry = async (
  courseId: string,
  rosterId: string,
  reason: string,
): Promise<OptionalCourseRoster> => {
  const res = await apiClient.put<{ success: boolean; data: OptionalCourseRoster }>(
    `/v1/courses/${courseId}/roster/${rosterId}/withdraw`,
    { reason },
  );
  return res.data.data;
};

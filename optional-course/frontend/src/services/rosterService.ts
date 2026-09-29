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
  withdrawalDate: string,
): Promise<OptionalCourseRoster> => {
  const res = await apiClient.put<{ success: boolean; data: OptionalCourseRoster }>(
    `/v1/courses/${courseId}/roster/${rosterId}/withdraw`,
    { reason, withdrawal_date: withdrawalDate },
  );
  return res.data.data;
};

export type RosterBatchStatus = "ok" | "added" | "already_in_roster" | "not_found" | "duplicate_in_file";

export interface RosterBatchResult {
  student_no: string;
  status: RosterBatchStatus;
  student_name_cn?: string;
  student_name_en?: string;
  student_class?: string;
  entry?: OptionalCourseRoster;
}

/** dryRun=true 只核對學號不寫入（預覽用）；false 才把核對通過的學生加入名冊 */
export const addRosterBatch = async (
  courseId: string,
  studentNos: string[],
  dryRun: boolean,
): Promise<RosterBatchResult[]> => {
  const res = await apiClient.post<{ success: boolean; data: RosterBatchResult[] }>(
    `/v1/courses/${courseId}/roster/batch`,
    { student_nos: studentNos, dry_run: dryRun },
  );
  return res.data.data;
};

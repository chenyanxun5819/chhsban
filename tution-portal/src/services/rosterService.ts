import apiClient from "@/utils/api";
import { ClassRosterEntry } from "@/types";

/**
 * 已開課課程的學生名單服務
 */

export async function getClassRoster(classId: string): Promise<ClassRosterEntry[]> {
  const response = await apiClient.get(`/v1/classes/${classId}/roster`);
  return response.data?.data || [];
}

export async function addRosterStudent(
  classId: string,
  studentId: string
): Promise<ClassRosterEntry> {
  const response = await apiClient.post(`/v1/classes/${classId}/roster`, {
    student_id: studentId,
  });
  return response.data.data;
}

export async function withdrawRosterStudent(
  classId: string,
  rosterId: string,
  reason: string
): Promise<void> {
  await apiClient.put(`/v1/classes/${classId}/roster/${rosterId}/withdraw`, {
    reason,
  });
}

const GENDER_BOARDING_LABELS: Record<string, string> = {
  L: "男 · 走讀",
  LH: "男 · 住宿",
  P: "女 · 走讀",
  PH: "女 · 住宿",
};

export function getGenderBoardingLabel(code: string): string {
  return GENDER_BOARDING_LABELS[code] || code || "-";
}

export function exportRosterToCSV(roster: ClassRosterEntry[], classId: string): void {
  const headers = ["學號", "中文姓名", "英文姓名", "班級", "性別/走宿", "加入日期", "退出日期", "狀態"];
  const rows = roster.map((s) => [
    s.student_no,
    s.name_cn,
    s.name_en,
    s.real_class_name,
    getGenderBoardingLabel(s.gender_boarding),
    s.enrollment_date,
    s.withdrawal_date || "",
    s.is_active ? "在讀" : "已退出",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `roster-${classId}-${Date.now()}.csv`;
  link.click();
}

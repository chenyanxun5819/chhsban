import apiClient from "@/utils/api";
import { TutionClass, TutionRosterSnapshot } from "@/types";

/**
 * 建立新申請
 */
export async function createApplication(
  teacherId: string,
  data: {
    form: string;
    subject: string;
    day_of_week: string;
    start_date: string;
    fees: number;
    venue: string;
    initial_roster?: TutionRosterSnapshot[];
  }
): Promise<TutionClass> {
  const response = await apiClient.post("/v1/classes", {
    teacher_id: teacherId,
    ...data,
  });
  return response.data.data;
}

/**
 * 驗證學生並取得其詳細信息
 */
export async function validateStudent(
  studentId: string
): Promise<TutionRosterSnapshot | null> {
  try {
    const response = await apiClient.get(`/v1/students/${studentId}`);
    if (response.data && response.data.data) {
      const student = response.data.data;
      return {
        student_id: student.student_id,
        student_no: student.student_no,
        name_cn: student.name_cn,
      };
    }
  } catch (error) {
    console.error(`Failed to validate student ${studentId}:`, error);
  }
  return null;
}

/**
 * 批量驗證學生
 */
export async function validateStudents(
  studentIds: string[]
): Promise<{
  valid: TutionRosterSnapshot[];
  invalid: string[];
}> {
  const valid: TutionRosterSnapshot[] = [];
  const invalid: string[] = [];

  for (const id of studentIds) {
    const student = await validateStudent(id);
    if (student) {
      valid.push(student);
    } else {
      invalid.push(id);
    }
  }

  return { valid, invalid };
}

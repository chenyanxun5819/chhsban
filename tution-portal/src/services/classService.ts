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
    time_start: string;
    time_end: string;
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
 * 重新提交學生名單（僅限待審批階段）
 */
export async function updateRoster(
  classId: string,
  students: TutionRosterSnapshot[]
): Promise<TutionClass> {
  const response = await apiClient.put(`/v1/classes/${classId}/roster`, {
    students,
  });
  return response.data.data;
}

/** 學生已離校（後端回 410），不能加入名單 */
export class StudentLeftSchoolError extends Error {
  constructor(public studentId: string) {
    super(`Student ${studentId} has left the school`);
  }
}

/**
 * 驗證學生並取得其詳細信息；查無此學生回 null，已離校丟 StudentLeftSchoolError
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
        name_en: student.name_en || "-",
        real_class_name: student.real_class_name || "-",
        gender_boarding: student.gender_boarding || "-",
      };
    }
  } catch (error: any) {
    if (error?.response?.status === 410) {
      throw new StudentLeftSchoolError(studentId);
    }
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
  left: string[];
}> {
  const valid: TutionRosterSnapshot[] = [];
  const invalid: string[] = [];
  const left: string[] = [];

  for (const id of studentIds) {
    try {
      const student = await validateStudent(id);
      if (student) {
        valid.push(student);
      } else {
        invalid.push(id);
      }
    } catch (error) {
      if (error instanceof StudentLeftSchoolError) {
        left.push(id);
      } else {
        throw error;
      }
    }
  }

  return { valid, invalid, left };
}

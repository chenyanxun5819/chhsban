import apiClient from "@/tution/api";
import type { AttendanceStatusCode } from "@/tution/services/attendanceQueryService";

/**
 * 住宿生點名控管、學號出席查詢（後端 chhsban-tution 的 boarding-attendance.ts）。
 * 兩支都是唯讀，督察員、超級管理員、舍監可用。
 */

/** 該課程在查詢日期的狀況 */
export type BoardingSessionKind = "held" | "rescheduled_in" | "cancelled" | "rescheduled_out";

export interface BoardingStudentRow {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  real_class_name: string;
  gender_boarding: string;
  /** 學生名錄的在校狀態：active 在校／left 已離校／excluded 不計入（STAR 班） */
  student_status?: "active" | "left" | "excluded" | null;
  /** null：尚未點名（停課／調離當天也是 null，不需點名） */
  status: AttendanceStatusCode | null;
  absence_reason?: string;
}

export interface BoardingClassGroup {
  class_id: string;
  form: string;
  subject: string;
  teacher_id: string;
  teacher_name_cn: string;
  time_start: string;
  time_end: string;
  venue: string;
  session: BoardingSessionKind;
  /** rescheduled_in：原本的上課日；rescheduled_out：調去的新日期 */
  related_date?: string;
  reason?: string;
  students: BoardingStudentRow[];
}

export interface BoardingAttendanceResult {
  date: string;
  classes: BoardingClassGroup[];
}

export interface StudentInfo {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  real_class_name: string;
  gender_boarding: string;
  /** 學生名錄的在校狀態：active 在校／left 已離校／excluded 不計入（STAR 班） */
  student_status?: "active" | "left" | "excluded" | null;
}

export interface StudentSessionRow {
  date: string;
  scheduled_date: string;
  session: "held" | "rescheduled" | "cancelled";
  status: AttendanceStatusCode | null;
  absence_reason?: string;
  is_past: boolean;
  on_roster: boolean;
}

export interface StudentClassSummary {
  class_id: string;
  form: string;
  subject: string;
  teacher_id: string;
  teacher_name_cn: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  venue: string;
  start_date: string;
  end_date?: string;
  enrollment_date: string;
  withdrawal_date?: string;
  sessions: StudentSessionRow[];
  stats: {
    present: number;
    late: number;
    absent: number;
    excuse: number;
    unmarked: number;
    attendance_rate: number | null;
  };
}

export interface StudentAttendanceResult {
  student: StudentInfo | null;
  classes: StudentClassSummary[];
}

export const boardingService = {
  async getBoardingAttendance(date: string): Promise<BoardingAttendanceResult> {
    const response = await apiClient.get<{ data: BoardingAttendanceResult }>(
      `/v1/boarding-attendance?date=${encodeURIComponent(date)}`
    );
    return response.data.data;
  },

  /** 查無此學號時回傳 null */
  async getStudentAttendance(studentNo: string): Promise<StudentAttendanceResult | null> {
    try {
      const response = await apiClient.get<{ data: StudentAttendanceResult }>(
        `/v1/student-attendance?student_no=${encodeURIComponent(studentNo)}`
      );
      return response.data.data;
    } catch (error: any) {
      if (error?.response?.status === 404) return null;
      throw error;
    }
  },
};

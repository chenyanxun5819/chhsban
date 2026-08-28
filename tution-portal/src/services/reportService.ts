import apiClient from "@/utils/api";

export interface CourseReportRow {
  class_id: string;
  teacher_id: string;
  teacher_name_cn: string;
  form: string;
  subject: string;
  approval_status: string;
  end_date?: string;
  expected_count: number;
  actual_held_count: number;
  cancelled_count: number;
  unconfirmed_attendance_count: number;
  active_roster_count: number;
  withdrawn_roster_count: number;
  /** 百分比 0-100（到課+遲到 / 已點名總筆數）；尚無任何點名紀錄時為 null */
  attendance_rate: number | null;
  absent_count: number;
  excuse_count: number;
  late_count: number;
}

export interface CourseReportSummary {
  generated_at: number;
  rows: CourseReportRow[];
}

export const reportService = {
  /**
   * 讀取「各課程開課報表」快照。每日凌晨由後端 Cron 重新計算一次，這裡拿到的一律是快照，
   * 不會即時計算——課程數一多，即時算會很慢。
   */
  async getCourseSummary(): Promise<CourseReportSummary | null> {
    const response = await apiClient.get<{ data: CourseReportSummary | null }>(
      "/v1/reports/course-summary"
    );
    return response.data?.data ?? null;
  },
};

import apiClient from "@/utils/api";

/**
 * 出勤記錄查詢／點名寫入服務。
 *
 * 對應後端 GET /api/v1/attendance?class={id}（查詢）與 POST /api/v1/attendance/bulk（點名寫入）。
 * 型別故意不放進 @/types 共用的 TutionAttendance——那個型別目前被既有的
 * AttendanceStats 頁面在用，欄位定義跟這裡（class_id + class_date，沒有 schedule_id）
 * 不一致，屬於另一個尚未清理的既有問題，不在這次點名計畫範圍內。
 */
export type AttendanceStatusCode = "present" | "absent" | "late" | "excuse";

export interface AttendanceQueryRecord {
  attendance_id: string;
  class_id: string;
  student_id: string;
  class_date: string; // YYYY-MM-DD
  status: AttendanceStatusCode;
  absence_reason?: string;
}

export interface AttendanceBulkRecord {
  student_id: string;
  status: AttendanceStatusCode;
  absence_reason?: string; // 僅 status = "excuse" 時需要
}

/** 狀態代號／顏色對照（矩陣總覽格子與點名表共用，避免各處各自維護一份）。 */
export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatusCode,
  { label: string; code: string; color: string }
> = {
  present: { label: "到課", code: "P", color: "#28a745" },
  absent: { label: "缺席", code: "A", color: "#dc3545" },
  late: { label: "遲到", code: "L", color: "#fd7e14" },
  excuse: { label: "請假", code: "E", color: "#6f42c1" },
};

/** 請假理由下拉選項（狀態為「請假」時必選一項；選「其他」需另外填寫文字）。 */
export const EXCUSE_REASON_OPTIONS: string[] = [
  "事假",
  "病假",
  "公假",
  "特假",
  "喪假",
  "活動開會",
  "其他",
];

export const attendanceQueryService = {
  /**
   * 取得某課程所有出勤記錄。查詢失敗直接吞掉回傳空陣列，避免影響排課表格等次要用途；
   * 點名頁本身載入既有紀錄時，會另外檢查錯誤（見呼叫端）。
   */
  async listByClass(classId: string): Promise<AttendanceQueryRecord[]> {
    try {
      const response = await apiClient.get<{ data: AttendanceQueryRecord[] }>(
        `/v1/attendance?class=${classId}`
      );
      return response.data?.data || [];
    } catch (error) {
      console.warn("Failed to fetch attendance records (non-fatal):", error);
      return [];
    }
  },

  /**
   * 批次寫入（覆寫）某班某日期全體學生的點名結果。失敗時拋出例外，由呼叫端顯示錯誤。
   */
  async saveBulk(
    classId: string,
    classDate: string,
    records: AttendanceBulkRecord[]
  ): Promise<AttendanceQueryRecord[]> {
    const response = await apiClient.post<{ data: AttendanceQueryRecord[] }>(
      "/v1/attendance/bulk",
      { class_id: classId, class_date: classDate, records }
    );
    return response.data?.data || [];
  },
};

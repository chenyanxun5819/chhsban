import apiClient from "@/utils/api";
import type { TutionAttendance } from "@/types/index";

export interface CreateAttendancePayload {
  schedule_id: string;
  roster_id: string;
  status: "present" | "absent" | "late";
}

export interface UpdateAttendancePayload {
  status: "present" | "absent" | "late";
}

export const attendanceService = {
  /**
   * 獲取指定排課的所有點名記錄
   */
  async getAttendanceRecords(
    scheduleId: string
  ): Promise<TutionAttendance[]> {
    try {
      const response = await apiClient.get<TutionAttendance[]>(
        `/v1/attendances?schedule=${scheduleId}`
      );
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch attendance records:", error);
      throw error;
    }
  },

  /**
   * 記錄學生出勤 (present/absent/late)
   */
  async recordAttendance(
    scheduleId: string,
    rosterId: string,
    status: "present" | "absent" | "late"
  ): Promise<TutionAttendance> {
    try {
      const payload: CreateAttendancePayload = {
        schedule_id: scheduleId,
        roster_id: rosterId,
        status,
      };
      const response = await apiClient.post<TutionAttendance>(
        `/v1/attendances`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to record attendance:", error);
      throw error;
    }
  },

  /**
   * 更新學生出勤狀態
   */
  async updateAttendance(
    attendanceId: string,
    status: "present" | "absent" | "late"
  ): Promise<TutionAttendance> {
    try {
      const payload: UpdateAttendancePayload = { status };
      const response = await apiClient.put<TutionAttendance>(
        `/v1/attendances/${attendanceId}`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to update attendance:", error);
      throw error;
    }
  },

  /**
   * 批量記錄出勤 (一堂課的所有學生)
   */
  async batchRecordAttendance(
    scheduleId: string,
    records: Array<{ roster_id: string; status: "present" | "absent" | "late" }>
  ): Promise<TutionAttendance[]> {
    try {
      const promises = records.map((record) =>
        this.recordAttendance(scheduleId, record.roster_id, record.status)
      );
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error("Failed to batch record attendance:", error);
      throw error;
    }
  },

  /**
   * 刪除出勤記錄
   */
  async deleteAttendance(attendanceId: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/attendances/${attendanceId}`);
    } catch (error) {
      console.error("Failed to delete attendance:", error);
      throw error;
    }
  },
};

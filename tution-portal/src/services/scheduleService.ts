import apiClient from "@/utils/api";
import type { TutionSchedule } from "@/types/index";

/**
 * 排課例外記錄的建立/更新內容。
 *
 * 後端只儲存「例外」（無開課／調課），「有開課」是預設值、不會實際寫入 KV，
 * 所以這裡的 status 只會是 cancelled 或 rescheduled，不接受 held。
 */
export interface ScheduleExceptionPayload {
  class_id: string;
  scheduled_date: string; // YYYY-MM-DD
  status: "cancelled" | "rescheduled";
  cancellation_reason?: string;
  rescheduled_to?: string;
  reschedule_reason?: string;
}

export const scheduleService = {
  /**
   * 取得指定課程的所有排課例外記錄（無開課/調課）
   */
  async getSchedules(classId: string): Promise<TutionSchedule[]> {
    try {
      const response = await apiClient.get<{ data: TutionSchedule[] }>(
        `/v1/schedules?class=${classId}`
      );
      return response.data?.data || [];
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      throw error;
    }
  },

  /**
   * 建立（或更新，若當天已有例外記錄）一筆排課例外
   */
  async createException(payload: ScheduleExceptionPayload): Promise<TutionSchedule> {
    try {
      const response = await apiClient.post<{ data: TutionSchedule }>(
        `/v1/schedules`,
        payload
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to create schedule exception:", error);
      throw error;
    }
  },

  /**
   * 標記某天無開課（停課）
   */
  async markAsCancelled(
    classId: string,
    scheduledDate: string,
    reason: string
  ): Promise<TutionSchedule> {
    return this.createException({
      class_id: classId,
      scheduled_date: scheduledDate,
      status: "cancelled",
      cancellation_reason: reason,
    });
  },

  /**
   * 標記某天調課（新日期）
   */
  async markAsRescheduled(
    classId: string,
    scheduledDate: string,
    newDate: string,
    reason: string
  ): Promise<TutionSchedule> {
    return this.createException({
      class_id: classId,
      scheduled_date: scheduledDate,
      status: "rescheduled",
      rescheduled_to: newDate,
      reschedule_reason: reason,
    });
  },

  /**
   * 取得全系統所有排課例外記錄（僅 admin/super_admin），供每日教室使用總覽使用
   */
  async listAllSchedules(): Promise<TutionSchedule[]> {
    try {
      const response = await apiClient.get<{ data: TutionSchedule[] }>(`/v1/schedules`);
      return response.data?.data || [];
    } catch (error) {
      console.error("Failed to fetch all schedules:", error);
      throw error;
    }
  },

  /**
   * 管理員為調課後的課程指定教室（rescheduled_venue）
   */
  async assignRescheduleVenue(scheduleId: string, venue: string): Promise<TutionSchedule> {
    try {
      const response = await apiClient.put<{ data: TutionSchedule }>(
        `/v1/schedules/${scheduleId}`,
        { rescheduled_venue: venue }
      );
      return response.data.data;
    } catch (error) {
      console.error("Failed to assign reschedule venue:", error);
      throw error;
    }
  },
};

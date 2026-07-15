import apiClient from "@/utils/api";
import type { TutionSchedule } from "@/types/index";

export interface CreateSchedulePayload {
  class_id: string;
  scheduled_date: string; // YYYY-MM-DD
  status?: "held" | "cancelled" | "rescheduled";
  cancellation_reason?: string;
  rescheduled_to?: string;
  reschedule_reason?: string;
}

export interface UpdateSchedulePayload {
  status: "held" | "cancelled" | "rescheduled";
  cancellation_reason?: string;
  rescheduled_to?: string;
  reschedule_reason?: string;
}

export const scheduleService = {
  /**
   * 取得指定課程的所有開課記錄
   */
  async getSchedules(classId: string): Promise<TutionSchedule[]> {
    try {
      const response = await apiClient.get<TutionSchedule[]>(
        `/v1/schedules?class=${classId}`
      );
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      throw error;
    }
  },

  /**
   * 建立新的開課記錄 (標記為已上課)
   */
  async createSchedule(
    classId: string,
    scheduledDate: string
  ): Promise<TutionSchedule> {
    try {
      const payload: CreateSchedulePayload = {
        class_id: classId,
        scheduled_date: scheduledDate,
        status: "held",
      };
      const response = await apiClient.post<TutionSchedule>(
        `/v1/schedules`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to create schedule:", error);
      throw error;
    }
  },

  /**
   * 標記開課記錄為已上課
   */
  async markAsHeld(scheduleId: string): Promise<TutionSchedule> {
    try {
      const payload: UpdateSchedulePayload = {
        status: "held",
      };
      const response = await apiClient.put<TutionSchedule>(
        `/v1/schedules/${scheduleId}`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to mark schedule as held:", error);
      throw error;
    }
  },

  /**
   * 停課 (需填寫停課原因)
   */
  async markAsCancelled(
    scheduleId: string,
    reason: string
  ): Promise<TutionSchedule> {
    try {
      const payload: UpdateSchedulePayload = {
        status: "cancelled",
        cancellation_reason: reason,
      };
      const response = await apiClient.put<TutionSchedule>(
        `/v1/schedules/${scheduleId}`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to cancel schedule:", error);
      throw error;
    }
  },

  /**
   * 調課 (選擇新日期並填寫原因)
   */
  async markAsRescheduled(
    scheduleId: string,
    newDate: string,
    reason: string
  ): Promise<TutionSchedule> {
    try {
      const payload: UpdateSchedulePayload = {
        status: "rescheduled",
        rescheduled_to: newDate,
        reschedule_reason: reason,
      };
      const response = await apiClient.put<TutionSchedule>(
        `/v1/schedules/${scheduleId}`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to reschedule:", error);
      throw error;
    }
  },

  /**
   * 刪除開課記錄
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/schedules/${scheduleId}`);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      throw error;
    }
  },
};

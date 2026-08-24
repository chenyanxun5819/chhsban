import apiClient from "@/utils/api";

/**
 * 系統設定：目前只有「最後上課日期」——申請人沒自行設定個別課程 end_date 時，
 * 以管理員在這裡設定的日期作為預設終止日。
 */
export const settingsService = {
  async getLastTeachingDate(): Promise<string | null> {
    try {
      const response = await apiClient.get<{ data: { date: string | null } }>(
        `/v1/settings/last-teaching-date`
      );
      return response.data?.data?.date ?? null;
    } catch (error) {
      console.error("Failed to fetch last teaching date:", error);
      throw error;
    }
  },

  async setLastTeachingDate(date: string): Promise<void> {
    try {
      await apiClient.put(`/v1/settings/last-teaching-date`, { date });
    } catch (error) {
      console.error("Failed to set last teaching date:", error);
      throw error;
    }
  },
};

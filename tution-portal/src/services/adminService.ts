import apiClient from "@/utils/api";
import type { TutionClass } from "@/types/index";

export interface ApprovalPayload {
  decision: "approved" | "rejected";
  rejection_reason?: string;
}

export const adminService = {
  /**
   * 獲取所有待審批的應用
   */
  async getPendingApplications(): Promise<TutionClass[]> {
    try {
      const response = await apiClient.get<TutionClass[]>(
        `/v1/classes?status=pending`
      );
      return response.data || [];
    } catch (error) {
      console.error("Failed to fetch pending applications:", error);
      throw error;
    }
  },

  /**
   * 獲取應用詳情
   */
  async getApplicationDetail(classId: string): Promise<TutionClass> {
    try {
      const response = await apiClient.get<TutionClass>(
        `/v1/classes/${classId}`
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to fetch application detail:", error);
      throw error;
    }
  },

  /**
   * 批准應用
   */
  async approveApplication(classId: string): Promise<TutionClass> {
    try {
      const payload: ApprovalPayload = {
        decision: "approved",
      };
      const response = await apiClient.put<TutionClass>(
        `/v1/classes/${classId}/approve`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to approve application:", error);
      throw error;
    }
  },

  /**
   * 拒絕應用
   */
  async rejectApplication(
    classId: string,
    reason: string
  ): Promise<TutionClass> {
    try {
      const payload: ApprovalPayload = {
        decision: "rejected",
        rejection_reason: reason,
      };
      const response = await apiClient.put<TutionClass>(
        `/v1/classes/${classId}/reject`,
        payload
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to reject application:", error);
      throw error;
    }
  },

  /**
   * 指定上課地點（狀態進入審核中，鎖定申請人編輯權限）
   */
  async assignVenue(classId: string, venue: string): Promise<TutionClass> {
    try {
      const response = await apiClient.put<TutionClass>(
        `/v1/classes/${classId}/venue`,
        { venue }
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to assign venue:", error);
      throw error;
    }
  },

  /**
   * 下載應用為 PDF
   */
  async downloadApplicationPdf(classId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/v1/classes/${classId}/pdf`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Failed to download PDF:", error);
      throw error;
    }
  },

  /**
   * 刪除應用
   */
  async deleteApplication(classId: string): Promise<void> {
    try {
      await apiClient.delete(`/v1/classes/${classId}`);
    } catch (error) {
      console.error("Failed to delete application:", error);
      throw error;
    }
  },
};

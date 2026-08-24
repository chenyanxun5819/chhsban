import apiClient from "@/utils/api";
import type { TutionClass } from "@/types/index";
import type { SemesterHalf } from "@/utils/semester";

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
   * 上傳已簽核的紙本申請表掃描檔（存檔備份）
   */
  async uploadSignedForm(classId: string, file: File): Promise<TutionClass> {
    try {
      const response = await apiClient.put<TutionClass>(
        `/v1/classes/${classId}/signed-form`,
        file,
        {
          headers: {
            "Content-Type": file.type,
            "X-Filename": encodeURIComponent(file.name),
          },
        }
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to upload signed form:", error);
      throw error;
    }
  },

  /**
   * 下載已存檔的簽核紙本掃描檔
   */
  async downloadSignedForm(classId: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/v1/classes/${classId}/signed-form`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Failed to download signed form:", error);
      throw error;
    }
  },

  /**
   * 審核申請人上傳的場地費收據（正確／不正確）
   */
  async reviewReceipt(
    classId: string,
    half: SemesterHalf,
    decision: "approved" | "rejected",
    rejectionReason?: string,
  ): Promise<TutionClass> {
    try {
      const response = await apiClient.put<TutionClass>(
        `/v1/classes/${classId}/receipt/review`,
        { half, decision, rejection_reason: rejectionReason },
      );
      return response.data!;
    } catch (error) {
      console.error("Failed to review receipt:", error);
      throw error;
    }
  },

  /**
   * 下載申請人上傳的收據檔案
   */
  async downloadReceipt(classId: string, half: SemesterHalf): Promise<Blob> {
    try {
      const response = await apiClient.get(`/v1/classes/${classId}/receipt?half=${half}`, {
        responseType: "blob",
      });
      return response.data;
    } catch (error) {
      console.error("Failed to download receipt:", error);
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

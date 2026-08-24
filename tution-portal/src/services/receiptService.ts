import apiClient from "@/utils/api";
import type { SemesterHalf } from "@/utils/semester";
import type { TutionClass } from "@/types/index";

export const receiptService = {
  /**
   * 上傳場地費收據（申請人手動輸入收據編號，套用到指定課程與學期）
   * 上傳後即進入「審核中」狀態，無法再更改
   */
  async uploadReceipt(
    classId: string,
    half: SemesterHalf,
    file: File,
    receiptNo: string,
  ): Promise<TutionClass> {
    const response = await apiClient.put<TutionClass>(
      `/v1/classes/${classId}/receipt?half=${half}`,
      file,
      {
        headers: {
          "Content-Type": file.type,
          "X-Filename": encodeURIComponent(file.name),
          "X-Receipt-No": encodeURIComponent(receiptNo),
        },
      },
    );
    return response.data!;
  },

  /**
   * 下載已上傳的收據檔案
   */
  async downloadReceipt(classId: string, half: SemesterHalf): Promise<Blob> {
    const response = await apiClient.get(`/v1/classes/${classId}/receipt?half=${half}`, {
      responseType: "blob",
    });
    return response.data;
  },
};

import apiClient from "@/utils/api";
import type { SemesterHalf } from "@/utils/semester";
import type { TutionClass } from "@/types/index";

export interface ReceiptOcrResult {
  raw_text: string;
  extracted_receipt_no: string | null;
  extracted_teacher_no: string | null;
  extracted_received_from: string | null;
  extracted_description: string | null;
  teacher_match: boolean | null;
}

export const receiptService = {
  /**
   * 預覽辨識收據照片上的 Receipt No. 與申請人工號（僅供上傳前顯示給申請人確認，不會存檔）
   * 實際存檔的收據編號一律由後端在 uploadReceipt 時對圖片重新跑一次 OCR 取得
   */
  async ocrReceipt(file: File): Promise<ReceiptOcrResult> {
    const response = await apiClient.post<{ data: ReceiptOcrResult }>(
      "/v1/classes/receipt-ocr",
      file,
      { headers: { "Content-Type": file.type } },
    );
    return response.data.data;
  },

  /**
   * 上傳場地費收據（收據編號由後端 OCR 直接判讀，不開放手動輸入/修改）
   * 上傳後即進入「審核中」狀態，無法再更改
   */
  async uploadReceipt(classId: string, half: SemesterHalf, file: File): Promise<TutionClass> {
    const response = await apiClient.put<{ data: TutionClass }>(
      `/v1/classes/${classId}/receipt?half=${half}`,
      file,
      {
        headers: {
          "Content-Type": file.type,
          "X-Filename": encodeURIComponent(file.name),
        },
      },
    );
    return response.data.data;
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

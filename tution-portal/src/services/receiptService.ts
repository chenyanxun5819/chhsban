import apiClient from "@/utils/api";
import type { SemesterHalf } from "@/utils/semester";
import type { TutionClass } from "@/types/index";

export interface ReceiptOcrResult {
  raw_text: string;
  extracted_receipt_no: string | null;
  extracted_teacher_no: string | null;
  teacher_match: boolean | null;
}

export const receiptService = {
  /**
   * 辨識收據照片上的 Receipt No. 與申請人工號（僅輔助預填，不會存檔）
   */
  async ocrReceipt(file: File): Promise<ReceiptOcrResult> {
    const response = await apiClient.post<ReceiptOcrResult>("/v1/classes/receipt-ocr", file, {
      headers: { "Content-Type": file.type },
    });
    return response.data!;
  },

  /**
   * 上傳場地費收據（收據編號可由 OCR 預填，申請人仍可手動修正，套用到指定課程與學期）
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

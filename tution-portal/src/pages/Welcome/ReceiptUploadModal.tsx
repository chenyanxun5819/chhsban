import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { receiptService } from "@/services/receiptService";
import type { SemesterHalf } from "@/utils/semester";

interface ReceiptUploadModalProps {
  isOpen: boolean;
  classId: string;
  half: SemesterHalf;
  halfLabel: string;
  onClose: () => void;
  onUploaded: () => void;
}

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  classId,
  half,
  halfLabel,
  onClose,
  onUploaded,
}) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [receiptNo, setReceiptNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrRan, setOcrRan] = useState(false);
  const [teacherMismatchCode, setTeacherMismatchCode] = useState<string | null>(null);

  const resetState = () => {
    setFile(null);
    setReceiptNo("");
    setSubmitting(false);
    setError(null);
    setOcrLoading(false);
    setOcrRan(false);
    setTeacherMismatchCode(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // 選好照片後自動辨識 Receipt No. 跟申請人工號，僅供上傳前預覽——收據編號不開放手動輸入，
  // 一律以後端在正式上傳時重新對圖片跑出的 OCR 結果為準
  const handleFileChange = async (f: File | null) => {
    setFile(f);
    setReceiptNo("");
    setOcrRan(false);
    setTeacherMismatchCode(null);
    if (!f) return;

    setOcrLoading(true);
    try {
      const result = await receiptService.ocrReceipt(f);
      if (result.extracted_receipt_no) {
        setReceiptNo(result.extracted_receipt_no);
      }
      if (result.teacher_match === false && result.extracted_teacher_no) {
        setTeacherMismatchCode(result.extracted_teacher_no);
      }
    } catch (err) {
      console.error("Receipt OCR error:", err);
    } finally {
      setOcrLoading(false);
      setOcrRan(true);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t("receiptModal.errorNoFile"));
      return;
    }
    if (!receiptNo) {
      setError(t("receiptModal.errorOcrRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await receiptService.uploadReceipt(classId, half, file);
      resetState();
      onUploaded();
      onClose();
      alert(t("receiptModal.successUploaded"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("receiptModal.errorUploadFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = !!file && !!receiptNo && !ocrLoading;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{t("receiptModal.title", { half: halfLabel })}</h3>
          <button className="modal-close-btn" onClick={handleClose} disabled={submitting} aria-label={t("receiptModal.close")}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t("receiptModal.photoLabel")}</label>
            <div className="receipt-photo-buttons">
              <input
                type="file"
                id="receipt-file-input"
                accept="image/jpeg,image/png"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-small"
                onClick={() => document.getElementById("receipt-file-input")?.click()}
                disabled={submitting}
              >
                📁 {t("receiptModal.chooseFile")}
              </button>

              <input
                type="file"
                id="receipt-camera-input"
                accept="image/jpeg,image/png"
                capture="environment"
                style={{ display: "none" }}
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                disabled={submitting}
              />
              <button
                type="button"
                className="btn btn-small"
                onClick={() => document.getElementById("receipt-camera-input")?.click()}
                disabled={submitting}
              >
                📷 {t("receiptModal.takePhoto")}
              </button>
            </div>
            {file && <p className="receipt-file-name">{file.name}</p>}
            {ocrLoading && <p className="receipt-ocr-hint">{t("receiptModal.ocrRecognizing")}</p>}
            {!ocrLoading && ocrRan && receiptNo && (
              <p className="receipt-ocr-hint">{t("receiptModal.ocrFoundHint", { no: receiptNo })}</p>
            )}
            {!ocrLoading && ocrRan && !receiptNo && (
              <p className="receipt-ocr-hint receipt-ocr-hint--error">{t("receiptModal.ocrFailedHint")}</p>
            )}
          </div>

          {teacherMismatchCode && (
            <div className="form-group receipt-teacher-mismatch">
              {t("receiptModal.ocrTeacherMismatch", { code: teacherMismatchCode })}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t("receiptModal.receiptNoLabel")}</label>
            <div className="receipt-no-readonly">
              {receiptNo || t("receiptModal.receiptNoPending")}
            </div>
          </div>

          <div className="form-group receipt-warning">
            {t("receiptModal.warning")}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={submitting}>
              {t("receiptModal.cancel")}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !canSubmit}>
              {submitting ? t("receiptModal.uploading") : t("receiptModal.confirmUpload")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

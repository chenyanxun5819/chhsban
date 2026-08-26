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

  const resetState = () => {
    setFile(null);
    setReceiptNo("");
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t("receiptModal.errorNoFile"));
      return;
    }
    if (!receiptNo.trim()) {
      setError(t("receiptModal.errorNoReceiptNo"));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await receiptService.uploadReceipt(classId, half, file, receiptNo.trim());
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
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="receipt-no-input">
              {t("receiptModal.receiptNoLabel")} <span className="required">*</span>
            </label>
            <input
              id="receipt-no-input"
              type="text"
              className="receipt-no-input"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder={t("receiptModal.receiptNoPlaceholder")}
              disabled={submitting}
            />
          </div>

          <div className="form-group receipt-warning">
            {t("receiptModal.warning")}
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={submitting}>
              {t("receiptModal.cancel")}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? t("receiptModal.uploading") : t("receiptModal.confirmUpload")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

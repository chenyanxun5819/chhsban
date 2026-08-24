import React, { useState } from "react";
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
      setError("請選擇收據照片");
      return;
    }
    if (!receiptNo.trim()) {
      setError("請輸入收據編號");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await receiptService.uploadReceipt(classId, half, file, receiptNo.trim());
      resetState();
      onUploaded();
      onClose();
      alert("✅ 收據已上傳，待管理員審核");
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗，請重試");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">📎 上傳{halfLabel}收據</h3>
          <button className="modal-close-btn" onClick={handleClose} disabled={submitting} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">收據照片</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="receipt-no-input">
              收據編號 <span className="required">*</span>
            </label>
            <input
              id="receipt-no-input"
              type="text"
              className="receipt-no-input"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              placeholder="請照收據上的 Receipt No. 輸入"
              disabled={submitting}
            />
          </div>

          <div className="form-group receipt-warning">
            ⚠️ 上傳後無法再更改，請務必核對照片上的號碼與上方輸入是否一致。
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={submitting}>
              取消
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "上傳中..." : "確認上傳"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

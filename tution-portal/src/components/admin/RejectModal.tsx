import React, { useState } from "react";
import "./admin.css";

interface RejectModalProps {
  isOpen: boolean;
  classId: string;
  className: string;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const RejectModal: React.FC<RejectModalProps> = ({
  isOpen,
  classId,
  className,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("請輸入拒絕原因");
      return;
    }

    try {
      await onConfirm(reason);
      setReason("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "拒絕申請失敗，請重試"
      );
      console.error("Reject error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">拒絕申請</h3>
          <button
            className="modal-close-btn"
            onClick={onCancel}
            disabled={loading}
            aria-label="關閉"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-info">
            <strong>班級代碼:</strong> {classId}
          </p>
          <p className="modal-info">
            <strong>班級名稱:</strong> {className}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reject-reason" className="form-label">
                拒絕原因 <span className="required">*</span>
              </label>
              <textarea
                id="reject-reason"
                className="form-textarea"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                placeholder="請輸入拒絕申請的原因..."
                rows={5}
                disabled={loading}
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={onCancel}
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn--danger"
                disabled={loading}
              >
                {loading ? "處理中..." : "確認拒絕"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

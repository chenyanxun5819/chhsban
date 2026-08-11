import React, { useState } from "react";
import { GeneratedScheduleRow } from "@/utils/scheduleGenerator";

interface CancelModalProps {
  row: GeneratedScheduleRow;
  open: boolean;
  loading?: boolean;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({
  row,
  open,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("請輸入停課原因");
      return;
    }

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "標記失敗");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">標記停課</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="alert alert-warning">
            ⚠️ 確認停課後，將無法再修改，請確認！
          </div>

          <div className="form-group">
            <label className="form-label">日期</label>
            <input
              type="date"
              value={row.scheduled_date}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              停課原因 <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              rows={3}
              placeholder="輸入停課原因..."
              required
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="btn btn-secondary"
            >
              取消
            </button>
            <button type="submit" disabled={loading} className="btn btn-danger">
              {loading ? "正在標記..." : "確認停課"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelModal;

import React, { useState } from "react";
import { TutionSchedule } from "@/types";

interface RescheduleModalProps {
  schedule: TutionSchedule;
  open: boolean;
  loading?: boolean;
  onConfirm: (newDate: string, reason: string) => Promise<void>;
  onClose: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  schedule,
  open,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const [newDate, setNewDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError("請選擇新的排期日期");
      return;
    }

    if (!reason.trim()) {
      setError("請輸入改期原因");
      return;
    }

    try {
      await onConfirm(newDate, reason);
      setNewDate("");
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "改期失敗");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">改期排課</h2>
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

          <div className="form-group">
            <label className="form-label">原排期日期</label>
            <input
              type="date"
              value={schedule.scheduled_date}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              新排期日期 <span className="required">*</span>
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="form-control"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              改期原因 <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              rows={3}
              placeholder="輸入改期原因..."
              required
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
            <button
              type="submit"
              disabled={loading}
              className="btn btn-warning"
            >
              {loading ? "正在改期..." : "確認改期"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;

import React, { useState } from "react";
import { GeneratedScheduleRow } from "@/utils/scheduleGenerator";

interface RescheduleModalProps {
  row: GeneratedScheduleRow;
  open: boolean;
  loading?: boolean;
  defaultVenue?: string;
  onConfirm: (newDate: string, newVenue: string, reason: string) => Promise<void>;
  onClose: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  row,
  open,
  loading = false,
  defaultVenue = "",
  onConfirm,
  onClose,
}) => {
  const [newDate, setNewDate] = useState("");
  const [newVenue, setNewVenue] = useState(defaultVenue);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError("請選擇新的上課日期");
      return;
    }
    if (!newVenue.trim()) {
      setError("請輸入新的上課地點");
      return;
    }
    if (!reason.trim()) {
      setError("請輸入調課原因");
      return;
    }

    try {
      await onConfirm(newDate, newVenue.trim(), reason.trim());
      setNewDate("");
      setNewVenue(defaultVenue);
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "調課失敗");
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">調課</h2>
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
            ⚠️ 確認調課後，將無法再修改，請確認！
          </div>

          <div className="form-group">
            <label className="form-label">原上課日期</label>
            <input
              type="date"
              value={row.scheduled_date}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              新上課日期 <span className="required">*</span>
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
              新上課地點 <span className="required">*</span>
            </label>
            <input
              type="text"
              value={newVenue}
              onChange={(e) => setNewVenue(e.target.value)}
              className="form-control"
              placeholder="例如：教室 B203"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              調課原因 <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              rows={3}
              placeholder="輸入調課原因..."
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
            <button type="submit" disabled={loading} className="btn btn-warning">
              {loading ? "正在調課..." : "確認調課"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;

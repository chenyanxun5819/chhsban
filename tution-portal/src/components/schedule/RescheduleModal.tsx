import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { GeneratedScheduleRow } from "@/utils/scheduleGenerator";

interface RescheduleModalProps {
  row: GeneratedScheduleRow;
  open: boolean;
  loading?: boolean;
  onConfirm: (newDate: string, reason: string) => Promise<void>;
  onClose: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({
  row,
  open,
  loading = false,
  onConfirm,
  onClose,
}) => {
  const { t } = useTranslation();
  // 預設帶入原本要調整的那堂課日期，而不是今天，方便老師從原日期附近挑新日期
  const [newDate, setNewDate] = useState(row.scheduled_date);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError(t("rescheduleModal.errorDateRequired"));
      return;
    }
    if (!reason.trim()) {
      setError(t("rescheduleModal.errorReasonRequired"));
      return;
    }

    try {
      await onConfirm(newDate, reason.trim());
      setNewDate(row.scheduled_date);
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("rescheduleModal.errorFailed"));
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">{t("rescheduleModal.title")}</h2>
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
            {t("rescheduleModal.warning")}
          </div>

          <div className="form-group">
            <label className="form-label">{t("rescheduleModal.originalDateLabel")}</label>
            <input
              type="date"
              value={row.scheduled_date}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("rescheduleModal.newDateLabel")} <span className="required">*</span>
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
              {t("rescheduleModal.reasonLabel")} <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              rows={3}
              placeholder={t("rescheduleModal.reasonPlaceholder")}
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
              {t("applicationDetail.cancel")}
            </button>
            <button type="submit" disabled={loading} className="btn btn-warning">
              {loading ? t("rescheduleModal.rescheduling") : t("rescheduleModal.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RescheduleModal;

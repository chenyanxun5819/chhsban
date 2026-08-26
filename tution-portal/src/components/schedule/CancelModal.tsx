import React, { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError(t("cancelModal.errorReasonRequired"));
      return;
    }

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("cancelModal.errorMarkFailed"));
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <h2 className="modal-title">{t("cancelModal.title")}</h2>
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
            {t("cancelModal.warning")}
          </div>

          <div className="form-group">
            <label className="form-label">{t("cancelModal.dateLabel")}</label>
            <input
              type="date"
              value={row.scheduled_date}
              disabled
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t("cancelModal.reasonLabel")} <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="form-control"
              rows={3}
              placeholder={t("cancelModal.reasonPlaceholder")}
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
              {t("applicationDetail.cancel")}
            </button>
            <button type="submit" disabled={loading} className="btn btn-danger">
              {loading ? t("cancelModal.marking") : t("cancelModal.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelModal;

import React, { useMemo, useState } from "react";
import type { TutionClass } from "@/types/index";
import { receiptService } from "@/services/receiptService";
import { getCurrentSemesterInfo, getSemesterInfo, type SemesterHalf } from "@/utils/semester";

interface ReceiptUploadModalProps {
  isOpen: boolean;
  approvedClasses: TutionClass[];
  onClose: () => void;
  onUploaded: () => void;
}

export const ReceiptUploadModal: React.FC<ReceiptUploadModalProps> = ({
  isOpen,
  approvedClasses,
  onClose,
  onUploaded,
}) => {
  const currentSemester = getCurrentSemesterInfo();
  const [half, setHalf] = useState<SemesterHalf>(currentSemester.half);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrDone, setOcrDone] = useState(false);
  const [receiptNo, setReceiptNo] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const semesterInfo = useMemo(() => getSemesterInfo(`${currentSemester.year}-${half === "h1" ? "01" : "07"}-01`), [currentSemester.year, half]);

  // 已經有「審核中」或「已通過」收據的課程不能再選（要改必須先被管理員退回）
  const selectableClasses = approvedClasses.filter((c) => {
    const record = half === "h1" ? c.receipt_h1 : c.receipt_h2;
    return !record || record.status === "rejected";
  });

  const resetState = () => {
    setSelectedClassIds([]);
    setFile(null);
    setOcrLoading(false);
    setOcrDone(false);
    setReceiptNo("");
    setConfirmed(false);
    setSubmitting(false);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setOcrDone(false);
    setReceiptNo("");
    setConfirmed(false);
    setError(null);
  };

  const handleOcr = async () => {
    if (!file) return;
    setOcrLoading(true);
    setError(null);
    try {
      const result = await receiptService.ocrReceipt(file);
      setReceiptNo(result.extracted_receipt_no || "");
      setOcrDone(true);
      if (!result.extracted_receipt_no) {
        setError("無法自動辨識收據編號，請手動輸入並確認");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "收據辨識失敗，請手動輸入編號");
      setOcrDone(true);
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedClassIds.length === 0) {
      setError("請至少選擇一堂課程");
      return;
    }
    if (!file) {
      setError("請選擇收據照片");
      return;
    }
    if (!receiptNo.trim()) {
      setError("請輸入收據編號");
      return;
    }
    if (!confirmed) {
      setError("請先勾選確認收據編號正確");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      for (const classId of selectedClassIds) {
        await receiptService.uploadReceipt(classId, half, file, receiptNo.trim());
      }
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
          <h3 className="modal-title">📎 上傳場地費收據</h3>
          <button className="modal-close-btn" onClick={handleClose} disabled={submitting} aria-label="關閉">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">學期</label>
            <div className="receipt-half-options">
              {(["h1", "h2"] as SemesterHalf[]).map((h) => {
                const info = getSemesterInfo(`${currentSemester.year}-${h === "h1" ? "01" : "07"}-01`);
                return (
                  <label key={h} className="receipt-half-option">
                    <input
                      type="radio"
                      name="receipt-half"
                      checked={half === h}
                      onChange={() => {
                        setHalf(h);
                        setSelectedClassIds([]);
                      }}
                      disabled={submitting}
                    />
                    {info.label}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              適用課程（一張收據可能涵蓋 1~2 堂課，請勾選）
            </label>
            {selectableClasses.length === 0 ? (
              <p className="receipt-empty-hint">
                {semesterInfo.label}沒有可上傳收據的課程（可能尚未有已批准課程，或已上傳過）
              </p>
            ) : (
              <div className="receipt-class-list">
                {selectableClasses.map((c) => (
                  <label key={c.class_id} className="receipt-class-option">
                    <input
                      type="checkbox"
                      checked={selectedClassIds.includes(c.class_id)}
                      onChange={() => toggleClass(c.class_id)}
                      disabled={submitting}
                    />
                    {c.subject}（{c.form}）
                    {(half === "h1" ? c.receipt_h1 : c.receipt_h2)?.status === "rejected" && (
                      <span className="receipt-rejected-tag">上次收據被退回，需重新上傳</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">收據照片</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={submitting}
            />
          </div>

          {file && (
            <div className="form-group">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleOcr}
                disabled={ocrLoading || submitting}
              >
                {ocrLoading ? "辨識中..." : "🔍 辨識收據編號"}
              </button>
            </div>
          )}

          {ocrDone && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="receipt-no-input">
                  收據編號 <span className="required">*</span>
                </label>
                <input
                  id="receipt-no-input"
                  type="text"
                  className="receipt-no-input"
                  value={receiptNo}
                  onChange={(e) => {
                    setReceiptNo(e.target.value);
                    setConfirmed(false);
                  }}
                  placeholder="請確認或手動輸入收據編號"
                  disabled={submitting}
                />
              </div>

              <div className="form-group receipt-warning">
                ⚠️ 上傳後無法再更改收據編號，請務必核對照片上的號碼與上方輸入是否一致。
              </div>

              <div className="form-group">
                <label className="receipt-confirm-checkbox">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    disabled={submitting}
                  />
                  我已核對收據編號正確，並了解上傳後無法更改
                </label>
              </div>
            </>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn btn--secondary" onClick={handleClose} disabled={submitting}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={submitting || !ocrDone || !confirmed}
            >
              {submitting ? "上傳中..." : "確認上傳"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

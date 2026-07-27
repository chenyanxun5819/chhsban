import React, { useState, useEffect } from "react";
import { TutionSchedule, TutionClass } from "@/types";

interface ScheduleFormProps {
  selectedClass?: TutionClass;
  editingSchedule?: TutionSchedule;
  loading?: boolean;
  onSubmit: (data: {
    class_id: string;
    schedule_date: string;
    status: "held" | "cancelled" | "rescheduled";
    remarks?: string;
    rescheduled_to?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  selectedClass,
  editingSchedule,
  loading = false,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    class_id: selectedClass?.class_id || "",
    schedule_date: editingSchedule?.scheduled_date || "",
    status: (editingSchedule?.status || "held") as
      | "held"
      | "cancelled"
      | "rescheduled",
    remarks: editingSchedule?.cancellation_reason || "",
    rescheduled_to: editingSchedule?.rescheduled_to || "",
  });

  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedClass) {
      setFormData((prev) => ({
        ...prev,
        class_id: selectedClass.class_id,
      }));
    }
  }, [selectedClass]);

  const validateForm = () => {
    const newTouched = {
      class_id: true,
      schedule_date: true,
      status: true,
    };
    setTouched(newTouched);

    if (!formData.class_id) {
      setError("請選擇課堂");
      return false;
    }

    if (!formData.schedule_date) {
      setError("請選擇排期日期");
      return false;
    }

    if (formData.status === "rescheduled" && !formData.rescheduled_to) {
      setError("改期狀態必須提供改期日期");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      // Reset form on success
      setFormData({
        class_id: selectedClass?.class_id || "",
        schedule_date: "",
        status: "held",
        remarks: "",
        rescheduled_to: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失敗");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setTouched((prev) => ({
      ...prev,
      [name]: true,
    }));
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Class Selection */}
      {!selectedClass && (
        <div className="form-group">
          <label className="form-label">
            課堂 <span className="required">*</span>
          </label>
          <input
            type="text"
            disabled
            value="未選擇"
            className="form-control"
          />
        </div>
      )}

      {/* Date Input */}
      <div className="form-group">
        <label className="form-label">
          排期日期 <span className="required">*</span>
        </label>
        <input
          type="date"
          name="schedule_date"
          value={formData.schedule_date}
          onChange={handleInputChange}
          className={`form-control ${touched.schedule_date ? (formData.schedule_date ? "is-valid" : "is-invalid") : ""}`}
          required
        />
      </div>

      {/* Status Selection */}
      <div className="form-group">
        <label className="form-label">
          狀態 <span className="required">*</span>
        </label>
        <select
          name="status"
          value={formData.status}
          onChange={handleInputChange}
          className="form-control"
          required
        >
          <option value="held">已進行</option>
          <option value="cancelled">已取消</option>
          <option value="rescheduled">已改期</option>
        </select>
      </div>

      {/* Rescheduled To Date */}
      {formData.status === "rescheduled" && (
        <div className="form-group">
          <label className="form-label">
            改期至日期 <span className="required">*</span>
          </label>
          <input
            type="date"
            name="rescheduled_to"
            value={formData.rescheduled_to}
            onChange={handleInputChange}
            className={`form-control ${
              touched.rescheduled_to
                ? formData.rescheduled_to
                  ? "is-valid"
                  : "is-invalid"
                : ""
            }`}
            required={formData.status === "rescheduled"}
          />
        </div>
      )}

      {/* Remarks */}
      <div className="form-group">
        <label className="form-label">備註</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleInputChange}
          className="form-control"
          rows={3}
          placeholder="輸入此排期的備註..."
        />
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? "正在提交..." : editingSchedule ? "更新排期" : "新增排期"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn btn-secondary"
        >
          取消
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm;

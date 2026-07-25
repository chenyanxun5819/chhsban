import React from "react";
import "./form.css";

interface ScheduleFormProps {
  onSubmit: (data: {
    schedule_date: string;
    status: "held" | "cancelled" | "rescheduled";
    remarks?: string;
    rescheduled_to?: string;
  }) => void;
  isLoading?: boolean;
}

export const ScheduleForm: React.FC<ScheduleFormProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = React.useState<{
    schedule_date: string;
    status: "held" | "cancelled" | "rescheduled";
    remarks: string;
    rescheduled_to: string;
  }>({
    schedule_date: "",
    status: "held",
    remarks: "",
    rescheduled_to: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.schedule_date) {
      alert("請選擇上課日期");
      return;
    }

    if (
      (formData.status as string) === "rescheduled" &&
      !formData.rescheduled_to
    ) {
      alert("請選擇調課日期");
      return;
    }

    onSubmit(formData);
  };

  return (
    <form className="schedule-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>上課日期 *</label>
        <input
          type="date"
          value={formData.schedule_date}
          onChange={(e) =>
            setFormData({ ...formData, schedule_date: e.target.value })
          }
          disabled={isLoading}
          required
        />
      </div>

      <div className="form-group">
        <label>狀態 *</label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData({
              ...formData,
              status: e.target.value as "held" | "cancelled" | "rescheduled",
            })
          }
          disabled={isLoading}
        >
          <option value="held">✅ 上課</option>
          <option value="cancelled">⚠️ 停課</option>
          <option value="rescheduled">🔄 調課</option>
        </select>
      </div>

      {formData.status !== "held" && (
        <div className="form-group">
          <label>原因/備註</label>
          <textarea
            value={formData.remarks}
            onChange={(e) =>
              setFormData({ ...formData, remarks: e.target.value })
            }
            disabled={isLoading}
            placeholder="請說明原因..."
            rows={3}
          />
        </div>
      )}

      {(formData.status as string) === "rescheduled" && (
        <div className="form-group">
          <label>調課至 *</label>
          <input
            type="date"
            value={formData.rescheduled_to}
            onChange={(e) =>
              setFormData({ ...formData, rescheduled_to: e.target.value })
            }
            disabled={isLoading}
            required
          />
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={isLoading} className="btn btn-primary">
          {isLoading ? "處理中..." : "提交"}
        </button>
      </div>
    </form>
  );
};

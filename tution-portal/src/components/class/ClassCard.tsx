import React from "react";
import { TutionClass } from "@/types";
import "./class.css";

interface ClassCardProps {
  class_: TutionClass;
  onView?: (classId: string) => void;
  onEdit?: (classId: string) => void;
  onDelete?: (classId: string) => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({
  class_,
  onView,
  onEdit,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "status-approved";
      case "pending":
        return "status-pending";
      case "rejected":
        return "status-rejected";
      case "active":
        return "status-active";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      approved: "✅ 已批准",
      pending: "⏳ 待審批",
      rejected: "❌ 已拒絕",
      active: "🟢 進行中",
    };
    return labels[status] || status;
  };

  return (
    <div className="class-card">
      <div className="class-card-header">
        <div className="class-title">
          <h3>{class_.subject}</h3>
          <span className={`status-badge ${getStatusColor(class_.approval_status)}`}>
            {getStatusLabel(class_.approval_status)}
          </span>
        </div>
      </div>

      <div className="class-info">
        <div className="info-row">
          <span className="label">教師:</span>
          <span className="value">{class_.teacher_name_cn}</span>
        </div>
        <div className="info-row">
          <span className="label">年級:</span>
          <span className="value">{class_.form}</span>
        </div>
        <div className="info-row">
          <span className="label">時間:</span>
          <span className="value">
            {class_.day_of_week} {class_.time_start} - {class_.time_end}
          </span>
        </div>
        <div className="info-row">
          <span className="label">開課日期:</span>
          <span className="value">{class_.start_date}</span>
        </div>
        <div className="info-row">
          <span className="label">學費:</span>
          <span className="value">RM {class_.fees}</span>
        </div>
        <div className="info-row">
          <span className="label">地點:</span>
          <span className="value">{class_.venue}</span>
        </div>
      </div>

      <div className="class-actions">
        {onView && (
          <button className="btn btn-primary" onClick={() => onView(class_.class_id)}>
            查看詳情
          </button>
        )}
        {onEdit && (
          <button className="btn btn-secondary" onClick={() => onEdit(class_.class_id)}>
            編輯
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={() => onDelete(class_.class_id)}>
            刪除
          </button>
        )}
      </div>
    </div>
  );
};

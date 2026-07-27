import React from "react";
import { TutionRoster, RosterStatus } from "@/types";

interface RosterRowProps {
  student: TutionRoster;
  onEdit: (student: TutionRoster) => void;
  onRemove: (studentId: string) => Promise<void>;
  loading?: boolean;
}

const RosterRow: React.FC<RosterRowProps> = ({
  student,
  onEdit,
  onRemove,
  loading = false,
}) => {
  const [removing, setRemoving] = React.useState(false);

  const handleRemove = async () => {
    if (confirm(`確認移除學生 ${student.name_cn} 嗎？`)) {
      setRemoving(true);
      try {
        await onRemove(student.student_id);
      } finally {
        setRemoving(false);
      }
    }
  };

  const getStatusColor = (status: RosterStatus): string => {
    switch (status) {
      case "active":
        return "success";
      case "dropped":
        return "danger";
      case "initial":
        return "warning";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: RosterStatus): string => {
    switch (status) {
      case "active":
        return "活躍";
      case "dropped":
        return "已移除";
      case "initial":
        return "新增";
      default:
        return "未知";
    }
  };

  return (
    <div className="roster-row">
      <div className="row-content">
        <div className="student-info">
          <div className="student-no">{student.student_no}</div>
          <div className="student-names">
            <span className="name-cn">{student.name_cn}</span>
            <span className="name-en">{student.name_en}</span>
          </div>
        </div>

        <div className="student-meta">
          <span className="class-name">{student.input_class_name}</span>
          <span className={`status-badge ${getStatusColor(student.status)}`}>
            {getStatusLabel(student.status)}
          </span>
        </div>
      </div>

      <div className="row-actions">
        <button
          className="btn btn-outline-primary"
          onClick={() => onEdit(student)}
          disabled={loading || removing}
          aria-label={`編輯 ${student.name_cn}`}
        >
          編輯
        </button>
        {student.status !== "dropped" && (
          <button
            className="btn btn-outline-danger"
            onClick={handleRemove}
            disabled={loading || removing}
            aria-label={`移除 ${student.name_cn}`}
          >
            {removing ? "移除中..." : "移除"}
          </button>
        )}
      </div>
    </div>
  );
};

export default RosterRow;

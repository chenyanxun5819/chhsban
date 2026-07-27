import React, { useState } from "react";
import { TutionRoster, TutionAttendance, AttendanceStatus } from "../../types";

interface AttendanceRowProps {
  student: TutionRoster;
  attendance?: TutionAttendance;
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  loading?: boolean;
  onSelect?: (studentId: string, selected: boolean) => void;
  selected?: boolean;
}

const AttendanceRow: React.FC<AttendanceRowProps> = ({
  student,
  attendance,
  onStatusChange,
  loading = false,
  onSelect,
  selected = false,
}) => {
  const [hoverStatus, setHoverStatus] = useState<AttendanceStatus | null>(null);
  const currentStatus = attendance?.status || "absent";

  const handleStatusClick = (status: AttendanceStatus) => {
    if (!loading) {
      onStatusChange(student.student_id, status);
    }
  };

  const getStatusLabel = (status: AttendanceStatus): string => {
    const labels: Record<AttendanceStatus, string> = {
      present: "✓ 出席",
      late: "⏱ 遲到",
      absent: "✕ 缺席",
    };
    return labels[status];
  };

  const getStatusColor = (status: AttendanceStatus): string => {
    const colors: Record<AttendanceStatus, string> = {
      present: "success",
      late: "warning",
      absent: "danger",
    };
    return colors[status];
  };

  return (
    <div className={`attendance-row ${loading ? "loading" : ""}`}>
      {onSelect && (
        <input
          type="checkbox"
          className="row-checkbox"
          checked={selected}
          onChange={(e) => onSelect(student.student_id, e.target.checked)}
          disabled={loading}
          aria-label={`Select ${student.name_cn}`}
        />
      )}

      <div className="student-info">
        <span className="student-no">{student.student_no}</span>
        <span className="student-name">{student.name_cn}</span>
      </div>

      <div className="status-buttons">
        {(["present", "late", "absent"] as AttendanceStatus[]).map((status) => (
          <button
            key={status}
            className={`status-btn status-${getStatusColor(status)} ${
              currentStatus === status ? "active" : ""
            } ${hoverStatus === status ? "hover" : ""}`}
            onClick={() => handleStatusClick(status)}
            disabled={loading}
            onMouseEnter={() => !loading && setHoverStatus(status)}
            onMouseLeave={() => setHoverStatus(null)}
            aria-pressed={currentStatus === status}
            title={getStatusLabel(status)}
          >
            {getStatusLabel(status)}
          </button>
        ))}
      </div>

      {loading && <div className="loading-spinner" />}
    </div>
  );
};

export default AttendanceRow;

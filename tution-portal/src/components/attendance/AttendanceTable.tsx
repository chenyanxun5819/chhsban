import React from "react";
import "./attendance.css";

interface AttendanceRecord {
  attendance_id: string;
  student_id: string;
  student_name: string;
  status: "present" | "absent" | "late";
}

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onStatusChange: (attendanceId: string, newStatus: "present" | "absent" | "late") => void;
  isLoading?: boolean;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({
  records,
  onStatusChange,
  isLoading = false,
}) => {
  if (records.length === 0) {
    return <div className="empty-state">沒有學生記錄</div>;
  }

  return (
    <div className="attendance-table-container">
      <table className="attendance-table">
        <thead>
          <tr>
            <th>學生 ID</th>
            <th>名稱</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.attendance_id}>
              <td>{record.student_id}</td>
              <td>{record.student_name}</td>
              <td>
                <AttendanceCell
                  status={record.status}
                  onStatusChange={(status) =>
                    onStatusChange(record.attendance_id, status)
                  }
                  disabled={isLoading}
                />
              </td>
              <td>{getStatusEmoji(record.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface AttendanceCellProps {
  status: "present" | "absent" | "late";
  onStatusChange: (status: "present" | "absent" | "late") => void;
  disabled?: boolean;
}

export const AttendanceCell: React.FC<AttendanceCellProps> = ({
  status,
  onStatusChange,
  disabled = false,
}) => {
  const statusOptions: Array<{ value: "present" | "absent" | "late"; label: string; emoji: string }> = [
    { value: "present", label: "出席", emoji: "✅" },
    { value: "absent", label: "缺席", emoji: "❌" },
    { value: "late", label: "遲到", emoji: "⏱️" },
  ];

  return (
    <select
      value={status}
      onChange={(e) =>
        onStatusChange(e.target.value as "present" | "absent" | "late")
      }
      disabled={disabled}
      className="attendance-select"
    >
      {statusOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.emoji} {opt.label}
        </option>
      ))}
    </select>
  );
};

interface AttendanceStatsProps {
  total: number;
  present: number;
  absent: number;
  late: number;
}

export const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  total,
  present,
  absent,
  late,
}) => {
  const rate = total > 0 ? ((present / total) * 100).toFixed(1) : "0";

  return (
    <div className="attendance-stats">
      <div className="stat-card">
        <h4>總學生數</h4>
        <p className="stat-value">{total}</p>
      </div>
      <div className="stat-card stat-present">
        <h4>✅ 出席</h4>
        <p className="stat-value">{present}</p>
      </div>
      <div className="stat-card stat-absent">
        <h4>❌ 缺席</h4>
        <p className="stat-value">{absent}</p>
      </div>
      <div className="stat-card stat-late">
        <h4>⏱️ 遲到</h4>
        <p className="stat-value">{late}</p>
      </div>
      <div className="stat-card stat-rate">
        <h4>📊 出勤率</h4>
        <p className="stat-value">{rate}%</p>
      </div>
    </div>
  );
};

function getStatusEmoji(status: string): string {
  const map: { [key: string]: string } = {
    present: "✅",
    absent: "❌",
    late: "⏱️",
  };
  return map[status] || "❓";
}

import React from "react";
import { TutionClass } from "@/types";
import "./class.css";

interface ClassTableProps {
  classes: TutionClass[];
  onView?: (classId: string) => void;
  onEdit?: (classId: string) => void;
  onDelete?: (classId: string) => void;
}

export const ClassTable: React.FC<ClassTableProps> = ({
  classes,
  onView,
  onEdit,
  onDelete,
}) => {
  if (classes.length === 0) {
    return <div className="empty-state">沒有找到補習班</div>;
  }

  return (
    <div className="class-table-container">
      <table className="class-table">
        <thead>
          <tr>
            <th>科目</th>
            <th>教師</th>
            <th>年級</th>
            <th>時間</th>
            <th>開課日期</th>
            <th>狀態</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((cls) => (
            <tr key={cls.class_id}>
              <td>{cls.subject}</td>
              <td>{cls.teacher_name_cn}</td>
              <td>{cls.form}</td>
              <td>
                {cls.day_of_week} {cls.time_start}-{cls.time_end}
              </td>
              <td>{cls.start_date}</td>
              <td>
                <ClassStatusBadge status={cls.approval_status} />
              </td>
              <td className="actions-cell">
                {onView && (
                  <button className="btn-small" onClick={() => onView(cls.class_id)}>
                    查看
                  </button>
                )}
                {onEdit && (
                  <button className="btn-small" onClick={() => onEdit(cls.class_id)}>
                    編輯
                  </button>
                )}
                {onDelete && (
                  <button className="btn-small btn-danger" onClick={() => onDelete(cls.class_id)}>
                    刪除
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

interface ClassStatusBadgeProps {
  status: string;
}

export const ClassStatusBadge: React.FC<ClassStatusBadgeProps> = ({ status }) => {
  const getStatusDisplay = (status: string) => {
    const map: { [key: string]: { emoji: string; text: string } } = {
      approved: { emoji: "✅", text: "已批准" },
      pending: { emoji: "⏳", text: "待審批" },
      rejected: { emoji: "❌", text: "已拒絕" },
      active: { emoji: "🟢", text: "進行中" },
    };
    return map[status] || { emoji: "❓", text: status };
  };

  const display = getStatusDisplay(status);

  return (
    <span className={`status-badge status-${status}`}>
      {display.emoji} {display.text}
    </span>
  );
};

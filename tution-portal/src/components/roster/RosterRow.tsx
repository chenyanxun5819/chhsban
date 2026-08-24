import React from "react";
import { ClassRosterEntry } from "@/types";

interface RosterRowProps {
  student: ClassRosterEntry;
  onWithdraw: (student: ClassRosterEntry) => Promise<void>;
  loading?: boolean;
  /** 管理員（super_admin）只能檢視，不能操作退出。 */
  readOnly?: boolean;
}

const RosterRow: React.FC<RosterRowProps> = ({
  student,
  onWithdraw,
  loading = false,
  readOnly = false,
}) => {
  const [withdrawing, setWithdrawing] = React.useState(false);

  const handleWithdraw = async () => {
    if (!confirm(`確認讓 ${student.name_cn} 退出此課程嗎？`)) {
      return;
    }
    const reason = window.prompt("請輸入退出原因（可留空）") || "";
    setWithdrawing(true);
    try {
      await onWithdraw({ ...student, withdrawal_reason: reason });
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className={`roster-row ${!student.is_active ? "roster-row--withdrawn" : ""}`}>
      <div className="row-content">
        <div className="student-line-1">
          <span className="student-no">{student.student_no}</span>
          <span className="separator-tab"></span>
          <span className="name-cn">{student.name_cn}</span>
          <span className="separator-tab"></span>
          <span className="name-en">{student.name_en}</span>
        </div>

        <div className="student-line-2">
          <span className="class-name">{student.real_class_name}</span>
          <span className="separator-tab"></span>
          <span className="gender-code">{student.gender_boarding}</span>
          <span className="separator-tab"></span>
          <span className={`status-badge ${student.is_active ? "success" : "danger"}`}>
            {student.is_active ? "在讀" : "已退出"}
          </span>
          {student.is_active && !readOnly && (
            <button
              className="btn btn-outline-danger btn-withdraw"
              onClick={handleWithdraw}
              disabled={loading || withdrawing}
              aria-label={`讓 ${student.name_cn} 退出`}
            >
              {withdrawing ? "處理中..." : "退出"}
            </button>
          )}
        </div>

        <div className="student-line-3">
          <span className="date-info">
            {student.is_active ? `加入: ${student.enrollment_date}` : `退出: ${student.withdrawal_date}`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RosterRow;

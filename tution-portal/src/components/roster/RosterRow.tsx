import React from "react";
import { useTranslation } from "react-i18next";
import { ClassRosterEntry } from "@/types";
import { formatDisplayDate } from "@/utils/validators";

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
  const { t } = useTranslation();
  const [withdrawing, setWithdrawing] = React.useState(false);

  const handleWithdraw = async () => {
    if (!confirm(t("roster.confirmWithdraw", { name: student.name_cn }))) {
      return;
    }
    const reason = window.prompt(t("roster.withdrawReasonPrompt")) || "";
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
            {student.is_active ? t("roster.active") : t("roster.statusWithdrawn")}
          </span>
          {student.is_active && !readOnly && (
            <button
              className="btn btn-outline-danger btn-withdraw"
              onClick={handleWithdraw}
              disabled={loading || withdrawing}
              aria-label={t("roster.withdrawAriaLabel", { name: student.name_cn })}
            >
              {withdrawing ? t("roster.withdrawing") : t("roster.withdrawAction")}
            </button>
          )}
        </div>

        <div className="student-line-3">
          <span className="date-info">
            {student.is_active
              ? t("roster.enrolledLabel", { date: formatDisplayDate(student.enrollment_date) })
              : t("roster.withdrawnLabel", {
                  date: student.withdrawal_date ? formatDisplayDate(student.withdrawal_date) : "-",
                })}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RosterRow;

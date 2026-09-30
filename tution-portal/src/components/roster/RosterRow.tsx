import React from "react";
import { useTranslation } from "react-i18next";
import { ClassRosterEntry } from "@/types";
import { formatDisplayDate } from "@/utils/validators";

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

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
  // 正在填寫的退出資料；退出日期可事後補登，預設今天
  const [form, setForm] = React.useState<{ date: string; reason: string } | null>(null);
  const today = todayStr();

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setWithdrawing(true);
    try {
      await onWithdraw({ ...student, withdrawal_date: form.date, withdrawal_reason: form.reason.trim() });
      setForm(null);
    } catch {
      // 錯誤訊息由上層顯示，保留表單讓使用者修改
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
          {student.student_status === "left" && (
            <>
              <span className="separator-tab"></span>
              <span className="status-badge danger">{t("roster.leftSchool")}</span>
            </>
          )}
          {student.is_active && !readOnly && !form && (
            <button
              className="btn btn-outline-danger btn-withdraw"
              onClick={() => setForm({ date: today, reason: "" })}
              disabled={loading}
              aria-label={t("roster.withdrawAriaLabel", { name: student.name_cn })}
            >
              {t("roster.withdrawAction")}
            </button>
          )}
        </div>

        {form && (
          <form className="withdraw-form" onSubmit={handleWithdraw}>
            <label>
              {t("roster.withdrawDateLabel")}
              <input
                type="date"
                value={form.date}
                min={student.enrollment_date || undefined}
                max={today}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </label>
            <label className="withdraw-form__reason">
              {t("roster.withdrawReasonLabel")}
              <input
                value={form.reason}
                placeholder={t("roster.withdrawReasonPlaceholder")}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </label>
            <button type="submit" className="btn btn-outline-danger btn-withdraw" disabled={loading || withdrawing}>
              {withdrawing ? t("roster.withdrawing") : t("roster.confirmWithdrawAction")}
            </button>
            <button type="button" className="btn btn-withdraw-cancel" onClick={() => setForm(null)} disabled={withdrawing}>
              {t("roster.withdrawCancel")}
            </button>
          </form>
        )}

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

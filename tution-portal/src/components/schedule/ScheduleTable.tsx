import React from "react";
import { useTranslation } from "react-i18next";
import type { GeneratedScheduleRow } from "@/utils/scheduleGenerator";
import { useWeekdayShort } from "@/i18n/labels";

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

interface ScheduleTableProps {
  rows: GeneratedScheduleRow[];
  attendedDates: Set<string>;
  loading?: boolean;
  onCancel: (row: GeneratedScheduleRow) => void;
  onReschedule: (row: GeneratedScheduleRow) => void;
  /** 管理員（super_admin）只能檢視排課，不能停課／調課。 */
  readOnly?: boolean;
}

const AttendanceBadge: React.FC<{ attended: boolean }> = ({ attended }) => {
  const { t } = useTranslation();
  return attended ? (
    <span className="attendance-ok">{t("schedule.attended")}</span>
  ) : (
    <span className="attendance-warn">{t("schedule.notAttended")}</span>
  );
};

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  rows,
  attendedDates,
  loading = false,
  onCancel,
  onReschedule,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const weekdayShort = useWeekdayShort();
  const today = todayStr();

  const formatDateWithWeekday = (dateStr: string): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return `${dateStr}（${weekdayShort(date.getUTCDay())}）`;
  };

  const STATUS_LABEL: Record<GeneratedScheduleRow["status"], string> = {
    held: t("schedule.statusHeld"),
    cancelled: t("schedule.statusCancelled"),
    rescheduled: t("schedule.statusRescheduled"),
  };

  if (loading) {
    return <div className="schedule-table-empty">{t("schedule.loadingText")}</div>;
  }

  if (rows.length === 0) {
    return <div className="schedule-table-empty">{t("schedule.noRows")}</div>;
  }

  return (
    <div className="schedule-table">
      {rows.map((row) => {
        const hasHappened = row.actual_date <= today;
        const attended = attendedDates.has(row.actual_date);

        // 該堂課一旦被學生點過名，就視同已確認上課，停課/調課不再開放；
        // 停課/調課本身也只限操作一次，一旦確認就鎖定，不能再修改。
        const isLocked = row.status !== "held" || attended;

        // 「有開課」原始日期的點名情況：調課後原日期不適用，改在調課明細顯示新日期的點名情況
        const showOriginalAttendance = row.status === "held" && hasHappened;

        return (
          <div key={row.scheduled_date} className={`schedule-row status-${row.status}`}>
            <div className="schedule-row-line1">
              <span className="schedule-row-date">
                {formatDateWithWeekday(row.scheduled_date)}
              </span>
              <span className="schedule-row-attendance">
                {showOriginalAttendance ? <AttendanceBadge attended={attended} /> : "—"}
              </span>
            </div>

            <div className="schedule-row-line2">
              <span className={`schedule-badge status-${row.status}`}>
                {STATUS_LABEL[row.status]}
              </span>

              {row.status === "rescheduled" && (
                <span className="schedule-row-detail">
                  → {formatDateWithWeekday(row.rescheduled_to || "")}
                  {"　"}
                  {hasHappened ? <AttendanceBadge attended={attended} /> : "—"}
                </span>
              )}

              <span className="schedule-row-reason">
                {row.status === "cancelled" && (row.cancellation_reason || "—")}
                {row.status === "rescheduled" && (row.reschedule_reason || "—")}
                {row.status === "held" && "—"}
              </span>

              {!isLocked && !readOnly && (
                <span className="schedule-row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => onCancel(row)}
                  >
                    {t("schedule.cancelAction")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-warning"
                    onClick={() => onReschedule(row)}
                  >
                    {t("schedule.rescheduleAction")}
                  </button>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleTable;

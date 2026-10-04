import React from "react";
import { useTranslation } from "@/tution/i18n";
import { useWeekdayShort } from "@/tution/i18n/labels";
import type { GeneratedScheduleRow, ScheduleSummaryStats } from "@/tution/utils/scheduleGenerator";

/**
 * 排課狀態（唯讀）：由 tution-portal 的 ScheduleStats／ScheduleTable 搬入，
 * 拿掉停課／調課（排課由老師在 tution-portal 自行維護）。
 */

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}

export const ScheduleStats: React.FC<{ stats: ScheduleSummaryStats }> = ({ stats }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="schedule-unconfirmed-banner">
        <span className="schedule-unconfirmed-label">{t("schedule.notAttendedBanner")}</span>
        <span className="schedule-unconfirmed-count">{stats.unconfirmedAttendanceCount}</span>
      </div>
      <div className="schedule-stats-container">
        <div className="schedule-stats-row">
          <div className="stat-item">
            <span className="stat-code">{t("schedule.expectedCount")}</span>
            <span className="stat-amount">{stats.expectedCount}</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-code">{t("schedule.actualHeldCount")}</span>
            <span className="stat-amount">{stats.actualHeldCount}</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-code">{t("schedule.cancelledCount")}</span>
            <span className="stat-amount">{stats.cancelledCount}</span>
          </div>
        </div>
      </div>
    </>
  );
};

const AttendanceBadge: React.FC<{ attended: boolean }> = ({ attended }) => {
  const { t } = useTranslation();
  return attended ? (
    <span className="attendance-ok">{t("schedule.attended")}</span>
  ) : (
    <span className="attendance-warn">{t("schedule.notAttended")}</span>
  );
};

export const ScheduleTable: React.FC<{ rows: GeneratedScheduleRow[]; attendedDates: Set<string> }> = ({
  rows,
  attendedDates,
}) => {
  const { t } = useTranslation();
  const weekdayShort = useWeekdayShort();
  const today = todayStr();

  const formatDateWithWeekday = (dateStr: string): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return `${dateStr}（${weekdayShort(new Date(Date.UTC(y, m - 1, d)).getUTCDay())}）`;
  };

  const STATUS_LABEL: Record<GeneratedScheduleRow["status"], string> = {
    held: t("schedule.statusHeld"),
    cancelled: t("schedule.statusCancelled"),
    rescheduled: t("schedule.statusRescheduled"),
    extra: t("schedule.statusExtra"),
  };

  if (rows.length === 0) {
    return <div className="schedule-table-empty">{t("schedule.noRows")}</div>;
  }

  return (
    <div className="schedule-table">
      {rows.map((row) => {
        const hasHappened = row.actual_date <= today;
        const attended = attendedDates.has(row.actual_date);
        // 「有開課」原始日期的點名情況：調課後原日期不適用，改在調課明細顯示新日期的點名情況
        const showOriginalAttendance = (row.status === "held" || row.status === "extra") && hasHappened;

        return (
          <div key={row.scheduled_date} className={`schedule-row status-${row.status}`}>
            <div className="schedule-row-line1">
              <span className="schedule-row-date">{formatDateWithWeekday(row.scheduled_date)}</span>
              <span className="schedule-row-attendance">
                {showOriginalAttendance ? <AttendanceBadge attended={attended} /> : "—"}
              </span>
            </div>

            <div className="schedule-row-line2">
              <span className={`schedule-badge status-${row.status}`}>{STATUS_LABEL[row.status]}</span>
              {row.status === "rescheduled" && (
                <span className="schedule-row-detail">
                  → {formatDateWithWeekday(row.rescheduled_to || "")}
                  {"　"}
                  {hasHappened ? <AttendanceBadge attended={attended} /> : "—"}
                </span>
              )}
              {(row.status === "held" || row.status === "extra") && (
                <span className="schedule-row-reason">{row.status === "extra" ? row.extra_session_note || "—" : "—"}</span>
              )}
            </div>

            {(row.status === "cancelled" || row.status === "rescheduled") && (
              <div className="schedule-row-line3">
                <span className="schedule-row-reason">
                  {row.status === "cancelled" ? row.cancellation_reason || "—" : row.reschedule_reason || "—"}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

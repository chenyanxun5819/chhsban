import React from "react";
import { useTranslation } from "react-i18next";
import type { ScheduleSummaryStats } from "@/utils/scheduleGenerator";

interface ScheduleStatsProps {
  stats: ScheduleSummaryStats;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({ stats }) => {
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

export default ScheduleStats;

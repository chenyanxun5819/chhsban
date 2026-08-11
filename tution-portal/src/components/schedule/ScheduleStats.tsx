import React from "react";
import type { ScheduleSummaryStats } from "@/utils/scheduleGenerator";

interface ScheduleStatsProps {
  stats: ScheduleSummaryStats;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({ stats }) => {
  return (
    <>
      <div className="schedule-unconfirmed-banner">
        <span className="schedule-unconfirmed-label">未點名</span>
        <span className="schedule-unconfirmed-count">{stats.unconfirmedAttendanceCount}</span>
      </div>

      
        <div className="schedule-stats-row">
          <div className="stat-item">
            <span className="stat-code">應開課數</span>
            <span className="stat-amount">{stats.expectedCount}</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-code">實際開課數</span>
            <span className="stat-amount">{stats.actualHeldCount}</span>
          </div>
          <div className="stat-separator"></div>
          <div className="stat-item">
            <span className="stat-code">停課數</span>
            <span className="stat-amount">{stats.cancelledCount}</span>
          </div>
        </div>

    </>
  );
};

export default ScheduleStats;

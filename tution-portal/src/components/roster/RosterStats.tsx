import React from "react";
import { ClassRosterEntry } from "@/types";

interface RosterStatsProps {
  roster: ClassRosterEntry[];
}

const RosterStats: React.FC<RosterStatsProps> = ({ roster }) => {
  const stats = React.useMemo(() => {
    const active = roster.filter((s) => s.is_active);
    const withdrawn = roster.filter((s) => !s.is_active);

    const countByCode = (code: string) =>
      active.filter((s) => s.gender_boarding === code).length;

    return {
      total: roster.length,
      activeCount: active.length,
      withdrawnCount: withdrawn.length,
      maleDay: countByCode("L"),
      maleBoarding: countByCode("LH"),
      femaleDay: countByCode("P"),
      femaleBoarding: countByCode("PH"),
    };
  }, [roster]);

  return (
    <div className="roster-stats-section">
      <div className="roster-stats">
        <div className="roster-stat-card">
          <div className="stat-label">在讀學生</div>
          <div className="stat-value">{stats.activeCount}</div>
        </div>
        <div className="roster-stat-card danger">
          <div className="stat-label">已退出</div>
          <div className="stat-value">{stats.withdrawnCount}</div>
        </div>
        <div className="roster-stat-card">
          <div className="stat-label">總計</div>
          <div className="stat-value">{stats.total}</div>
        </div>
      </div>

      <div className="roster-stats roster-stats--gender">
        <div className="roster-stat-card info">
          <div className="stat-label">男 · 走讀 (L)</div>
          <div className="stat-value">{stats.maleDay}</div>
        </div>
        <div className="roster-stat-card info">
          <div className="stat-label">男 · 住宿 (LH)</div>
          <div className="stat-value">{stats.maleBoarding}</div>
        </div>
        <div className="roster-stat-card warning">
          <div className="stat-label">女 · 走讀 (P)</div>
          <div className="stat-value">{stats.femaleDay}</div>
        </div>
        <div className="roster-stat-card warning">
          <div className="stat-label">女 · 住宿 (PH)</div>
          <div className="stat-value">{stats.femaleBoarding}</div>
        </div>
      </div>
    </div>
  );
};

export default RosterStats;

import React from "react";
import { TutionRoster } from "@/types";

interface RosterStatsProps {
  roster: TutionRoster[];
}

const RosterStats: React.FC<RosterStatsProps> = ({ roster }) => {
  const stats = React.useMemo(() => {
    const total = roster.length;
    const active = roster.filter((s) => s.status === "active").length;
    const dropped = roster.filter((s) => s.status === "dropped").length;
    const initial = roster.filter((s) => s.status === "initial").length;
    const activeRate = total > 0 ? Math.round((active / total) * 100) : 0;

    return { total, active, dropped, initial, activeRate };
  }, [roster]);

  return (
    <div className="roster-stats">
      <div className="stat-card">
        <div className="stat-label">總人數</div>
        <div className="stat-value">{stats.total}</div>
      </div>

      <div className="stat-card success">
        <div className="stat-label">活躍學生</div>
        <div className="stat-value">{stats.active}</div>
      </div>

      <div className="stat-card warning">
        <div className="stat-label">新增學生</div>
        <div className="stat-value">{stats.initial}</div>
      </div>

      <div className="stat-card danger">
        <div className="stat-label">已移除</div>
        <div className="stat-value">{stats.dropped}</div>
      </div>

      <div className="stat-card info">
        <div className="stat-label">活躍率</div>
        <div className="stat-value">{stats.activeRate}%</div>
      </div>
    </div>
  );
};

export default RosterStats;

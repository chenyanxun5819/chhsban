import React from "react";
import { useTranslation } from "react-i18next";
import { ClassRosterEntry } from "@/types";

interface RosterStatsProps {
  roster: ClassRosterEntry[];
}

const RosterStats: React.FC<RosterStatsProps> = ({ roster }) => {
  const { t } = useTranslation();
  const stats = React.useMemo(() => {
    const active = roster.filter((s) => s.is_active);
    const withdrawn = roster.filter((s) => !s.is_active);

    const countByCode = (code: string) =>
      active.filter((s) => s.gender_boarding === code).length;

    return {
      activeCount: active.length,
      withdrawnCount: withdrawn.length,
      maleDay: countByCode("L"),
      maleBoarding: countByCode("LH"),
      femaleDay: countByCode("P"),
      femaleBoarding: countByCode("PH"),
    };
  }, [roster]);

  return (
    <div className="roster-stats-container">
      <div className="roster-stats-row">
        <div className="stat-item">
          <span className="stat-code">{t("roster.active")}</span>
          <span className="stat-amount">{stats.activeCount}</span>
        </div>
        <div className="stat-separator"></div>
        <div className="stat-item">
          <span className="stat-code">{t("roster.statWithdrawn")}</span>
          <span className="stat-amount">{stats.withdrawnCount}</span>
        </div>
      </div>

      <div className="roster-stats-row">
        <div className="stat-item">
          <span className="stat-code">L</span>
          <span className="stat-amount">{stats.maleDay}</span>
        </div>
        <div className="stat-separator"></div>
        <div className="stat-item">
          <span className="stat-code">LH</span>
          <span className="stat-amount">{stats.maleBoarding}</span>
        </div>
        <div className="stat-separator"></div>
        <div className="stat-item">
          <span className="stat-code">P</span>
          <span className="stat-amount">{stats.femaleDay}</span>
        </div>
        <div className="stat-separator"></div>
        <div className="stat-item">
          <span className="stat-code">PH</span>
          <span className="stat-amount">{stats.femaleBoarding}</span>
        </div>
      </div>
    </div>
  );
};

export default RosterStats;

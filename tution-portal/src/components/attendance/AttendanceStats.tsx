import React, { useMemo } from "react";
import { TutionAttendance, TutionRoster } from "../../types";

interface AttendanceStatsProps {
  attendance: TutionAttendance[];
  roster: TutionRoster[];
}

interface StatsData {
  total: number;
  present: number;
  absent: number;
  late: number;
  presentRate: number;
}

const AttendanceStats: React.FC<AttendanceStatsProps> = ({
  attendance,
  roster,
}) => {
  const stats = useMemo<StatsData>(() => {
    const total = roster.length;
    const present = attendance.filter((a) => a.status === "present").length;
    const absent = attendance.filter((a) => a.status === "absent").length;
    const late = attendance.filter((a) => a.status === "late").length;
    const presentRate = total > 0 ? Math.round((present / total) * 100) : 0;

    return {
      total,
      present,
      absent,
      late,
      presentRate,
    };
  }, [attendance, roster]);

  const chartData = [
    { label: "出席", count: stats.present, percentage: stats.total > 0 ? (stats.present / stats.total) * 100 : 0, color: "success" },
    { label: "遲到", count: stats.late, percentage: stats.total > 0 ? (stats.late / stats.total) * 100 : 0, color: "warning" },
    { label: "缺席", count: stats.absent, percentage: stats.total > 0 ? (stats.absent / stats.total) * 100 : 0, color: "danger" },
  ];

  return (
    <div className="attendance-stats">
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">總人數</div>
        </div>

        <div className="stat-card stat-present">
          <div className="stat-value">{stats.present}</div>
          <div className="stat-label">出席</div>
          <div className="stat-percentage">{Math.round((stats.present / stats.total) * 100) || 0}%</div>
        </div>

        <div className="stat-card stat-late">
          <div className="stat-value">{stats.late}</div>
          <div className="stat-label">遲到</div>
          <div className="stat-percentage">{Math.round((stats.late / stats.total) * 100) || 0}%</div>
        </div>

        <div className="stat-card stat-absent">
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">缺席</div>
          <div className="stat-percentage">{Math.round((stats.absent / stats.total) * 100) || 0}%</div>
        </div>

        <div className="stat-card stat-rate">
          <div className="stat-value">{stats.presentRate}%</div>
          <div className="stat-label">出席率</div>
        </div>
      </div>

      <div className="attendance-chart">
        <h3 className="chart-title">點名分佈</h3>
        <div className="chart-bars">
          {chartData.map((item) => (
            <div key={item.label} className="chart-item">
              <div className="chart-label">{item.label}</div>
              <div className="bar-container">
                <div
                  className={`bar-fill bar-${item.color}`}
                  style={{ width: `${item.percentage}%` }}
                  role="progressbar"
                  aria-valuenow={item.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <div className="bar-info">
                {item.count} / {stats.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AttendanceStats;

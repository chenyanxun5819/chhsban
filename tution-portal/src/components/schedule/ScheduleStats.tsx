import React, { useMemo } from "react";
import { TutionSchedule } from "@/types";

interface ScheduleStatsProps {
  schedules: TutionSchedule[];
}

interface MonthlyStats {
  total: number;
  held: number;
  cancelled: number;
  rescheduled: number;
  attendanceRate: number;
}

const ScheduleStats: React.FC<ScheduleStatsProps> = ({ schedules }) => {
  const stats = useMemo((): MonthlyStats => {
    const total = schedules.length;
    const held = schedules.filter((s) => s.status === "held").length;
    const cancelled = schedules.filter((s) => s.status === "cancelled").length;
    const rescheduled = schedules.filter(
      (s) => s.status === "rescheduled"
    ).length;

    // Calculate attendance rate
    // Attendance tracking will be added in Phase 3.3
    let attendanceRate = 0;

    return {
      total,
      held,
      cancelled,
      rescheduled,
      attendanceRate,
    };
  }, [schedules]);

  // Chart visualization using CSS
  const chartData = [
    { label: "已進行", value: stats.held, color: "success" },
    { label: "已取消", value: stats.cancelled, color: "danger" },
    { label: "已改期", value: stats.rescheduled, color: "warning" },
  ];

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="schedule-stats">
      <div className="stats-grid">
        {/* Total Classes */}
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">全部排課</div>
        </div>

        {/* Held Classes */}
        <div className="stat-card success">
          <div className="stat-value">{stats.held}</div>
          <div className="stat-label">已進行</div>
        </div>

        {/* Cancelled Classes */}
        <div className="stat-card danger">
          <div className="stat-value">{stats.cancelled}</div>
          <div className="stat-label">已取消</div>
        </div>

        {/* Rescheduled Classes */}
        <div className="stat-card warning">
          <div className="stat-value">{stats.rescheduled}</div>
          <div className="stat-label">已改期</div>
        </div>

        {/* Attendance Rate */}
        <div className="stat-card info">
          <div className="stat-value">{stats.attendanceRate.toFixed(1)}%</div>
          <div className="stat-label">出席率</div>
        </div>
      </div>

      {/* Bar Chart */}
      {stats.total > 0 && (
        <div className="stats-chart">
          <h3 className="chart-title">排課狀態分佈</h3>
          <div className="bar-chart">
            {chartData.map((item) => (
              <div key={item.label} className="bar-item">
                <div className="bar-label">{item.label}</div>
                <div className="bar-container">
                  <div
                    className={`bar-fill bar-${item.color}`}
                    style={{
                      width: `${(item.value / maxValue) * 100}%`,
                    }}
                  >
                    <span className="bar-value">{item.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.total === 0 && (
        <div className="stats-empty">
          <p>暫無排課數據</p>
        </div>
      )}
    </div>
  );
};

export default ScheduleStats;

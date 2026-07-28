import React from "react";

interface StatsSummaryProps {
  stats: {
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    attendanceRate: number;
  };
  studentCount: number;
}

const StatsSummary: React.FC<StatsSummaryProps> = ({ stats, studentCount }) => {
  return (
    <div className="stats-summary">
      <div className="stat-card primary">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-label">總出勤記錄</div>
          <div className="stat-value">{stats.totalRecords}</div>
        </div>
      </div>

      <div className="stat-card success">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <div className="stat-label">出席</div>
          <div className="stat-value">{stats.presentCount}</div>
          <div className="stat-percentage">
            {stats.totalRecords > 0
              ? (((stats.presentCount) / stats.totalRecords) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
      </div>

      <div className="stat-card warning">
        <div className="stat-icon">⏰</div>
        <div className="stat-content">
          <div className="stat-label">遲到</div>
          <div className="stat-value">{stats.lateCount}</div>
          <div className="stat-percentage">
            {stats.totalRecords > 0
              ? (((stats.lateCount) / stats.totalRecords) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
      </div>

      <div className="stat-card danger">
        <div className="stat-icon">❌</div>
        <div className="stat-content">
          <div className="stat-label">缺席</div>
          <div className="stat-value">{stats.absentCount}</div>
          <div className="stat-percentage">
            {stats.totalRecords > 0
              ? (((stats.absentCount) / stats.totalRecords) * 100).toFixed(0)
              : 0}
            %
          </div>
        </div>
      </div>

      <div className="stat-card info">
        <div className="stat-icon">📈</div>
        <div className="stat-content">
          <div className="stat-label">出勤率</div>
          <div className="stat-value">{stats.attendanceRate}%</div>
          <div className="stat-subtitle">{studentCount} 名學生</div>
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;

import React from "react";
import { useTranslation } from "react-i18next";

interface AttendanceChartProps {
  data: {
    present: number;
    late: number;
    absent: number;
  };
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data }) => {
  const { t } = useTranslation();
  const total = data.present + data.late + data.absent;
  const presentPct = total > 0 ? (data.present / total) * 100 : 0;
  const latePct = total > 0 ? (data.late / total) * 100 : 0;
  const absentPct = total > 0 ? (data.absent / total) * 100 : 0;

  return (
    <div className="attendance-chart-container">
      <div className="chart-wrapper">
        <h3>{t("attendanceStatsPage.distributionTitle")}</h3>

        {/* 簡易圓形進度圖 */}
        <div className="pie-chart">
          <svg viewBox="0 0 200 200" className="pie-svg">
            {/* 出席比例 (綠色) */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#28a745"
              strokeWidth="20"
              strokeDasharray={`${presentPct * 5.65} 565`}
              strokeDashoffset="0"
              transform="rotate(-90 100 100)"
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />

            {/* 遲到比例 (橙色) */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#ffc107"
              strokeWidth="20"
              strokeDasharray={`${latePct * 5.65} 565`}
              strokeDashoffset={`${-presentPct * 5.65}`}
              transform="rotate(-90 100 100)"
              style={{
                transition: "stroke-dasharray 0.5s ease",
                strokeDashoffset: `${-(presentPct * 5.65)}`,
              }}
            />

            {/* 缺席比例 (紅色) */}
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="#dc3545"
              strokeWidth="20"
              strokeDasharray={`${absentPct * 5.65} 565`}
              strokeDashoffset={`${-((presentPct + latePct) * 5.65)}`}
              transform="rotate(-90 100 100)"
              style={{
                transition: "stroke-dasharray 0.5s ease",
                strokeDashoffset: `${-(presentPct + latePct) * 5.65}`,
              }}
            />

            {/* 中心文字 */}
            <text x="100" y="95" textAnchor="middle" fontSize="20" fontWeight="bold">
              {total}
            </text>
            <text x="100" y="115" textAnchor="middle" fontSize="12" fill="#999">
              {t("attendanceStatsPage.recordsUnit")}
            </text>
          </svg>

          {/* 圖例 */}
          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#28a745" }}></span>
              <span className="legend-label">{t("attendanceStatsPage.legendPresent", { count: data.present, pct: presentPct.toFixed(1) })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#ffc107" }}></span>
              <span className="legend-label">{t("attendanceStatsPage.legendLate", { count: data.late, pct: latePct.toFixed(1) })}</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: "#dc3545" }}></span>
              <span className="legend-label">{t("attendanceStatsPage.legendAbsent", { count: data.absent, pct: absentPct.toFixed(1) })}</span>
            </div>
          </div>
        </div>

        {/* 橫條圖 */}
        <div className="bar-chart">
          <h4>{t("attendanceStatsPage.barChartTitle")}</h4>
          <div className="bar-container">
            <div className="bar-item">
              <div className="bar-label">{t("attendanceStatsPage.present")}</div>
              <div className="bar-track">
                <div
                  className="bar-fill success"
                  style={{ width: `${presentPct}%` }}
                ></div>
              </div>
              <div className="bar-value">{presentPct.toFixed(1)}%</div>
            </div>

            <div className="bar-item">
              <div className="bar-label">{t("attendanceStatsPage.late")}</div>
              <div className="bar-track">
                <div
                  className="bar-fill warning"
                  style={{ width: `${latePct}%` }}
                ></div>
              </div>
              <div className="bar-value">{latePct.toFixed(1)}%</div>
            </div>

            <div className="bar-item">
              <div className="bar-label">{t("attendanceStatsPage.absent")}</div>
              <div className="bar-track">
                <div
                  className="bar-fill danger"
                  style={{ width: `${absentPct}%` }}
                ></div>
              </div>
              <div className="bar-value">{absentPct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;

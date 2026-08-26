import React from "react";
import { useTranslation } from "react-i18next";
import { TutionAttendance } from "@/types";
import { formatDisplayDate } from "@/utils/validators";

interface StudentStat {
  name: string;
  present: number;
  late: number;
  absent: number;
  total: number;
}

interface AttendanceHistoryProps {
  records: TutionAttendance[];
  studentStats: StudentStat[];
}

const AttendanceHistory: React.FC<AttendanceHistoryProps> = ({
  records,
  studentStats,
}) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = React.useState<"by-date" | "by-student">(
    "by-date"
  );
  const [searchTerm, setSearchTerm] = React.useState("");

  // 按日期分組
  const recordsByDate = React.useMemo(() => {
    const grouped: Record<string, TutionAttendance[]> = {};

    records.forEach((record) => {
      const dateStr = formatDisplayDate(record.recorded_at);
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(record);
    });

    return Object.entries(grouped).sort((a, b) => {
      const dateA = new Date(a[0]).getTime();
      const dateB = new Date(b[0]).getTime();
      return dateB - dateA;
    });
  }, [records]);

  // 篩選學生統計
  const filteredStudentStats = React.useMemo(() => {
    if (!searchTerm) return studentStats;
    const term = searchTerm.toLowerCase();
    return studentStats.filter((s) => s.name.toLowerCase().includes(term));
  }, [studentStats, searchTerm]);

  return (
    <div className="attendance-history-container">
      <div className="history-header">
        <h3>{t("attendanceStatsPage.detailTitle")}</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === "by-date" ? "active" : ""}`}
            onClick={() => setViewMode("by-date")}
          >
            {t("attendanceStatsPage.byDate")}
          </button>
          <button
            className={`toggle-btn ${viewMode === "by-student" ? "active" : ""}`}
            onClick={() => setViewMode("by-student")}
          >
            {t("attendanceStatsPage.byStudent")}
          </button>
        </div>
      </div>

      {viewMode === "by-date" ? (
        <div className="history-by-date">
          {recordsByDate.length === 0 ? (
            <div className="empty-message">{t("attendanceStatsPage.noRecords")}</div>
          ) : (
            recordsByDate.map(([date, dateRecords]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <span className="date-label">{date}</span>
                  <span className="record-count">{t("attendanceStatsPage.recordCount", { count: dateRecords.length })}</span>
                </div>

                <div className="records-list">
                  {dateRecords.map((record) => (
                    <div key={record.attendance_id} className="record-item">
                      <div className="record-student">
                        <span className="student-id">{record.student_id}</span>
                      </div>
                      <div className="record-status">
                        {record.status === "present" && (
                          <span className="status-badge success">✅ {t("attendanceStatsPage.present")}</span>
                        )}
                        {record.status === "late" && (
                          <span className="status-badge warning">⏰ {t("attendanceStatsPage.late")}</span>
                        )}
                        {record.status === "absent" && (
                          <span className="status-badge danger">❌ {t("attendanceStatsPage.absent")}</span>
                        )}
                      </div>
                      <div className="record-time">
                        {new Date(record.recorded_at).toLocaleTimeString(
                          "zh-TW"
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="history-by-student">
          <div className="search-box">
            <input
              type="text"
              placeholder={t("attendanceStatsPage.searchStudentPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredStudentStats.length === 0 ? (
            <div className="empty-message">
              {searchTerm ? t("attendanceStatsPage.noMatchingStudent") : t("attendanceStatsPage.noStudentRecords")}
            </div>
          ) : (
            <div className="student-stats-table">
              <div className="table-header">
                <div className="col-name">{t("attendanceStatsPage.studentNameCol")}</div>
                <div className="col-stat">{t("attendanceStatsPage.present")}</div>
                <div className="col-stat">{t("attendanceStatsPage.late")}</div>
                <div className="col-stat">{t("attendanceStatsPage.absent")}</div>
                <div className="col-stat">{t("attendanceStatsPage.totalCol")}</div>
                <div className="col-rate">{t("attendanceStatsPage.attendanceRate")}</div>
              </div>

              {filteredStudentStats.map((stat, idx) => {
                const rate =
                  stat.total > 0
                    ? (((stat.present + stat.late) / stat.total) * 100).toFixed(
                        1
                      )
                    : "0";

                return (
                  <div key={idx} className="table-row">
                    <div className="col-name">{stat.name}</div>
                    <div className="col-stat success">{stat.present}</div>
                    <div className="col-stat warning">{stat.late}</div>
                    <div className="col-stat danger">{stat.absent}</div>
                    <div className="col-stat">{stat.total}</div>
                    <div className={`col-rate ${rate === "100" ? "excellent" : rate === "0" ? "poor" : ""}`}>
                      {rate}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;

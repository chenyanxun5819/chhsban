import React from "react";
import { TutionAttendance } from "@/types";

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
  const [viewMode, setViewMode] = React.useState<"by-date" | "by-student">(
    "by-date"
  );
  const [searchTerm, setSearchTerm] = React.useState("");

  // 按日期分組
  const recordsByDate = React.useMemo(() => {
    const grouped: Record<string, TutionAttendance[]> = {};

    records.forEach((record) => {
      const dateStr = new Date(record.recorded_at).toLocaleDateString(
        "zh-TW"
      );
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
        <h3>出勤詳細記錄</h3>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === "by-date" ? "active" : ""}`}
            onClick={() => setViewMode("by-date")}
          >
            📅 按日期
          </button>
          <button
            className={`toggle-btn ${viewMode === "by-student" ? "active" : ""}`}
            onClick={() => setViewMode("by-student")}
          >
            👥 按學生
          </button>
        </div>
      </div>

      {viewMode === "by-date" ? (
        <div className="history-by-date">
          {recordsByDate.length === 0 ? (
            <div className="empty-message">暫無出勤記錄</div>
          ) : (
            recordsByDate.map(([date, dateRecords]) => (
              <div key={date} className="date-group">
                <div className="date-header">
                  <span className="date-label">{date}</span>
                  <span className="record-count">({dateRecords.length} 筆)</span>
                </div>

                <div className="records-list">
                  {dateRecords.map((record) => (
                    <div key={record.attendance_id} className="record-item">
                      <div className="record-student">
                        <span className="student-id">{record.student_id}</span>
                      </div>
                      <div className="record-status">
                        {record.status === "present" && (
                          <span className="status-badge success">✅ 出席</span>
                        )}
                        {record.status === "late" && (
                          <span className="status-badge warning">⏰ 遲到</span>
                        )}
                        {record.status === "absent" && (
                          <span className="status-badge danger">❌ 缺席</span>
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
              placeholder="搜尋學生名字..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {filteredStudentStats.length === 0 ? (
            <div className="empty-message">
              {searchTerm ? "未找到符合條件的學生" : "暫無學生出勤記錄"}
            </div>
          ) : (
            <div className="student-stats-table">
              <div className="table-header">
                <div className="col-name">學生名字</div>
                <div className="col-stat">出席</div>
                <div className="col-stat">遲到</div>
                <div className="col-stat">缺席</div>
                <div className="col-stat">總計</div>
                <div className="col-rate">出勤率</div>
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

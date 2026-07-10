import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import apiClient from "@/utils/api";
import {
  AttendanceRecord,
  AttendanceStats,
  TutionRoster,
  TutionScheduleExtended,
  AttendanceRecordStatus,
} from "@/types/index";
import "./attendance-sheet.css";

interface GridCell {
  studentId: string;
  scheduleId: string;
  status: AttendanceRecordStatus;
  remarks?: string;
}

export const AttendanceSheet: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();

  const [students, setStudents] = useState<TutionRoster[]>([]);
  const [schedules, setSchedules] = useState<TutionScheduleExtended[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<Map<string, AttendanceStats>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    from: "",
    to: "",
  });
  const [changes, setChanges] = useState<Map<string, AttendanceRecordStatus>>(
    new Map()
  );
  const [editMode, setEditMode] = useState(false);

  const statusOptions: AttendanceRecordStatus[] = [
    "present",
    "absent",
    "late",
    "early",
    "not_attended",
  ];

  const getStatusLabel = (status: AttendanceRecordStatus) => {
    const labels: Record<AttendanceRecordStatus, string> = {
      present: "✓ 出席",
      absent: "✗ 缺席",
      late: "/ 遲到",
      early: "~ 提早",
      not_attended: "- 未上",
    };
    return labels[status];
  };

  const getStatusColor = (status: AttendanceRecordStatus) => {
    const colors: Record<AttendanceRecordStatus, string> = {
      present: "status-present",
      absent: "status-absent",
      late: "status-late",
      early: "status-early",
      not_attended: "status-not-attended",
    };
    return colors[status];
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [classId, dateRange]);

  const fetchAttendanceData = async () => {
    if (!classId) return;

    try {
      setLoading(true);

      const [studentRes, scheduleRes, attendanceRes, statsRes] =
        await Promise.all([
          apiClient.get<TutionRoster[]>(`/v1/classes/${classId}/roster`),
          apiClient.get<TutionScheduleExtended[]>(
            `/v1/classes/${classId}/schedule`
          ),
          apiClient.get<AttendanceRecord[]>(
            `/v1/classes/${classId}/attendance`
          ),
          apiClient.get<Record<string, AttendanceStats>>(
            `/v1/classes/${classId}/attendance/stats`
          ),
        ]);

      if (studentRes.data) {
        setStudents(studentRes.data);
      }

      if (scheduleRes.data) {
        setSchedules(
          scheduleRes.data.filter((s) =>
            dateRange.from && dateRange.to
              ? s.date >= dateRange.from && s.date <= dateRange.to
              : true
          )
        );
      }

      if (attendanceRes.data) {
        setAttendance(attendanceRes.data);
      }

      if (statsRes.data) {
        const statsMap = new Map(
          Object.entries(statsRes.data).map(([key, value]) => [key, value])
        );
        setStats(statsMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入出席數據失敗");
      console.error("Attendance data fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceRecord = (
    studentId: string,
    scheduleId: string
  ): AttendanceRecord | undefined => {
    return attendance.find(
      (a) => a.student_id === studentId && a.schedule_id === scheduleId
    );
  };

  const getCellStatus = (
    studentId: string,
    scheduleId: string
  ): AttendanceRecordStatus | null => {
    const changeKey = `${studentId}-${scheduleId}`;
    if (changes.has(changeKey)) {
      return changes.get(changeKey) || null;
    }

    const record = getAttendanceRecord(studentId, scheduleId);
    return record?.status || null;
  };

  const handleCellClick = (studentId: string, scheduleId: string) => {
    if (!editMode) return;

    const changeKey = `${studentId}-${scheduleId}`;
    const currentStatus = getCellStatus(studentId, scheduleId);
    const currentIndex = statusOptions.indexOf(
      currentStatus || "not_attended"
    );
    const nextIndex = (currentIndex + 1) % statusOptions.length;
    const nextStatus = statusOptions[nextIndex];

    const newChanges = new Map(changes);
    newChanges.set(changeKey, nextStatus);
    setChanges(newChanges);
  };

  const handleBulkAction = (action: string) => {
    const newChanges = new Map(changes);

    schedules.forEach((schedule) => {
      students.forEach((student) => {
        const key = `${student.student_id}-${schedule.schedule_id}`;

        switch (action) {
          case "all-present":
            newChanges.set(key, "present");
            break;
          case "all-absent":
            newChanges.set(key, "absent");
            break;
          case "clear-all":
            newChanges.delete(key);
            break;
        }
      });
    });

    setChanges(newChanges);
  };

  const handleSaveChanges = async () => {
    if (!classId || changes.size === 0) return;

    try {
      const payload = Array.from(changes.entries()).map(
        ([key, status]) => {
          const [studentId, scheduleId] = key.split("-");
          return {
            student_id: studentId,
            schedule_id: scheduleId,
            status,
          };
        }
      );

      await apiClient.post(`/v1/classes/${classId}/attendance/bulk`, {
        records: payload,
      });

      await fetchAttendanceData();
      setChanges(new Map());
      setEditMode(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存出席記錄失敗");
      console.error("Save attendance error:", err);
    }
  };

  const calculateAttendanceRate = (studentId: string): number => {
    const studentStats = stats.get(studentId);
    return studentStats
      ? Math.round(
          (studentStats.presentCount / studentStats.totalSessions) * 100 || 0
        )
      : 0;
  };

  if (loading) {
    return (
      <Layout title="出席表">
        <div className="attendance-sheet">
          <div className="loading-spinner">載入中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="出席表">
      <div className="attendance-sheet">
        {/* Header */}
        <div className="attendance-header">
          <h2>出席表</h2>
          <div className="header-controls">
            <div className="date-range">
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                placeholder="開始日期"
              />
              <span>至</span>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                placeholder="結束日期"
              />
            </div>

            <div className="header-actions">
              {editMode && (
                <>
                  <button
                    className="bulk-action-btn"
                    onClick={() => handleBulkAction("all-present")}
                  >
                    ✓ 全選出席
                  </button>
                  <button
                    className="bulk-action-btn"
                    onClick={() => handleBulkAction("all-absent")}
                  >
                    ✗ 全選缺席
                  </button>
                  <button
                    className="bulk-action-btn"
                    onClick={() => handleBulkAction("clear-all")}
                  >
                    清除全部
                  </button>
                </>
              )}

              <button
                className={`edit-btn ${editMode ? "active" : ""}`}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "✓ 完成編輯" : "✎ 編輯"}
              </button>

              {editMode && (
                <button className="save-btn" onClick={handleSaveChanges}>
                  💾 保存
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className="grid-container">
          <table className="attendance-grid">
            <thead>
              <tr>
                <th className="student-col">
                  <div className="th-content">
                    <div>學生</div>
                    <div className="rate">出席率</div>
                  </div>
                </th>
                {schedules.map((schedule) => (
                  <th key={schedule.schedule_id} className="date-col">
                    <div className="th-content">
                      <div className="date">
                        {new Date(schedule.date).toLocaleDateString("zh-TW", {
                          month: "2-digit",
                          day: "2-digit",
                        })}
                      </div>
                      <div className="day">
                        {new Date(schedule.date).toLocaleDateString("zh-TW", {
                          weekday: "short",
                        })}
                      </div>
                      <div className="time">{schedule.start_time}</div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.student_id} className="student-row">
                  <td className="student-col">
                    <div className="student-info">
                      <div className="student-name">{student.name_cn}</div>
                      <div className="student-id">{student.student_no}</div>
                      <div className="attendance-rate">
                        {calculateAttendanceRate(student.student_id)}%
                      </div>
                    </div>
                  </td>

                  {schedules.map((schedule) => {
                    const status = getCellStatus(
                      student.student_id,
                      schedule.schedule_id
                    );
                    const isChanged =
                      changes.has(
                        `${student.student_id}-${schedule.schedule_id}`
                      );

                    return (
                      <td
                        key={`${student.student_id}-${schedule.schedule_id}`}
                        className={`attendance-cell ${
                          status ? getStatusColor(status) : "status-empty"
                        } ${isChanged ? "changed" : ""} ${
                          editMode ? "editable" : ""
                        }`}
                        onClick={() =>
                          handleCellClick(
                            student.student_id,
                            schedule.schedule_id
                          )
                        }
                        title={status ? getStatusLabel(status) : "未記錄"}
                      >
                        <div className="cell-content">
                          {status ? (
                            <span className="status-symbol">
                              {status === "present" && "✓"}
                              {status === "absent" && "✗"}
                              {status === "late" && "/"}
                              {status === "early" && "~"}
                              {status === "not_attended" && "-"}
                            </span>
                          ) : (
                            <span className="status-empty-symbol">·</span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistics */}
        <div className="statistics-section">
          <h3>出席統計</h3>
          <div className="stats-grid">
            {Array.from(stats.values())
              .slice(0, 5)
              .map((stat) => (
                <div key={stat.studentId} className="stat-card">
                  <div className="stat-name">{stat.studentName}</div>
                  <div className="stat-content">
                    <div className="stat-item">
                      <span className="label">出席</span>
                      <span className="value present">
                        {stat.presentCount}
                      </span>
                    </div>
                    <div className="stat-item">
                      <span className="label">缺席</span>
                      <span className="value absent">{stat.absentCount}</span>
                    </div>
                    <div className="stat-item">
                      <span className="label">遲到</span>
                      <span className="value late">{stat.lateCount}</span>
                    </div>
                  </div>
                  <div className="stat-rate">
                    出席率: {Math.round(stat.attendanceRate)}%
                  </div>
                </div>
              ))}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Legend */}
        <div className="legend">
          <div className="legend-title">狀態說明：</div>
          <div className="legend-items">
            <div className="legend-item">
              <span className="legend-symbol present">✓</span>
              <span>出席</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol absent">✗</span>
              <span>缺席</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol late">/</span>
              <span>遲到</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol early">~</span>
              <span>提早離開</span>
            </div>
            <div className="legend-item">
              <span className="legend-symbol not-attended">-</span>
              <span>未上課</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AttendanceSheet;

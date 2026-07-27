import React, { useState, useCallback, useMemo } from "react";
import { TutionSchedule, TutionRoster, TutionAttendance, AttendanceStatus } from "../../types";
import AttendanceRow from "./AttendanceRow";

interface AttendanceSheetProps {
  schedule: TutionSchedule;
  roster: TutionRoster[];
  onSubmit: (attendanceData: Partial<TutionAttendance>[]) => Promise<void>;
  onCancel: () => void;
  existingAttendance?: TutionAttendance[];
  classInfo?: { subject: string; form: string };
}

const AttendanceSheet: React.FC<AttendanceSheetProps> = ({
  schedule,
  roster,
  onSubmit,
  onCancel,
  existingAttendance = [],
  classInfo,
}) => {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(
      existingAttendance.map((a) => [a.student_id, a.status])
    ) || {}
  );

  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
    new Set()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (studentId: string, status: AttendanceStatus) => {
      setAttendance((prev) => ({ ...prev, [studentId]: status }));
      setError(null);
    },
    []
  );

  const handleSelectStudent = useCallback((studentId: string, selected: boolean) => {
    setSelectedStudents((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(studentId);
      } else {
        newSet.delete(studentId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedStudents.size === roster.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(roster.map((s) => s.student_id)));
    }
  }, [roster, selectedStudents.size]);

  const handleBatchStatus = useCallback(
    (status: AttendanceStatus) => {
      if (selectedStudents.size === 0) {
        setError("請先選擇學生");
        return;
      }

      setAttendance((prev) => {
        const updated = { ...prev };
        selectedStudents.forEach((studentId) => {
          updated[studentId] = status;
        });
        return updated;
      });
      setSelectedStudents(new Set());
      setError(null);
    },
    [selectedStudents]
  );

  const handleClearAll = useCallback(() => {
    setAttendance({});
    setSelectedStudents(new Set());
    setError(null);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const attendanceData = roster.map((student) => ({
        schedule_id: schedule.schedule_id,
        class_id: schedule.class_id,
        student_id: student.student_id,
        status: attendance[student.student_id] || "absent",
        recorded_at: Date.now(),
      }));

      await onSubmit(attendanceData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存點名記錄失敗，請重試"
      );
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const present = Object.values(attendance).filter((s) => s === "present").length;
    const absent = Object.values(attendance).filter((s) => s === "absent").length;
    const late = Object.values(attendance).filter((s) => s === "late").length;
    return { present, absent, late };
  }, [attendance]);

  const formattedDate = new Date(schedule.scheduled_date).toLocaleDateString(
    "zh-TW",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }
  );

  return (
    <div className="attendance-sheet">
      {/* 排期頭部 */}
      <div className="sheet-header">
        <div className="header-title">
          <h2>點名記錄</h2>
          <span className="schedule-date">{formattedDate}</span>
        </div>
        {classInfo && (
          <div className="class-info">
            <span className="class-subject">{classInfo.subject}</span>
            <span className="class-form">{classInfo.form}</span>
          </div>
        )}
      </div>

      {/* 快速統計 */}
      <div className="quick-stats">
        <div className="stat-badge">
          <span className="badge-label">出席</span>
          <span className="badge-value">{stats.present}</span>
        </div>
        <div className="stat-badge">
          <span className="badge-label">遲到</span>
          <span className="badge-value">{stats.late}</span>
        </div>
        <div className="stat-badge">
          <span className="badge-label">缺席</span>
          <span className="badge-value">{stats.absent}</span>
        </div>
      </div>

      {/* 工具欄 */}
      <div className="sheet-toolbar">
        <div className="toolbar-left">
          <button
            className={`btn btn-sm ${selectedStudents.size === roster.length ? "btn-secondary" : "btn-primary"}`}
            onClick={handleSelectAll}
            disabled={loading}
          >
            {selectedStudents.size === roster.length ? "取消全選" : "全選"}
            ({selectedStudents.size}/{roster.length})
          </button>
        </div>

        <div className="toolbar-actions">
          {selectedStudents.size > 0 && (
            <>
              <button
                className="btn btn-sm btn-success"
                onClick={() => handleBatchStatus("present")}
                disabled={loading}
              >
                標記出席 ({selectedStudents.size})
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => handleBatchStatus("late")}
                disabled={loading}
              >
                標記遲到 ({selectedStudents.size})
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => handleBatchStatus("absent")}
                disabled={loading}
              >
                標記缺席 ({selectedStudents.size})
              </button>
            </>
          )}
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleClearAll}
            disabled={loading}
          >
            清空
          </button>
        </div>
      </div>

      {/* 錯誤提示 */}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
          <button
            className="alert-close"
            onClick={() => setError(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}

      {/* 學生列表 */}
      <div className="roster-container">
        {roster.length === 0 ? (
          <div className="empty-state">
            <p>沒有學生記錄</p>
          </div>
        ) : (
          roster.map((student) => (
            <AttendanceRow
              key={student.student_id}
              student={student}
              attendance={{
                ...({} as TutionAttendance),
                student_id: student.student_id,
                status: attendance[student.student_id] || "absent",
              }}
              onStatusChange={handleStatusChange}
              onSelect={handleSelectStudent}
              selected={selectedStudents.has(student.student_id)}
              loading={loading}
            />
          ))
        )}
      </div>

      {/* 按鈕欄 */}
      <div className="sheet-footer">
        <button
          className="btn btn-lg btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          取消
        </button>
        <button
          className="btn btn-lg btn-primary"
          onClick={handleSubmit}
          disabled={loading || roster.length === 0}
        >
          {loading ? "保存中..." : "保存點名記錄"}
        </button>
      </div>
    </div>
  );
};

export default AttendanceSheet;

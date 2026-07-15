import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { scheduleService } from "@/services/scheduleService";
import { attendanceService } from "@/services/attendanceService";
import type { TutionSchedule, TutionRoster } from "@/types/index";
import "./attendance-sheet.css";

interface StudentAttendance {
  roster_id: string;
  student_name: string;
  status: "present" | "absent" | "late";
}

export const AttendanceSheet: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schedules, setSchedules] = useState<TutionSchedule[]>([]);
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<
    string | null
  >(null);

  useEffect(() => {
    if (classId) {
      fetchSchedules();
    }
  }, [classId]);

  useEffect(() => {
    if (selectedScheduleId && classId) {
      fetchStudents(classId, selectedScheduleId);
    }
  }, [selectedScheduleId, classId]);

  const fetchSchedules = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const data = await scheduleService.getSchedules(classId);
      // 只顯示已上課的記錄
      const heldSchedules = data.filter(
        (s) => s.status === "held" || !s.status
      );
      const sorted = [...heldSchedules].sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      );
      setSchedules(sorted);
      if (sorted.length > 0) {
        setSelectedScheduleId(sorted[0].schedule_id);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "載入課程記錄失敗"
      );
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId: string, scheduleId: string) => {
    // TODO: 實現從 API 獲取該課程學生名單的邏輯
    // 暫時使用 mock 數據，正式環境應該從 TutionRoster 表查詢
    try {
      // 這裡應該調用 API 獲取該課程的所有學生
      // const response = await classService.getClassRoster(classId);
      const mockStudents: StudentAttendance[] = [
        {
          roster_id: "roster_1",
          student_name: "學生 A",
          status: "present",
        },
        {
          roster_id: "roster_2",
          student_name: "學生 B",
          status: "present",
        },
        {
          roster_id: "roster_3",
          student_name: "學生 C",
          status: "absent",
        },
      ];
      setStudents(mockStudents);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "載入學生名單失敗"
      );
    }
  };

  const handleStatusChange = (rosterId: string, newStatus: string) => {
    setStudents((prevStudents) =>
      prevStudents.map((student) =>
        student.roster_id === rosterId
          ? {
              ...student,
              status: newStatus as "present" | "absent" | "late",
            }
          : student
      )
    );
  };

  const handleSubmit = async () => {
    if (!selectedScheduleId || students.length === 0) {
      setError("請選擇課程並確保有學生名單");
      return;
    }

    try {
      setLoading(true);
      await attendanceService.batchRecordAttendance(
        selectedScheduleId,
        students.map((s) => ({
          roster_id: s.roster_id,
          status: s.status,
        }))
      );
      setSuccessMsg("點名記錄已保存");
      setTimeout(() => setSuccessMsg(null), 3000);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "保存點名記錄失敗"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "present";
      case "absent":
        return "absent";
      case "late":
        return "late";
      default:
        return "";
    }
  };

  if (loading && schedules.length === 0) {
    return (
      <Layout title="點名表">
        <div className="attendance-loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="點名表">
      <div className="attendance-container">
        {/* 訊息 */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && (
          <div className="alert alert-success">{successMsg}</div>
        )}

        {/* 課程選擇 */}
        <div className="schedule-selector">
          <label>選擇課程日期：</label>
          <select
            value={selectedScheduleId || ""}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="schedule-select"
          >
            <option value="">-- 選擇課程 --</option>
            {schedules.map((schedule) => (
              <option key={schedule.schedule_id} value={schedule.schedule_id}>
                {formatDate(schedule.scheduled_date)}
              </option>
            ))}
          </select>
        </div>

        {/* 點名表 */}
        {selectedScheduleId && students.length > 0 ? (
          <div className="attendance-section">
            <div className="attendance-header">
              <h3>
                點名 -{" "}
                {formatDate(
                  schedules.find(
                    (s) => s.schedule_id === selectedScheduleId
                  )?.scheduled_date || ""
                )}
              </h3>
              <p className="student-count">共 {students.length} 位學生</p>
            </div>

            {/* 桌面版：表格 */}
            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>學生姓名</th>
                    <th>出勤狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr
                      key={student.roster_id}
                      className={`student-row status-${getStatusColor(
                        student.status
                      )}`}
                    >
                      <td className="student-name">{student.student_name}</td>
                      <td className="status-cell">
                        <div className="status-buttons">
                          <button
                            className={`status-btn ${
                              student.status === "present" ? "active" : ""
                            }`}
                            onClick={() =>
                              handleStatusChange(student.roster_id, "present")
                            }
                            title="出席"
                          >
                            ✓
                          </button>
                          <button
                            className={`status-btn ${
                              student.status === "absent" ? "active" : ""
                            }`}
                            onClick={() =>
                              handleStatusChange(student.roster_id, "absent")
                            }
                            title="缺席"
                          >
                            ✗
                          </button>
                          <button
                            className={`status-btn ${
                              student.status === "late" ? "active" : ""
                            }`}
                            onClick={() =>
                              handleStatusChange(student.roster_id, "late")
                            }
                            title="遲到"
                          >
                            ⚠
                          </button>
                        </div>
                      </td>
                      <td className="status-label">
                        {student.status === "present" && "出席"}
                        {student.status === "absent" && "缺席"}
                        {student.status === "late" && "遲到"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 行動版：卡片 */}
            <div className="attendance-cards">
              {students.map((student) => (
                <div
                  key={student.roster_id}
                  className={`attendance-card status-${getStatusColor(
                    student.status
                  )}`}
                >
                  <div className="card-header">
                    <h4>{student.student_name}</h4>
                    <span className="status-label">
                      {student.status === "present" && "出席"}
                      {student.status === "absent" && "缺席"}
                      {student.status === "late" && "遲到"}
                    </span>
                  </div>
                  <div className="card-actions">
                    <button
                      className={`status-btn ${
                        student.status === "present" ? "active" : ""
                      }`}
                      onClick={() =>
                        handleStatusChange(student.roster_id, "present")
                      }
                    >
                      ✓ 出席
                    </button>
                    <button
                      className={`status-btn ${
                        student.status === "absent" ? "active" : ""
                      }`}
                      onClick={() =>
                        handleStatusChange(student.roster_id, "absent")
                      }
                    >
                      ✗ 缺席
                    </button>
                    <button
                      className={`status-btn ${
                        student.status === "late" ? "active" : ""
                      }`}
                      onClick={() =>
                        handleStatusChange(student.roster_id, "late")
                      }
                    >
                      ⚠ 遲到
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 操作按鈕 */}
            <div className="attendance-actions">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "保存中..." : "保存點名"}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                ← 返回
              </button>
            </div>
          </div>
        ) : (
          <div className="attendance-empty">
            <p>
              {schedules.length === 0
                ? "暫無已上課的記錄"
                : "請選擇課程"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AttendanceSheet;

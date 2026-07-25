import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import apiClient from "@/utils/api";
import {
  TutionScheduleExtended,
  ConflictResult,
} from "@/types/index";
import "./schedule-management.css";

type ViewMode = "month" | "week" | "day";

export const ScheduleManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();

  const [schedules, setSchedules] = useState<TutionScheduleExtended[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictResult | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    date: "",
    start_time: "19:00",
    end_time: "21:00",
    venue: "",
    recurrence: "none",
  });

  useEffect(() => {
    fetchSchedules();
  }, [classId]);

  const fetchSchedules = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const res = await apiClient.get<TutionScheduleExtended[]>(
        `/v1/classes/${classId}/schedule`
      );
      if (res.data) {
        setSchedules(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入時間表失敗");
      console.error("Schedule fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckConflicts = async () => {
    if (!formData.date || !classId) return;

    try {
      const res = await apiClient.post<ConflictResult>(
        `/v1/schedule/check-conflicts`,
        {
          class_id: classId,
          date: formData.date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          venue: formData.venue,
        }
      );
      if (res.data) {
        setConflicts(res.data);
      }
    } catch (err) {
      console.error("Conflict check error:", err);
    }
  };

  const handleAddSchedule = async () => {
    if (!formData.date || !formData.venue || !classId) {
      setError("請填寫所有必填欄位");
      return;
    }

    try {
      const payload: any = {
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        venue: formData.venue,
      };

      if (formData.recurrence !== "none") {
        payload.recurrence = {
          type: formData.recurrence,
          interval: 1,
        };
      }

      const res = await apiClient.post(
        `/v1/classes/${classId}/schedule`,
        payload
      );

      if (res.status === 201 || res.data) {
        await fetchSchedules();
        setShowAddForm(false);
        setFormData({
          date: "",
          start_time: "19:00",
          end_time: "21:00",
          venue: "",
          recurrence: "none",
        });
        setConflicts(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "新增課程時間表失敗");
      console.error("Schedule add error:", err);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!classId) return;
    if (!confirm("確定刪除此課程時間表？")) return;

    try {
      await apiClient.delete(
        `/v1/classes/${classId}/schedule/${scheduleId}`
      );
      await fetchSchedules();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除時間表失敗");
      console.error("Schedule delete error:", err);
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedDate);
    const firstDay = getFirstDayOfMonth(selectedDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${selectedDate.getFullYear()}-${String(
        selectedDate.getMonth() + 1
      ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      
      const daySchedules = schedules.filter((s) => s.date === dateStr);
      const isToday =
        new Date().toDateString() === new Date(dateStr).toDateString();

      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? "today" : ""}`}
          onClick={() => setSelectedDate(new Date(dateStr))}
        >
          <div className="day-number">{day}</div>
          <div className="day-schedules">
            {daySchedules.slice(0, 2).map((s) => (
              <div key={s.schedule_id} className="schedule-dot">
                {s.start_time}
              </div>
            ))}
            {daySchedules.length > 2 && (
              <div className="schedule-more">+{daySchedules.length - 2}</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("zh-TW", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <Layout title="課程時間表">
        <div className="schedule-management">
          <div className="loading-spinner">載入中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="課程時間表">
      <div className="schedule-management">
        {/* Header */}
        <div className="schedule-header">
          <div className="header-title">
            <h2>課程時間表</h2>
            <div className="view-controls">
              <button
                className={`view-btn ${viewMode === "month" ? "active" : ""}`}
                onClick={() => setViewMode("month")}
              >
                月
              </button>
              <button
                className={`view-btn ${viewMode === "week" ? "active" : ""}`}
                onClick={() => setViewMode("week")}
              >
                周
              </button>
              <button
                className={`view-btn ${viewMode === "day" ? "active" : ""}`}
                onClick={() => setViewMode("day")}
              >
                日
              </button>
            </div>
          </div>
          <button
            className="add-schedule-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            + 新增課程時間表
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="add-form-section">
            <h3>新增課程時間表</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => {
                    setFormData({ ...formData, date: e.target.value });
                    setTimeout(handleCheckConflicts, 100);
                  }}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="form-group">
                <label>開始時間</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => {
                    setFormData({ ...formData, start_time: e.target.value });
                    setTimeout(handleCheckConflicts, 100);
                  }}
                />
              </div>

              <div className="form-group">
                <label>結束時間</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => {
                    setFormData({ ...formData, end_time: e.target.value });
                    setTimeout(handleCheckConflicts, 100);
                  }}
                />
              </div>

              <div className="form-group">
                <label>教室位置</label>
                <input
                  type="text"
                  placeholder="例：Room 101"
                  value={formData.venue}
                  onChange={(e) => {
                    setFormData({ ...formData, venue: e.target.value });
                    setTimeout(handleCheckConflicts, 100);
                  }}
                />
              </div>

              <div className="form-group">
                <label>重複</label>
                <select
                  value={formData.recurrence}
                  onChange={(e) =>
                    setFormData({ ...formData, recurrence: e.target.value })
                  }
                >
                  <option value="none">不重複</option>
                  <option value="weekly">每週重複</option>
                  <option value="monthly">每月重複</option>
                </select>
              </div>
            </div>

            {conflicts && (
              <div
                className={`conflict-result ${
                  conflicts.hasConflict ? "has-conflict" : "no-conflict"
                }`}
              >
                {conflicts.hasConflict ? (
                  <>
                    <strong>⚠️ 發現衝突:</strong>
                    <ul>
                      {conflicts.conflicts.map((c, i) => (
                        <li key={i}>{c.message}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <span>✓ 時間表檢查通過，無衝突</span>
                )}
                {conflicts.warnings.length > 0 && (
                  <>
                    <strong>⚠️ 警告:</strong>
                    <ul>
                      {conflicts.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className="form-actions">
              <button
                className="btn btn-primary"
                onClick={handleAddSchedule}
                disabled={conflicts?.hasConflict}
              >
                新增課程
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {viewMode === "month" && (
          <div className="calendar-section">
            <div className="calendar-header">
              <button onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedDate(newDate);
              }}>
                ← 上月
              </button>
              <span className="month-year">
                {selectedDate.toLocaleDateString("zh-TW", {
                  year: "numeric",
                  month: "long",
                })}
              </span>
              <button onClick={() => {
                const newDate = new Date(selectedDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedDate(newDate);
              }}>
                下月 →
              </button>
            </div>

            <div className="weekdays-header">
              {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                <div key={day} className="weekday">
                  {day}
                </div>
              ))}
            </div>

            <div className="calendar-grid">{renderCalendar()}</div>
          </div>
        )}

        {/* Schedule List */}
        <div className="schedule-list-section">
          <h3>課程清單 - {formatDate(selectedDate.toISOString().split("T")[0])}</h3>

          <div className="schedule-list">
            {schedules
              .filter(
                (s) =>
                  s.date ===
                  selectedDate.toISOString().split("T")[0]
              )
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((schedule) => (
                <div key={schedule.schedule_id} className="schedule-item">
                  <div className="schedule-time">
                    <div className="time-badge">
                      {schedule.start_time} - {schedule.end_time}
                    </div>
                  </div>
                  <div className="schedule-info">
                    <div className="venue-name">
                      📍 {schedule.venue}
                    </div>
                    <div className="schedule-status">
                      狀態：<span className={`status-${schedule.status}`}>
                        {schedule.status === "scheduled" && "計劃中"}
                        {schedule.status === "ongoing" && "進行中"}
                        {schedule.status === "completed" && "已完成"}
                        {schedule.status === "cancelled" && "已取消"}
                      </span>
                    </div>
                  </div>
                  <div className="schedule-actions">
                    <button
                      className="action-btn edit"
                      onClick={() =>
                        console.log("Edit schedule", schedule.schedule_id)
                      }
                    >
                      編輯
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteSchedule(schedule.schedule_id)}
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            {schedules.filter(
              (s) =>
                s.date === selectedDate.toISOString().split("T")[0]
            ).length === 0 && (
              <div className="empty-state">此日期未有課程安排</div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

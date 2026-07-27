import React, { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/common/Layout";
import { useClasses } from "@/hooks/useClasses";
import { useAuth } from "@/context/AuthContext";
import {
  ScheduleList,
  ScheduleForm,
  RescheduleModal,
  ScheduleStats,
} from "@/components/schedule";
import { TutionSchedule } from "@/types";
import apiClient from "@/utils/api";
import "@/components/schedule/schedule.css";
import "./schedule-management.css";

type TabType = "list" | "form" | "stats";

export const ScheduleManagement: React.FC = () => {
  const { user } = useAuth();
  const { classes, loading: classesLoading } = useClasses({
    teacherId: user?.teacherId,
    autoFetch: true,
  });

  // State Management
  const [currentTab, setCurrentTab] = useState<TabType>("list");
  const [selectedClassId, setSelectedClassId] = useState<string | undefined>();
  const [schedules, setSchedules] = useState<TutionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<TutionSchedule | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Fetch schedules when selected class changes
  // (Note: fetchClasses is not needed as classes are auto-fetched)
  useEffect(() => {
    if (selectedClassId) {
      fetchSchedules(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchSchedules = async (classId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<TutionSchedule[]>(
        `/api/v1/schedules?class=${classId}`
      );
      setSchedules(response.data || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "載入排期失敗";
      setError(message);
      console.error("fetchSchedules error:", message);
    } finally {
      setLoading(false);
    }
  };

  // Get selected class info
  const selectedClass = useMemo(
    () => classes.find((c) => c.class_id === selectedClassId),
    [classes, selectedClassId]
  );

  // Handlers
  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value || undefined);
  };

  const handleCreateSchedule = async (data: {
    class_id: string;
    schedule_date: string;
    status: "held" | "cancelled" | "rescheduled";
    remarks?: string;
    rescheduled_to?: string;
  }) => {
    try {
      setFormLoading(true);
      setError(null);

      const response = await apiClient.post("/api/v1/schedules", data);
      
      if (response.data) {
        setSchedules([...schedules, response.data]);
        alert("排期已成功新增！");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "新增排期失敗";
      setError(message);
      throw err;
    } finally {
      setFormLoading(false);
    }
  };

  const handleReschedule = (schedule: TutionSchedule) => {
    setSelectedSchedule(schedule);
    setShowRescheduleModal(true);
  };

  const handleRescheduleSubmit = async (newDate: string, reason: string) => {
    if (!selectedSchedule) return;

    try {
      setRescheduleLoading(true);
      setError(null);

      await apiClient.put(
        `/api/v1/schedules/${selectedSchedule.schedule_id}`,
        {
          status: "rescheduled",
          rescheduled_to: newDate,
          remarks: reason,
        }
      );

      setSchedules(
        schedules.map((s) =>
          s.schedule_id === selectedSchedule.schedule_id
            ? {
                ...s,
                status: "rescheduled" as const,
                rescheduled_to: newDate,
                remarks: reason,
              }
            : s
        )
      );

      setShowRescheduleModal(false);
      setSelectedSchedule(null);
      alert("排期已成功改期！");
    } catch (err) {
      const message = err instanceof Error ? err.message : "改期失敗";
      setError(message);
      throw err;
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    if (!window.confirm("確定要取消此排期嗎？")) return;

    try {
      setError(null);
      await apiClient.put(`/api/v1/schedules/${scheduleId}`, {
        status: "cancelled",
      });

      setSchedules(
        schedules.map((s) =>
          s.schedule_id === scheduleId ? { ...s, status: "cancelled" as const } : s
        )
      );

      alert("排期已成功取消！");
    } catch (err) {
      const message = err instanceof Error ? err.message : "取消排期失敗";
      setError(message);
    }
  };

  const handleViewAttendance = (schedule: TutionSchedule) => {
    console.log("View attendance for schedule:", schedule.schedule_id);
    // This will be implemented in Phase 3.3
    alert("出席記錄功能將在下一版本推出");
  };

  // Render
  if (classesLoading && classes.length === 0) {
    return (
      <Layout title="排期管理">
        <div className="schedule-management loading">
          <div className="schedule-empty">
            <p>正在加載課堂信息...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (classes.length === 0) {
    return (
      <Layout title="排期管理">
        <div className="schedule-management">
          <div className="schedule-empty">
            <h3>暫無課堂</h3>
            <p>您尚未建立任何補習課堂，請先創建課堂後再進行排期。</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="排期管理">
      <div className="schedule-management">
        {/* Header */}
        <div className="schedule-header">
          <div className="header-title">
            <h2>排期管理</h2>
            <p className="subtitle">管理補習課程的排期記錄</p>
          </div>

          {/* Class Selector */}
          <div className="class-selector">
            <label className="selector-label">選擇課堂:</label>
            <select
              value={selectedClassId || ""}
              onChange={handleClassChange}
              className="selector-input"
            >
              <option value="">-- 選擇課堂 --</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>
                  {c.subject} - {c.form} ({c.day_of_week} {c.time_start})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger">
            <strong>錯誤:</strong> {error}
            <button
              className="alert-close"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        {selectedClass && (
          <>
            <div className="schedule-tabs">
              <button
                className={`tab-btn ${currentTab === "list" ? "active" : ""}`}
                onClick={() => setCurrentTab("list")}
              >
                排期列表
              </button>
              <button
                className={`tab-btn ${currentTab === "form" ? "active" : ""}`}
                onClick={() => setCurrentTab("form")}
              >
                新增排期
              </button>
              <button
                className={`tab-btn ${currentTab === "stats" ? "active" : ""}`}
                onClick={() => setCurrentTab("stats")}
              >
                統計分析
              </button>
            </div>

            {/* Tab Content */}
            <div className="schedule-content">
              {/* List Tab */}
              {currentTab === "list" && (
                <ScheduleList
                  schedules={schedules}
                  classes={classes}
                  loading={loading}
                  onReschedule={handleReschedule}
                  onCancel={handleCancelSchedule}
                  onViewAttendance={handleViewAttendance}
                />
              )}

              {/* Form Tab */}
              {currentTab === "form" && (
                <ScheduleForm
                  selectedClass={selectedClass}
                  loading={formLoading}
                  onSubmit={handleCreateSchedule}
                  onCancel={() => setCurrentTab("list")}
                />
              )}

              {/* Stats Tab */}
              {currentTab === "stats" && (
                <ScheduleStats schedules={schedules} />
              )}
            </div>

            {/* Reschedule Modal */}
            {selectedSchedule && (
              <RescheduleModal
                schedule={selectedSchedule}
                open={showRescheduleModal}
                loading={rescheduleLoading}
                onConfirm={handleRescheduleSubmit}
                onClose={() => {
                  setShowRescheduleModal(false);
                  setSelectedSchedule(null);
                }}
              />
            )}
          </>
        )}

        {/* No Class Selected */}
        {!selectedClass && (
          <div className="schedule-empty">
            <p>請選擇一個課堂以查看或管理排期</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

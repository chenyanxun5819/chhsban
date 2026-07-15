import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { scheduleService } from "@/services/scheduleService";
import type { TutionSchedule } from "@/types/index";
import "./schedule-management.css";

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { scheduleService } from "@/services/scheduleService";
import type { TutionSchedule } from "@/types/index";
import "./schedule-management.css";

type ModalType =
  | null
  | "create"
  | "cancel"
  | "reschedule"
  | "mark_held";

interface ModalState {
  type: ModalType;
  scheduleId?: string;
  data?: {
    reason?: string;
    newDate?: string;
  };
}

export const ScheduleManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schedules, setSchedules] = useState<TutionSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Form state for modals
  const [formData, setFormData] = useState({
    newDate: "",
    reason: "",
  });

  useEffect(() => {
    if (classId) {
      fetchSchedules();
    }
  }, [classId]);

  const fetchSchedules = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const data = await scheduleService.getSchedules(classId);
      // 按日期排序
      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.scheduled_date).getTime() -
          new Date(b.scheduled_date).getTime()
      );
      setSchedules(sorted);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "載入開課記錄失敗"
      );
      console.error("Error fetching schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  // 顯示成功訊息
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // 建立新的開課記錄
  const handleCreateSchedule = async () => {
    if (!classId || !formData.newDate) {
      setError("請選擇日期");
      return;
    }

    try {
      await scheduleService.createSchedule(classId, formData.newDate);
      showSuccess("開課記錄已建立");
      await fetchSchedules();
      setModal({ type: null });
      setFormData({ newDate: "", reason: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "建立開課記錄失敗"
      );
    }
  };

  // 標記為已上課
  const handleMarkAsHeld = async (scheduleId: string) => {
    try {
      await scheduleService.markAsHeld(scheduleId);
      showSuccess("已標記為上課");
      await fetchSchedules();
      setModal({ type: null });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "標記失敗"
      );
    }
  };

  // 停課
  const handleCancelClass = async () => {
    if (!modal.scheduleId || !formData.reason) {
      setError("請填寫停課原因");
      return;
    }

    try {
      await scheduleService.markAsCancelled(
        modal.scheduleId,
        formData.reason
      );
      showSuccess("已標記為停課");
      await fetchSchedules();
      setModal({ type: null });
      setFormData({ newDate: "", reason: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "停課標記失敗"
      );
    }
  };

  // 調課
  const handleReschedule = async () => {
    if (!modal.scheduleId || !formData.newDate || !formData.reason) {
      setError("請填寫新日期和調課原因");
      return;
    }

    try {
      await scheduleService.markAsRescheduled(
        modal.scheduleId,
        formData.newDate,
        formData.reason
      );
      showSuccess("已標記為調課");
      await fetchSchedules();
      setModal({ type: null });
      setFormData({ newDate: "", reason: "" });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "調課標記失敗"
      );
    }
  };

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  };

  // 分組開課記錄 (按日期)
  const groupedSchedules = schedules.reduce(
    (acc, schedule) => {
      const date = schedule.scheduled_date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(schedule);
      return acc;
    },
    {} as Record<string, TutionSchedule[]>
  );

  // 獲取狀態標籤
  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; className: string }> = {
      held: { label: "✓ 已上課", className: "status-held" },
      cancelled: { label: "✗ 停課", className: "status-cancelled" },
      rescheduled: { label: "⟳ 調課", className: "status-rescheduled" },
    };
    return labels[status] || { label: "未知", className: "status-unknown" };
  };

  if (loading) {
    return (
      <Layout title="開課記錄管理">
        <div className="schedule-loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="開課記錄管理">
      <div className="schedule-container">
        {/* 錯誤和成功訊息 */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && (
          <div className="alert alert-success">{successMsg}</div>
        )}

        {/* 操作按鈕 */}
        <div className="schedule-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setModal({ type: "create" });
              setFormData({ newDate: "", reason: "" });
            }}
          >
            + 建立開課記錄
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate(-1)}
          >
            ← 返回
          </button>
        </div>

        {/* 開課記錄列表 */}
        {schedules.length === 0 ? (
          <div className="schedule-empty">
            <p>暫無開課記錄</p>
          </div>
        ) : (
          <div className="schedule-list">
            {Object.entries(groupedSchedules).map(([date, items]) => (
              <div key={date} className="schedule-group">
                <div className="group-header">
                  <h3>{formatDate(date)}</h3>
                </div>
                <div className="group-items">
                  {items.map((schedule) => {
                    const status = getStatusLabel(
                      schedule.status || "held"
                    );
                    return (
                      <div
                        key={schedule.schedule_id}
                        className={`schedule-card ${status.className}`}
                      >
                        <div className="card-header">
                          <span className={`status-badge ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="card-body">
                          <p className="date-info">
                            📅 {formatDate(
                              schedule.scheduled_date
                            )}
                          </p>
                          {schedule.status === "cancelled" &&
                            schedule.cancellation_reason && (
                              <p className="reason-info">
                                <strong>停課原因：</strong>
                                {schedule.cancellation_reason}
                              </p>
                            )}
                          {schedule.status === "rescheduled" && (
                            <>
                              {schedule.rescheduled_to && (
                                <p className="reschedule-info">
                                  <strong>調課至：</strong>
                                  {formatDate(schedule.rescheduled_to)}
                                </p>
                              )}
                              {schedule.reschedule_reason && (
                                <p className="reason-info">
                                  <strong>調課原因：</strong>
                                  {schedule.reschedule_reason}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        <div className="card-actions">
                          {(!schedule.status ||
                            schedule.status === "held") && (
                            <>
                              <button
                                className="btn-small btn-cancel"
                                onClick={() => {
                                  setModal({
                                    type: "cancel",
                                    scheduleId:
                                      schedule.schedule_id,
                                  });
                                  setFormData({
                                    newDate: "",
                                    reason: "",
                                  });
                                }}
                              >
                                停課
                              </button>
                              <button
                                className="btn-small btn-reschedule"
                                onClick={() => {
                                  setModal({
                                    type: "reschedule",
                                    scheduleId:
                                      schedule.schedule_id,
                                  });
                                  setFormData({
                                    newDate: "",
                                    reason: "",
                                  });
                                }}
                              >
                                調課
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 模態對話框 */}
        {modal.type && (
          <div
            className="modal-overlay"
            onClick={() => setModal({ type: null })}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              {/* 建立開課記錄對話框 */}
              {modal.type === "create" && (
                <>
                  <h2>建立開課記錄</h2>
                  <div className="modal-form">
                    <div className="form-group">
                      <label>上課日期 *</label>
                      <input
                        type="date"
                        value={formData.newDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleCreateSchedule}
                      >
                        確定
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal({ type: null })}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 停課對話框 */}
              {modal.type === "cancel" && (
                <>
                  <h2>停課</h2>
                  <div className="modal-form">
                    <div className="form-group">
                      <label>停課原因 *</label>
                      <textarea
                        placeholder="請填寫停課原因..."
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reason: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-danger"
                        onClick={handleCancelClass}
                      >
                        確定停課
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal({ type: null })}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* 調課對話框 */}
              {modal.type === "reschedule" && (
                <>
                  <h2>調課</h2>
                  <div className="modal-form">
                    <div className="form-group">
                      <label>新上課日期 *</label>
                      <input
                        type="date"
                        value={formData.newDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>調課原因 *</label>
                      <textarea
                        placeholder="請填寫調課原因..."
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reason: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        className="btn btn-primary"
                        onClick={handleReschedule}
                      >
                        確定調課
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setModal({ type: null })}
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

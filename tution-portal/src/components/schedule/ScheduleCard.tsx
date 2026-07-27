import React from "react";
import { TutionSchedule, TutionClass } from "@/types";

interface ScheduleCardProps {
  schedule: TutionSchedule;
  classInfo?: TutionClass;
  onReschedule?: (schedule: TutionSchedule) => void;
  onCancel?: (scheduleId: string) => void;
  onViewAttendance?: (schedule: TutionSchedule) => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  classInfo,
  onReschedule,
  onCancel,
  onViewAttendance,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "held":
        return "已進行";
      case "cancelled":
        return "已取消";
      case "rescheduled":
        return "已改期";
      case "scheduled":
        return "已排期";
      case "ongoing":
        return "進行中";
      case "completed":
        return "已完成";
      default:
        return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "held":
      case "completed":
        return "success";
      case "cancelled":
        return "danger";
      case "rescheduled":
        return "warning";
      case "scheduled":
      case "ongoing":
        return "info";
      default:
        return "secondary";
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("zh-HK", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        weekday: "short",
      });
    } catch {
      return dateStr;
    }
  };

  // Attendance tracking will be added in Phase 3.3

  return (
    <div className="schedule-card">
      <div className="schedule-card-header">
        <div className="schedule-date-time">
          <div className="schedule-date">{formatDate(schedule.scheduled_date)}</div>
          {classInfo && (
            <div className="schedule-time">
              {classInfo.time_start} - {classInfo.time_end}
            </div>
          )}
        </div>
        <span className={`schedule-badge status-${getStatusColor(schedule.status)}`}>
          {getStatusBadge(schedule.status)}
        </span>
      </div>

      {classInfo && (
        <div className="schedule-card-body">
          <div className="schedule-info-item">
            <span className="label">科目:</span>
            <span className="value">{classInfo.subject}</span>
          </div>
          <div className="schedule-info-item">
            <span className="label">班級:</span>
            <span className="value">{classInfo.form}</span>
          </div>
          <div className="schedule-info-item">
            <span className="label">地點:</span>
            <span className="value">{classInfo.venue}</span>
          </div>
          {schedule.cancellation_reason && (
            <div className="schedule-info-item">
              <span className="label">取消原因:</span>
              <span className="value">{schedule.cancellation_reason}</span>
            </div>
          )}
          {schedule.reschedule_reason && (
            <div className="schedule-info-item">
              <span className="label">改期原因:</span>
              <span className="value">{schedule.reschedule_reason}</span>
            </div>
          )}
        </div>
      )}

      <div className="schedule-card-footer">
        {schedule.status !== "held" && schedule.status !== "cancelled" && (
          <>
            {onReschedule && (
              <button
                className="btn btn-sm btn-warning"
                onClick={() => onReschedule(schedule)}
              >
                改期
              </button>
            )}
            {onCancel && (
              <button
                className="btn btn-sm btn-danger"
                onClick={() => onCancel(schedule.schedule_id)}
              >
                取消
              </button>
            )}
          </>
        )}
        {schedule.status === "held" && onViewAttendance && (
          <button
            className="btn btn-sm btn-info"
            onClick={() => onViewAttendance(schedule)}
          >
            查看出席
          </button>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard;

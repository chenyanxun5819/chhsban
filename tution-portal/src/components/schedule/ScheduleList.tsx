import React, { useMemo, useState } from "react";
import { TutionSchedule, TutionClass } from "@/types";
import ScheduleCard from "./ScheduleCard";

interface ScheduleListProps {
  schedules: TutionSchedule[];
  classes: TutionClass[];
  loading?: boolean;
  onReschedule?: (schedule: TutionSchedule) => void;
  onCancel?: (scheduleId: string) => void;
  onViewAttendance?: (schedule: TutionSchedule) => void;
}

type FilterType = "all" | "scheduled" | "held" | "cancelled" | "rescheduled";

const ScheduleList: React.FC<ScheduleListProps> = ({
  schedules,
  classes,
  loading = false,
  onReschedule,
  onCancel,
  onViewAttendance,
}) => {
  const [filterStatus, setFilterStatus] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const classMap = useMemo(
    () => new Map(classes.map((c) => [c.class_id, c])),
    [classes]
  );

  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      // Filter by status
      if (filterStatus !== "all" && schedule.status !== filterStatus) {
        return false;
      }

      // Filter by search query (class subject or venue)
      if (searchQuery) {
        const classInfo = classMap.get(schedule.class_id);
        const query = searchQuery.toLowerCase();
        if (classInfo) {
          return (
            classInfo.subject.toLowerCase().includes(query) ||
            classInfo.form.toLowerCase().includes(query) ||
            classInfo.venue.toLowerCase().includes(query)
          );
        }
        return false;
      }

      return true;
    });
  }, [schedules, filterStatus, searchQuery, classMap]);

  const groupedByClass = useMemo(() => {
    const grouped = new Map<string, TutionSchedule[]>();
    filteredSchedules.forEach((schedule) => {
      const classId = schedule.class_id;
      if (!grouped.has(classId)) {
        grouped.set(classId, []);
      }
      grouped.get(classId)!.push(schedule);
    });
    return grouped;
  }, [filteredSchedules]);

  const statusStats = useMemo(() => ({
    all: schedules.length,
    scheduled: schedules.filter((s) => !["held", "cancelled", "rescheduled"].includes(s.status)).length,
    held: schedules.filter((s) => s.status === "held").length,
    cancelled: schedules.filter((s) => s.status === "cancelled").length,
    rescheduled: schedules.filter((s) => s.status === "rescheduled").length,
  }), [schedules]);

  if (loading) {
    return <div className="schedule-list loading">正在加載...</div>;
  }

  if (schedules.length === 0) {
    return (
      <div className="schedule-list empty">
        <p>暫無排期記錄</p>
      </div>
    );
  }

  return (
    <div className="schedule-list">
      {/* Filter Bar */}
      <div className="schedule-filter-bar">
        <div className="filter-search">
          <input
            type="text"
            placeholder="搜尋科目、班級或地點..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-status-tabs">
          {(["all", "scheduled", "held", "cancelled", "rescheduled"] as const).map((status) => (
            <button
              key={status}
              className={`filter-tab ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
            >
              {status === "all" && "全部"}
              {status === "scheduled" && "已排期"}
              {status === "held" && "已進行"}
              {status === "cancelled" && "已取消"}
              {status === "rescheduled" && "已改期"}
              <span className="filter-count">({statusStats[status]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Result Count */}
      <div className="schedule-result-count">
        找到 <strong>{filteredSchedules.length}</strong> 個排期
      </div>

      {/* Empty Filter Result */}
      {filteredSchedules.length === 0 ? (
        <div className="schedule-list-empty">
          <p>沒有符合條件的排期記錄</p>
        </div>
      ) : (
        <>
          {/* Grouped by Class */}
          {Array.from(groupedByClass.entries()).map(([classId, classSchedules]) => {
            const classInfo = classMap.get(classId);
            return (
              <div key={classId} className="schedule-group">
                {classInfo && (
                  <div className="schedule-group-header">
                    <h3 className="group-title">
                      {classInfo.subject} - {classInfo.form}
                    </h3>
                    <span className="group-count">
                      {classSchedules.length} 節課
                    </span>
                  </div>
                )}
                <div className="schedule-cards-container">
                  {classSchedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.schedule_id}
                      schedule={schedule}
                      classInfo={classInfo}
                      onReschedule={onReschedule}
                      onCancel={onCancel}
                      onViewAttendance={onViewAttendance}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default ScheduleList;

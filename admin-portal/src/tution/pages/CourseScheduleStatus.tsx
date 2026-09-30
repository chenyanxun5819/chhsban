import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ClassDetailPage } from "@/tution/components/classDetail/ClassDetailPage";
import { ScheduleStats, ScheduleTable } from "@/tution/components/classDetail/ScheduleView";
import { useClassDetail } from "@/tution/hooks";
import { summarizeSchedule } from "@/tution/utils/scheduleGenerator";

/** 已開課管理 → 排課狀態（唯讀；原本外連 tution-portal /classes/:id/schedule） */
const CourseScheduleStatus: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { classInfo, rows, attendanceRecords, loading, error } = useClassDetail(id);

  const attendedDates = useMemo(() => new Set(attendanceRecords.map((a) => a.class_date)), [attendanceRecords]);
  const stats = useMemo(() => summarizeSchedule(rows, attendedDates), [rows, attendedDates]);

  return (
    <ClassDetailPage title="排課狀態" classInfo={classInfo} loading={loading} error={error}>
      <div className="schedule-management">
        <ScheduleStats stats={stats} />
        <ScheduleTable rows={rows} attendedDates={attendedDates} />
      </div>
    </ClassDetailPage>
  );
};

export default CourseScheduleStatus;

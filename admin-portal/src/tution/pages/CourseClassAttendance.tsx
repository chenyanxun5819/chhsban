import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { AttendanceOverview } from "@/tution/components/attendance/AttendanceOverviewTable";
import { ClassDetailPage } from "@/tution/components/classDetail/ClassDetailPage";
import { useClassDetail } from "@/tution/hooks";
import type { AttendanceQueryRecord } from "@/tution/services/attendanceQueryService";

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}

/**
 * 已開課管理 → 出席狀況（唯讀；原本外連 tution-portal /classes/:id/attendance）。
 * 與 tution-portal 管理員看到的一樣，只顯示出席總覽表，點名由老師在 tution-portal 進行。
 */
const CourseClassAttendance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { classInfo, roster, rows, attendanceRecords, loading, error } = useClassDetail(id);

  const activeRoster = useMemo(() => roster.filter((r) => r.is_active), [roster]);
  // 只有「有開課」（非停課）且已到期的日期才需要點名
  const markableRows = useMemo(() => {
    const today = todayStr();
    return rows.filter((row) => row.status !== "cancelled" && row.actual_date <= today);
  }, [rows]);
  const recordsByKey = useMemo(() => {
    const map = new Map<string, AttendanceQueryRecord>();
    attendanceRecords.forEach((r) => map.set(`${r.student_id}|${r.class_date}`, r));
    return map;
  }, [attendanceRecords]);

  return (
    <ClassDetailPage title="出席狀況" classInfo={classInfo} loading={loading} error={error}>
      {markableRows.length === 0 ? (
        <div className="empty-state">尚無可顯示的出席紀錄</div>
      ) : (
        <AttendanceOverview rows={markableRows} allRows={rows} roster={activeRoster} recordsByKey={recordsByKey} />
      )}
    </ClassDetailPage>
  );
};

export default CourseClassAttendance;

import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ClassRosterEntry, TutionClass, TutionSchedule } from "@/types";
import { getClassRoster } from "@/services/rosterService";
import { scheduleService } from "@/services/scheduleService";
import {
  attendanceQueryService,
  type AttendanceQueryRecord,
} from "@/services/attendanceQueryService";
import { generateScheduleRows } from "@/utils/scheduleGenerator";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import { AttendanceOverview } from "@/components/attendance/AttendanceOverviewTable";

interface CourseAttendanceStatusProps {
  /** 已開課的課程清單（申請人工號＋姓名＋年級＋科目都已包含在課程紀錄本身，無需另外查詢老師資料） */
  classes: TutionClass[];
}

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

export const CourseAttendanceStatus: React.FC<CourseAttendanceStatusProps> = ({ classes }) => {
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [roster, setRoster] = useState<ClassRosterEntry[]>([]);
  const [exceptions, setExceptions] = useState<TutionSchedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceQueryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const courseOptionLabel = (cls: TutionClass): string =>
    `${cls.teacher_id} ${cls.teacher_name_cn} - ${gradeLabel(cls.form)}${cls.subject}`;

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        courseOptionLabel(a).localeCompare(courseOptionLabel(b), "zh-Hant")
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [classes]
  );

  const selectedClass = sortedClasses.find((c) => c.class_id === selectedClassId) || null;

  useEffect(() => {
    if (!selectedClassId) {
      setRoster([]);
      setExceptions([]);
      setAttendanceRecords([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rosterList, scheduleList, attendanceList] = await Promise.all([
          getClassRoster(selectedClassId),
          scheduleService.getSchedules(selectedClassId),
          attendanceQueryService.listByClass(selectedClassId),
        ]);
        if (cancelled) return;
        setRoster(rosterList);
        setExceptions(scheduleList);
        setAttendanceRecords(attendanceList);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "載入出席資料失敗");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  const activeRoster = useMemo(() => roster.filter((r) => r.is_active), [roster]);

  const rows = useMemo(() => {
    if (!selectedClass) return [];
    return generateScheduleRows({
      dayOfWeek: selectedClass.day_of_week,
      startDate: selectedClass.start_date,
      endDate: selectedClass.end_date,
      exceptions,
    });
  }, [selectedClass, exceptions]);

  const today = todayStr();
  const markableRows = useMemo(
    () => rows.filter((row) => row.status !== "cancelled" && row.actual_date <= today),
    [rows, today]
  );

  const recordsByKey = useMemo(() => {
    const map = new Map<string, AttendanceQueryRecord>();
    attendanceRecords.forEach((r) => map.set(`${r.student_id}|${r.class_date}`, r));
    return map;
  }, [attendanceRecords]);

  return (
    <div className="course-attendance-status">
      <div className="course-list-toolbar">
        <label className="course-list-toolbar__sort">
          <span>選擇課程：</span>
          <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)}>
            <option value="">請選擇課程</option>
            {sortedClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {courseOptionLabel(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ 出現錯誤：{error}</span>
        </div>
      )}

      {!selectedClassId ? (
        <div className="empty-state">請先選擇一個課程</div>
      ) : loading ? (
        <div className="loading-text">載入中...</div>
      ) : (
        <>
          {selectedClass && (
            <p className="attendance-subtitle">
              {t("schedule.applicantLabel")}: {selectedClass.teacher_name_cn} ・{" "}
              {t("common.everyDayPrefix")}
              {dayLabel(selectedClass.day_of_week)} {selectedClass.time_start}-
              {selectedClass.time_end} ・ {selectedClass.venue}
            </p>
          )}
          {markableRows.length === 0 ? (
            <div className="empty-state">尚無可顯示的出席紀錄</div>
          ) : (
            <AttendanceOverview
              rows={markableRows}
              allRows={rows}
              roster={activeRoster}
              recordsByKey={recordsByKey}
            />
          )}
        </>
      )}
    </div>
  );
};

export default CourseAttendanceStatus;

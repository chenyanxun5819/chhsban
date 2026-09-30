import { useCallback, useEffect, useMemo, useState } from "react";
import tutionApi from "@/tution/api";
import { attendanceQueryService, type AttendanceQueryRecord } from "@/tution/services/attendanceQueryService";
import { getClassRoster } from "@/tution/services/rosterService";
import { scheduleService } from "@/tution/services/scheduleService";
import { settingsService } from "@/tution/services/settingsService";
import { generateScheduleRows } from "@/tution/utils/scheduleGenerator";
import type { ClassRosterEntry, ClassroomRecord, TutionClass, TutionSchedule } from "@/tution/types";

/**
 * 補習班管理各頁共用的資料：所有課程（申請中／已開課）、可用教室、全域「最後上課日期」。
 * 原本在 tution-portal 的 AdminPanel 由一個大元件抓一次、各分頁共用；拆成獨立頁面後各頁自己呼叫這個 hook。
 */
export function useTutionAdminData() {
  const [allClasses, setAllClasses] = useState<TutionClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([]);
  const [lastTeachingDate, setLastTeachingDate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchAllClasses = async () => {
    try {
      setClassesLoading(true);
      setError(null);
      const response = await tutionApi.get("/v1/classes");
      setAllClasses((response.data?.data as TutionClass[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入課程失敗");
      console.error("Fetch classes error:", err);
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => {
    fetchAllClasses();
    tutionApi
      .get("/classrooms?availableOnly=true")
      .then((response) => {
        if (response.data?.success) setClassrooms(response.data.data || []);
      })
      .catch((err) => console.error("Fetch classrooms error:", err));
    settingsService
      .getLastTeachingDate()
      .then((date) => setLastTeachingDate(date || ""))
      .catch((err) => console.error("Fetch last teaching date error:", err));
  }, []);

  return {
    allClasses,
    classesLoading,
    classrooms,
    lastTeachingDate,
    setLastTeachingDate,
    error,
    setError,
    fetchAllClasses,
  };
}

/** 已開課（approved／active／ended）的課程 */
export function filterCourses(classes: TutionClass[]): TutionClass[] {
  return classes.filter(
    (item) => item.approval_status === "approved" || item.approval_status === "active" || item.approval_status === "ended",
  );
}

/** 已開課清單／出席狀況的年份選項：今年＋所有課程的開課年份（新到舊） */
export function courseYearOptions(courses: TutionClass[]): number[] {
  return Array.from(new Set([new Date().getFullYear(), ...courses.map((c) => new Date(c.start_date).getFullYear())])).sort(
    (a, b) => b - a,
  );
}

export function filterByYear(courses: TutionClass[], year: string): TutionClass[] {
  return year === "all" ? courses : courses.filter((c) => new Date(c.start_date).getFullYear() === Number(year));
}

/**
 * 已開課管理「學生總覽／排課狀態／出席狀況」三個唯讀頁共用：一次載入單一課程的
 * 課程資料、名冊、排課例外與出勤紀錄，並依星期與起訖日產生排課列（新到舊）。
 */
export function useClassDetail(classId: string | undefined) {
  const [classInfo, setClassInfo] = useState<TutionClass | null>(null);
  const [roster, setRoster] = useState<ClassRosterEntry[]>([]);
  const [exceptions, setExceptions] = useState<TutionSchedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!classId) {
      setError("課程 ID 未找到");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [classRes, rosterList, scheduleList, attendanceList] = await Promise.all([
        tutionApi.get(`/v1/classes/${classId}`),
        getClassRoster(classId),
        scheduleService.getSchedules(classId),
        attendanceQueryService.listByClass(classId),
      ]);
      setClassInfo((classRes.data?.data as TutionClass) || null);
      setRoster(rosterList);
      setExceptions(scheduleList);
      setAttendanceRecords(attendanceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入課程資料失敗");
      console.error("Fetch class detail error:", err);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    if (!classInfo) return [];
    return generateScheduleRows({
      dayOfWeek: classInfo.day_of_week,
      startDate: classInfo.start_date,
      endDate: classInfo.end_date,
      exceptions,
    });
  }, [classInfo, exceptions]);

  return { classInfo, roster, attendanceRecords, rows, loading, error, reload: load };
}

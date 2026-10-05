import React, { useEffect, useMemo, useState } from "react";
import { TutionPage } from "@/tution/components/TutionPage";
import { filterCourses, useTutionAdminData } from "@/tution/hooks";
import { scheduleService } from "@/tution/services/scheduleService";
import type { TutionClass, TutionSchedule } from "@/tution/types";

function courseLabel(course: TutionClass): string {
  return `${course.application_no || course.class_id}｜${course.teacher_name_cn}｜${course.subject}（${course.form}）`;
}

const OCCUPYING_STATUSES = new Set(["reviewing", "approved", "active"]);
const UTC_WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dayNameFromDate(dateStr: string): string {
  return UTC_WEEKDAY_NAMES[toUTCDate(dateStr).getUTCDay()];
}

function effectiveEndDate(course: TutionClass, lastTeachingDate?: string): string {
  if (course.end_date) return course.end_date;
  if (lastTeachingDate && lastTeachingDate >= course.start_date) return lastTeachingDate;
  return `${course.start_date.slice(0, 4)}-12-31`;
}

function isDateWithinCourseRange(course: TutionClass, date: string, lastTeachingDate?: string): boolean {
  if (date < course.start_date) return false;
  return date <= effectiveEndDate(course, lastTeachingDate);
}

function occupiedClassroomsOnDate(params: {
  date: string;
  classes: TutionClass[];
  schedules: TutionSchedule[];
  lastTeachingDate?: string;
}): Set<string> {
  const { date, classes, schedules, lastTeachingDate } = params;
  const occupied = new Set<string>();
  const classById = new Map(classes.map((course) => [course.class_id, course]));
  const dayName = dayNameFromDate(date);

  for (const course of classes) {
    if (!OCCUPYING_STATUSES.has(course.approval_status)) continue;
    if (!course.venue) continue;
    if (course.day_of_week !== dayName) continue;
    if (!isDateWithinCourseRange(course, date, lastTeachingDate)) continue;

    const exception = schedules.find((schedule) => schedule.class_id === course.class_id && schedule.scheduled_date === date);
    if (!exception) {
      occupied.add(course.venue);
      continue;
    }
    if (exception.status === "extra") {
      occupied.add(exception.extra_session_venue || course.venue);
    }
  }

  for (const schedule of schedules) {
    const course = classById.get(schedule.class_id);
    if (!course || !OCCUPYING_STATUSES.has(course.approval_status)) continue;

    if (schedule.status === "extra" && schedule.scheduled_date === date) {
      const venue = schedule.extra_session_venue || course.venue;
      if (venue) occupied.add(venue);
      continue;
    }
    if (schedule.status === "rescheduled" && schedule.rescheduled_to === date && schedule.rescheduled_venue) {
      occupied.add(schedule.rescheduled_venue);
    }
  }

  return occupied;
}

const ExtraSessions: React.FC = () => {
  const { allClasses, classrooms, classesLoading, lastTeachingDate, error, setError } = useTutionAdminData();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [allSchedules, setAllSchedules] = useState<TutionSchedule[]>([]);

  const courses = useMemo(
    () =>
      filterCourses(allClasses)
        .filter((course) => course.approval_status === "approved" || course.approval_status === "active")
        .sort((a, b) => courseLabel(a).localeCompare(courseLabel(b), "zh-Hant")),
    [allClasses],
  );
  const courseById = useMemo(() => new Map(courses.map((course) => [course.class_id, course])), [courses]);
  const extraSessions = useMemo(
    () =>
      allSchedules
        .filter((item) => item.status === "extra")
        .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date) || b.updated_at - a.updated_at),
    [allSchedules],
  );
  const availableClassrooms = useMemo(() => {
    if (!scheduledDate) return classrooms;
    const occupied = occupiedClassroomsOnDate({
      date: scheduledDate,
      classes: allClasses,
      schedules: allSchedules,
      lastTeachingDate,
    });
    return [...classrooms]
      .filter((classroom) => !occupied.has(classroom.classroom_id))
      .sort((a, b) => a.classroom_id.localeCompare(b.classroom_id));
  }, [scheduledDate, classrooms, allClasses, allSchedules, lastTeachingDate]);

  const loadExtraSessions = async () => {
    try {
      setLoadingList(true);
      const all = await scheduleService.listAllSchedules();
      setAllSchedules(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入額外加課失敗");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadExtraSessions();
  }, []);

  useEffect(() => {
    if (!selectedVenue) return;
    if (availableClassrooms.some((classroom) => classroom.classroom_id === selectedVenue)) return;
    setSelectedVenue("");
  }, [availableClassrooms, selectedVenue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !scheduledDate || !selectedVenue || !note.trim()) {
      setError("請先選擇課程、日期、教室並填寫備註說明");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await scheduleService.createExtraSession(selectedClassId, scheduledDate, note.trim(), selectedVenue);
      setScheduledDate("");
      setSelectedVenue("");
      setNote("");
      await loadExtraSessions();
      alert("✅ 額外加課已加入，老師現在會在排課／點名頁看到這堂課。");
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "DATE_ALREADY_HAS_SESSION") {
        setError("該日期已有原定課、調課或其他加課，不能重複新增");
      } else if (code === "INVALID_EXTRA_SESSION_VENUE") {
        setError("所選教室已不適用於補習，請重新選擇");
      } else if (code === "EXTRA_SESSION_VENUE_OCCUPIED") {
        setError("所選教室當天已被其他課程使用，請重新選擇");
      } else {
        setError(code || err?.message || "新增額外加課失敗");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: TutionSchedule) => {
    if (!window.confirm(`確定要刪除 ${schedule.scheduled_date} 的額外加課嗎？`)) return;
    try {
      setError(null);
      await scheduleService.deleteSchedule(schedule.schedule_id);
      await loadExtraSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除額外加課失敗");
    }
  };

  return (
    <TutionPage title="額外加課" error={error}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>新增額外加課</h3>
        <p style={{ color: "#666" }}>
          由 super_admin 核准後，額外加課日期會直接出現在老師的排課管理與點名頁面中。
        </p>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <label>
            <div>選擇課程</div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={classesLoading || loadingList || saving}
            >
              <option value="">請選擇課程...</option>
              {courses.map((course) => (
                <option key={course.class_id} value={course.class_id}>
                  {courseLabel(course)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div>加課日期</div>
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} disabled={loadingList || saving} />
          </label>
          <label>
            <div>選教室</div>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              disabled={loadingList || saving || !scheduledDate || availableClassrooms.length === 0}
            >
              <option value="">
                {!scheduledDate
                  ? "請先選擇日期..."
                  : availableClassrooms.length === 0
                    ? "當天沒有可用教室"
                    : "請選擇教室..."}
              </option>
              {availableClassrooms.map((classroom) => (
                <option key={classroom.classroom_id} value={classroom.classroom_id}>
                  {classroom.classroom_id}｜{classroom.classroom_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <div>備註說明</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="例如：考前加強、假期補課、特別練習"
              disabled={loadingList || saving}
            />
          </label>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving || classesLoading || loadingList}>
              {saving ? "送出中..." : "送出確認"}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>已核准的額外加課</h3>
        {loadingList ? (
          <p>載入中...</p>
        ) : extraSessions.length === 0 ? (
          <p>目前沒有額外加課記錄。</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>日期</th>
                <th>課程</th>
                <th>教室</th>
                <th>備註</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {extraSessions.map((session) => {
                const course = courseById.get(session.class_id);
                return (
                  <tr key={session.schedule_id}>
                    <td style={{ whiteSpace: "nowrap" }}>{session.scheduled_date}</td>
                    <td>{course ? courseLabel(course) : session.class_id}</td>
                    <td>{session.extra_session_venue || course?.venue || "—"}</td>
                    <td>{session.extra_session_note || "—"}</td>
                    <td>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(session)}>
                        刪除
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </TutionPage>
  );
};

export default ExtraSessions;

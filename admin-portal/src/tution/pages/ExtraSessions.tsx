import React, { useEffect, useMemo, useState } from "react";
import { TutionPage } from "@/tution/components/TutionPage";
import { filterCourses, useTutionAdminData } from "@/tution/hooks";
import { scheduleService } from "@/tution/services/scheduleService";
import type { TutionClass, TutionSchedule } from "@/tution/types";

function courseLabel(course: TutionClass): string {
  return `${course.application_no || course.class_id}｜${course.teacher_name_cn}｜${course.subject}（${course.form}）`;
}

const ExtraSessions: React.FC = () => {
  const { allClasses, classesLoading, error, setError } = useTutionAdminData();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [extraSessions, setExtraSessions] = useState<TutionSchedule[]>([]);

  const courses = useMemo(
    () =>
      filterCourses(allClasses)
        .filter((course) => course.approval_status === "approved" || course.approval_status === "active")
        .sort((a, b) => courseLabel(a).localeCompare(courseLabel(b), "zh-Hant")),
    [allClasses],
  );
  const courseById = useMemo(() => new Map(courses.map((course) => [course.class_id, course])), [courses]);

  const loadExtraSessions = async () => {
    try {
      setLoadingList(true);
      const all = await scheduleService.listAllSchedules();
      setExtraSessions(
        all
          .filter((item) => item.status === "extra")
          .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date) || b.updated_at - a.updated_at),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入額外加課失敗");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadExtraSessions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !scheduledDate || !note.trim()) {
      setError("請先選擇課程、日期並填寫備註說明");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await scheduleService.createExtraSession(selectedClassId, scheduledDate, note.trim());
      setScheduledDate("");
      setNote("");
      await loadExtraSessions();
      alert("✅ 額外加課已加入，老師現在會在排課／點名頁看到這堂課。");
    } catch (err: any) {
      const code = err?.response?.data?.error;
      if (code === "DATE_ALREADY_HAS_SESSION") {
        setError("該日期已有原定課、調課或其他加課，不能重複新增");
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
            <select value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} disabled={classesLoading || saving}>
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
            <input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} disabled={saving} />
          </label>
          <label>
            <div>備註說明</div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="例如：考前加強、假期補課、特別練習"
              disabled={saving}
            />
          </label>
          <div>
            <button type="submit" className="btn btn-primary" disabled={saving || classesLoading}>
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

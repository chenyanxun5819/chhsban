import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/common/Layout";
import {
  listAllCourses,
  createCourse,
  bindTeacher,
  openCourse,
  closeCourse,
  listTeachers,
} from "@/services/courseService";
import type { OptionalCourse, TeacherOption } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  pending: "未綁老師",
  open: "開放中",
  closed: "已關閉",
};

const AdminCourseList: React.FC = () => {
  const [courses, setCourses] = useState<OptionalCourse[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // 依科組分組並排序，供綁定老師的下拉選單使用（科組名稱排序，組內再依姓名排序）
  const teachersByDepartment = useMemo(() => {
    const groups = new Map<string, TeacherOption[]>();
    for (const t of teachers) {
      const dept = t.department || "未分類";
      if (!groups.has(dept)) groups.set(dept, []);
      groups.get(dept)!.push(t);
    }
    for (const list of groups.values()) {
      list.sort((a, b) => (a.name_cn || a.name_en).localeCompare(b.name_cn || b.name_en, "zh-Hant"));
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0], "zh-Hant"));
  }, [teachers]);

  const teacherEmailById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teachers) map.set(t.teacher_id, t.email);
    return map;
  }, [teachers]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [courseList, teacherList] = await Promise.all([listAllCourses(), listTeachers()]);
      setCourses(courseList);
      setTeachers(teacherList);
    } catch (err: any) {
      setError(err.response?.data?.error || "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    try {
      setError(null);
      await createCourse({ subject: subject.trim() });
      setSubject("");
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "建課失敗");
    }
  };

  const handleBind = async (courseId: string) => {
    const teacherId = selectedTeacher[courseId];
    if (!teacherId) return;
    try {
      setBusyId(courseId);
      setError(null);
      await bindTeacher(courseId, teacherId);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "綁定老師失敗");
    } finally {
      setBusyId(null);
    }
  };

  const handleOpen = async (courseId: string) => {
    try {
      setBusyId(courseId);
      setError(null);
      await openCourse(courseId);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "開放窗口失敗");
    } finally {
      setBusyId(null);
    }
  };

  const handleClose = async (courseId: string) => {
    try {
      setBusyId(courseId);
      setError(null);
      await closeCourse(courseId);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.error || "關閉窗口失敗");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Layout title="課程總覽（行政人員）">
      <div className="card">
        <h3>開新課程窗口</h3>
        <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <div className="form-row" style={{ flex: 1 }}>
            <label htmlFor="subject">選修課名稱</label>
            <input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：程式設計入門"
            />
          </div>
          <button type="submit" className="btn btn--primary">
            建立課程
          </button>
        </form>
      </div>

      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>載入中...</p>
      ) : courses.length === 0 ? (
        <p>目前沒有任何課程。</p>
      ) : (
        courses.map((course) => (
          <div className="card" key={course.course_id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{course.subject}</h3>
              <span className={`badge badge--${course.window_status}`}>
                {STATUS_LABEL[course.window_status]}
              </span>
            </div>
            <p>
              授課老師：
              {course.teacher_id ? (
                <>
                  {course.teacher_name_cn}
                  {teacherEmailById.get(course.teacher_id) && (
                    <span style={{ color: "#888" }}>（{teacherEmailById.get(course.teacher_id)}）</span>
                  )}
                </>
              ) : (
                <em>尚未綁定</em>
              )}
            </p>

            {!course.teacher_id && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <select
                  value={selectedTeacher[course.course_id] || ""}
                  onChange={(e) =>
                    setSelectedTeacher((prev) => ({ ...prev, [course.course_id]: e.target.value }))
                  }
                >
                  <option value="">選擇老師...</option>
                  {teachersByDepartment.map(([dept, list]) => (
                    <optgroup key={dept} label={dept}>
                      {list.map((t) => (
                        <option key={t.teacher_id} value={t.teacher_id}>
                          {t.name_cn || t.name_en}（{t.email}）
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  className="btn"
                  disabled={busyId === course.course_id || !selectedTeacher[course.course_id]}
                  onClick={() => handleBind(course.course_id)}
                >
                  綁定老師
                </button>
              </div>
            )}

            {course.teacher_id && course.window_status === "pending" && (
              <button className="btn btn--primary" disabled={busyId === course.course_id} onClick={() => handleOpen(course.course_id)}>
                開放窗口（老師開始可管理）
              </button>
            )}

            {course.window_status === "open" && (
              <button className="btn btn--danger" disabled={busyId === course.course_id} onClick={() => handleClose(course.course_id)}>
                關閉窗口
              </button>
            )}
          </div>
        ))
      )}
    </Layout>
  );
};

export default AdminCourseList;

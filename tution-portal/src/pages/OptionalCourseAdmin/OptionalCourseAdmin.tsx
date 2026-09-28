import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import {
  optionalCourseService,
  type OptionalCourse,
  type OptionalCourseTeacherOption,
} from "@/services/optionalCourseService";
import "./optional-course-admin.css";

/**
 * 選修課總覽（行政端）。資料來自獨立的選修課 Worker（optional-course-system），
 * 與補習班的 AdminPanel 分開成獨立頁面，不共用任何狀態。
 * 權限與補習系統一致：super_admin 可建課／綁定老師／開關窗口；admin（督察員）只能查看。
 * 老師端（名冊／排課／點名）仍在 optional-course.pages.dev。
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "未綁老師",
  open: "開放中",
  closed: "已關閉",
};

// 與選修課 Worker 一致：以馬來西亞時間（UTC+8）判定日曆年，保留今年＋往前 2 年
const currentYear = () => new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear();
const selectableYears = () => {
  const y = currentYear();
  return [y + 1, y, y - 1, y - 2];
};

const VIEW_PERMISSIONS = ["super_admin", "admin"];

export const OptionalCourseAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = user?.permission === "super_admin";

  const [year, setYear] = useState(currentYear());
  const [courses, setCourses] = useState<OptionalCourse[]>([]);
  const [teachers, setTeachers] = useState<OptionalCourseTeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [createYear, setCreateYear] = useState(currentYear());
  const [selectedTeacher, setSelectedTeacher] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (user && !VIEW_PERMISSIONS.includes(user.permission)) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // 依科組分組並排序，供綁定老師的下拉選單使用
  const teachersByDepartment = useMemo(() => {
    const groups = new Map<string, OptionalCourseTeacherOption[]>();
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

  const teacherEmailById = useMemo(
    () => new Map(teachers.map((t) => [t.teacher_id, t.email])),
    [teachers],
  );

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      setCourses(await optionalCourseService.listCourses(year));
    } catch (err: any) {
      setError(err.response?.data?.error || "載入選修課失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !VIEW_PERMISSIONS.includes(user.permission)) return;
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, user?.permission]);

  // 老師清單只在綁定老師時用得到，督察員沒有權限也不需要
  useEffect(() => {
    if (!canManage) return;
    optionalCourseService
      .listTeachers()
      .then(setTeachers)
      .catch(() => setError("載入老師清單失敗"));
  }, [canManage]);

  const runAction = async (courseId: string, action: () => Promise<unknown>, failMessage: string) => {
    try {
      setBusyId(courseId);
      setError(null);
      await action();
      await loadCourses();
    } catch (err: any) {
      setError(err.response?.data?.error || failMessage);
    } finally {
      setBusyId(null);
    }
  };

  // 刪除無法復原，要求輸入課程編號確認，避免點錯列
  const handleDelete = (course: OptionalCourse) => {
    const input = window.prompt(
      `確定要刪除「${course.course_no} ${course.subject}」嗎？\n\n` +
        "課程的名冊、排課、點名紀錄會一併刪除，無法復原；此編號也不會再被使用。\n\n" +
        `請輸入課程編號 ${course.course_no} 確認刪除：`,
    );
    if (input === null) return;
    if (input.trim() !== course.course_no) {
      setError("輸入的課程編號不符，未刪除");
      return;
    }
    runAction(course.course_id, () => optionalCourseService.deleteCourse(course.course_id), "刪除課程失敗");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    try {
      setError(null);
      await optionalCourseService.createCourse(subject.trim(), createYear);
      setSubject("");
      if (createYear !== year) {
        setYear(createYear); // 切到新課程所在年份，useEffect 會重新載入
      } else {
        await loadCourses();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "建課失敗");
    }
  };

  if (!user || !VIEW_PERMISSIONS.includes(user.permission)) {
    return null;
  }

  return (
    <Layout title="選修課總覽">
      <div className="oc-admin">
        {canManage && (
          <section className="oc-card">
            <h2 className="oc-card__title">開新課程窗口</h2>
            <form onSubmit={handleCreate} className="oc-create-form">
              <label className="oc-field oc-field--grow">
                <span>選修課名稱</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例如：程式設計入門" />
              </label>
              <label className="oc-field">
                <span>年份</span>
                <select value={createYear} onChange={(e) => setCreateYear(Number(e.target.value))}>
                  <option value={currentYear()}>{currentYear()}</option>
                  <option value={currentYear() + 1}>{currentYear() + 1}</option>
                </select>
              </label>
              <button type="submit" className="oc-btn oc-btn--primary">
                建立課程
              </button>
            </form>
          </section>
        )}

        <section className="oc-card">
          <div className="oc-toolbar">
            <h2 className="oc-card__title">選修課列表</h2>
            <label className="oc-field oc-field--inline">
              <span>年份：</span>
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {selectableYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="oc-hint">
            系統只保留今年及往前 2 年的選修課資料。老師的名冊、排課、點名在
            <a href="https://optional-course.pages.dev/my/courses" target="_blank" rel="noopener noreferrer">
              選修課點名系統 ↗
            </a>
            。{!canManage && "（督察員僅可查看）"}
          </p>

          {error && <p className="oc-error">{error}</p>}

          {loading ? (
            <p>載入中...</p>
          ) : courses.length === 0 ? (
            <p className="oc-empty">{year} 年沒有任何選修課。</p>
          ) : (
            <div className="oc-table-wrap">
              <table className="oc-table">
                <thead>
                  <tr>
                    <th>編號</th>
                    <th>選修課名稱</th>
                    <th>授課老師</th>
                    <th>狀態</th>
                    {canManage && <th>操作</th>}
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr key={course.course_id}>
                      <td className="oc-nowrap">{course.course_no}</td>
                      <td>{course.subject}</td>
                      <td>
                        {course.teacher_id ? (
                          <>
                            {course.teacher_name_cn}
                            {teacherEmailById.get(course.teacher_id) && (
                              <div className="oc-muted">{teacherEmailById.get(course.teacher_id)}</div>
                            )}
                          </>
                        ) : (
                          <em className="oc-muted">尚未綁定</em>
                        )}
                      </td>
                      <td>
                        <span className={`oc-badge oc-badge--${course.window_status}`}>
                          {STATUS_LABEL[course.window_status]}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          {!course.teacher_id && (
                            <div className="oc-actions">
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
                                className="oc-btn"
                                disabled={busyId === course.course_id || !selectedTeacher[course.course_id]}
                                onClick={() =>
                                  runAction(
                                    course.course_id,
                                    () => optionalCourseService.bindTeacher(course.course_id, selectedTeacher[course.course_id]),
                                    "綁定老師失敗",
                                  )
                                }
                              >
                                綁定老師
                              </button>
                            </div>
                          )}
                          {course.teacher_id && course.window_status === "pending" && (
                            <button
                              className="oc-btn oc-btn--primary"
                              disabled={busyId === course.course_id}
                              onClick={() =>
                                runAction(course.course_id, () => optionalCourseService.openCourse(course.course_id), "開放窗口失敗")
                              }
                            >
                              開放窗口
                            </button>
                          )}
                          {course.window_status === "open" && (
                            <button
                              className="oc-btn oc-btn--danger"
                              disabled={busyId === course.course_id}
                              onClick={() => {
                                if (!window.confirm(`確定要關閉「${course.subject}」的窗口嗎？關閉後老師無法再修改名冊、排課、點名。`)) return;
                                runAction(course.course_id, () => optionalCourseService.closeCourse(course.course_id), "關閉窗口失敗");
                              }}
                            >
                              關閉窗口
                            </button>
                          )}
                          <button
                            className="oc-btn oc-btn--link-danger"
                            disabled={busyId === course.course_id}
                            onClick={() => handleDelete(course)}
                          >
                            刪除
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default OptionalCourseAdmin;

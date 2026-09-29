import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { useAuth } from "@/shared/auth/AuthContext";
import {
  listCourses,
  createCourse,
  updateCourseWeekday,
  bindTeacher,
  openCourse,
  closeCourse,
  deleteCourse,
  listTeachers,
} from "@/optional/services/courseService";
import { getAttendanceSummary } from "@/optional/services/calendarService";
import type { CourseAttendanceSummary, OptionalCourse, TeacherOption, Weekday } from "@/optional/types";
import { SCHOOL_WEEKDAYS, WEEKDAY_LABEL } from "@/optional/utils/calendar";
import { currentYear, selectableYears } from "@/shared/utils/year";

/**
 * 選修課總覽（原 tution-portal 的 OptionalCourseAdmin，2026-09-29 搬到管理站）。
 * super_admin 可建課／綁定老師／設定上課星期／開關窗口／刪除；督察員只能查看。
 * 老師的名冊、點名在 optional-course.pages.dev。
 */

const STATUS_LABEL: Record<string, string> = {
  pending: "未綁老師",
  open: "開放中",
  closed: "已關閉",
};

const TEACHER_SITE_URL = "https://optional-course.pages.dev/my/courses";

const CourseList: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.permission === "super_admin";

  const [year, setYear] = useState(currentYear());
  const [courses, setCourses] = useState<OptionalCourse[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [stats, setStats] = useState<Map<string, CourseAttendanceSummary>>(new Map());
  const [calendarReady, setCalendarReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [createYear, setCreateYear] = useState(currentYear());
  const [createWeekday, setCreateWeekday] = useState<Weekday | "">("");
  const [selectedTeacher, setSelectedTeacher] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  // 依科組分組並排序，供綁定老師的下拉選單使用
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

  const teacherEmailById = useMemo(() => new Map(teachers.map((t) => [t.teacher_id, t.email])), [teachers]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const [list, summary] = await Promise.all([listCourses(year), getAttendanceSummary(year)]);
      setCourses(list);
      setStats(new Map(summary.courses.map((c) => [c.course_id, c])));
      setCalendarReady(summary.calendar_ready);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "載入選修課失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  // 老師清單只在綁定老師時用得到，督察員沒有權限也不需要
  useEffect(() => {
    if (!canManage) return;
    listTeachers()
      .then(setTeachers)
      .catch(() => setError("載入老師清單失敗"));
  }, [canManage]);

  const runAction = async (courseId: string, action: () => Promise<unknown>, failMessage: string) => {
    try {
      setBusyId(courseId);
      setError(null);
      await action();
      await load();
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
    runAction(course.course_id, () => deleteCourse(course.course_id), "刪除課程失敗");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    try {
      setError(null);
      await createCourse({ subject: subject.trim(), year: createYear, day_of_week: createWeekday || undefined });
      setSubject("");
      setCreateWeekday("");
      if (createYear !== year) {
        setYear(createYear); // 切到新課程所在年份，useEffect 會重新載入
      } else {
        await load();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "建課失敗");
    }
  };

  return (
    <Layout title="選修課總覽">
      {canManage && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>開新課程窗口</h3>
          <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-row" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
              <label htmlFor="subject">選修課名稱</label>
              <input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="例如：程式設計入門" />
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label htmlFor="createWeekday">上課星期</label>
              <select id="createWeekday" value={createWeekday} onChange={(e) => setCreateWeekday(e.target.value as Weekday | "")}>
                <option value="">稍後設定</option>
                {SCHOOL_WEEKDAYS.map((w) => (
                  <option key={w} value={w}>
                    {WEEKDAY_LABEL[w]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-row" style={{ marginBottom: 0 }}>
              <label htmlFor="createYear">年份</label>
              <select id="createYear" value={createYear} onChange={(e) => setCreateYear(Number(e.target.value))}>
                <option value={currentYear()}>{currentYear()}</option>
                <option value={currentYear() + 1}>{currentYear() + 1}</option>
              </select>
            </div>
            <button type="submit" className="btn btn--primary">
              建立課程
            </button>
          </form>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0", flexWrap: "wrap" }}>
        <label htmlFor="viewYear">年份：</label>
        <select id="viewYear" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {selectableYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <span style={{ color: "#888", fontSize: 13 }}>
          系統只保留今年及往前 2 年的選修課資料。老師的名冊、點名在{" "}
          <a href={TEACHER_SITE_URL} target="_blank" rel="noopener noreferrer">
            選修課點名系統 ↗
          </a>
          {!canManage && "（督察員僅可查看）"}
        </span>
      </div>

      {!loading && !calendarReady && (
        <div className="card notice">
          {year} 年的選修課行事曆尚未建立，無法推算應點名日期。請先到 <Link to="/optional/calendar">選修課行事曆</Link>{" "}
          設定開學日、結業日與假期。
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p>載入中...</p>
      ) : courses.length === 0 ? (
        <p>{year} 年沒有任何選修課。</p>
      ) : (
        <div className="card" style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>編號</th>
                <th>選修課名稱</th>
                <th>授課老師</th>
                <th>上課星期</th>
                <th>點名</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const s = stats.get(course.course_id);
                const busy = busyId === course.course_id;
                return (
                  <tr key={course.course_id}>
                    <td style={{ whiteSpace: "nowrap" }}>{course.course_no}</td>
                    <td>{course.subject}</td>
                    <td>
                      {course.teacher_id ? (
                        <>
                          {course.teacher_name_cn}
                          {teacherEmailById.get(course.teacher_id) && (
                            <div style={{ color: "#888", fontSize: 12 }}>{teacherEmailById.get(course.teacher_id)}</div>
                          )}
                        </>
                      ) : (
                        <em style={{ color: "#888" }}>尚未綁定</em>
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <select
                          value={course.day_of_week || ""}
                          disabled={busy}
                          onChange={(e) =>
                            runAction(
                              course.course_id,
                              () => updateCourseWeekday(course.course_id, e.target.value as Weekday | ""),
                              "設定上課星期失敗",
                            )
                          }
                        >
                          <option value="">未設定</option>
                          {SCHOOL_WEEKDAYS.map((w) => (
                            <option key={w} value={w}>
                              {WEEKDAY_LABEL[w]}
                            </option>
                          ))}
                        </select>
                      ) : course.day_of_week ? (
                        WEEKDAY_LABEL[course.day_of_week]
                      ) : (
                        <em style={{ color: "#b45309" }}>未設定</em>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {s && course.day_of_week && calendarReady ? (
                        <>
                          {s.recorded_count} / {s.due_count}
                          {s.missing_dates.length > 0 && (
                            <div>
                              <span className="badge badge--missing">未點名 {s.missing_dates.length}</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "#999" }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge--${course.window_status}`}>{STATUS_LABEL[course.window_status]}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                        {canManage && !course.teacher_id && (
                          <>
                            <select
                              value={selectedTeacher[course.course_id] || ""}
                              onChange={(e) => setSelectedTeacher((prev) => ({ ...prev, [course.course_id]: e.target.value }))}
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
                              className="btn btn--small"
                              disabled={busy || !selectedTeacher[course.course_id]}
                              onClick={() =>
                                runAction(course.course_id, () => bindTeacher(course.course_id, selectedTeacher[course.course_id]), "綁定老師失敗")
                              }
                            >
                              綁定老師
                            </button>
                          </>
                        )}
                        {canManage && course.teacher_id && course.window_status === "pending" && (
                          <button
                            className="btn btn--small btn--primary"
                            disabled={busy}
                            onClick={() => runAction(course.course_id, () => openCourse(course.course_id), "開放窗口失敗")}
                          >
                            開放窗口
                          </button>
                        )}
                        {canManage && course.window_status === "open" && (
                          <button
                            className="btn btn--small btn--danger"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`確定要關閉「${course.subject}」的窗口嗎？關閉後老師無法再修改名冊、點名。`)) return;
                              runAction(course.course_id, () => closeCourse(course.course_id), "關閉窗口失敗");
                            }}
                          >
                            關閉窗口
                          </button>
                        )}
                        {canManage && course.window_status === "closed" && (
                          <button
                            className="btn btn--small btn--primary"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`確定要重新開放「${course.subject}」嗎？開放後老師可再修改名冊、點名。`)) return;
                              runAction(course.course_id, () => openCourse(course.course_id), "重新開放失敗");
                            }}
                          >
                            重新開放
                          </button>
                        )}
                        <Link className="btn btn--small" to={`/optional/courses/${course.course_id}/schedule`}>
                          上課日期{canManage ? "／停課" : ""}
                        </Link>
                        {canManage && (
                          <button className="btn btn--small btn--danger" disabled={busy} onClick={() => handleDelete(course)}>
                            刪除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default CourseList;

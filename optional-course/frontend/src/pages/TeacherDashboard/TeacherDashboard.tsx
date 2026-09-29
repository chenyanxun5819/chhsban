import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { listMyCourses } from "@/services/courseService";
import { getCourseSessions } from "@/services/calendarService";
import type { OptionalCourse } from "@/types";
import { currentYear, selectableYears } from "@/utils/year";
import { WEEKDAY_LABEL } from "@/utils/calendar";

const STATUS_LABEL: Record<string, string> = {
  pending: "尚未开放 / Not Open",
  open: "开放中 / Open",
  closed: "已关闭 / Closed",
};

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<OptionalCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [year, setYear] = useState(currentYear());
  const [missing, setMissing] = useState<Record<string, number>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    setMissing({});
    listMyCourses(year)
      .then((list) => {
        setCourses(list);
        // 各課未點名堂數（每門課一次請求，老師通常只有一兩門課）
        list
          .filter((c) => c.window_status === "open")
          .forEach((c) =>
            getCourseSessions(c.course_id)
              .then((info) =>
                setMissing((prev) => ({ ...prev, [c.course_id]: info.sessions.filter((s) => s.missing).length })),
              )
              .catch(() => undefined),
          );
      })
      .catch((err) => setError(err.response?.data?.error || "载入失败 / Failed to load"))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <Layout title="选修课点名系统 / Optional Course">
      <div className="welcome-header">
        <h1>欢迎 / Welcome, {user?.teacherName}!</h1>
        <p>我的选修课 / My Optional Courses</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        <label htmlFor="viewYear">年份 / Year：</label>
        <select id="viewYear" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {selectableYears().map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>载入中... / Loading...</p>
      ) : courses.length === 0 ? (
        <p>
          {year} 年没有绑定给您的课程，如有疑问请联络行政人员。
          <br />
          No courses are assigned to you for {year}. Please contact the administrator if you have any questions.
        </p>
      ) : (
        courses.map((course) => (
          <div className="card" key={course.course_id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                <span style={{ color: "#888", fontWeight: "normal", marginRight: 8 }}>{course.course_no}</span>
                {course.subject}
              </h3>
              <span className={`badge badge--${course.window_status}`}>
                {STATUS_LABEL[course.window_status]}
              </span>
            </div>
            {course.day_of_week && (
              <p style={{ color: "#666", margin: "8px 0" }}>
                每{WEEKDAY_LABEL[course.day_of_week]}上课 / Every {course.day_of_week}
                {course.time_start && `　${course.time_start}${course.time_end ? `–${course.time_end}` : ""}`}
                {course.venue && `　${course.venue}`}
              </p>
            )}
            {missing[course.course_id] > 0 && (
              <p style={{ color: "#b91c1c", margin: "8px 0" }}>
                您有 {missing[course.course_id]} 堂课未点名，请尽快补上。 / {missing[course.course_id]} session(s) not yet marked, please complete them soon.
              </p>
            )}
            {course.window_status === "pending" ? (
              <p style={{ color: "#888" }}>窗口尚未开放，暂时无法管理名册/点名。 / Not open yet; roster and attendance are unavailable.</p>
            ) : (
              <>
                {course.window_status === "closed" && (
                  <p style={{ color: "#888" }}>课程已关闭，名册/点名仅供查看。 / Course closed; roster and attendance are view-only.</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/roster`)}>
                    {course.window_status === "open" ? "名册管理 / Roster" : "查看名册 / View Roster"}
                  </button>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/attendance`)}>
                    {course.window_status === "open" ? "点名 / Attendance" : "查看点名 / View Attendance"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </Layout>
  );
};

export default TeacherDashboard;

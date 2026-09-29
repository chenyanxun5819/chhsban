import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { listMyCourses } from "@/services/courseService";
import { getCourseSessions } from "@/services/calendarService";
import type { OptionalCourse } from "@/types";
import { currentYear, selectableYears } from "@/utils/year";
import { WEEKDAY_LABEL } from "@/utils/calendar";

const STATUS_LABEL: Record<string, string> = {
  pending: "尚未開放",
  open: "開放中",
  closed: "已關閉",
};

const TeacherDashboard: React.FC = () => {
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
      .catch((err) => setError(err.response?.data?.error || "載入失敗"))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <Layout title="我的選修課">
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        <label htmlFor="viewYear">年份：</label>
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
        <p>載入中...</p>
      ) : courses.length === 0 ? (
        <p>{year} 年沒有綁定給您的課程，如有疑問請聯絡行政人員。</p>
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
                每{WEEKDAY_LABEL[course.day_of_week]}上課
                {course.time_start && `　${course.time_start}${course.time_end ? `–${course.time_end}` : ""}`}
                {course.venue && `　${course.venue}`}
              </p>
            )}
            {missing[course.course_id] > 0 && (
              <p style={{ color: "#b91c1c", margin: "8px 0" }}>您有 {missing[course.course_id]} 堂課未點名，請盡快補上。</p>
            )}
            {course.window_status === "pending" ? (
              <p style={{ color: "#888" }}>窗口尚未開放，暫時無法管理名冊/點名。</p>
            ) : (
              <>
                {course.window_status === "closed" && (
                  <p style={{ color: "#888" }}>課程已關閉，名冊/上課日期/點名僅供查看。</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/roster`)}>
                    {course.window_status === "open" ? "名冊管理" : "查看名冊"}
                  </button>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/schedule`)}>
                    上課日期
                  </button>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/attendance`)}>
                    {course.window_status === "open" ? "點名" : "查看點名"}
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

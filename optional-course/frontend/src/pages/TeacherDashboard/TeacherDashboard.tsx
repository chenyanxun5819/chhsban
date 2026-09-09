import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { listMyCourses } from "@/services/courseService";
import type { OptionalCourse } from "@/types";

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

  useEffect(() => {
    listMyCourses()
      .then(setCourses)
      .catch((err) => setError(err.response?.data?.error || "載入失敗"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout title="我的選修課">
      {error && <p className="error-text">{error}</p>}
      {loading ? (
        <p>載入中...</p>
      ) : courses.length === 0 ? (
        <p>目前沒有綁定給您的課程，請聯絡行政人員。</p>
      ) : (
        courses.map((course) => (
          <div className="card" key={course.course_id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{course.subject}</h3>
              <span className={`badge badge--${course.window_status}`}>
                {STATUS_LABEL[course.window_status]}
              </span>
            </div>
            {course.window_status !== "open" ? (
              <p style={{ color: "#888" }}>窗口尚未開放，暫時無法管理名冊/排課/點名。</p>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/roster`)}>
                  名冊管理
                </button>
                <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/schedule`)}>
                  排課管理
                </button>
                <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/attendance`)}>
                  點名
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
};

export default TeacherDashboard;

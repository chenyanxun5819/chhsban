import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { listMyCourses } from "@/services/courseService";
import { getCourseSessions } from "@/services/calendarService";
import type { OptionalCourse } from "@/types";
import { currentYear, selectableYears } from "@/utils/year";
import { courseWeekdays, weekdayListLabel } from "@/utils/calendar";

const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      .catch((err) => setError(err.response?.data?.error || t("common.loadFailed")))
      .finally(() => setLoading(false));
  }, [year]);

  return (
    <Layout title={t("common.appTitle")}>
      <div className="welcome-header">
        <h1>{t("dashboard.welcome", { name: user?.teacherName })}</h1>
        <p>{t("dashboard.myCourses")}</p>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        <label htmlFor="viewYear">{t("dashboard.year")}</label>
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
        <p>{t("common.loading")}</p>
      ) : courses.length === 0 ? (
        <p>{t("dashboard.noCourses", { year })}</p>
      ) : (
        courses.map((course) => (
          <div className="card" key={course.course_id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>
                <span style={{ color: "#888", fontWeight: "normal", marginRight: 8 }}>{course.course_no}</span>
                {course.subject}
              </h3>
              <span className={`badge badge--${course.window_status}`}>
                {t(`windowStatus.${course.window_status}`)}
              </span>
            </div>
            {courseWeekdays(course).length > 0 && (
              <p style={{ color: "#666", margin: "8px 0" }}>
                {t("dashboard.everyDayClass", { day: weekdayListLabel(courseWeekdays(course)) })}
                {course.time_start && `　${course.time_start}${course.time_end ? `–${course.time_end}` : ""}`}
                {course.venue && `　${course.venue}`}
              </p>
            )}
            {missing[course.course_id] > 0 && (
              <p style={{ color: "#b91c1c", margin: "8px 0" }}>
                {t("dashboard.missingSessions", { count: missing[course.course_id] })}
              </p>
            )}
            {course.window_status === "pending" ? (
              <p style={{ color: "#888" }}>{t("dashboard.pendingNotice")}</p>
            ) : (
              <>
                {course.window_status === "closed" && (
                  <p style={{ color: "#888" }}>{t("dashboard.closedNotice")}</p>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/roster`)}>
                    {course.window_status === "open" ? t("dashboard.manageRoster") : t("dashboard.viewRoster")}
                  </button>
                  <button className="btn" onClick={() => navigate(`/courses/${course.course_id}/attendance`)}>
                    {course.window_status === "open" ? t("dashboard.takeAttendance") : t("dashboard.viewAttendance")}
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

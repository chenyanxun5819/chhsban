import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Layout } from "@/shared/components/Layout";
import { getCourse } from "@/optional/services/courseService";
import { getCourseSessions } from "@/optional/services/calendarService";
import { listAttendance, listRoster } from "@/optional/services/attendanceService";
import { AttendanceOverview } from "@/optional/components/AttendanceOverview";
import type { CourseSessionsInfo, OptionalCourse, OptionalCourseAttendance, OptionalCourseRoster } from "@/optional/types";
import { WEEKDAY_LABEL } from "@/optional/utils/calendar";

/** 單一選修課的點名總覽（學生 × 上課日），唯讀；點名由老師在 optional-course.pages.dev 操作 */
const CourseAttendance: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [roster, setRoster] = useState<OptionalCourseRoster[]>([]);
  const [info, setInfo] = useState<CourseSessionsInfo | null>(null);
  const [records, setRecords] = useState<OptionalCourseAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([getCourse(id), listRoster(id), getCourseSessions(id), listAttendance(id)])
      .then(([c, r, i, a]) => {
        setCourse(c);
        setRoster(r);
        setInfo(i);
        setRecords(a);
      })
      .catch((err) => setError(err.response?.data?.error || "載入失敗"))
      .finally(() => setLoading(false));
  }, [id]);

  const subtitle = course
    ? [
        course.teacher_name_cn && `授課老師：${course.teacher_name_cn}`,
        course.day_of_week &&
          `每${WEEKDAY_LABEL[course.day_of_week]}${
            course.time_start ? ` ${course.time_start}${course.time_end ? `-${course.time_end}` : ""}` : ""
          }`,
        course.venue,
      ]
        .filter(Boolean)
        .join(" ・ ")
    : "";

  return (
    <Layout title={course ? `點名總覽 - ${course.course_no} ${course.subject}` : "點名總覽"}>
      <p style={{ marginTop: 0 }}>
        <Link to="/optional/courses">← 回選修課總覽</Link>
      </p>
      {course && subtitle && <p className="oc-att-subtitle" style={{ marginBottom: 12 }}>{subtitle}</p>}
      {error && <p className="error-text">{error}</p>}
      {loading || !info ? (
        !error && <p>載入中...</p>
      ) : (
        <AttendanceOverview info={info} roster={roster} records={records} />
      )}
    </Layout>
  );
};

export default CourseAttendance;

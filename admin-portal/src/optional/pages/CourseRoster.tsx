import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { TutionPage } from "@/tution/components/TutionPage";
import { RosterStats, RosterTable } from "@/tution/components/classDetail/RosterView";
import { exportRosterToXLSX } from "@/tution/services/rosterService";
import type { ClassRosterEntry } from "@/tution/types";
import { getCourse } from "@/optional/services/courseService";
import { listRoster } from "@/optional/services/attendanceService";
import type { OptionalCourse, OptionalCourseRoster } from "@/optional/types";
import { WEEKDAY_LABEL } from "@/optional/utils/calendar";

/** 選修課名冊轉成補習班學生總覽元件的欄位 */
const toRosterEntry = (r: OptionalCourseRoster): ClassRosterEntry => ({
  roster_id: r.roster_id,
  class_id: r.course_id,
  student_id: r.student_id,
  student_no: r.student_no,
  name_cn: r.student_name_cn,
  name_en: r.student_name_en,
  real_class_name: r.student_class,
  gender_boarding: r.gender_boarding || "-",
  student_status: r.student_status,
  enrollment_date: r.enrollment_date,
  withdrawal_date: r.withdrawal_date || null,
  withdrawal_reason: r.withdrawal_reason || null,
  is_active: r.is_active,
});

/**
 * 單一選修課的學生總覽（唯讀），完全比照補習班「已開課管理 → 學生總覽」：
 * 共用 tution 的 RosterStats／RosterTable 與 class-detail.css；名冊由老師在 optional-course.pages.dev 維護。
 */
const CourseRoster: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [roster, setRoster] = useState<ClassRosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [c, r] = await Promise.all([getCourse(id), listRoster(id)]);
      setCourse(c);
      setRoster(r.map(toRosterEntry));
    } catch (err: any) {
      setError(err.response?.data?.error || "載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const subtitle = course
    ? [
        `課程編號: ${course.course_no}`,
        course.teacher_name_cn && `授課老師: ${course.teacher_name_cn}`,
        course.day_of_week &&
          `每${WEEKDAY_LABEL[course.day_of_week]}${
            course.time_start ? ` ${course.time_start}${course.time_end ? `-${course.time_end}` : ""}` : ""
          }`,
        course.venue || "-",
      ]
        .filter(Boolean)
        .join(" ・ ")
    : "";

  return (
    <TutionPage title="學生總覽" heading={course ? `${course.subject} - 學生總覽` : "學生總覽"} error={error}>
      <div className="tu-class-detail">
        <div className="class-detail-header">
          <Link to="/optional/courses" className="btn btn-small">
            ← 返回選修課總覽
          </Link>
          {course && <p className="class-detail-subtitle">{subtitle}</p>}
        </div>
        {loading && !course ? (
          <div className="loading-text">載入中...</div>
        ) : !course ? (
          <div className="empty-state">找不到這門課程</div>
        ) : (
          <>
            <RosterStats roster={roster} />
            <RosterTable
              roster={roster}
              onExport={() => exportRosterToXLSX(roster, course.course_no)}
              onRefresh={load}
              loading={loading}
            />
          </>
        )}
      </div>
    </TutionPage>
  );
};

export default CourseRoster;

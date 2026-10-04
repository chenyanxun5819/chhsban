import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CoursePageHeader, Layout } from "@/components/common/Layout";
import { getCourse } from "@/services/courseService";
import { listSchedules } from "@/services/scheduleService";
import { getCourseSessions } from "@/services/calendarService";
import type { CourseSessionsInfo, OptionalCourse, OptionalCourseSchedule } from "@/types";
import { weekdayListLabel, courseSubtitle, formatDate } from "@/utils/calendar";

/**
 * 上課日期表（老師端唯讀）：應點名日期由學校行事曆＋課程上課星期推算。
 * 選修課跟學校統一排課，停課／調課只有行政人員能在管理站（admin-portal）登記。
 */
const ScheduleManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [course, setCourse] = useState<OptionalCourse | null>(null);
  const [schedules, setSchedules] = useState<OptionalCourseSchedule[]>([]);
  const [info, setInfo] = useState<CourseSessionsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    Promise.all([getCourse(id), listSchedules(id), getCourseSessions(id)])
      .then(([c, s, i]) => {
        setCourse(c);
        setSchedules(s);
        setInfo(i);
      })
      .catch((err) => setError(err.response?.data?.error || t("common.loadFailed")))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <Layout title={t("schedule.title")}>
      {course && <CoursePageHeader subject={course.subject} subtitle={courseSubtitle(course)} />}
      {error && <p className="error-text">{error}</p>}

      {loading || !info ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          {course?.window_status === "closed" && (
            <p className="card" style={{ color: "#92400e", background: "#fffbeb" }}>
              {t("schedule.closedNotice")}
            </p>
          )}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{t("schedule.tableTitle")}</h3>
            {!info.calendar_ready ? (
              <p style={{ color: "#b45309" }}>{t("schedule.calendarNotReady")}</p>
            ) : info.weekly_days.length === 0 ? (
              <p style={{ color: "#b45309" }}>{t("schedule.noWeekday")}</p>
            ) : (
              <>
                <p style={{ color: "#666", marginTop: 0 }}>
                  {t("schedule.summary", { day: weekdayListLabel(info.weekly_days), count: info.sessions.length })}
                </p>
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("schedule.date")}</th>
                      <th>{t("schedule.note")}</th>
                      <th>{t("schedule.attendance")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {info.sessions.map((s) => (
                      <tr key={s.date} style={s.date === info.today ? { background: "#eff6ff" } : undefined}>
                        <td>{formatDate(s.date)}</td>
                        <td>
                          {s.rescheduled_from ? t("schedule.movedFrom", { date: formatDate(s.rescheduled_from) }) : ""}
                          {s.venue ? t("schedule.venue", { venue: s.venue }) : ""}
                        </td>
                        <td>
                          {s.recorded ? (
                            <span style={{ color: "#166534" }}>{t("schedule.recorded")}</span>
                          ) : s.missing ? (
                            <span className="badge badge--missing">{t("schedule.missing")}</span>
                          ) : (
                            <span style={{ color: "#999" }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>

          {schedules.length > 0 && (
            <div className="card">
              <h3>{t("schedule.changesTitle")}</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("schedule.originalDate")}</th>
                    <th>{t("schedule.status")}</th>
                    <th>{t("schedule.note")}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.schedule_id}>
                      <td>{formatDate(s.scheduled_date)}</td>
                      <td>{s.status === "cancelled"
                          ? t("schedule.cancelled")
                          : t("schedule.movedTo", { date: s.rescheduled_to ? formatDate(s.rescheduled_to) : "-" })}</td>
                      <td>{s.cancellation_reason || s.reschedule_reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Layout>
  );
};

export default ScheduleManagement;

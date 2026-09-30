import React from "react";
import { Link } from "react-router-dom";
import { TutionPage } from "@/tution/components/TutionPage";
import { useTranslation } from "@/tution/i18n";
import { useDayLabel, useGradeLabel } from "@/tution/i18n/labels";
import { formatDisplayDate } from "@/tution/utils/validators";
import type { TutionClass } from "@/tution/types";

/**
 * 已開課管理底下「學生總覽／排課狀態／出席狀況」三個唯讀頁的外框：
 * 返回連結、課程資訊，內容包在 .tu-class-detail（class-detail.css 的作用域）裡。
 */
export const ClassDetailPage: React.FC<{
  title: string;
  classInfo: TutionClass | null;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}> = ({ title, classInfo, loading, error, children }) => {
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();

  return (
    <TutionPage
      title={title}
      heading={classInfo ? `${classInfo.subject}（${gradeLabel(classInfo.form)}） - ${title}` : title}
      error={error}
    >
      <div className="tu-class-detail">
        <div className="class-detail-header">
          <Link to="/tution/courses" className="btn btn-small">
            ← 返回已開課管理
          </Link>
          {classInfo && (
            <p className="class-detail-subtitle">
              {t("roster.classNoLabel")}: {classInfo.application_no || classInfo.class_id}
              {" ・ "}
              {t("schedule.applicantLabel")}: {classInfo.teacher_name_cn}
              {" ・ "}
              {t("common.everyDayPrefix")}
              {dayLabel(classInfo.day_of_week)} {classInfo.time_start}-{classInfo.time_end}
              {" ・ "}
              {classInfo.venue || "-"}
              {classInfo.end_date ? ` ・ ${t("schedule.endDateLabel")} ${formatDisplayDate(classInfo.end_date)}` : ""}
            </p>
          )}
        </div>
        {loading ? (
          <div className="loading-text">載入中...</div>
        ) : !classInfo ? (
          <div className="empty-state">{t("schedule.notFound")}</div>
        ) : (
          children
        )}
      </div>
    </TutionPage>
  );
};

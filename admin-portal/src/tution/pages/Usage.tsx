import React from "react";
import { ClassroomUsageOverview } from "@/tution/components/admin/ClassroomUsageOverview";
import { TutionPage } from "@/tution/components/TutionPage";
import { useTutionAdminData } from "@/tution/hooks";

/** 每日教室使用總覽（原 tution-portal /admin/usage）；教室管理員也可查看 */
const Usage: React.FC = () => {
  const { allClasses, classesLoading, classrooms, lastTeachingDate, error } = useTutionAdminData();
  return (
    <TutionPage title="每日教室使用總覽" error={error}>
      <ClassroomUsageOverview
        classes={allClasses}
        classrooms={classrooms}
        lastTeachingDate={lastTeachingDate || undefined}
        classesLoading={classesLoading}
      />
    </TutionPage>
  );
};

export default Usage;

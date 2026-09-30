import React from "react";
import { useParams } from "react-router-dom";
import { ClassDetailPage } from "@/tution/components/classDetail/ClassDetailPage";
import { RosterStats, RosterTable } from "@/tution/components/classDetail/RosterView";
import { useClassDetail } from "@/tution/hooks";
import { exportRosterToXLSX } from "@/tution/services/rosterService";

/** 已開課管理 → 學生總覽（唯讀；原本外連 tution-portal /classes/:id/roster） */
const CourseRoster: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { classInfo, roster, loading, error, reload } = useClassDetail(id);

  return (
    <ClassDetailPage title="學生總覽" classInfo={classInfo} loading={loading} error={error}>
      <RosterStats roster={roster} />
      <RosterTable
        roster={roster}
        onExport={() => id && exportRosterToXLSX(roster, id)}
        onRefresh={reload}
        loading={loading}
      />
    </ClassDetailPage>
  );
};

export default CourseRoster;

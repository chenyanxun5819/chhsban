import React from "react";
import { CourseReportTable } from "@/tution/components/admin/CourseReportTable";
import { TutionPage } from "@/tution/components/TutionPage";

/** 各課程開課報表（原 tution-portal /admin/course-report）；督察員也可查看 */
const CourseReport: React.FC = () => (
  <TutionPage title="各課程開課報表">
    <CourseReportTable />
  </TutionPage>
);

export default CourseReport;

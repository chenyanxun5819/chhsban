import React, { useState } from "react";
import { CourseAttendanceStatus } from "@/tution/components/admin/CourseAttendanceStatus";
import { TutionPage } from "@/tution/components/TutionPage";
import { courseYearOptions, filterByYear, filterCourses, useTutionAdminData } from "@/tution/hooks";

/** 各課程出席狀況（原 tution-portal /admin/course-attendance）；督察員也可查看 */
const CourseAttendance: React.FC = () => {
  const { allClasses, error } = useTutionAdminData();
  // 預設只顯示今年，往年課程保留在資料裡但不預設顯示
  const [year, setYear] = useState<string>(String(new Date().getFullYear()));
  const courses = filterCourses(allClasses);

  return (
    <TutionPage title="各課程出席狀況" error={error}>
      <div className="course-list-toolbar">
        <label className="course-list-toolbar__sort">
          <span>年份：</span>
          <select value={year} onChange={(e) => setYear(e.target.value)}>
            {courseYearOptions(courses).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
            <option value="all">全部年份</option>
          </select>
        </label>
      </div>
      <CourseAttendanceStatus classes={filterByYear(courses, year)} />
    </TutionPage>
  );
};

export default CourseAttendance;

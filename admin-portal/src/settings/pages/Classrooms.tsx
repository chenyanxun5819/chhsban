import React from "react";
import ClassroomManagement from "@/settings/components/ClassroomManagement";
import { SettingsPage } from "@/settings/components/SettingsPage";

/** 教室管理（原 tution-portal /admin/classrooms 與 /classrooms）；頁面本身已有標題，不再加外層標題 */
const Classrooms: React.FC = () => (
  <SettingsPage title="教室管理" bare>
    <section className="admin-section">
      <ClassroomManagement />
    </section>
  </SettingsPage>
);

export default Classrooms;

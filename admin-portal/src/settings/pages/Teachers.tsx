import React from "react";
import TeacherManagement from "@/settings/components/TeacherManagement";
import { SettingsPage } from "@/settings/components/SettingsPage";

/** 老師管理（2026-10-01 由獨立的教師管理系統整合進來）；頁面本身已有標題，不再加外層標題 */
const Teachers: React.FC = () => (
  <SettingsPage title="老師管理" bare>
    <section className="admin-section">
      <TeacherManagement />
    </section>
  </SettingsPage>
);

export default Teachers;

import React from "react";
import { SettingsPage } from "@/settings/components/SettingsPage";

// 教師資料由獨立的教師管理系統負責（teacher-management-portal），尚未整合登入
const TEACHER_MANAGEMENT_URL = "https://master.teacher-management-portal.pages.dev/";

/** 老師管理（原 tution-portal /admin/teachers） */
const Teachers: React.FC = () => (
  <SettingsPage title="老師管理">
    <div className="teacher-management-card">
      <p>教師資料管理目前由獨立系統負責，尚未與本系統整合登入，需要用該系統的帳號另外登入一次。</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => window.open(TEACHER_MANAGEMENT_URL, "_blank", "noopener,noreferrer")}
      >
        前往教師管理系統 ↗
      </button>
    </div>
  </SettingsPage>
);

export default Teachers;

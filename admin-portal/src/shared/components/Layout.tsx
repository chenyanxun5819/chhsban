import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthContext";
import type { Permission } from "@/shared/types";
import { canAccess } from "@/shared/access";

type NavItem = { label: string; path: string };

// 側邊欄依「系統」分組；每一組對應 src/ 底下的一個資料夾（data/、tution/、optional/、settings/）
const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "學生資料",
    items: [
      { label: "學生名單同步", path: "/data/student-sync" },
      { label: "核對官方名單", path: "/data/official-roster" },
      { label: "學生資料匯出", path: "/data/student-export" },
    ],
  },
  {
    title: "補習班",
    items: [
      { label: "審批管理", path: "/tution/approvals" },
      { label: "已開課管理", path: "/tution/courses" },
      { label: "各課程開課報表", path: "/tution/course-report" },
      { label: "各課程出席狀況", path: "/tution/course-attendance" },
      { label: "每日教室使用", path: "/tution/usage" },
      { label: "住宿生點名控管", path: "/tution/boarding-attendance" },
      { label: "學號出席查詢", path: "/tution/student-attendance" },
    ],
  },
  {
    title: "選修課",
    items: [
      { label: "選修課總覽", path: "/optional/courses" },
      { label: "選修課行事曆", path: "/optional/calendar" },
      { label: "選修課點名追蹤", path: "/optional/attendance" },
    ],
  },
  {
    title: "共用設定",
    items: [
      { label: "老師管理", path: "/settings/teachers" },
      { label: "申請人密碼重設", path: "/settings/password-reset" },
      { label: "教室管理", path: "/settings/classrooms" },
    ],
  },
];

const PERMISSION_LABEL: Partial<Record<Permission, string>> = {
  super_admin: "（超級管理員）",
  admin: "（督察員，僅可查看）",
  classroom_manager: "（教室管理員）",
  dorm_supervisor: "（舍監）",
};

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ap-layout">
      <aside className={`ap-sidebar${menuOpen ? " ap-sidebar--open" : ""}`}>
        <div className="ap-sidebar__brand">行政管理站</div>
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => canAccess(item.path, user?.permission));
          if (items.length === 0) return null;
          return (
            <nav key={group.title} className="ap-nav-group">
              <div className="ap-nav-group__title">{group.title}</div>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `ap-nav-link${isActive ? " ap-nav-link--active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          );
        })}
      </aside>

      <div className="ap-content">
        <header className="ap-header">
          <button className="btn btn--ghost ap-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="選單">
            ☰
          </button>
          {title && <div className="ap-header__title">{title}</div>}
          <div className="ap-header__right">
            {user && (
              <span className="ap-header__user">
                {user.teacherName}
                {PERMISSION_LABEL[user.permission]}
              </span>
            )}
            <button className="btn btn--ghost" onClick={logout}>
              登出
            </button>
          </div>
        </header>
        <main className="ap-main">{children}</main>
      </div>
    </div>
  );
};

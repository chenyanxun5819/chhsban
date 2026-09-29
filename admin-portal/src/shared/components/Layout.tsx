import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthContext";
import type { Permission } from "@/shared/types";

const TUTION_PORTAL_URL = "https://tution-portal.pages.dev";

type NavItem = {
  label: string;
  path: string; // 站內路徑，或 external=true 時為 tution-portal 的路徑
  external?: boolean; // 第一期還沒搬進來的頁面，暫時連回 tution-portal（第二期搬完後改為站內）
  // 督察員（admin）可見；未設定時只有 super_admin 看得到
  forAdmin?: boolean;
};

// 側邊欄依「系統」分組；每一組對應 src/ 底下的一個資料夾（tution/、optional/、shared/）
const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "補習班",
    items: [
      { label: "審批管理", path: "/admin/approvals", external: true },
      { label: "已開課管理", path: "/admin/courses", external: true },
      { label: "各課程開課報表", path: "/admin/course-report", external: true, forAdmin: true },
      { label: "各課程出席狀況", path: "/admin/course-attendance", external: true, forAdmin: true },
      { label: "每日教室使用", path: "/admin/usage", external: true },
    ],
  },
  {
    title: "選修課",
    items: [
      { label: "選修課總覽", path: "/optional/courses", forAdmin: true },
      { label: "選修課行事曆", path: "/optional/calendar", forAdmin: true },
      { label: "選修課點名追蹤", path: "/optional/attendance", forAdmin: true },
    ],
  },
  {
    title: "共用設定",
    items: [
      { label: "老師管理", path: "/admin/teachers", external: true },
      { label: "申請人密碼重設", path: "/admin/password-reset", external: true },
      { label: "教室管理", path: "/admin/classrooms", external: true },
    ],
  },
];

function visibleItems(items: NavItem[], permission: Permission | undefined): NavItem[] {
  if (permission === "super_admin") return items;
  return items.filter((item) => item.forAdmin);
}

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
          const items = visibleItems(group.items, user?.permission);
          if (items.length === 0) return null;
          return (
            <nav key={group.title} className="ap-nav-group">
              <div className="ap-nav-group__title">{group.title}</div>
              {items.map((item) =>
                item.external ? (
                  <a
                    key={item.path}
                    className="ap-nav-link"
                    href={`${TUTION_PORTAL_URL}${item.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="尚未搬到管理站，會在補習班系統開啟"
                  >
                    {item.label} <span className="ap-nav-link__ext">↗</span>
                  </a>
                ) : (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `ap-nav-link${isActive ? " ap-nav-link--active" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </NavLink>
                ),
              )}
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
                {user.permission === "super_admin" ? "（超級管理員）" : "（督察員，僅可查看）"}
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

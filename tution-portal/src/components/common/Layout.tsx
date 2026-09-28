import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "./LanguageToggle";
import houseIcon from "../../assets/house.svg";
import logOutIcon from "../../assets/log-out.svg";
import "../../styles/layout.css";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle, menuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="main-header">
      <div className="header__left">
        {onMenuToggle && (
          <button
            className="header__menu-toggle hide-desktop"
            onClick={onMenuToggle}
            aria-label="Toggle menu"
          >
            <span className={`menu-icon ${menuOpen ? "open" : ""}`}></span>
          </button>
        )}
      </div>
      <div className="header__center">
        {title && <span className="header__title">{title}</span>}
      </div>
      <div className="header__right">
        <div className="user-info">
          <span className="user-info__name">{user?.teacherName}</span>
        </div>
        <LanguageToggle />
        <button
          className="header__home"
          onClick={() => navigate("/")}
          aria-label={t("common.backHome")}
        >
          <img src={houseIcon} alt="" className="header__home-icon" />
        </button>
        <button
          className="header__logout"
          onClick={logout}
          aria-label={t("common.logout")}
        >
          <img src={logOutIcon} alt="" className="header__logout-icon" />
        </button>
      </div>
    </header>
  );
};

interface SidebarProps {
  onClose?: () => void;
}

type NavItem = { path: string; icon: string; label: string };

// 側邊欄只保留給 super_admin / admin（督察員）/ classroom_manager（教室管理員）使用。
// 補習班與選修課是兩個獨立系統（各自的 Worker 與資料），側邊欄分組顯示、頁面也各自獨立；
// 老師與教室資料兩邊共用，另外放一組。
const ADMIN_NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "補習班",
    items: [
      { path: "/admin/approvals", icon: "📋", label: "審批管理" },
      { path: "/admin/courses", icon: "📚", label: "已開課管理" },
      { path: "/admin/course-report", icon: "📊", label: "各課程開課報表" },
      { path: "/admin/course-attendance", icon: "✅", label: "各課程出席狀況" },
      { path: "/admin/usage", icon: "🗓️", label: "每日教室使用" },
    ],
  },
  {
    title: "選修課",
    items: [{ path: "/optional/courses", icon: "🎯", label: "選修課總覽" }],
  },
  {
    title: "共用設定",
    items: [
      { path: "/admin/teachers", icon: "👨‍🏫", label: "老師管理" },
      { path: "/admin/password-reset", icon: "🔑", label: "申請人密碼重設" },
      { path: "/admin/classrooms", icon: "🏫", label: "教室管理" },
    ],
  },
];

// 督察員／教室管理員是窄範圍角色，側邊欄只顯示各自有權限的分頁（可能不只一個）；超級管理員顯示全部
// 與 App.tsx 的 RESTRICTED_ALLOWED_PATHS 保持一致
const RESTRICTED_VISIBLE_PATHS: Record<string, string[]> = {
  admin: ["/admin/course-report", "/admin/course-attendance", "/optional/courses"],
  classroom_manager: ["/admin/usage"],
};

function getVisibleNavGroups(permission?: string) {
  const allowedPaths = permission ? RESTRICTED_VISIBLE_PATHS[permission] : undefined;
  if (!allowedPaths) return ADMIN_NAV_GROUPS;
  return ADMIN_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => allowedPaths.includes(item.path)),
  })).filter((group) => group.items.length > 0);
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const visibleNavGroups = getVisibleNavGroups(user?.permission);

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* 桌機版側邊欄 */}
      <nav className="nav-sidebar">
        <div className="logo">
          <h2>補習班／選修課管理系統</h2>
        </div>
        {visibleNavGroups.map((group) => (
          <div key={group.title} className="nav-group">
            <div className="nav-group__title">{group.title}</div>
            <ul className="nav-list">
              {group.items.map((item) => (
                <li key={item.path}>
                  <button
                    className={`nav-item ${location.pathname === item.path ? "nav-item--active" : ""}`}
                    onClick={() => handleNavClick(item.path)}
                  >
                    <span className="nav-item__icon">{item.icon}</span>
                    <span className="nav-item__label">{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

    </>
  );
};

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const showSidebar =
    user?.permission === "super_admin" ||
    user?.permission === "admin" ||
    user?.permission === "classroom_manager";

  return (
    <div className={`responsive-layout ${showSidebar ? "" : "responsive-layout--no-sidebar"}`}>
      {showSidebar && (
        <div className="responsive-layout__sidebar">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="responsive-layout__main">
        <Header
          title={title}
          menuOpen={sidebarOpen}
          onMenuToggle={showSidebar ? () => setSidebarOpen(!sidebarOpen) : undefined}
        />
        <main className="main-content container">
          {children}
        </main>
      </div>
    </div>
  );
};

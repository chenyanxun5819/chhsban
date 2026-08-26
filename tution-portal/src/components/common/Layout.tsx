import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { LANG_STORAGE_KEY } from "@/i18n";
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
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const next = i18n.language.startsWith("en") ? "zh" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  };

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
        <button
          className="header__lang"
          onClick={toggleLanguage}
          aria-label={i18n.language.startsWith("en") ? t("common.switchToChinese") : t("common.switchToEnglish")}
          title={i18n.language.startsWith("en") ? t("common.switchToChinese") : t("common.switchToEnglish")}
        >
          {i18n.language.startsWith("en") ? "中" : "EN"}
        </button>
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

// 側邊欄只保留給 super_admin 使用，直接列出管理後台的四個分頁
const ADMIN_NAV_ITEMS: Array<{ path: string; icon: string; label: string }> = [
  { path: "/admin/approvals", icon: "📋", label: "審批管理" },
  { path: "/admin/courses", icon: "📚", label: "已開課管理" },
  { path: "/admin/teachers", icon: "👨‍🏫", label: "老師管理" },
  { path: "/admin/usage", icon: "🗓️", label: "每日教室使用" },
  { path: "/admin/classrooms", icon: "🏫", label: "教室管理" },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <>
      {/* 桌機版側邊欄 */}
      <nav className="nav-sidebar">
        <div className="logo">
          <h2>補習班系統</h2>
        </div>
        <ul className="nav-list">
          {ADMIN_NAV_ITEMS.map((item) => (
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
      </nav>

      {/* 手機版底部導航 */}
      <nav className="nav-bottom">
        {ADMIN_NAV_ITEMS.map((item) => (
          <button
            key={item.path}
            className={`nav-bottom__item ${location.pathname === item.path ? "nav-bottom__item--active" : ""}`}
            onClick={() => handleNavClick(item.path)}
            title={item.label}
          >
            <span className="nav-bottom__icon">{item.icon}</span>
            <span className="nav-bottom__label">{item.label}</span>
          </button>
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
  const showSidebar = user?.permission === "super_admin";

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

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import houseIcon from "../../assets/house.svg";
import "../../styles/layout.css";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle, menuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <button
          className="header__home"
          onClick={() => navigate("/")}
          aria-label="返回首頁"
        >
          <img src={houseIcon} alt="" className="header__home-icon" />
        </button>
      </div>
      <div className="header__center">
        {title && <span className="header__title">{title}</span>}
      </div>
      <div className="header__right">
        <div className="user-info">
          <span className="user-info__name">{user?.teacherName}</span>
        </div>
        <button
          className="header__logout"
          onClick={logout}
          aria-label="Logout"
        >
          登出
        </button>
      </div>
    </header>
  );
};

interface SidebarProps {
  onClose?: () => void;
}

/**
 * 側邊欄只保留給 super_admin 使用（進入管理後台）。
 * 一般教師的唯一導覽需求是回首頁，已改由 Header 標題點擊處理，不需要側邊欄。
 */
export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();

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
          <li>
            <button className="nav-item" onClick={() => handleNavClick("/admin")}>
              <span className="nav-item__icon">🔐</span>
              <span className="nav-item__label">管理後台</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* 手機版底部導航 */}
      <nav className="nav-bottom">
        <button
          className="nav-bottom__item"
          onClick={() => handleNavClick("/admin")}
          title="管理後台"
        >
          <span className="nav-bottom__icon">🔐</span>
          <span className="nav-bottom__label">管理後台</span>
        </button>
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

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "../../styles/layout.css";

interface HeaderProps {
  title?: string;
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, onMenuToggle, menuOpen }) => {
  const { user, logout } = useAuth();

  return (
    <header className="main-header">
      <div className="header__left">
        <button
          className="header__menu-toggle hide-desktop"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
        >
          <span className={`menu-icon ${menuOpen ? "open" : ""}`}></span>
        </button>
        <h1 className="header__title">{title || "補習班系統"}</h1>
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

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
}

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

const navItems: NavItem[] = [
  { id: "home", label: "首頁", path: "/", icon: "🏠" },
  { id: "apps", label: "申請", path: "/applications", icon: "📋" },
  { id: "classes", label: "課程", path: "/classes", icon: "📚" },
  { id: "admin", label: "審批", path: "/admin", icon: "⚙️" },
];

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

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
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className="nav-item"
                onClick={() => handleNavClick(item.path)}
              >
                <span className="nav-item__icon">{item.icon}</span>
                <span className="nav-item__label">{item.label}</span>
              </button>
            </li>
          ))}
          {hasPermission("admin") && (
            <li>
              <button
                className="nav-item"
                onClick={() => handleNavClick("/admin")}
              >
                <span className="nav-item__icon">🔐</span>
                <span className="nav-item__label">管理</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {/* 手機版底部導航 */}
      <nav className="nav-bottom">
        {navItems.map((item) => (
          <button
            key={item.id}
            className="nav-bottom__item"
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

  return (
    <div className="responsive-layout">
      <div className="responsive-layout__sidebar">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>
      <div className="responsive-layout__main">
        <Header
          title={title}
          menuOpen={sidebarOpen}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="main-content container">
          {children}
        </main>
      </div>
    </div>
  );
};

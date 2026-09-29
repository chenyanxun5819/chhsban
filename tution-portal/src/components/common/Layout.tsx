import React from "react";
import { useNavigate } from "react-router-dom";
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

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

// 行政管理頁（審批、已開課、報表、教室、老師設定等）已搬到行政管理站 admin-portal（2026-09-29），
// 本站只剩補習班老師端，不再有行政側邊欄。
export const Layout: React.FC<LayoutProps> = ({ title, children }) => (
  <div className="responsive-layout responsive-layout--no-sidebar">
    <div className="responsive-layout__main">
      <Header title={title} />
      <main className="main-content container">{children}</main>
    </div>
  </div>
);

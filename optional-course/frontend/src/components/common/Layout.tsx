import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import houseIcon from "@/assets/house.svg";
import logOutIcon from "@/assets/log-out.svg";

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

// Header 版面沿用 tution-portal：左邊頁面標題，右邊老師姓名 + 回首頁 + 登出圖示
export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-header__title">{title || "选修课点名系统"}</span>
        <div className="app-header__right">
          {user && <span className="app-header__user">{user.teacherName}</span>}
          <button className="app-header__icon-btn" onClick={() => navigate("/")} aria-label="回首页" title="回首页">
            <img src={houseIcon} alt="" />
          </button>
          <button className="app-header__icon-btn" onClick={logout} aria-label="登出" title="登出">
            <img src={logOutIcon} alt="" />
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};

interface CoursePageHeaderProps {
  subject: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

// 各頁上半部：課程名稱 + 一行課程資訊（編號・老師・上課時間・地點），右側可放按鈕
export const CoursePageHeader: React.FC<CoursePageHeaderProps> = ({ subject, subtitle, actions }) => (
  <div className="page-header">
    <div>
      <h2>{subject}</h2>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {actions}
  </div>
);

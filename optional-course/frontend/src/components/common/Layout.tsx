import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface LayoutProps {
  title?: string;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ title, children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__title" onClick={() => navigate("/")}>
          選修課點名系統
        </div>
        {title && <div className="app-header__page-title">{title}</div>}
        <div className="app-header__right">
          {user && (
            <span className="app-header__user">
              {user.teacherName}
              {user.permission === "admin" || user.permission === "super_admin" ? "（行政人員）" : "（授課老師）"}
            </span>
          )}
          <button className="btn btn--ghost" onClick={logout}>
            登出
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};

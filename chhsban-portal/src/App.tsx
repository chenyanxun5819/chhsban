import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RoleBasedRoute } from "@/components/RoleBasedRoute";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import AdminPanel from "@/pages/AdminPanel";
import SuperAdminPanel from "@/pages/SuperAdminPanel";
import UnauthorizedPage from "@/pages/UnauthorizedPage";
import "@/styles/App.css";

// 內部路由組件
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* 登入頁面 */}
      {!isAuthenticated && (
        <Route path="/" element={<LoginPage />} />
      )}

      {/* 受保護的路由 - 需要認證 */}
      {isAuthenticated && (
        <>
          {/* Dashboard - 教師首頁（所有認證用戶可訪問） */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Panel - 管理員面板（需要 admin 或更高權限） */}
          <Route
            path="/admin"
            element={
              <RoleBasedRoute requiredPermission="admin">
                <AdminPanel />
              </RoleBasedRoute>
            }
          />

          {/* Super Admin Panel - 超級管理員面板（需要 super_admin 權限） */}
          <Route
            path="/super-admin"
            element={
              <RoleBasedRoute requiredPermission="super_admin">
                <SuperAdminPanel />
              </RoleBasedRoute>
            }
          />

          {/* 無權限頁面 */}
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* 根路徑重定向 */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </>
      )}

      {/* 404 重定向 */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />} />
    </Routes>
  );
};

// 主應用組件
const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

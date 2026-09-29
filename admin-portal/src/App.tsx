import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/shared/auth/AuthContext";
import { ADMIN_PERMISSIONS } from "@/shared/types";
import Login from "@/shared/pages/Login";
import CourseList from "@/optional/pages/CourseList";
import Calendar from "@/optional/pages/Calendar";
import AttendanceTracking from "@/optional/pages/AttendanceTracking";
import CourseSchedule from "@/optional/pages/CourseSchedule";

// 行政管理站：只給 super_admin（可修改）與 admin（督察員，只能查看）使用。
// 路由依系統分前綴：/optional/*（選修課，第一期）、/tution/*（補習班，第二期）。

const NoAccess: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <div className="login-page">
      <div className="login-card">
        <h1>本站僅供行政人員使用</h1>
        <p className="subtitle">{user?.teacherName}，您的帳號沒有行政管理權限。</p>
        <p style={{ fontSize: 14, lineHeight: 1.8 }}>
          補習班：<a href="https://tution-portal.pages.dev">tution-portal.pages.dev</a>
          <br />
          選修課：<a href="https://optional-course.pages.dev">optional-course.pages.dev</a>
        </p>
        <button className="btn" onClick={logout}>
          登出
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    return <div style={{ padding: 24 }}>載入中...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!user || !ADMIN_PERMISSIONS.includes(user.permission)) {
    return <NoAccess />;
  }
  return <>{children}</>;
};

const protectedPage = (page: React.ReactNode) => <ProtectedRoute>{page}</ProtectedRoute>;

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<Navigate to="/optional/courses" replace />} />

    {/* 選修課（optional-course-system Worker） */}
    <Route path="/optional/courses" element={protectedPage(<CourseList />)} />
    <Route path="/optional/courses/:id/schedule" element={protectedPage(<CourseSchedule />)} />
    <Route path="/optional/calendar" element={protectedPage(<Calendar />)} />
    <Route path="/optional/attendance" element={protectedPage(<AttendanceTracking />)} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

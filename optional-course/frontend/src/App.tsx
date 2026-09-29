import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login/Login";
import TeacherDashboard from "@/pages/TeacherDashboard/TeacherDashboard";
import RosterManagement from "@/pages/RosterManagement/RosterManagement";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";

// 行政端（建課、綁定老師、開關窗口、行事曆、點名追蹤）在管理站（admin-portal），
// 本站只保留老師端（名冊／排課／點名）。舊的 /admin/courses 一律轉址過去。
const ADMIN_PORTAL_URL = "https://chhsban-admin.pages.dev/optional/courses";

// admin（督察員）在選修課只能查看課程總覽，不會有自己的課，一律導到管理系統
const RESTRICTED_ALLOWED_PATHS: Record<string, string[]> = {
  admin: ["/admin/courses"],
};

const RedirectToAdminPortal: React.FC = () => {
  useEffect(() => {
    window.location.replace(ADMIN_PORTAL_URL);
  }, []);
  return (
    <div style={{ padding: 24 }}>
      选修课行政管理已移到 <a href={ADMIN_PORTAL_URL}>行政管理站 / Admin Portal</a>，正在为您转址... / Redirecting...
    </div>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>载入中... / Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const allowedPaths = user ? RESTRICTED_ALLOWED_PATHS[user.permission] : undefined;
  if (allowedPaths && !allowedPaths.includes(location.pathname)) {
    return <Navigate to={allowedPaths[0]} replace />;
  }

  return <>{children}</>;
};

const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.permission === "admin" || user?.permission === "super_admin";
  return <Navigate to={isAdmin ? "/admin/courses" : "/my/courses"} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/courses" element={<RedirectToAdminPortal />} />
      <Route
        path="/my/courses"
        element={
          <ProtectedRoute>
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/roster"
        element={
          <ProtectedRoute>
            <RosterManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/schedule"
        element={
          <ProtectedRoute>
            <ScheduleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/courses/:id/attendance"
        element={
          <ProtectedRoute>
            <AttendanceSheet />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

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

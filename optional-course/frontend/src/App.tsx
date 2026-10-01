import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login/Login";
import TeacherDashboard from "@/pages/TeacherDashboard/TeacherDashboard";
import RosterManagement from "@/pages/RosterManagement/RosterManagement";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";

// 行政端（建課、綁定老師、開關窗口、行事曆、點名追蹤）在管理站（admin-portal），
// 本站只保留老師端（名冊／排課／點名）。舊的 /admin/courses 一律轉址過去。
const ADMIN_PORTAL_URL = "https://chhsban-admin.pages.dev/optional/courses";

const RedirectToAdminPortal: React.FC = () => {
  const { t } = useTranslation();
  useEffect(() => {
    window.location.replace(ADMIN_PORTAL_URL);
  }, []);
  return (
    <div style={{ padding: 24 }}>
      {t("app.redirectPrefix")}
      <a href={ADMIN_PORTAL_URL}>{t("app.adminPortal")}</a>
      {t("app.redirectSuffix")}
    </div>
  );
};

// 不依身分轉址：管理身分的人（超級管理員、督察員等）也可能被綁定為授課老師，從本站登入就留在老師端；
// 要做行政工作時自行到行政管理站登入（Header 有連結）。
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>{t("common.loading")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const HomeRedirect: React.FC = () => <Navigate to="/my/courses" replace />;

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

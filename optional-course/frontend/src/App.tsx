import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login/Login";
import AdminCourseList from "@/pages/AdminCourseList/AdminCourseList";
import TeacherDashboard from "@/pages/TeacherDashboard/TeacherDashboard";
import RosterManagement from "@/pages/RosterManagement/RosterManagement";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";

// admin 在本系統的權限範圍比 teacher 窄：只負責開課程窗口＋綁定老師，
// 一律導回 /admin/courses；其餘身份（teacher/viewer/super_admin）不受此限制。
const RESTRICTED_ALLOWED_PATHS: Record<string, string[]> = {
  admin: ["/admin/courses"],
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div style={{ padding: 24 }}>載入中...</div>;
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
      <Route
        path="/admin/courses"
        element={
          <ProtectedRoute>
            <AdminCourseList />
          </ProtectedRoute>
        }
      />
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

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import Welcome from "@/pages/Welcome/Welcome";
import ApplicationForm from "@/pages/ApplicationManagement/ApplicationForm";
import ApplicationList from "@/pages/ApplicationManagement/ApplicationList";
import ApplicationDetail from "@/pages/ApplicationManagement/ApplicationDetail";
import AdminPanel from "@/pages/AdminPanel/AdminPanel";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";
import "./styles/App.css";

// Placeholder Pages - 待實施
const ClassList = () => (
  <Layout title="已批准課程">
    <div className="page"><h1>已批准課程 (待實施)</h1></div>
  </Layout>
);
const RosterManagement = () => (
  <Layout title="學生名單">
    <div className="page"><h1>學生名單 (待實施)</h1></div>
  </Layout>
);
const Dashboard = () => (
  <Layout title="系統首頁">
    <div className="page"><h1>系統首頁 (待實施)</h1></div>
  </Layout>
);
const Login = () => <div className="page"><h1>登入頁面 (待實施)</h1></div>;

// 受保護的路由組件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="loading">載入中...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 主應用路由
const AppRoutes = () => {
  return (
    <Routes>
      {/* 公開路由 */}
      <Route path="/login" element={<Login />} />

      {/* 受保護路由 */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Welcome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/new"
        element={
          <ProtectedRoute>
            <ApplicationForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <ApplicationList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes"
        element={
          <ProtectedRoute>
            <ClassList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes/:id/schedule"
        element={
          <ProtectedRoute>
            <ScheduleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes/:id/roster"
        element={
          <ProtectedRoute>
            <RosterManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classes/:id/attendance"
        element={
          <ProtectedRoute>
            <AttendanceSheet />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// 主應用組件
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

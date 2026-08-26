import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import Login from "@/pages/Login/Login";
import Welcome from "@/pages/Welcome/Welcome";
import ApplicationForm from "@/pages/ApplicationManagement/ApplicationForm";
import ApplicationList from "@/pages/ApplicationManagement/ApplicationList";
import ApplicationDetail from "@/pages/ApplicationManagement/ApplicationDetail";
import AdminPanel from "@/pages/AdminPanel/AdminPanel";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";
import RosterManagementPage from "@/pages/RosterManagement/RosterManagement";
import AttendanceStatsPage from "@/pages/AttendanceStats/AttendanceStats";
import ClassroomManagement from "@/pages/ClassroomManagement/ClassroomManagement";
import { useEffect, useState } from "react";
import { TutionClass } from "@/types";
import apiClient from "@/utils/api";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import "./styles/App.css";

// 課程列表頁面
const ClassList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const [classes, setClasses] = useState<TutionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!user?.teacherId) {
        setClasses([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(
          `/v1/classes?teacher=${encodeURIComponent(user.teacherId)}`
        );
        const ownedClasses = (response.data?.data as TutionClass[]) || [];

        const approvedClasses = ownedClasses.filter(
          (c) => c.approval_status === "approved" || c.approval_status === "active"
        );

        setClasses(approvedClasses);
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || "載入課程列表失敗";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.teacherId]);

  return (
    <Layout title="已批准課程">
      <div className="page">
        <h1>已批准課程</h1>
        {loading && <p>載入中...</p>}
        {error && <p style={{ color: "red" }}>錯誤: {error}</p>}
        {classes.length === 0 && !loading && <p>尚無批准的課程</p>}
        {classes.map((c) => (
          <div key={c.class_id} className="class-item" style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
            <h3>{c.subject} ({gradeLabel(c.form)})</h3>
            <p>教師: {c.teacher_name_cn}</p>
            <p>時間: {dayLabel(c.day_of_week)} {c.time_start}-{c.time_end}</p>
            <p>地點: {c.venue}</p>
            <p>學費: RM {c.fees}</p>
            <button onClick={() => navigate(`/classes/${c.class_id}/schedule`)}>查看詳情</button>
          </div>
        ))}
      </div>
    </Layout>
  );
};

const Dashboard = () => (
  <Layout title="系統首頁">
    <div className="page"><h1>系統首頁 (待實施)</h1></div>
  </Layout>
);

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
            <RosterManagementPage />
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
        path="/classes/:id/stats"
        element={
          <ProtectedRoute>
            <AttendanceStatsPage />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<Navigate to="/admin/approvals" replace />} />
      <Route
        path="/admin/:tab"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="/classrooms"
        element={
          <ProtectedRoute>
            <Layout title="教室管理">
              <ClassroomManagement />
            </Layout>
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

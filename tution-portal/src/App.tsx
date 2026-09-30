import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import Login from "@/pages/Login/Login";
import Welcome from "@/pages/Welcome/Welcome";
import ApplicationForm from "@/pages/ApplicationManagement/ApplicationForm";
import ApplicationList from "@/pages/ApplicationManagement/ApplicationList";
import ApplicationDetail from "@/pages/ApplicationManagement/ApplicationDetail";
// 原本管理頁樣式裡未加前綴、也套用到老師端的規則（管理頁已搬到 admin-portal）；放在原本 import 管理頁的位置，維持樣式載入順序
import "./styles/legacy-admin-globals.css";
import ScheduleManagement from "@/pages/ScheduleManagement/ScheduleManagement";
import AttendanceSheet from "@/pages/AttendanceSheet/AttendanceSheet";
import RosterManagementPage from "@/pages/RosterManagement/RosterManagement";
import { useEffect, useState } from "react";
import { TutionClass } from "@/types";
import apiClient from "@/utils/api";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import { useTranslation } from "react-i18next";
import "./styles/App.css";

// 課程列表頁面
const ClassList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
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
        const errorMessage = err.response?.data?.error || t("classList.loadFailed");
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, [user?.teacherId]);

  return (
    <Layout title={t("classList.title")}>
      <div className="page">
        <h1>{t("classList.title")}</h1>
        {loading && <p>{t("welcome.loading")}</p>}
        {error && <p style={{ color: "red" }}>{t("classList.errorPrefix")}: {error}</p>}
        {classes.length === 0 && !loading && <p>{t("classList.empty")}</p>}
        {classes.map((c) => (
          <div key={c.class_id} className="class-item" style={{ marginBottom: "20px", padding: "10px", border: "1px solid #ddd", borderRadius: "5px" }}>
            <h3>{c.subject} ({gradeLabel(c.form)})</h3>
            <p>{t("classList.teacher")}: {c.teacher_name_cn}</p>
            <p>{t("classList.time")}: {dayLabel(c.day_of_week)} {c.time_start}-{c.time_end}</p>
            <p>{t("classList.venue")}: {c.venue}</p>
            <p>{t("classList.fees")}: RM {c.fees}</p>
            <button onClick={() => navigate(`/classes/${c.class_id}/schedule`)}>{t("classList.viewDetails")}</button>
          </div>
        ))}
      </div>
    </Layout>
  );
};

const Dashboard = () => {
  const { t } = useTranslation();
  return (
    <Layout title={t("dashboard.title")}>
      <div className="page"><h1>{t("dashboard.notImplemented")}</h1></div>
    </Layout>
  );
};

// 行政管理頁已全部搬到行政管理站（admin-portal，2026-09-29），本站只剩補習班老師端。
const ADMIN_PORTAL_URL = "https://chhsban-admin.pages.dev";

// 舊的管理頁網址 → 管理站對應頁，避免書籤失效
const ADMIN_TAB_TO_PORTAL_PATH: Record<string, string> = {
  approvals: "/tution/approvals",
  courses: "/tution/courses",
  "course-report": "/tution/course-report",
  "course-attendance": "/tution/course-attendance",
  usage: "/tution/usage",
  teachers: "/settings/teachers",
  "password-reset": "/settings/password-reset",
  classrooms: "/settings/classrooms",
};

// 督察員、教室管理員、舍監在本站沒有可用的頁面，進任何頁面都直接轉到管理站
const ADMIN_ONLY_PERMISSIONS = ["admin", "classroom_manager", "dorm_supervisor"];

const RedirectToAdminPortal: React.FC<{ path?: string }> = ({ path = "/" }) => {
  const url = `${ADMIN_PORTAL_URL}${path}`;
  useEffect(() => {
    window.location.replace(url);
  }, [url]);
  return (
    <div style={{ padding: 24 }}>
      管理頁已移到 <a href={url}>行政管理站</a>，正在為您轉址...
    </div>
  );
};

const RedirectAdminTab: React.FC = () => {
  const { tab } = useParams<{ tab: string }>();
  return <RedirectToAdminPortal path={ADMIN_TAB_TO_PORTAL_PATH[tab || ""] || "/"} />;
};

// 受保護的路由組件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="loading">{t("welcome.loading")}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 督察員、教室管理員、舍監一律轉到管理站；超級管理員只有首頁轉過去，
  // 從管理站「已開課管理」點過來的名冊／排課／出席頁仍在本站開啟
  if (user && (ADMIN_ONLY_PERMISSIONS.includes(user.permission) || (user.permission === "super_admin" && location.pathname === "/"))) {
    return <RedirectToAdminPortal />;
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
      {/* 行政管理頁已搬到管理站（admin-portal），舊網址轉過去 */}
      <Route path="/admin" element={<RedirectToAdminPortal />} />
      <Route path="/admin/:tab" element={<RedirectAdminTab />} />
      <Route path="/optional/courses" element={<RedirectToAdminPortal path="/optional/courses" />} />
      <Route path="/classrooms" element={<RedirectToAdminPortal path="/settings/classrooms" />} />
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

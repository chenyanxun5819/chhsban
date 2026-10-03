import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/shared/auth/AuthContext";
import { ADMIN_PERMISSIONS } from "@/shared/types";
import { HOME_BY_PERMISSION, canAccess } from "@/shared/access";
import Login from "@/shared/pages/Login";
import Approvals from "@/tution/pages/Approvals";
import Courses from "@/tution/pages/Courses";
import CourseRoster from "@/tution/pages/CourseRoster";
import CourseScheduleStatus from "@/tution/pages/CourseScheduleStatus";
import CourseClassAttendance from "@/tution/pages/CourseClassAttendance";
import CourseReport from "@/tution/pages/CourseReport";
import CourseAttendance from "@/tution/pages/CourseAttendance";
import Usage from "@/tution/pages/Usage";
import BoardingAttendance from "@/tution/pages/BoardingAttendance";
import StudentAttendance from "@/tution/pages/StudentAttendance";
import CourseList from "@/optional/pages/CourseList";
import Calendar from "@/optional/pages/Calendar";
import AttendanceTracking from "@/optional/pages/AttendanceTracking";
import CourseSchedule from "@/optional/pages/CourseSchedule";
import OptionalCourseAttendance from "@/optional/pages/CourseAttendance";
import OptionalCourseReport from "@/optional/pages/CourseReport";
import OptionalCourseRoster from "@/optional/pages/CourseRoster";
import Teachers from "@/settings/pages/Teachers";
import Classrooms from "@/settings/pages/Classrooms";
import StudentSync from "@/data/pages/StudentSync";
import StudentExport from "@/data/pages/StudentExport";
import OfficialRoster from "@/data/pages/OfficialRoster";
import LegacyCleanup from "@/data/pages/LegacyCleanup";
import YearArchive from "@/data/pages/YearArchive";

// 行政管理站：super_admin（全部）、admin（督察員，只能查看）、classroom_manager（教室管理員）、dorm_supervisor（舍監）。
// 路由依系統分前綴：/data/*（學生資料）、/tution/*（補習班）、/optional/*（選修課）、/settings/*（共用設定）；
// 每頁可進入的身分見 shared/access.ts。

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

/**
 * 登入且為行政身分才能進入；沒有這一頁權限的身分導回自己的首頁。
 * accessPath：權限表裡的路徑（有參數的路由，例如選修課的停課頁，沿用所屬列表頁的權限）。
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode; accessPath?: string }> = ({ children, accessPath }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  if (isLoading) {
    return <div style={{ padding: 24 }}>載入中...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (!user || !ADMIN_PERMISSIONS.includes(user.permission)) {
    return <NoAccess />;
  }
  if (!canAccess(accessPath ?? location.pathname, user.permission)) {
    return <Navigate to={HOME_BY_PERMISSION[user.permission] ?? "/login"} replace />;
  }
  return <>{children}</>;
};

const HomeRedirect: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <div style={{ padding: 24 }}>載入中...</div>;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  const home = HOME_BY_PERMISSION[user.permission];
  return home ? <Navigate to={home} replace /> : <NoAccess />;
};

const page = (element: React.ReactNode, accessPath?: string) => (
  <ProtectedRoute accessPath={accessPath}>{element}</ProtectedRoute>
);

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/" element={<HomeRedirect />} />

    {/* 學生資料（學生名單同步、核對官方名單、匯出，經 tution-system Worker 讀寫 students_KV） */}
    <Route path="/data/student-sync" element={page(<StudentSync />)} />
    <Route path="/data/official-roster" element={page(<OfficialRoster />)} />
    <Route path="/data/student-export" element={page(<StudentExport />)} />
    <Route path="/data/year-archive" element={page(<YearArchive />)} />

    {/* 補習班（tution-system Worker） */}
    <Route path="/tution/approvals" element={page(<Approvals />)} />
    <Route path="/tution/courses" element={page(<Courses />)} />
    <Route path="/tution/courses/:id/roster" element={page(<CourseRoster />, "/tution/courses")} />
    <Route path="/tution/courses/:id/schedule" element={page(<CourseScheduleStatus />, "/tution/courses")} />
    <Route path="/tution/courses/:id/attendance" element={page(<CourseClassAttendance />, "/tution/courses")} />
    <Route path="/tution/course-report" element={page(<CourseReport />)} />
    <Route path="/tution/course-attendance" element={page(<CourseAttendance />)} />
    <Route path="/tution/usage" element={page(<Usage />)} />
    <Route path="/tution/boarding-attendance" element={page(<BoardingAttendance />)} />
    <Route path="/tution/student-attendance" element={page(<StudentAttendance />)} />

    {/* 選修課（optional-course-system Worker） */}
    <Route path="/optional/courses" element={page(<CourseList />)} />
    <Route path="/optional/courses/:id/roster" element={page(<OptionalCourseRoster />, "/optional/courses")} />
    <Route path="/optional/courses/:id/schedule" element={page(<CourseSchedule />, "/optional/courses")} />
    <Route path="/optional/courses/:id/attendance" element={page(<OptionalCourseAttendance />, "/optional/courses")} />
    <Route path="/optional/calendar" element={page(<Calendar />)} />
    <Route path="/optional/attendance" element={page(<AttendanceTracking />)} />
    <Route path="/optional/course-report" element={page(<OptionalCourseReport />)} />

    {/* 共用設定（老師資料走 teacher-management Worker，教室資料走 tution-system Worker） */}
    <Route path="/settings/teachers" element={page(<Teachers />)} />
    <Route path="/settings/classrooms" element={page(<Classrooms />)} />

    {/* 一次性工具：舊學生資料清理（清完即可移除，見 LegacyCleanup.tsx 的提示語） */}
    <Route path="/maintenance/legacy-cleanup" element={page(<LegacyCleanup />)} />

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

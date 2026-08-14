import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { ApprovalList, RejectModal } from "@/components/admin";
import { adminService } from "@/services/adminService";
import apiClient from "@/utils/api";
import type { TutionClass } from "@/types/index";
import ClassroomManagement from "@/pages/ClassroomManagement/ClassroomManagement";
import "./admin-panel.css";

type TabType = "approvals" | "courses" | "teachers" | "classrooms";

const TEACHER_MANAGEMENT_URL = "https://master.teacher-management-portal.pages.dev/";

const COURSE_STATUS_LABELS: Record<string, string> = {
  approved: "✅ 已批准",
  active: "🚀 進行中",
  ended: "🏁 已結束",
};

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentTab, setCurrentTab] = useState<TabType>("approvals");
  const [error, setError] = useState<string | null>(null);

  // 審批相關狀態
  const [applications, setApplications] = useState<TutionClass[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<TutionClass | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // 已開課相關狀態
  const [courses, setCourses] = useState<TutionClass[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [endDateDrafts, setEndDateDrafts] = useState<Record<string, string>>({});
  const [savingEndDateId, setSavingEndDateId] = useState<string | null>(null);

  // 權限檢查：只有 super_admin 才能訪問此頁面
  useEffect(() => {
    if (user && user.permission !== "super_admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const fetchApplications = async () => {
    try {
      setAppLoading(true);
      setError(null);
      const response = await apiClient.get("/v1/classes");
      const apps = ((response.data?.data as TutionClass[]) || []).filter(
        (item) => item.approval_status === "pending" || item.approval_status === "reviewing",
      );
      setApplications(apps);
      setPendingCount(apps.filter((a) => a.approval_status === "pending").length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入申請失敗");
      console.error("Fetch applications error:", err);
    } finally {
      setAppLoading(false);
    }
  };

  // 掛載時抓一次審批清單（同時作為分頁徽章的數量來源）
  useEffect(() => {
    if (user?.permission !== "super_admin") return;
    fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.permission]);

  // 載入已開課課程
  useEffect(() => {
    if (user?.permission !== "super_admin" || currentTab !== "courses") {
      return;
    }

    const fetchCourses = async () => {
      try {
        setCoursesLoading(true);
        setError(null);
        const response = await apiClient.get("/v1/classes");
        const list = ((response.data?.data as TutionClass[]) || []).filter(
          (item) =>
            item.approval_status === "approved" ||
            item.approval_status === "active" ||
            item.approval_status === "ended",
        );
        setCourses(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : "載入課程失敗");
        console.error("Fetch courses error:", err);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchCourses();
  }, [currentTab, user?.permission]);

  // 批准申請
  const handleApprove = async (classId: string) => {
    if (!window.confirm("確定要批准此申請嗎？")) {
      return;
    }

    try {
      await adminService.approveApplication(classId);
      await fetchApplications();
      alert("✅ 申請已批准");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "批准失敗";
      setError(errMsg);
      alert(`❌ ${errMsg}`);
      console.error("Approve error:", err);
    }
  };

  // 指定上課地點
  const handleAssignVenue = async (classId: string, venue: string) => {
    try {
      await adminService.assignVenue(classId, venue);
      await fetchApplications();
      alert("✅ 已指定上課地點，申請狀態已轉為審核中");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "指定地點失敗";
      alert(`❌ ${errMsg}`);
      console.error("Assign venue error:", err);
    }
  };

  // 刪除申請
  const handleDeleteApplication = async (classId: string) => {
    if (!window.confirm("確定要刪除此申請嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) {
      return;
    }

    try {
      await adminService.deleteApplication(classId);
      await fetchApplications();
      alert("✅ 申請已刪除");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "刪除失敗";
      alert(`❌ ${errMsg}`);
      console.error("Delete error:", err);
    }
  };

  // 刪除已開課的課程
  const handleDeleteCourse = async (classId: string) => {
    if (!window.confirm("確定要刪除此課程嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) {
      return;
    }

    try {
      await adminService.deleteApplication(classId);
      setCourses((prev) => prev.filter((c) => c.class_id !== classId));
      alert("✅ 課程已刪除");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "刪除失敗";
      alert(`❌ ${errMsg}`);
      console.error("Delete course error:", err);
    }
  };

  // 設定課程結束日期（供 ScheduleManagement 排課生成範圍使用）
  const handleSetEndDate = async (classId: string) => {
    const value = endDateDrafts[classId];
    if (!value) {
      alert("請先選擇結束日期");
      return;
    }

    setSavingEndDateId(classId);
    try {
      const response = await apiClient.put(`/v1/classes/${classId}`, { end_date: value });
      const updated = response.data?.data;
      setCourses((prev) =>
        prev.map((c) => (c.class_id === classId ? { ...c, end_date: updated?.end_date ?? value } : c))
      );
      alert("✅ 結束日期已更新");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "更新結束日期失敗";
      alert(`❌ ${errMsg}`);
      console.error("Set end date error:", err);
    } finally {
      setSavingEndDateId(null);
    }
  };

  // 打開拒絕彈窗
  const handleRejectClick = (classId: string) => {
    const app = applications.find((a) => a.class_id === classId);
    setSelectedAppId(classId);
    setSelectedApp(app || null);
    setRejectModalOpen(true);
  };

  // 提交拒絕
  const handleRejectSubmit = async (reason: string) => {
    if (!selectedAppId) return;

    try {
      setRejectingId(selectedAppId);
      await adminService.rejectApplication(selectedAppId, reason);
      await fetchApplications();

      setRejectModalOpen(false);
      setSelectedAppId(null);
      setSelectedApp(null);

      alert("✅ 申請已拒絕");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "拒絕失敗";
      console.error("Reject error:", err);
      throw new Error(errMsg);
    } finally {
      setRejectingId(null);
    }
  };

  if (!user || user.permission !== "super_admin") {
    return null;
  }

  return (
    <Layout title="管理員儀表板">
      <div className="admin-panel">
        {/* 選項卡導航 */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${currentTab === "approvals" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("approvals")}
          >
            📋 審批管理{" "}
            {pendingCount > 0 && <span className="badge badge--danger">{pendingCount}</span>}
          </button>
          <button
            className={`tab-button ${currentTab === "courses" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("courses")}
          >
            📚 已開課管理
          </button>
          <button
            className={`tab-button ${currentTab === "teachers" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("teachers")}
          >
            👨‍🏫 老師管理
          </button>
          <button
            className={`tab-button ${currentTab === "classrooms" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("classrooms")}
          >
            🏫 教室管理
          </button>
        </div>

        {/* 審批管理 */}
        {currentTab === "approvals" && (
          <section className="admin-section">
            <h2 className="section-title">審批管理</h2>
            <ApprovalList
              applications={applications}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              onAssignVenue={handleAssignVenue}
              onDelete={handleDeleteApplication}
              loading={appLoading}
              empty={!appLoading && applications.length === 0}
            />

            {/* 拒絕彈窗 */}
            <RejectModal
              isOpen={rejectModalOpen}
              classId={selectedAppId || ""}
              className={
                selectedApp ? `${selectedApp.teacher_name_cn} - ${selectedApp.subject}` : ""
              }
              onConfirm={handleRejectSubmit}
              onCancel={() => {
                setRejectModalOpen(false);
                setSelectedAppId(null);
                setSelectedApp(null);
              }}
              loading={rejectingId !== null}
            />
          </section>
        )}

        {/* 已開課管理 */}
        {currentTab === "courses" && (
          <section className="admin-section">
            <h2 className="section-title">已開課管理</h2>
            {coursesLoading ? (
              <div className="loading-text">載入中...</div>
            ) : courses.length === 0 ? (
              <div className="empty-state">暫無已開課的課程</div>
            ) : (
              <div className="course-list">
                {courses.map((course) => (
                  <div key={course.class_id} className="course-row">
                    <div className="course-row__main">
                      <span className="course-row__title">
                        {course.subject}（{course.form}）
                      </span>
                      <span className="course-row__badge">
                        {COURSE_STATUS_LABELS[course.approval_status] || course.approval_status}
                      </span>
                    </div>
                    <div className="course-row__meta">
                      <span>👨‍🏫 {course.teacher_name_cn}</span>
                      <span>📍 {course.venue || "-"}</span>
                      <span>
                        📅 {course.day_of_week} {course.time_start}-{course.time_end}
                      </span>
                      <span>🏁 結束日期：{course.end_date || "未設定"}</span>
                    </div>
                    <div className="course-row__end-date">
                      <input
                        type="date"
                        className="course-row__end-date-input"
                        value={endDateDrafts[course.class_id] ?? course.end_date ?? ""}
                        onChange={(e) =>
                          setEndDateDrafts((prev) => ({ ...prev, [course.class_id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn btn-small"
                        disabled={savingEndDateId === course.class_id}
                        onClick={() => handleSetEndDate(course.class_id)}
                      >
                        {savingEndDateId === course.class_id ? "儲存中..." : "設定結束日期"}
                      </button>
                    </div>
                    <div className="course-row__actions">
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/roster`)}
                      >
                        👥 管理學生
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/schedule`)}
                      >
                        📅 開課記錄
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/attendance`)}
                      >
                        ✓ 點名
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/pdf`)}
                      >
                        📄 PDF
                      </button>
                      <button
                        className="btn btn-small btn--danger"
                        onClick={() => handleDeleteCourse(course.class_id)}
                      >
                        🗑️ 刪除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 老師管理 */}
        {currentTab === "teachers" && (
          <section className="admin-section">
            <h2 className="section-title">老師管理</h2>
            <div className="teacher-management-card">
              <p>
                教師資料管理目前由獨立系統負責，尚未與本系統整合登入，需要用該系統的帳號另外登入一次。
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.open(TEACHER_MANAGEMENT_URL, "_blank", "noopener,noreferrer")}
              >
                前往教師管理系統 ↗
              </button>
            </div>
          </section>
        )}

        {/* 教室管理 */}
        {currentTab === "classrooms" && (
          <section className="admin-section">
            <ClassroomManagement />
          </section>
        )}

        {error && (
          <div className="error-banner">
            <span>⚠️ 出現錯誤：{error}</span>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { ApprovalList, RejectModal } from "@/components/admin";
import { adminService } from "@/services/adminService";
import apiClient from "@/utils/api";
import type {
  AdminStatistic,
  RecentActivity,
  TutionClass,
} from "@/types/index";
import "./admin-panel.css";

type TabType = "dashboard" | "approvals";

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: "blue" | "green" | "orange" | "red";
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color }) => (
  <div className={`stat-card stat-card--${color}`}>
    <div className="stat-icon">{icon}</div>
    <div className="stat-content">
      <div className="stat-value">{value.toLocaleString()}</div>
      <div className="stat-label">{label}</div>
    </div>
  </div>
);

interface ActivityItemProps {
  activity: RecentActivity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "application":
        return "📋";
      case "schedule":
        return "📅";
      case "attendance":
        return "✓";
      case "class_update":
        return "🔄";
      default:
        return "•";
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "application":
        return "color-blue";
      case "schedule":
        return "color-green";
      case "attendance":
        return "color-orange";
      case "class_update":
        return "color-purple";
      default:
        return "color-gray";
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = Math.floor((now - timestamp) / 1000);

    if (diff < 60) return "剛剛";
    if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
    return new Date(timestamp).toLocaleDateString("zh-TW");
  };

  return (
    <div className={`activity-item ${getActivityColor(activity.type)}`}>
      <div className="activity-icon">{getActivityIcon(activity.type)}</div>
      <div className="activity-content">
        <div className="activity-title">{activity.title}</div>
        <div className="activity-description">{activity.description}</div>
      </div>
      <div className="activity-time">{formatTime(activity.timestamp)}</div>
    </div>
  );
};

interface QuickActionProps {
  label: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange";
  onClick: () => void;
}

const QuickAction: React.FC<QuickActionProps> = ({ label, icon, color, onClick }) => (
  <button className={`quick-action quick-action--${color}`} onClick={onClick}>
    <div className="action-icon">{icon}</div>
    <div className="action-label">{label}</div>
  </button>
);

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 狀態管理
  const [currentTab, setCurrentTab] = useState<TabType>("dashboard");
  const [stats, setStats] = useState<AdminStatistic | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 審批相關狀態
  const [applications, setApplications] = useState<TutionClass[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<TutionClass | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // 權限檢查：只有 super_admin 才能訪問此頁面
  useEffect(() => {
    if (user && user.permission !== "super_admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  // 載入儀表板數據
  useEffect(() => {
    if (user?.permission !== "super_admin" || currentTab !== "dashboard") {
      return;
    }

    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [statsRes, activitiesRes] = await Promise.all([
          apiClient.get<AdminStatistic>("/v1/admin/statistics"),
          apiClient.get<RecentActivity[]>("/v1/admin/activities"),
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (activitiesRes.data) setActivities(activitiesRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "載入數據失敗");
        console.error("Admin data fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [currentTab]);

  // 載入待審批應用
  useEffect(() => {
    if (user?.permission !== "super_admin" || currentTab !== "approvals") {
      return;
    }

    const fetchApplications = async () => {
      try {
        setAppLoading(true);
        setError(null);
        const apps = await adminService.getPendingApplications();
        setApplications(apps);
      } catch (err) {
        setError(err instanceof Error ? err.message : "載入申請失敗");
        console.error("Fetch applications error:", err);
      } finally {
        setAppLoading(false);
      }
    };

    fetchApplications();
  }, [currentTab]);

  // 批准申請
  const handleApprove = async (classId: string) => {
    if (!window.confirm("確定要批准此申請嗎？")) {
      return;
    }

    try {
      setLoading(true);
      await adminService.approveApplication(classId);

      // 更新列表
      setApplications((prev) => prev.filter((app) => app.class_id !== classId));

      // 更新統計
      if (stats) {
        setStats({
          ...stats,
          pendingApplications: Math.max(0, stats.pendingApplications - 1),
        });
      }

      alert("✅ 申請已批准");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "批准失敗";
      setError(errMsg);
      alert(`❌ ${errMsg}`);
      console.error("Approve error:", err);
    } finally {
      setLoading(false);
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

      // 更新列表
      setApplications((prev) =>
        prev.filter((app) => app.class_id !== selectedAppId)
      );

      // 更新統計
      if (stats) {
        setStats({
          ...stats,
          pendingApplications: Math.max(0, stats.pendingApplications - 1),
        });
      }

      // 關閉彈窗
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

  // 查看詳情
  const handleViewDetail = (classId: string) => {
    // 可以導航到詳情頁面或打開詳情彈窗
    const app = applications.find((a) => a.class_id === classId);
    if (app) {
      console.log("View detail:", app);
      // 暫時用 alert 顯示
      alert(
        `詳情:\n\n班級: ${app.class_id}\n教師: ${app.teacher_name_cn}\n科目: ${app.subject}\n時間: ${app.day_of_week} ${app.time_start}-${app.time_end}\n地點: ${app.venue}\n收費: $${app.fees}`
      );
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "approvals":
        setCurrentTab("approvals");
        break;
      default:
        console.log(`Quick action: ${action}`);
    }
  };

  if (!user || user.permission !== "super_admin") {
    return null;
  }

  if (loading && currentTab === "dashboard") {
    return (
      <Layout title="管理員儀表板">
        <div className="admin-panel">
          <div className="loading-spinner">載入中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="管理員儀表板">
      <div className="admin-panel">
        {/* 選項卡導航 */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${currentTab === "dashboard" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("dashboard")}
          >
            📊 儀表板
          </button>
          <button
            className={`tab-button ${currentTab === "approvals" ? "tab-button--active" : ""}`}
            onClick={() => setCurrentTab("approvals")}
          >
            📋 申請審批{" "}
            {stats && stats.pendingApplications > 0 && (
              <span className="badge badge--danger">
                {stats.pendingApplications}
              </span>
            )}
          </button>
        </div>

        {/* 儀表板標籤頁 */}
        {currentTab === "dashboard" && (
          <>
            {/* 系統統計 */}
            <section className="admin-section">
              <h2 className="section-title">系統統計</h2>
              <div className="stats-grid">
                <StatCard
                  label="教師總數"
                  value={stats?.totalTeachers || 0}
                  icon="👨‍🏫"
                  color="blue"
                />
                <StatCard
                  label="班級總數"
                  value={stats?.totalClasses || 0}
                  icon="📚"
                  color="green"
                />
                <StatCard
                  label="學生總數"
                  value={stats?.totalStudents || 0}
                  icon="👥"
                  color="orange"
                />
                <StatCard
                  label="待審申請"
                  value={stats?.pendingApplications || 0}
                  icon="⏳"
                  color="red"
                />
              </div>
            </section>

            {/* 快速操作 */}
            <section className="admin-section">
              <h2 className="section-title">快速操作</h2>
              <div className="quick-actions-grid">
                <QuickAction
                  label="審批申請"
                  icon="📋"
                  color="blue"
                  onClick={() => handleQuickAction("approvals")}
                />
                <QuickAction
                  label="新增教師"
                  icon="➕"
                  color="green"
                  onClick={() => handleQuickAction("add-teacher")}
                />
                <QuickAction
                  label="匯出報告"
                  icon="📊"
                  color="purple"
                  onClick={() => handleQuickAction("export-report")}
                />
                <QuickAction
                  label="系統設置"
                  icon="⚙️"
                  color="orange"
                  onClick={() => handleQuickAction("settings")}
                />
              </div>
            </section>

            {/* 最近活動 */}
            <section className="admin-section">
              <h2 className="section-title">最近活動</h2>
              <div className="activities-list">
                {activities.length > 0 ? (
                  activities.slice(0, 8).map((activity) => (
                    <ActivityItem
                      key={activity.activity_id}
                      activity={activity}
                    />
                  ))
                ) : (
                  <div className="empty-state">暫無活動記錄</div>
                )}
              </div>
            </section>

            {/* 快速連結 */}
            <section className="admin-section admin-section--footer">
              <h2 className="section-title">快速連結</h2>
              <div className="quick-links">
                <a href="/admin/teachers" className="quick-link">
                  👨‍🏫 教師管理
                </a>
                <a href="/admin/classes" className="quick-link">
                  📚 班級管理
                </a>
                <a href="/admin/students" className="quick-link">
                  👥 學生名冊
                </a>
                <a href="/admin/reports" className="quick-link">
                  📊 出席報告
                </a>
              </div>
            </section>
          </>
        )}

        {/* 申請審批標籤頁 */}
        {currentTab === "approvals" && (
          <section className="admin-section">
            <h2 className="section-title">待審批申請</h2>
            <ApprovalList
              applications={applications}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              onViewDetail={handleViewDetail}
              loading={appLoading}
              empty={!appLoading && applications.length === 0}
            />

            {/* 拒絕彈窗 */}
            <RejectModal
              isOpen={rejectModalOpen}
              classId={selectedAppId || ""}
              className={
                selectedApp
                  ? `${selectedApp.teacher_name_cn} - ${selectedApp.subject}`
                  : ""
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

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import apiClient from "@/utils/api";
import {
  AdminStatistic,
  RecentActivity,
} from "@/types/index";
import "./admin-panel.css";

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
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStatistic | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const handleQuickAction = (action: string) => {
    console.log(`Quick action: ${action}`);
    // 將在 Phase 3+ 實施導航邏輯
  };

  if (loading) {
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
              label="新增教師"
              icon="➕"
              color="blue"
              onClick={() => handleQuickAction("add-teacher")}
            />
            <QuickAction
              label="新增班級"
              icon="📝"
              color="green"
              onClick={() => handleQuickAction("add-class")}
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
                <ActivityItem key={activity.activity_id} activity={activity} />
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

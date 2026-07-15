import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import {
  ResponsiveCard,
  ResponsiveGrid,
  ResponsiveStack,
} from "@/components/common/ResponsiveCard";
import { TutionClass, TutionStatus } from "@/types";
import apiClient from "@/utils/api";
import "./welcome.css";

interface ApplicationStats {
  pending: number;
  approved: number;
  total: number;
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ApplicationStats>({
    pending: 0,
    approved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TutionClass[]>([]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      // 查詢教師的所有申請
      const response = await apiClient.get(`/v1/classes?teacher=${user?.teacherId}`);

      if (response.data && response.data.data) {
        const classes = response.data.data as TutionClass[];
        setApplications(classes);

        // 計算統計
        const pending = classes.filter(
          (c) => c.approval_status === "pending"
        ).length;
        const approved = classes.filter(
          (c) => c.approval_status === "approved" || c.approval_status === "active"
        ).length;

        setStats({
          pending,
          approved,
          total: classes.length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: TutionStatus) => {
    const statusMap: Record<TutionStatus, { label: string; className: string }> = {
      pending: { label: "⏳ 待審批", className: "badge-pending" },
      approved: { label: "✅ 已批准", className: "badge-approved" },
      rejected: { label: "❌ 已拒絕", className: "badge-rejected" },
      active: { label: "🚀 進行中", className: "badge-active" },
      ended: { label: "🏁 已結束", className: "badge-ended" },
    };
    const info = statusMap[status];
    return <span className={`badge ${info.className}`}>{info.label}</span>;
  };

  return (
    <Layout title="歡迎">
      <div className="welcome-container">
        {/* 歡迎標題 */}
        <div className="welcome-header">
          <h1>歡迎, {user?.teacherName}!</h1>
          <p>補習班系統 - 教師管理平台</p>
        </div>

        {/* 統計卡片 (響應式網格) */}
        <ResponsiveGrid columns="3" gap="lg">
          <div className="stat-card">
            <div className="stat-card__value">{stats.pending}</div>
            <div className="stat-card__label">待審批申請</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{stats.approved}</div>
            <div className="stat-card__label">已批准課程</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__value">{stats.total}</div>
            <div className="stat-card__label">總申請數</div>
          </div>
        </ResponsiveGrid>

        {/* 待審批申請 */}
        {stats.pending > 0 && (
          <section className="welcome-section">
            <h2 className="section-title">📋 待審批申請</h2>
            <ResponsiveGrid columns="auto" gap="md">
              {applications
                .filter((app) => app.approval_status === "pending")
                .map((app) => (
                  <ResponsiveCard
                    key={app.class_id}
                    title={`${app.subject} - ${app.form}`}
                    subtitle={getStatusBadge(app.approval_status)}
                    variant="status-pending"
                    action={
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/applications/${app.class_id}`)}
                      >
                        查看
                      </button>
                    }
                  >
                    <p className="card-info">
                      📅 {new Date(app.start_date).toLocaleDateString("zh-TW")}
                    </p>
                    <p className="card-info">💰 RM {app.fees}</p>
                    <p className="card-info">📍 {app.venue}</p>
                  </ResponsiveCard>
                ))}
            </ResponsiveGrid>
          </section>
        )}

        {/* 已批准課程 */}
        {stats.approved > 0 && (
          <section className="welcome-section">
            <h2 className="section-title">✅ 已批准課程</h2>
            <ResponsiveGrid columns="auto" gap="md">
              {applications
                .filter(
                  (app) =>
                    app.approval_status === "approved" || app.approval_status === "active"
                )
                .map((app) => (
                  <ResponsiveCard
                    key={app.class_id}
                    title={`${app.subject} (${app.form})`}
                    subtitle={getStatusBadge(app.approval_status)}
                    variant="status-approved"
                  >
                    <p className="card-info">
                      📅 {app.day_of_week} {app.time_start}-{app.time_end}
                    </p>
                    <p className="card-info">📍 {app.venue}</p>
                    <p className="card-info">👥 {app.initial_roster?.length || 0} 名學生</p>
                    <div className="card-actions">
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${app.class_id}/roster`)}
                      >
                        👥 管理學生
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${app.class_id}/schedule`)}
                      >
                        📅 開課記錄
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${app.class_id}/attendance`)}
                      >
                        ✓ 點名
                      </button>
                    </div>
                  </ResponsiveCard>
                ))}
            </ResponsiveGrid>
          </section>
        )}

        {/* 空狀態 */}
        {stats.total === 0 && !loading && (
          <ResponsiveCard>
            <div className="empty-state__content">
              <p className="empty-state__icon">📝</p>
              <p className="empty-state__text">尚無申請，請提出新申請</p>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/applications/new")}
              >
                + 提出新申請
              </button>
            </div>
          </ResponsiveCard>
        )}

        {/* 新增申請按鈕 */}
        {!loading && stats.total > 0 && (
          <div className="welcome-footer">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/applications/new")}
            >
              + 提出新申請
            </button>
          </div>
        )}

        {/* Loading 狀態 */}
        {loading && (
          <div className="welcome-loading">
            <p>載入中...</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Welcome;

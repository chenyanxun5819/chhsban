import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { ResponsiveCard } from "@/components/common/ResponsiveCard";
import { TutionClass, TutionStatus } from "@/types";
import apiClient from "@/utils/api";
import "./welcome.css";

interface ApplicationRowProps {
  app: TutionClass;
  statusBadge: string;
  actions: React.ReactNode;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ app, statusBadge, actions }) => (
  <div className="app-row">
    <div className="app-row__main">
      <span className="app-row__title">
        {app.subject} ({app.form})
      </span>
      <span className="app-row__badge">{statusBadge}</span>
    </div>
    <div className="app-row__meta">
      <span>📅 {new Date(app.start_date).toLocaleDateString("zh-TW")}</span>
      <span>📍 {app.venue || "-"}</span>
      <span>💰 RM {app.fees}</span>
    </div>
    <div className="app-row__actions">{actions}</div>
  </div>
);

interface ApplicationStats {
  pending: number;
  reviewing: number;
  approved: number;
  total: number;
}

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<ApplicationStats>({
    pending: 0,
    reviewing: 0,
    approved: 0,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<TutionClass[]>([]);

  useEffect(() => {
    fetchApplications();
  }, [user?.teacherId]);

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
        const reviewing = classes.filter(
          (c) => c.approval_status === "reviewing"
        ).length;
        const approved = classes.filter(
          (c) => c.approval_status === "approved" || c.approval_status === "active"
        ).length;

        setStats({
          pending,
          reviewing,
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
    const statusMap: Record<TutionStatus, string> = {
      pending: "⏳ 待審批",
      reviewing: "🔍 審核中",
      approved: "✅ 已批准",
      rejected: "❌ 已拒絕",
      active: "🚀 進行中",
      ended: "🏁 已結束",
    };
    return statusMap[status] || status;
  };

  return (
    <Layout title="歡迎">
      <div className="welcome-container">
        {/* 歡迎標題 */}
        <div className="welcome-header">
          <h1>歡迎, {user?.teacherName}!</h1>
          <p>補習班系統 - 教師管理平台</p>
        </div>

        {/* 待審批申請 */}
        {stats.pending > 0 && (
          <section className="welcome-section">
            <h2 className="section-title">📋 待審批申請</h2>
            <div className="app-list">
              {applications
                .filter((app) => app.approval_status === "pending")
                .map((app) => (
                  <ApplicationRow
                    key={app.class_id}
                    app={app}
                    statusBadge={getStatusBadge(app.approval_status)}
                    actions={
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/applications/${app.class_id}`)}
                      >
                        查看
                      </button>
                    }
                  />
                ))}
            </div>
          </section>
        )}

        {/* 審核中 */}
        {stats.reviewing > 0 && (
          <section className="welcome-section">
            <h2 className="section-title">🔍 審核中</h2>
            <div className="app-list">
              {applications
                .filter((app) => app.approval_status === "reviewing")
                .map((app) => (
                  <ApplicationRow
                    key={app.class_id}
                    app={app}
                    statusBadge={getStatusBadge(app.approval_status)}
                    actions={
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/applications/${app.class_id}`)}
                      >
                        查看
                      </button>
                    }
                  />
                ))}
            </div>
          </section>
        )}

        {/* 已批准課程 */}
        {stats.approved > 0 && (
          <section className="welcome-section">
            <h2 className="section-title">✅ 已批准課程</h2>
            <div className="app-list">
              {applications
                .filter(
                  (app) =>
                    app.approval_status === "approved" || app.approval_status === "active"
                )
                .map((app) => (
                  <ApplicationRow
                    key={app.class_id}
                    app={app}
                    statusBadge={getStatusBadge(app.approval_status)}
                    actions={
                      <>
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
                      </>
                    }
                  />
                ))}
            </div>
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

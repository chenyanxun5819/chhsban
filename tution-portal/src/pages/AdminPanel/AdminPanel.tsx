import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { adminService } from "@/services/adminService";
import type { TutionClass } from "@/types/index";
import "./admin-panel.css";

interface ApplicationWithModal extends TutionClass {
  showRejectModal?: boolean;
  rejectReason?: string;
}

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [applications, setApplications] = useState<ApplicationWithModal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    // 只允許管理員訪問
    if (user && user.permission !== "admin" && user.permission !== "super_admin") {
      navigate("/");
      return;
    }
    fetchApplications();
  }, [user, navigate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await adminService.getPendingApplications();
      setApplications(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "載入應用列表失敗"
      );
      console.error("Error fetching applications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (classId: string) => {
    try {
      setProcessingId(classId);
      await adminService.approveApplication(classId);
      setSuccessMsg("應用已批准");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchApplications();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "批准失敗"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (classId: string, reason: string) => {
    if (!reason.trim()) {
      setError("請填寫拒絕原因");
      return;
    }

    try {
      setProcessingId(classId);
      await adminService.rejectApplication(classId, reason);
      setSuccessMsg("應用已拒絕");
      setTimeout(() => setSuccessMsg(null), 3000);
      await fetchApplications();
      setRejectingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "拒絕失敗"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadPdf = async (classId: string) => {
    try {
      const blob = await adminService.downloadApplicationPdf(classId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `application-${classId}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "下載失敗"
      );
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  if (loading) {
    return (
      <Layout title="管理員審批">
        <div className="admin-loading">
          <div className="spinner"></div>
          <p>載入中...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="管理員審批">
      <div className="admin-container">
        {/* 訊息 */}
        {error && <div className="alert alert-error">{error}</div>}
        {successMsg && (
          <div className="alert alert-success">{successMsg}</div>
        )}

        {/* 標題和統計 */}
        <div className="admin-header">
          <h2>待審批應用</h2>
          <div className="pending-count">
            共 <strong>{applications.length}</strong> 筆待審批
          </div>
        </div>

        {/* 應用列表 */}
        {applications.length === 0 ? (
          <div className="applications-empty">
            <p>暫無待審批的應用</p>
          </div>
        ) : (
          <div className="applications-list">
            {applications.map((app) => (
              <div key={app.class_id} className="application-card">
                <div className="card-header">
                  <div className="app-info">
                    <h3>{app.subject}</h3>
                    <p className="teacher-name">
                      教師：{app.teacher_name || "未知"}
                    </p>
                  </div>
                  <span className="status-badge pending">待審批</span>
                </div>

                <div className="card-body">
                  <div className="info-grid">
                    <div className="info-item">
                      <label>課程形式</label>
                      <span>{app.form || "-"}</span>
                    </div>
                    <div className="info-item">
                      <label>上課日期</label>
                      <span>
                        {app.start_date ? formatDate(app.start_date) : "-"}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>上課地點</label>
                      <span>{app.venue || "-"}</span>
                    </div>
                    <div className="info-item">
                      <label>課程費用</label>
                      <span>
                        {app.fees ? `$${app.fees.toLocaleString()}` : "-"}
                      </span>
                    </div>
                    <div className="info-item">
                      <label>星期</label>
                      <span>{app.day_of_week || "-"}</span>
                    </div>
                    <div className="info-item">
                      <label>學生人數</label>
                      <span>{app.student_count || "-"}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn btn-primary"
                    onClick={() => handleApprove(app.class_id)}
                    disabled={processingId === app.class_id}
                  >
                    {processingId === app.class_id ? "處理中..." : "✓ 批准"}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setRejectingId(app.class_id)}
                    disabled={processingId === app.class_id}
                  >
                    ✗ 拒絕
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDownloadPdf(app.class_id)}
                    disabled={processingId === app.class_id}
                  >
                    📄 PDF
                  </button>
                </div>

                {/* 拒絕模態框 */}
                {rejectingId === app.class_id && (
                  <div className="reject-modal">
                    <div className="modal-content">
                      <h4>拒絕應用</h4>
                      <textarea
                        placeholder="請填寫拒絕原因..."
                        value={app.rejectReason || ""}
                        onChange={(e) => {
                          setApplications((prev) =>
                            prev.map((a) =>
                              a.class_id === app.class_id
                                ? { ...a, rejectReason: e.target.value }
                                : a
                            )
                          );
                        }}
                        rows={3}
                      />
                      <div className="modal-actions">
                        <button
                          className="btn btn-danger"
                          onClick={() =>
                            handleReject(app.class_id, app.rejectReason || "")
                          }
                          disabled={processingId === app.class_id}
                        >
                          確認拒絕
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => setRejectingId(null)}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;

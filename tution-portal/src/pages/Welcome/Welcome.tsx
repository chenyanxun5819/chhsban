import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { ResponsiveCard } from "@/components/common/ResponsiveCard";
import { TutionClass, TutionStatus } from "@/types";
import apiClient from "@/utils/api";
import { getActiveReceiptHalf, getCurrentSemesterInfo, getSemesterInfo, type SemesterHalf } from "@/utils/semester";
import { receiptService } from "@/services/receiptService";
import { useGradeLabel } from "@/i18n/labels";
import { ReceiptUploadModal } from "./ReceiptUploadModal";
import "./welcome.css";

interface ApplicationRowProps {
  app: TutionClass;
  statusBadge: string;
  extra?: React.ReactNode;
  actions: React.ReactNode;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({ app, statusBadge, extra, actions }) => {
  const gradeLabel = useGradeLabel();
  return (
  <div className="app-row">
    <div className="app-row__main">
      <span className="app-row__title">
        {app.subject} ({gradeLabel(app.form)})
      </span>
      <span className="app-row__badge">{statusBadge}</span>
    </div>
    <div className="app-row__meta">
      <span>📅 {new Date(app.start_date).toLocaleDateString("zh-TW")}</span>
      <span>📍 {app.venue || "-"}</span>
      <span>💰 RM {app.fees}</span>
    </div>
    {extra}
    <div className="app-row__actions">{actions}</div>
  </div>
  );
};

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
  const [receiptModalTarget, setReceiptModalTarget] = useState<{ classId: string; half: SemesterHalf } | null>(
    null,
  );
  const [endDateDrafts, setEndDateDrafts] = useState<Record<string, string>>({});
  const [savingEndDateId, setSavingEndDateId] = useState<string | null>(null);

  useEffect(() => {
    fetchApplications();
  }, [user?.teacherId]);

  // 每學年（以 6/1 為界的上/下學年）最多 2 堂已批准（含進行中）課程，
  // 用當下所在的學年判斷是否已達申請上限——實際強制以後端為準，這裡只是預先隱藏按鈕避免白填表單
  const currentSemester = getCurrentSemesterInfo();
  const approvedCourses = applications.filter(
    (app) => app.approval_status === "approved" || app.approval_status === "active",
  );
  const approvedThisSemesterCount = approvedCourses.filter(
    (app) => getSemesterInfo(app.start_date).key === currentSemester.key,
  ).length;
  const canApplyNew = approvedThisSemesterCount < 2;

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

  // 設定自己課程的結束日期（供排課/教室使用等功能判斷這堂課還要開多久）
  const handleSetEndDate = async (classId: string) => {
    const value = endDateDrafts[classId];
    if (!value) {
      alert("請先選擇結束日期");
      return;
    }

    setSavingEndDateId(classId);
    try {
      await apiClient.put(`/v1/classes/${classId}`, { end_date: value });
      await fetchApplications();
      alert("✅ 結束日期已更新");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "更新結束日期失敗";
      alert(`❌ ${errMsg}`);
      console.error("Set end date error:", err);
    } finally {
      setSavingEndDateId(null);
    }
  };

  const renderEndDateEditor = (app: TutionClass) => (
    <div className="app-row__end-date">
      <span className="app-row__end-date-label">🏁 結束日期</span>
      <input
        type="date"
        className="app-row__end-date-input"
        value={endDateDrafts[app.class_id] ?? app.end_date ?? ""}
        onChange={(e) =>
          setEndDateDrafts((prev) => ({ ...prev, [app.class_id]: e.target.value }))
        }
      />
      <button
        className="btn btn-small"
        disabled={savingEndDateId === app.class_id}
        onClick={() => handleSetEndDate(app.class_id)}
      >
        {savingEndDateId === app.class_id ? "儲存中..." : "確定"}
      </button>
    </div>
  );

  const activeHalf = getActiveReceiptHalf();
  const activeHalfLabel = activeHalf === "h1" ? "上學期" : "下學期";

  const handleViewReceipt = async (classId: string, half: SemesterHalf) => {
    const viewWindow = window.open("", "_blank");
    try {
      const blob = await receiptService.downloadReceipt(classId, half);
      const url = window.URL.createObjectURL(blob);
      if (viewWindow) {
        viewWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      viewWindow?.close();
      alert(`❌ ${err instanceof Error ? err.message : "下載失敗"}`);
      console.error("View receipt error:", err);
    }
  };

  // 只顯示「目前這個時間點該收的那一學期」收據狀態／上傳鈕（5/31 前上學期、6/1 起下學期）
  const renderReceiptAction = (app: TutionClass) => {
    const record = activeHalf === "h1" ? app.receipt_h1 : app.receipt_h2;

    if (!record || record.status === "rejected") {
      return (
        <React.Fragment key="receipt">
          {record?.status === "rejected" && (
            <span className="receipt-rejected-tag">❌ 收據被退回，請重新上傳</span>
          )}
          <button
            className="btn btn-small"
            onClick={() => setReceiptModalTarget({ classId: app.class_id, half: activeHalf })}
          >
            📎 上傳{activeHalfLabel}收據
          </button>
        </React.Fragment>
      );
    }

    if (record.status === "pending") {
      return (
        <span key="receipt" className="receipt-inline-status">
          ⏳ {activeHalfLabel}收據審核中
        </span>
      );
    }

    return (
      <button
        key="receipt"
        type="button"
        className="btn-link"
        onClick={() => handleViewReceipt(app.class_id, activeHalf)}
      >
        📄 {activeHalfLabel}收據（已通過）
      </button>
    );
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
                    extra={renderEndDateEditor(app)}
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
                        {renderReceiptAction(app)}
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

        {/* 新增申請按鈕：每學年（上/下學年）最多 2 堂已批准課程，達上限則不顯示 */}
        {!loading && stats.total > 0 && canApplyNew && (
          <div className="welcome-footer">
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate("/applications/new")}
            >
              + 提出新申請
            </button>
          </div>
        )}

        {!loading && stats.total > 0 && !canApplyNew && (
          <p className="welcome-quota-hint">
            {currentSemester.label}已有 {approvedThisSemesterCount} 堂已批准課程，達本學年申請上限（2 堂）
          </p>
        )}

        {receiptModalTarget && (
          <ReceiptUploadModal
            isOpen={true}
            classId={receiptModalTarget.classId}
            half={receiptModalTarget.half}
            halfLabel={receiptModalTarget.half === "h1" ? "上學期" : "下學期"}
            onClose={() => setReceiptModalTarget(null)}
            onUploaded={fetchApplications}
          />
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

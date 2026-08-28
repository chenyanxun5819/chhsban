import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { TutionClass, TutionStatus } from "@/types";
import apiClient from "@/utils/api";
import { formatDisplayDate } from "@/utils/validators";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import "./application-list.css";

type FilterStatus = "all" | "pending" | "reviewing" | "approved" | "rejected" | "active";

const ApplicationList: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const [applications, setApplications] = useState<TutionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchText, setSearchText] = useState("");
  const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchApplications();
  }, [user?.teacherId, user?.permission]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/v1/my/classes");
      const myApplications = response.data?.data as TutionClass[] | undefined;
      setApplications(myApplications || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t("applicationList.loadFailed");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 年份選項：往年申請預設收起來，只在下拉選單看得到，避免歷史申請一直堆在畫面上
  const yearOptions = Array.from(
    new Set([new Date().getFullYear(), ...applications.map((app) => new Date(app.start_date).getFullYear())]),
  ).sort((a, b) => b - a);

  // 篩選應用
  const filteredApplications = applications.filter((app) => {
    // 年份篩選
    if (filterYear !== "all" && new Date(app.start_date).getFullYear() !== Number(filterYear)) {
      return false;
    }

    // 狀態篩選
    if (filterStatus !== "all" && app.approval_status !== filterStatus) {
      return false;
    }

    // 搜尋文字
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      return (
        app.subject.toLowerCase().includes(searchLower) ||
        app.form.toLowerCase().includes(searchLower) ||
        app.venue.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const getStatusInfo = (status: TutionStatus) => {
    const statusMap: Record<TutionStatus, { label: string; badge: string; color: string }> = {
      pending: { label: t("applicationList.status.pending"), badge: "⏳", color: "warning" },
      reviewing: { label: t("applicationList.status.reviewing"), badge: "🔍", color: "info" },
      approved: { label: t("applicationList.status.approved"), badge: "✅", color: "success" },
      rejected: { label: t("applicationList.status.rejected"), badge: "❌", color: "danger" },
      active: { label: t("applicationList.status.active"), badge: "🚀", color: "info" },
      ended: { label: t("applicationList.status.ended"), badge: "🏁", color: "secondary" },
    };
    return statusMap[status];
  };

  const handleViewDetails = (classId: string) => {
    navigate(`/applications/${classId}`);
  };

  const handleEditApplication = (e: React.MouseEvent, classId: string) => {
    e.stopPropagation();
    navigate(`/applications/${classId}/edit`);
  };

  return (
    <Layout title={t("applicationList.title")}>
      <div className="list-container">
        <div className="list-page-title">
          <h1>{t("applicationList.heading")}</h1>
          <p>{t("applicationList.subtitle")}</p>
        </div>

        {/* 搜尋和篩選欄 */}
        <div className="list-header">
          <div className="search-box">
            <input
              type="text"
              placeholder={t("applicationList.searchPlaceholder")}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="year-filter">
            <label>
              {t("applicationList.yearLabel")}
              <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="all">{t("applicationList.yearAll")}</option>
              </select>
            </label>
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === "all" ? "active" : ""}`}
              onClick={() => setFilterStatus("all")}
            >
              {t("applicationList.filter.all")}
            </button>
            <button
              className={`filter-tab ${filterStatus === "pending" ? "active" : ""}`}
              onClick={() => setFilterStatus("pending")}
            >
              {t("applicationList.filter.pending")}
            </button>
            <button
              className={`filter-tab ${filterStatus === "reviewing" ? "active" : ""}`}
              onClick={() => setFilterStatus("reviewing")}
            >
              {t("applicationList.filter.reviewing")}
            </button>
            <button
              className={`filter-tab ${filterStatus === "approved" ? "active" : ""}`}
              onClick={() => setFilterStatus("approved")}
            >
              {t("applicationList.filter.approved")}
            </button>
            <button
              className={`filter-tab ${filterStatus === "active" ? "active" : ""}`}
              onClick={() => setFilterStatus("active")}
            >
              {t("applicationList.filter.active")}
            </button>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* 內容區域 */}
        {loading ? (
          <div className="empty-state">
            <p>{t("welcome.loading")}</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            <p>{t("applicationList.empty")}</p>
          </div>
        ) : (
          <>
            {/* 桌機版: 表格 */}
            <div className="table-view hide-mobile">
              <div className="table-wrapper">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>{t("applicationList.col.subject")}</th>
                      <th>{t("applicationList.col.grade")}</th>
                      <th>{t("applicationList.col.startDate")}</th>
                      <th>{t("applicationList.col.venue")}</th>
                      <th>{t("applicationList.col.fees")}</th>
                      <th>{t("applicationList.col.status")}</th>
                      <th>{t("applicationList.col.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map((app) => {
                      const statusInfo = getStatusInfo(app.approval_status);
                      return (
                        <tr key={app.class_id}>
                          <td>
                            <strong>{app.subject}</strong>
                          </td>
                          <td>{gradeLabel(app.form)}</td>
                          <td>{formatDisplayDate(app.start_date)}</td>
                          <td>{app.venue}</td>
                          <td>RM {app.fees}</td>
                          <td>
                            <span className={`badge badge-${statusInfo.color}`}>
                              {statusInfo.badge} {statusInfo.label}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-link"
                              onClick={() => handleViewDetails(app.class_id)}
                            >
                              {t("applicationList.view")}
                            </button>
                            {app.approval_status === "pending" && (
                              <button
                                className="btn btn-link"
                                onClick={(e) => handleEditApplication(e, app.class_id)}
                              >
                                {t("applicationList.edit")}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 手機版: 卡片列表 */}
            <div className="card-view hide-desktop">
              <div className="applications-cards">
                {filteredApplications.map((app) => {
                  const statusInfo = getStatusInfo(app.approval_status);
                  return (
                    <div
                      key={app.class_id}
                      className="application-card"
                      onClick={() => handleViewDetails(app.class_id)}
                    >
                      <div className="card-header">
                        <div>
                          <h3>{app.subject}</h3>
                          <p>{gradeLabel(app.form)}</p>
                        </div>
                        <span className={`badge badge-${statusInfo.color}`}>
                          {statusInfo.badge}
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="card-row">
                          <span className="label">{t("applicationList.startDateLabel")}</span>
                          <span className="value">
                            {formatDisplayDate(app.start_date)}
                          </span>
                        </div>
                        <div className="card-row">
                          <span className="label">{t("applicationList.classTimeLabel")}</span>
                          <span className="value">
                            {dayLabel(app.day_of_week)} {app.time_start}-{app.time_end}
                          </span>
                        </div>
                        <div className="card-row">
                          <span className="label">{t("applicationList.venueLabel")}</span>
                          <span className="value">{app.venue}</span>
                        </div>
                        <div className="card-row">
                          <span className="label">{t("applicationList.feesLabel")}</span>
                          <span className="value">RM {app.fees}</span>
                        </div>
                        {app.initial_roster && (
                          <div className="card-row">
                            <span className="label">{t("applicationList.studentCountLabel")}</span>
                            <span className="value">
                              {t("applicationList.studentCount", { count: app.initial_roster.length })}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="card-footer">
                        <button
                          className="btn btn-small btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(app.class_id);
                          }}
                        >
                          {t("applicationList.viewDetails")}
                        </button>
                        {app.approval_status === "pending" && (
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={(e) => handleEditApplication(e, app.class_id)}
                          >
                            {t("applicationList.edit")}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* 新增申請按鈕 */}
        <div className="list-footer">
          <button
            className="btn btn-primary btn-large"
            onClick={() => navigate("/applications/new")}
          >
            {t("welcome.newApplication")}
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationList;

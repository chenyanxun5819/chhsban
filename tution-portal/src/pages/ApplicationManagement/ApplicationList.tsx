import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { TutionClass, TutionStatus } from "@/types";
import apiClient from "@/utils/api";
import "./application-list.css";

type FilterStatus = "all" | "pending" | "approved" | "rejected" | "active";

const ApplicationList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [applications, setApplications] = useState<TutionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      // 根據權限決定查詢範圍
      // super_admin 和 admin 可以看所有人的申請，其他人只能看自己的
      let url = "/v1/classes";
      if (user?.permission === "super_admin" || user?.permission === "admin") {
        // super_admin 和 admin 看所有申請
        url = "/v1/classes";
      } else {
        // 其他人只看自己的申請
        url = `/v1/classes?teacher=${user?.teacherId}`;
      }

      const response = await apiClient.get(url);

      if (response.data && response.data.data) {
        setApplications(response.data.data as TutionClass[]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "載入申請列表失敗";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 篩選應用
  const filteredApplications = applications.filter((app) => {
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
      pending: { label: "待審批", badge: "⏳", color: "warning" },
      approved: { label: "已批准", badge: "✅", color: "success" },
      rejected: { label: "已拒絕", badge: "❌", color: "danger" },
      active: { label: "進行中", badge: "🚀", color: "info" },
      ended: { label: "已結束", badge: "🏁", color: "secondary" },
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
    <Layout title="申請列表">
      <div className="list-container">
        {/* 搜尋和篩選欄 */}
        <div className="list-header">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜尋科目、年級或地點..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <div className="filter-tabs">
            <button
              className={`filter-tab ${filterStatus === "all" ? "active" : ""}`}
              onClick={() => setFilterStatus("all")}
            >
              全部
            </button>
            <button
              className={`filter-tab ${filterStatus === "pending" ? "active" : ""}`}
              onClick={() => setFilterStatus("pending")}
            >
              待審批
            </button>
            <button
              className={`filter-tab ${filterStatus === "approved" ? "active" : ""}`}
              onClick={() => setFilterStatus("approved")}
            >
              已批准
            </button>
            <button
              className={`filter-tab ${filterStatus === "active" ? "active" : ""}`}
              onClick={() => setFilterStatus("active")}
            >
              進行中
            </button>
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* 內容區域 */}
        {loading ? (
          <div className="empty-state">
            <p>載入中...</p>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="empty-state">
            <p>📋 尚無符合條件的申請</p>
          </div>
        ) : (
          <>
            {/* 桌機版: 表格 */}
            <div className="table-view hide-mobile">
              <div className="table-wrapper">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>科目</th>
                      <th>年級</th>
                      <th>開課日期</th>
                      <th>上課地點</th>
                      <th>學費</th>
                      <th>狀態</th>
                      <th>操作</th>
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
                          <td>{app.form}</td>
                          <td>{new Date(app.start_date).toLocaleDateString("zh-TW")}</td>
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
                              查看
                            </button>
                            {app.approval_status === "pending" && (
                              <button
                                className="btn btn-link"
                                onClick={(e) => handleEditApplication(e, app.class_id)}
                              >
                                編輯
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
                          <p>{app.form}</p>
                        </div>
                        <span className={`badge badge-${statusInfo.color}`}>
                          {statusInfo.badge}
                        </span>
                      </div>

                      <div className="card-body">
                        <div className="card-row">
                          <span className="label">開課日期:</span>
                          <span className="value">
                            {new Date(app.start_date).toLocaleDateString("zh-TW")}
                          </span>
                        </div>
                        <div className="card-row">
                          <span className="label">上課時間:</span>
                          <span className="value">
                            {app.day_of_week} {app.time_start}-{app.time_end}
                          </span>
                        </div>
                        <div className="card-row">
                          <span className="label">上課地點:</span>
                          <span className="value">{app.venue}</span>
                        </div>
                        <div className="card-row">
                          <span className="label">學費:</span>
                          <span className="value">RM {app.fees}</span>
                        </div>
                        {app.initial_roster && (
                          <div className="card-row">
                            <span className="label">學生人數:</span>
                            <span className="value">{app.initial_roster.length} 人</span>
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
                          查看詳情
                        </button>
                        {app.approval_status === "pending" && (
                          <button
                            className="btn btn-small btn-secondary"
                            onClick={(e) => handleEditApplication(e, app.class_id)}
                          >
                            編輯
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
            + 提出新申請
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationList;

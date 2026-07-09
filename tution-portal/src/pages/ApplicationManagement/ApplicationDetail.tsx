import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { TutionClass, TutionRosterSnapshot } from "@/types";
import apiClient from "@/utils/api";
import "./application-detail.css";

interface FormData {
  form: string;
  subject: string;
  day_of_week: string;
  start_date: string;
  fees: number;
  venue: string;
}

const ApplicationDetail: React.FC = () => {
  const navigate = useNavigate();
  const { classId } = useParams<{ classId: string }>();

  const [application, setApplication] = useState<TutionClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    form: "",
    subject: "",
    day_of_week: "",
    start_date: "",
    fees: 0,
    venue: "",
  });

  const [roster, setRoster] = useState<TutionRosterSnapshot[]>([]);

  useEffect(() => {
    fetchApplicationDetail();
  }, [classId]);

  const fetchApplicationDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!classId) {
        setError("無效的申請 ID");
        return;
      }

      const response = await apiClient.get(`/v1/classes/${classId}`);
      const appData = response.data.data as TutionClass;

      setApplication(appData);
      setFormData({
        form: appData.form,
        subject: appData.subject,
        day_of_week: appData.day_of_week,
        start_date: appData.start_date,
        fees: appData.fees,
        venue: appData.venue,
      });
      setRoster(appData.initial_roster || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "載入申請詳情失敗";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "fees" ? parseFloat(value) : value,
    }));
  };

  const handleSaveChanges = async () => {
    setIsUpdating(true);
    setError(null);

    try {
      const response = await apiClient.put(`/v1/classes/${classId}`, {
        form: formData.form,
        subject: formData.subject,
        day_of_week: formData.day_of_week,
        start_date: formData.start_date,
        fees: formData.fees,
        venue: formData.venue,
      });

      setApplication(response.data.data);
      setIsEditing(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "更新失敗，請重試";
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteApplication = async () => {
    if (!window.confirm("確認要刪除此申請嗎？")) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await apiClient.delete(`/v1/classes/${classId}`);
      setTimeout(() => {
        navigate("/applications");
      }, 800);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || "刪除失敗，請重試";
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (application) {
      setFormData({
        form: application.form,
        subject: application.subject,
        day_of_week: application.day_of_week,
        start_date: application.start_date,
        fees: application.fees,
        venue: application.venue,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; emoji: string; color: string }> = {
      pending: { label: "待審批", emoji: "⏳", color: "warning" },
      approved: { label: "已批准", emoji: "✅", color: "success" },
      rejected: { label: "已拒絕", emoji: "❌", color: "danger" },
      active: { label: "進行中", emoji: "🚀", color: "info" },
      ended: { label: "已結束", emoji: "🏁", color: "secondary" },
    };
    const info = statusMap[status] || statusMap.pending;
    return (
      <span className={`badge badge-${info.color}`}>
        {info.emoji} {info.label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout title="申請詳情">
        <div className="empty-state">
          <p>載入中...</p>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout title="申請詳情">
        <div className="empty-state">
          <p>📋 申請不存在或已被刪除</p>
          <button className="btn btn-primary" onClick={() => navigate("/applications")}>
            返回列表
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`申請詳情 - ${application.subject}`}>
      <div className="detail-container">
        {/* 頂部栏 */}
        <div className="detail-header">
          <div className="header-info">
            <h1>{application.subject}</h1>
            <p>{application.form} 班</p>
          </div>
          {getStatusBadge(application.approval_status)}
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* 基本信息 */}
        <div className="detail-section">
          <h2 className="section-title">📋 基本信息</h2>

          {!isEditing ? (
            <div className="info-grid info-grid--2col">
              <div className="info-item">
                <label>科目</label>
                <p>{application.subject}</p>
              </div>
              <div className="info-item">
                <label>年級</label>
                <p>{application.form}</p>
              </div>
              <div className="info-item">
                <label>上課日期</label>
                <p>{application.day_of_week}</p>
              </div>
              <div className="info-item">
                <label>上課時間</label>
                <p>
                  {application.time_start} - {application.time_end}
                </p>
              </div>
              <div className="info-item">
                <label>開課日期</label>
                <p>{new Date(application.start_date).toLocaleDateString("zh-TW")}</p>
              </div>
              <div className="info-item">
                <label>學費</label>
                <p>RM {application.fees}</p>
              </div>
              <div className="info-item info-item--fullwidth">
                <label>上課地點</label>
                <p>{application.venue}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>科目 *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>年級 *</label>
                  <input
                    type="text"
                    name="form"
                    value={formData.form}
                    onChange={handleFormChange}
                    disabled
                  />
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>上課日期 *</label>
                  <input
                    type="text"
                    value={formData.day_of_week}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>開課日期 *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleFormChange}
                  />
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>學費 (RM) *</label>
                  <input
                    type="number"
                    name="fees"
                    value={formData.fees}
                    onChange={handleFormChange}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="form-group">
                  <label>上課地點 *</label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 學生名單 */}
        {roster.length > 0 && (
          <div className="detail-section">
            <h2 className="section-title">
              👥 學生名單 ({roster.length} 人)
            </h2>

            <div className="roster-table hide-mobile">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>學號</th>
                      <th>姓名</th>
                      <th>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((student) => (
                      <tr key={student.student_id}>
                        <td>{student.student_no}</td>
                        <td>{student.name_cn}</td>
                        <td>
                          <span className="badge badge-info">✓ 已驗證</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="roster-cards hide-desktop">
              {roster.map((student) => (
                <div key={student.student_id} className="roster-card">
                  <div>
                    <p className="student-no">{student.student_no}</p>
                    <p className="student-name">{student.name_cn}</p>
                  </div>
                  <span className="badge badge-info">✓</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 操作按鈕 */}
        <div className="detail-actions">
          {!isEditing ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => navigate("/applications")}
              >
                返回列表
              </button>

              {application.approval_status === "pending" && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                    disabled={isUpdating}
                  >
                    編輯
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteApplication}
                    disabled={isUpdating}
                  >
                    刪除
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveChanges}
                disabled={isUpdating}
              >
                {isUpdating ? "保存中..." : "保存"}
              </button>
            </>
          )}
        </div>

        {/* 時間戳 */}
        <div className="detail-footer">
          <p>建立時間: {new Date(application.created_at).toLocaleString("zh-TW")}</p>
          {application.updated_at && (
            <p>最後修改: {new Date(application.updated_at).toLocaleString("zh-TW")}</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationDetail;

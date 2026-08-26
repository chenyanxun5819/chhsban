import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/common/Layout";
import { TutionClass, TutionRosterSnapshot } from "@/types";
import apiClient from "@/utils/api";
import { validateStudent, updateRoster } from "@/services/classService";
import { FORMS, DAYS_OF_WEEK, formatDisplayDate, formatDisplayDateTime } from "@/utils/validators";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import "./application-detail.css";

const DETAIL_RETRY_DELAYS_MS = [600, 1200, 2000];

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
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();

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
  const [newStudentId, setNewStudentId] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  useEffect(() => {
    fetchApplicationDetail();
  }, [id]);

  const wait = (delayMs: number) =>
    new Promise((resolve) => window.setTimeout(resolve, delayMs));

  const fetchApplicationDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!id) {
        setError(t("applicationDetail.errorInvalidId"));
        return;
      }

      let response = null;
      let lastError: any = null;

      for (let attempt = 0; attempt <= DETAIL_RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          response = await apiClient.get(`/v1/classes/${id}`);
          break;
        } catch (err: any) {
          lastError = err;
          const status = err?.response?.status;
          const shouldRetry = status === 404 && attempt < DETAIL_RETRY_DELAYS_MS.length;

          if (!shouldRetry) {
            throw err;
          }

          await wait(DETAIL_RETRY_DELAYS_MS[attempt]);
        }
      }

      if (!response) {
        throw lastError;
      }

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
      const errorMessage = err.response?.data?.error || t("applicationDetail.errorLoadFailed");
      setError(errorMessage);
      setApplication(null);
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
    if (roster.length === 0) {
      setError(t("applicationDetail.errorRosterEmpty"));
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await apiClient.put(`/v1/classes/${id}`, {
        form: formData.form,
        subject: formData.subject,
        day_of_week: formData.day_of_week,
        start_date: formData.start_date,
        fees: formData.fees,
        venue: formData.venue,
      });

      const updatedApp = await updateRoster(id!, roster);

      setApplication(updatedApp);
      setRoster(updatedApp.initial_roster || []);
      setIsEditing(false);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t("applicationDetail.errorUpdateFailed");
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  // 新增學生到名單
  const handleAddRosterStudent = async () => {
    if (!newStudentId.trim()) {
      setRosterError(t("applicationDetail.errorStudentIdRequired"));
      return;
    }

    if (roster.find((s) => s.student_id === newStudentId.trim())) {
      setRosterError(t("applicationDetail.errorStudentDuplicate"));
      return;
    }

    setAddingStudent(true);
    setRosterError(null);

    try {
      const student = await validateStudent(newStudentId.trim());
      if (!student) {
        setRosterError(t("applicationDetail.errorStudentNotFound", { id: newStudentId }));
        return;
      }

      setRoster((prev) => [...prev, student]);
      setNewStudentId("");
    } catch (err) {
      setRosterError(t("applicationDetail.errorVerifyFailed"));
    } finally {
      setAddingStudent(false);
    }
  };

  // 從名單移除學生
  const handleRemoveRosterStudent = (studentId: string) => {
    setRoster((prev) => prev.filter((s) => s.student_id !== studentId));
  };

  const handleDeleteApplication = async () => {
    if (!window.confirm(t("applicationDetail.confirmDelete"))) {
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      await apiClient.delete(`/v1/classes/${id}`);
      setTimeout(() => {
        navigate("/applications");
      }, 800);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t("applicationDetail.errorDeleteFailed");
      setError(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setRosterError(null);
    setNewStudentId("");
    if (application) {
      setFormData({
        form: application.form,
        subject: application.subject,
        day_of_week: application.day_of_week,
        start_date: application.start_date,
        fees: application.fees,
        venue: application.venue,
      });
      setRoster(application.initial_roster || []);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; emoji: string; color: string }> = {
      pending: { label: t("applicationList.status.pending"), emoji: "⏳", color: "warning" },
      reviewing: { label: t("applicationList.status.reviewing"), emoji: "🔍", color: "info" },
      approved: { label: t("applicationList.status.approved"), emoji: "✅", color: "success" },
      rejected: { label: t("applicationList.status.rejected"), emoji: "❌", color: "danger" },
      active: { label: t("applicationList.status.active"), emoji: "🚀", color: "info" },
      ended: { label: t("applicationList.status.ended"), emoji: "🏁", color: "secondary" },
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
      <Layout title={t("applicationDetail.title")}>
        <div className="empty-state">
          <p>{t("welcome.loading")}</p>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout title={t("applicationDetail.title")}>
        <div className="empty-state">
          <p>{t("applicationDetail.notFound")}</p>
          <button className="btn btn-primary" onClick={() => navigate("/applications")}>
            {t("applicationDetail.backToList")}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={t("applicationDetail.titleWithSubject", { subject: application.subject })}>
      <div className="detail-container">
        {/* 頂部栏 */}
        <div className="detail-header">
          <div className="header-info">
            <h1>{application.subject}</h1>
            <p>
              {t("applicationDetail.gradeTeacherLine", {
                grade: gradeLabel(application.form),
                teacher: application.teacher_name_cn,
              })}
            </p>
          </div>
          {getStatusBadge(application.approval_status)}
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* 基本信息 */}
        <div className="detail-section">
          <h2 className="section-title">{t("applicationDetail.sectionBasicInfo")}</h2>

          {!isEditing ? (
            <div className="info-grid info-grid--2col">
              <div className="info-item">
                <label>{t("field.subject")}</label>
                <p>{application.subject}</p>
              </div>
              <div className="info-item">
                <label>{t("field.grade")}</label>
                <p>{gradeLabel(application.form)}</p>
              </div>
              <div className="info-item">
                <label>{t("field.classDay")}</label>
                <p>{dayLabel(application.day_of_week)}</p>
              </div>
              <div className="info-item">
                <label>{t("field.classTime")}</label>
                <p>
                  {application.time_start} - {application.time_end}
                </p>
              </div>
              <div className="info-item">
                <label>{t("field.startDate")}</label>
                <p>{formatDisplayDate(application.start_date)}</p>
              </div>
              <div className="info-item">
                <label>{t("field.fees")}</label>
                <p>RM {application.fees}</p>
              </div>
              <div className="info-item info-item--fullwidth">
                <label>{t("field.venue")}</label>
                <p>{application.venue}</p>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>{t("field.subject")} *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                  />
                </div>
                <div className="form-group">
                  <label>{t("field.grade")} *</label>
                  <select name="form" value={formData.form} onChange={handleFormChange}>
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {gradeLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>{t("field.classDay")} *</label>
                  <select
                    name="day_of_week"
                    value={formData.day_of_week}
                    onChange={handleFormChange}
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {dayLabel(d.value)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t("field.startDate")} *</label>
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
                  <label>{t("field.fees")}</label>
                  <p>RM {formData.fees}</p>
                </div>
                <div className="form-group">
                  <label>{t("field.venue")}</label>
                  <p>{formData.venue || t("applicationDetail.venueUnassigned")}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 學生名單 */}
        {(roster.length > 0 || isEditing) && (
          <div className="detail-section">
            <h2 className="section-title">
              {t("applicationDetail.rosterSectionTitle", { count: roster.length })}
            </h2>

            {rosterError && <div className="alert alert-error">{rosterError}</div>}

            <div className="roster-table hide-mobile">
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>{t("field.studentNo")}</th>
                      <th>{t("field.studentName")}</th>
                      <th>{t("field.status")}</th>
                      {isEditing && <th>{t("field.actions")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {roster.map((student) => (
                      <tr key={student.student_id}>
                        <td>{student.student_no}</td>
                        <td>{student.name_cn}</td>
                        <td>
                          <span className="badge badge-info">{t("applicationDetail.verified")}</span>
                        </td>
                        {isEditing && (
                          <td>
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => handleRemoveRosterStudent(student.student_id)}
                            >
                              {t("applicationDetail.remove")}
                            </button>
                          </td>
                        )}
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
                  {isEditing ? (
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => handleRemoveRosterStudent(student.student_id)}
                    >
                      {t("applicationDetail.remove")}
                    </button>
                  ) : (
                    <span className="badge badge-info">✓</span>
                  )}
                </div>
              ))}
            </div>

            {isEditing && (
              <div className="roster-add-row">
                <input
                  type="text"
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  placeholder={t("applicationDetail.studentIdPlaceholder")}
                  disabled={addingStudent}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleAddRosterStudent();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddRosterStudent}
                  disabled={addingStudent}
                >
                  {addingStudent ? t("applicationDetail.verifying") : t("applicationDetail.addStudent")}
                </button>
              </div>
            )}
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
                {t("applicationDetail.backToList")}
              </button>

              {application.approval_status === "pending" && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setIsEditing(true)}
                    disabled={isUpdating}
                  >
                    {t("applicationDetail.edit")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={handleDeleteApplication}
                    disabled={isUpdating}
                  >
                    {t("applicationDetail.delete")}
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
                {t("applicationDetail.cancel")}
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveChanges}
                disabled={isUpdating}
              >
                {isUpdating ? t("applicationDetail.saving") : t("applicationDetail.save")}
              </button>
            </>
          )}
        </div>

        {/* 時間戳 */}
        <div className="detail-footer">
          <p>{t("applicationDetail.createdAt", { time: formatDisplayDateTime(application.created_at) })}</p>
          {application.updated_at && (
            <p>{t("applicationDetail.updatedAt", { time: formatDisplayDateTime(application.updated_at) })}</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ApplicationDetail;

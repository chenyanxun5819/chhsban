import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { TutionRosterSnapshot } from "@/types";
import { createApplication, validateStudents } from "@/services/classService";
import {
  FORMS,
  FIXED_TIME_START,
  FIXED_TIME_END,
  getMinDate,
  getDayOfWeekFromDate,
  parseCSV,
  parseXLSX,
} from "@/utils/validators";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import "./application-form.css";

interface FormData {
  form: string;
  subject: string;
  day_of_week: string;
  start_date: string;
  fees: number;
}

type StudentInputMethod = "csv" | "manual";

const ApplicationForm: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const [step, setStep] = useState<1 | 2>(1); // 手機: 分步 | 桌機: 全步
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 表單數據
  const [formData, setFormData] = useState<FormData>({
    form: "",
    subject: "",
    day_of_week: getDayOfWeekFromDate(getMinDate()),
    start_date: getMinDate(),
    fees: 0,
  });

  // 根據年級計算學費
  const getFeesForForm = (formValue: string): number => {
    if (["初一", "初二", "初三"].includes(formValue)) return 60;
    if (["高一", "高二", "高三"].includes(formValue)) return 70;
    return 0;
  };

  // 學生名單
  const [studentInputMethod, setStudentInputMethod] = useState<StudentInputMethod>("csv");
  const [csvContent, setCsvContent] = useState("");
  const [manualStudents, setManualStudents] = useState<TutionRosterSnapshot[]>([]);
  const [newStudentId, setNewStudentId] = useState("");

  // 驗證結果
  const [validationResult, setValidationResult] = useState<{
    valid: TutionRosterSnapshot[];
    invalid: string[];
  } | null>(null);
  const [validating, setValidating] = useState(false);

  // 基本信息表單變更
  const handleFormChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    if (name === "form") {
      // 年級改變時，自動更新學費
      const newFees = getFeesForForm(value);
      setFormData((prev) => ({
        ...prev,
        form: value,
        fees: newFees,
      }));
    } else if (name === "start_date") {
      // 開課日期改變時，自動更新上課日期（星期幾）
      setFormData((prev) => ({
        ...prev,
        start_date: value,
        day_of_week: getDayOfWeekFromDate(value),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
    setError(null);
  };

  // CSV / XLSX 上傳
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        // 處理 XLSX 文件
        const studentIds = await parseXLSX(file);
        setCsvContent(studentIds.join("\n"));
      } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        // 處理 CSV 文件
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          setCsvContent(content);
        };
        reader.onerror = () => {
          setError(t("applicationForm.errorReadCsvFailed"));
        };
        reader.readAsText(file, "UTF-8");
      } else {
        setError(t("applicationForm.errorUnsupportedFile"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("applicationForm.errorUploadFailed"));
    }
  };

  // 新增學生 (手動輸入)
  const addManualStudent = async () => {
    if (!newStudentId.trim()) {
      setError(t("applicationDetail.errorStudentIdRequired"));
      return;
    }

    setValidating(true);
    try {
      const result = await validateStudents([newStudentId]);
      if (result.valid.length > 0) {
        const newStudent = result.valid[0];
        if (!manualStudents.find((s) => s.student_id === newStudent.student_id)) {
          setManualStudents((prev) => [...prev, newStudent]);
          setNewStudentId("");
          setError(null);
        } else {
          setError(t("applicationForm.errorStudentDuplicate"));
        }
      } else {
        setError(t("applicationDetail.errorStudentNotFound", { id: newStudentId }));
      }
    } catch (err) {
      setError(t("applicationDetail.errorVerifyFailed"));
    } finally {
      setValidating(false);
    }
  };

  // 移除手動輸入的學生
  const removeManualStudent = (studentId: string) => {
    setManualStudents((prev) => prev.filter((s) => s.student_id !== studentId));
  };

  // 學生名單卡片（手動輸入 / 驗證結果共用），取代擁擠的表格版型
  const renderStudentCards = (
    list: TutionRosterSnapshot[],
    onRemove?: (studentId: string) => void
  ) => (
    <div className="app-student-list">
      {list.map((student) => (
        <div key={student.student_id} className="app-student-row">
          <div className="app-student-line-1">
            <span className="app-student-no">{student.student_no}</span>
            <span className="app-name-cn">{student.name_cn}</span>
            <span className="app-name-en">{student.name_en || "-"}</span>
          </div>
          <div className="app-student-line-2">
            <span className="app-class-badge">{student.real_class_name || "-"}</span>
            <span className="app-gender-badge">{student.gender_boarding || "-"}</span>
            {onRemove && (
              <button
                type="button"
                className="btn-remove-student"
                onClick={() => onRemove(student.student_id)}
              >
                {t("applicationDetail.remove")}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // 驗證學生名單（僅 CSV 上傳需要；手動輸入的學生已在新增時即時驗證）
  const validateStudentList = async () => {
    if (!csvContent.trim()) {
      setError(t("applicationForm.errorNoCsv"));
      return;
    }

    setValidating(true);
    try {
      const studentIds = parseCSV(csvContent);
      const result = await validateStudents(studentIds);
      setValidationResult(result);

      if (result.invalid.length > 0) {
        setError(
          t("applicationForm.errorInvalidStudentsList", {
            count: result.invalid.length,
            list: result.invalid.join(", "),
          })
        );
      }
    } catch (err) {
      setError(t("applicationDetail.errorVerifyFailed"));
    } finally {
      setValidating(false);
    }
  };

  // 提交申請
  const submitApplication = async () => {
    // 驗證基本信息
    if (
      !formData.form ||
      !formData.subject ||
      !formData.day_of_week ||
      !formData.start_date ||
      formData.fees <= 0
    ) {
      setError(t("applicationForm.errorRequiredFields"));
      return;
    }

    // 學生名單：手動輸入每筆都已即時驗證，直接使用；CSV 則需先完成「驗證名單」
    const finalRoster =
      studentInputMethod === "manual" ? manualStudents : validationResult?.valid ?? [];

    if (finalRoster.length === 0) {
      setError(
        studentInputMethod === "manual"
          ? t("applicationForm.errorNoManualStudents")
          : t("applicationForm.errorNoValidStudent")
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const application = await createApplication(user?.teacherId || "", {
        form: formData.form,
        subject: formData.subject,
        day_of_week: formData.day_of_week,
        time_start: FIXED_TIME_START,
        time_end: FIXED_TIME_END,
        start_date: formData.start_date,
        fees: formData.fees,
        venue: "",  // 上課地點由管理者填寫
        initial_roster: finalRoster,
      });

      setSuccess(true);
      setTimeout(() => {
        // 從不同的可能字段中取得 class_id
        const classId = application?.class_id || (application as any)?.data?.class_id || "";
        if (classId) {
          navigate(`/applications/${classId}`);
        } else {
          // 如果沒有 class_id，返回列表頁面
          navigate("/applications");
        }
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || t("applicationForm.errorSubmitFailed");
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 是否桌機版
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <Layout title={t("applicationForm.title")}>
      <div className="form-container">
        {/* 提示訊息 */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success">{t("applicationForm.successSubmitted")}</div>
        )}

        {/* 桌機版: 完整表單 */}
        {isDesktop ? (
          <div className="form-full">
            {/* 基本信息 */}
            <section className="form-section">
              <h2 className="form-section__title">{t("applicationDetail.sectionBasicInfo")}</h2>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>{t("field.grade")} *</label>
                  <select
                    name="form"
                    value={formData.form}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">{t("applicationForm.selectGrade")}</option>
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {gradeLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("field.subject")} *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder={t("applicationForm.subjectPlaceholder")}
                    required
                  />
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>{t("field.startDate")} *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleFormChange}
                    min={getMinDate()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t("field.classDay")}</label>
                  <div className="fee-display">
                    <span className="fee-value">
                      {formData.day_of_week ? dayLabel(formData.day_of_week) : "-"}
                    </span>
                    <p className="fee-note">{t("applicationForm.classDayAutoNote")}</p>
                  </div>
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>{t("field.fees")} (RM) *</label>
                  <div className="fee-display">
                    <span className="fee-value">RM {formData.fees}</span>
                    <p className="fee-note">{t("applicationForm.feesAutoNote")}</p>
                  </div>
                </div>
              </div>

              <p className="form-note">{t("applicationForm.classTimeNote", { start: FIXED_TIME_START, end: FIXED_TIME_END })}</p>
            </section>

            {/* 學生名單 */}
            <section className="form-section">
              <h2 className="form-section__title">{t("applicationForm.sectionStudentList")}</h2>

              <div className="student-method">
                <label>
                  <input
                    type="radio"
                    value="csv"
                    checked={studentInputMethod === "csv"}
                    onChange={(e) => {
                      setStudentInputMethod(e.target.value as StudentInputMethod);
                      setValidationResult(null);
                      setError(null);
                    }}
                  />
                  {t("applicationForm.uploadCsv")}
                </label>
                <label>
                  <input
                    type="radio"
                    value="manual"
                    checked={studentInputMethod === "manual"}
                    onChange={(e) => {
                      setStudentInputMethod(e.target.value as StudentInputMethod);
                      setValidationResult(null);
                      setError(null);
                    }}
                  />
                  {t("applicationForm.manualInput")}
                </label>
              </div>

              {studentInputMethod === "csv" ? (
                <div className="form-group">
                  <label>{t("applicationForm.uploadCsvLabel")}</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                  />
                  <p className="form-hint">{t("applicationForm.csvFormatHint")}</p>
                  {csvContent && (
                    <div className="csv-preview">
                      <p>{t("applicationForm.previewLabel")}</p>
                      <pre>{csvContent.split("\n").slice(0, 5).join("\n")}</pre>
                      {csvContent.split("\n").length > 5 && (
                        <p>{t("applicationForm.totalLines", { count: csvContent.split("\n").length })}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label>{t("applicationForm.manualInputLabel")}</label>
                  <div className="student-input-row">
                    <input
                      type="text"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      placeholder={t("applicationDetail.studentIdPlaceholder")}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          addManualStudent();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addManualStudent}
                      disabled={validating}
                    >
                      {validating ? t("applicationDetail.verifying") : t("applicationForm.add")}
                    </button>
                  </div>

                  {manualStudents.length > 0 && (
                    <div className="validation-result">
                      <p className="success">
                        {t("applicationForm.verifySuccess", { count: manualStudents.length })}
                      </p>
                      {renderStudentCards(manualStudents, removeManualStudent)}
                    </div>
                  )}
                </div>
              )}

              {/* 驗證按鈕：僅 CSV 上傳需要，手動輸入的學生已即時驗證 */}
              {studentInputMethod === "csv" && !validationResult && (
                <div className="form-group">
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={validateStudentList}
                    disabled={validating || loading}
                  >
                    {validating ? t("applicationDetail.verifying") : t("applicationForm.verifyList")}
                  </button>
                </div>
              )}

              {/* 驗證結果（CSV 上傳） */}
              {studentInputMethod === "csv" && validationResult && (
                <div className="validation-result">
                  <p className="success">{t("applicationForm.verifySuccess", { count: validationResult.valid.length })}</p>

                  {/* 學生詳細信息表 */}
                  {validationResult.valid.length > 0 &&
                    renderStudentCards(validationResult.valid)}

                  {validationResult.invalid.length > 0 && (
                    <p className="warning">
                      {t("applicationForm.invalidStudents", { count: validationResult.invalid.length })}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 按鈕 */}
            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/applications")}
                disabled={loading}
              >
                {t("applicationDetail.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitApplication}
                disabled={
                  loading ||
                  (studentInputMethod === "manual" ? manualStudents.length === 0 : !validationResult)
                }
              >
                {loading ? t("applicationForm.submitting") : t("applicationForm.submit")}
              </button>
            </div>
          </div>
        ) : (
          /* 手機版: 分步表單 */
          <div className="form-stepper">
            <div className="stepper-header">
              <div className={`stepper-step ${step >= 1 ? "active" : ""}`}>
                <span>1</span>
                <p>{t("applicationForm.stepBasicInfo")}</p>
              </div>
              <div className={`stepper-step ${step >= 2 ? "active" : ""}`}>
                <span>2</span>
                <p>{t("applicationForm.stepStudentList")}</p>
              </div>
            </div>

            {/* Step 1: 基本信息 */}
            {step === 1 && (
              <section className="form-section mobile-section">
                <h2 className="form-section__title">{t("applicationDetail.sectionBasicInfo")}</h2>

                <div className="form-group">
                  <label>{t("field.grade")} *</label>
                  <select
                    name="form"
                    value={formData.form}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">{t("applicationForm.selectGrade")}</option>
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {gradeLabel(f)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>{t("field.subject")} *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder={t("applicationForm.subjectPlaceholder")}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t("field.startDate")} *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleFormChange}
                    min={getMinDate()}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>{t("field.classDay")}</label>
                  <div className="fee-display">
                    <span className="fee-value">
                      {formData.day_of_week ? dayLabel(formData.day_of_week) : "-"}
                    </span>
                    <p className="fee-note">{t("applicationForm.classDayAutoNote")}</p>
                  </div>
                </div>

                <div className="form-group">
                  <label>{t("field.fees")} (RM) *</label>
                  <div className="fee-display">
                    <span className="fee-value">RM {formData.fees}</span>
                    <p className="fee-note">{t("applicationForm.feesAutoNote")}</p>
                  </div>
                </div>

                <p className="form-note">{t("applicationForm.classTimeNote", { start: FIXED_TIME_START, end: FIXED_TIME_END })}</p>

                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    if (formData.form && formData.subject && formData.day_of_week) {
                      setStep(2);
                    } else {
                      setError(t("applicationForm.errorRequiredFields"));
                    }
                  }}
                >
                  {t("applicationForm.nextStep")}
                </button>
              </section>
            )}

            {/* Step 2: 學生名單 */}
            {step === 2 && (
              <section className="form-section mobile-section">
                <h2 className="form-section__title">{t("applicationForm.sectionStudentList")}</h2>

                <div className="student-method">
                  <label>
                    <input
                      type="radio"
                      value="csv"
                      checked={studentInputMethod === "csv"}
                      onChange={(e) => {
                      setStudentInputMethod(e.target.value as StudentInputMethod);
                      setValidationResult(null);
                      setError(null);
                    }}
                    />
                    {t("applicationForm.uploadCsv")}
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="manual"
                      checked={studentInputMethod === "manual"}
                      onChange={(e) => {
                      setStudentInputMethod(e.target.value as StudentInputMethod);
                      setValidationResult(null);
                      setError(null);
                    }}
                    />
                    {t("applicationForm.manualInput")}
                  </label>
                </div>

                {studentInputMethod === "csv" ? (
                  <div className="form-group">
                    <label>{t("applicationForm.uploadCsvLabel")}</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvUpload}
                    />
                    <p className="form-hint">{t("applicationForm.csvFormatHint")}</p>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>{t("applicationForm.manualInputLabel")}</label>
                    <div className="student-input-row">
                      <input
                        type="text"
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        placeholder={t("applicationDetail.studentIdPlaceholder")}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={addManualStudent}
                        disabled={validating}
                      >
                        {t("applicationForm.add")}
                      </button>
                    </div>

                    {manualStudents.length > 0 && (
                      <div className="validation-result">
                        <p className="success">
                          {t("applicationForm.verifySuccess", { count: manualStudents.length })}
                        </p>
                        {renderStudentCards(manualStudents, removeManualStudent)}
                      </div>
                    )}
                  </div>
                )}

                {/* 驗證按鈕：僅 CSV 上傳需要，手動輸入的學生已即時驗證 */}
                {studentInputMethod === "csv" && !validationResult && (
                  <div className="form-group">
                    <button
                      type="button"
                      className="btn btn-secondary btn-block"
                      onClick={validateStudentList}
                      disabled={validating || loading}
                    >
                      {validating ? t("applicationDetail.verifying") : t("applicationForm.verifyList")}
                    </button>
                  </div>
                )}

                {studentInputMethod === "csv" && validationResult && (
                  <div className="validation-result">
                    <p className="success">{t("applicationForm.verifySuccess", { count: validationResult.valid.length })}</p>

                    {/* 學生詳細信息表 */}
                    {validationResult.valid.length > 0 &&
                      renderStudentCards(validationResult.valid)}

                    {validationResult.invalid.length > 0 && (
                      <p className="warning">
                        {t("applicationForm.invalidStudents", { count: validationResult.invalid.length })}
                      </p>
                    )}
                  </div>
                )}

                <div className="button-group">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    {t("applicationForm.prevStep")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={submitApplication}
                    disabled={
                      loading ||
                      (studentInputMethod === "manual" ? manualStudents.length === 0 : !validationResult)
                    }
                  >
                    {loading ? t("applicationForm.submitting") : t("applicationForm.submit")}
                  </button>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default ApplicationForm;

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { TutionRosterSnapshot } from "@/types";
import { createApplication, validateStudents } from "@/services/classService";
import {
  FORMS,
  DAYS_OF_WEEK,
  FIXED_TIME_START,
  FIXED_TIME_END,
  getMinDate,
  parseCSV,
  parseXLSX,
} from "@/utils/validators";
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
  const [step, setStep] = useState<1 | 2>(1); // 手機: 分步 | 桌機: 全步
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 表單數據
  const [formData, setFormData] = useState<FormData>({
    form: "",
    subject: "",
    day_of_week: "",
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
          setError("讀取 CSV 文件失敗");
        };
        reader.readAsText(file, "UTF-8");
      } else {
        setError("只支持 CSV、TXT 或 XLSX 檔案");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "上傳失敗");
    }
  };

  // 新增學生 (手動輸入)
  const addManualStudent = async () => {
    if (!newStudentId.trim()) {
      setError("請輸入學生 ID");
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
          setError("該學生已在列表中");
        }
      } else {
        setError(`學生 ${newStudentId} 不存在`);
      }
    } catch (err) {
      setError("驗證失敗，請重試");
    } finally {
      setValidating(false);
    }
  };

  // 移除手動輸入的學生
  const removeManualStudent = (studentId: string) => {
    setManualStudents((prev) => prev.filter((s) => s.student_id !== studentId));
  };

  // 驗證學生名單
  const validateStudentList = async () => {
    if (studentInputMethod === "csv" && !csvContent.trim()) {
      setError("請上傳 CSV 文件或輸入學生 ID");
      return;
    }

    if (studentInputMethod === "manual" && manualStudents.length === 0) {
      setError("請至少新增一名學生");
      return;
    }

    setValidating(true);
    try {
      let studentIds: string[] = [];

      if (studentInputMethod === "csv") {
        const lines = parseCSV(csvContent);
        studentIds = lines;
      } else {
        studentIds = manualStudents.map((s) => s.student_id);
      }

      const result = await validateStudents(studentIds);
      setValidationResult(result);

      if (result.invalid.length > 0) {
        setError(
          `${result.invalid.length} 名學生不存在: ${result.invalid.join(", ")}`
        );
      }
    } catch (err) {
      setError("驗證失敗，請重試");
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
      setError("請填寫所有必填字段");
      return;
    }

    // 驗證學生名單
    if (!validationResult || validationResult.valid.length === 0) {
      setError("請選擇至少一名學生");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const application = await createApplication(user?.teacherId || "", {
        form: formData.form,
        subject: formData.subject,
        day_of_week: formData.day_of_week,
        start_date: formData.start_date,
        fees: formData.fees,
        venue: "",  // 上課地點由管理者填寫
        initial_roster: validationResult.valid,
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
      const errorMessage = err.response?.data?.error || "提交失敗，請重試";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // 是否桌機版
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <Layout title="提出新申請">
      <div className="form-container">
        {/* 提示訊息 */}
        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success">✅ 申請已提交，即將跳轉...</div>
        )}

        {/* 桌機版: 完整表單 */}
        {isDesktop ? (
          <div className="form-full">
            {/* 基本信息 */}
            <section className="form-section">
              <h2 className="form-section__title">📋 基本信息</h2>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>年級 *</label>
                  <select
                    name="form"
                    value={formData.form}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">選擇年級</option>
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>科目 *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder="例: 數學、英文"
                    required
                  />
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>上課日期 *</label>
                  <select
                    name="day_of_week"
                    value={formData.day_of_week}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">選擇日期</option>
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>開課日期 *</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleFormChange}
                    min={getMinDate()}
                    required
                  />
                </div>
              </div>

              <div className="form-row form-row--2col">
                <div className="form-group">
                  <label>學費 (RM) *</label>
                  <div className="fee-display">
                    <span className="fee-value">RM {formData.fees}</span>
                    <p className="fee-note">系統自動根據年級填寫，無法修改</p>
                  </div>
                </div>
              </div>

              <div className="form-note">
                <p>⏰ 上課時間: {FIXED_TIME_START} - {FIXED_TIME_END}</p>
              </div>
            </section>

            {/* 學生名單 */}
            <section className="form-section">
              <h2 className="form-section__title">👥 學生名單</h2>

              <div className="student-method">
                <label>
                  <input
                    type="radio"
                    value="csv"
                    checked={studentInputMethod === "csv"}
                    onChange={(e) => setStudentInputMethod(e.target.value as StudentInputMethod)}
                  />
                  上傳 CSV 文件
                </label>
                <label>
                  <input
                    type="radio"
                    value="manual"
                    checked={studentInputMethod === "manual"}
                    onChange={(e) => setStudentInputMethod(e.target.value as StudentInputMethod)}
                  />
                  逐個輸入
                </label>
              </div>

              {studentInputMethod === "csv" ? (
                <div className="form-group">
                  <label>上傳 CSV 文件 *</label>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleCsvUpload}
                  />
                  <p className="form-hint">格式: 每行一個學生 ID</p>
                  {csvContent && (
                    <div className="csv-preview">
                      <p>預覽:</p>
                      <pre>{csvContent.split("\n").slice(0, 5).join("\n")}</pre>
                      {csvContent.split("\n").length > 5 && (
                        <p>... 共 {csvContent.split("\n").length} 行</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="form-group">
                  <label>逐個輸入學生 *</label>
                  <div className="student-input-row">
                    <input
                      type="text"
                      value={newStudentId}
                      onChange={(e) => setNewStudentId(e.target.value)}
                      placeholder="輸入學生 ID"
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
                      {validating ? "驗證中..." : "新增"}
                    </button>
                  </div>

                  {manualStudents.length > 0 && (
                    <div className="student-list">
                      {manualStudents.map((student) => (
                        <div key={student.student_id} className="student-item">
                          <span>{student.student_no} - {student.name_cn}</span>
                          <button
                            type="button"
                            className="btn btn-small btn-danger"
                            onClick={() => removeManualStudent(student.student_id)}
                          >
                            移除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 驗證按鈕 */}
              {!validationResult && (
                <div className="form-group">
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={validateStudentList}
                    disabled={validating || loading}
                  >
                    {validating ? "驗證中..." : "驗證名單"}
                  </button>
                </div>
              )}

              {/* 驗證結果 */}
              {validationResult && (
                <div className="validation-result">
                  <p className="success">✅ {validationResult.valid.length} 名學生驗證成功</p>
                  
                  {/* 學生詳細信息表 */}
                  {validationResult.valid.length > 0 && (
                    <div className="student-details-table">
                      <table>
                        <thead>
                          <tr>
                            <th>學號</th>
                            <th>中文姓名</th>
                            <th>Name</th>
                            <th>班級</th>
                            <th>性別/走宿</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validationResult.valid.map((student) => (
                            <tr key={student.student_id}>
                              <td>{student.student_no}</td>
                              <td>{student.name_cn}</td>
                              <td>{student.name_en || "-"}</td>
                              <td>{student.real_class_name || "-"}</td>
                              <td>{student.gender_boarding || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {validationResult.invalid.length > 0 && (
                    <p className="warning">
                      ⚠️ {validationResult.invalid.length} 名學生不存在
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
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={submitApplication}
                disabled={loading || !validationResult}
              >
                {loading ? "提交中..." : "提交申請"}
              </button>
            </div>
          </div>
        ) : (
          /* 手機版: 分步表單 */
          <div className="form-stepper">
            <div className="stepper-header">
              <div className={`stepper-step ${step >= 1 ? "active" : ""}`}>
                <span>1</span>
                <p>基本信息</p>
              </div>
              <div className={`stepper-step ${step >= 2 ? "active" : ""}`}>
                <span>2</span>
                <p>學生名單</p>
              </div>
            </div>

            {/* Step 1: 基本信息 */}
            {step === 1 && (
              <section className="form-section mobile-section">
                <h2 className="form-section__title">📋 基本信息</h2>

                <div className="form-group">
                  <label>年級 *</label>
                  <select
                    name="form"
                    value={formData.form}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">選擇年級</option>
                    {FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>科目 *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleFormChange}
                    placeholder="例: 數學、英文"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>上課日期 *</label>
                  <select
                    name="day_of_week"
                    value={formData.day_of_week}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">選擇日期</option>
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>開課日期 *</label>
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
                  <label>學費 (RM) *</label>
                  <div className="fee-display">
                    <span className="fee-value">RM {formData.fees}</span>
                    <p className="fee-note">系統自動根據年級填寫，無法修改</p>
                  </div>
                </div>

                <div className="form-note">
                  <p>⏰ 上課時間: {FIXED_TIME_START} - {FIXED_TIME_END}</p>
                </div>

                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    if (formData.form && formData.subject && formData.day_of_week) {
                      setStep(2);
                    } else {
                      setError("請填寫所有必填字段");
                    }
                  }}
                >
                  下一步
                </button>
              </section>
            )}

            {/* Step 2: 學生名單 */}
            {step === 2 && (
              <section className="form-section mobile-section">
                <h2 className="form-section__title">👥 學生名單</h2>

                <div className="student-method">
                  <label>
                    <input
                      type="radio"
                      value="csv"
                      checked={studentInputMethod === "csv"}
                      onChange={(e) => setStudentInputMethod(e.target.value as StudentInputMethod)}
                    />
                    上傳 CSV 文件
                  </label>
                  <label>
                    <input
                      type="radio"
                      value="manual"
                      checked={studentInputMethod === "manual"}
                      onChange={(e) => setStudentInputMethod(e.target.value as StudentInputMethod)}
                    />
                    逐個輸入
                  </label>
                </div>

                {studentInputMethod === "csv" ? (
                  <div className="form-group">
                    <label>上傳 CSV 文件 *</label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleCsvUpload}
                    />
                    <p className="form-hint">格式: 每行一個學生 ID</p>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>逐個輸入學生 *</label>
                    <div className="student-input-row">
                      <input
                        type="text"
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        placeholder="輸入學生 ID"
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={addManualStudent}
                        disabled={validating}
                      >
                        新增
                      </button>
                    </div>

                    {manualStudents.length > 0 && (
                      <div className="student-list">
                        {manualStudents.map((student) => (
                          <div key={student.student_id} className="student-item">
                            <span>{student.student_no} - {student.name_cn}</span>
                            <button
                              type="button"
                              className="btn btn-small btn-danger"
                              onClick={() => removeManualStudent(student.student_id)}
                            >
                              移除
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!validationResult && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-block"
                    onClick={validateStudentList}
                    disabled={validating || loading}
                  >
                    {validating ? "驗證中..." : "驗證名單"}
                  </button>
                )}

                {validationResult && (
                  <div className="validation-result">
                    <p className="success">✅ {validationResult.valid.length} 名學生驗證成功</p>
                    
                    {/* 學生詳細信息表 */}
                    {validationResult.valid.length > 0 && (
                      <div className="student-details-table mobile">
                        <table>
                          <thead>
                            <tr>
                              <th>學號</th>
                              <th>中文姓名</th>
                              <th>Name</th>
                              <th>班級</th>
                              <th>性別/走宿</th>
                            </tr>
                          </thead>
                          <tbody>
                            {validationResult.valid.map((student) => (
                              <tr key={student.student_id}>
                                <td>{student.student_no}</td>
                                <td>{student.name_cn}</td>
                                <td>{student.name_en}</td>
                                <td>{student.real_class_name || "-"}</td>
                                <td>{student.gender_boarding || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {validationResult.invalid.length > 0 && (
                      <p className="warning">
                        ⚠️ {validationResult.invalid.length} 名學生不存在
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
                    上一步
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={submitApplication}
                    disabled={loading || !validationResult}
                  >
                    {loading ? "提交中..." : "提交申請"}
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

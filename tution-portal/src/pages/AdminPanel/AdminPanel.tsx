import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/common/Layout";
import { ApprovalList, RejectModal } from "@/components/admin";
import { adminService } from "@/services/adminService";
import { getSemesterInfo } from "@/utils/semester";
import apiClient from "@/utils/api";
import type { ClassroomRecord, TutionClass } from "@/types/index";
import ClassroomManagement from "@/pages/ClassroomManagement/ClassroomManagement";
import "./admin-panel.css";

type CourseSortKey = "default" | "application_no" | "teacher" | "subject" | "day_of_week";

const COURSE_SORT_LABELS: Record<CourseSortKey, string> = {
  default: "預設順序",
  application_no: "編號",
  teacher: "申請人",
  subject: "課程",
  day_of_week: "星期",
};

const DAY_OF_WEEK_ORDER: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function sortCourses(courses: TutionClass[], sortKey: CourseSortKey): TutionClass[] {
  if (sortKey === "default") return courses;
  const sorted = [...courses];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "application_no":
        return (a.application_no || "").localeCompare(b.application_no || "", undefined, {
          numeric: true,
        });
      case "teacher":
        return a.teacher_name_cn.localeCompare(b.teacher_name_cn, "zh-Hant");
      case "subject":
        return a.subject.localeCompare(b.subject, "zh-Hant");
      case "day_of_week": {
        const ai = DAY_OF_WEEK_ORDER[a.day_of_week?.trim().toLowerCase()] ?? 99;
        const bi = DAY_OF_WEEK_ORDER[b.day_of_week?.trim().toLowerCase()] ?? 99;
        if (ai !== bi) return ai - bi;
        // 同一天再依年級排序（初一→高三，F1~F6 字面順序剛好一致）
        return a.form.localeCompare(b.form);
      }
      default:
        return 0;
    }
  });
  return sorted;
}

function exportCoursesToXLSX(courses: TutionClass[]): void {
  const headers = ["編號", "申請人", "科目", "年級", "上課日", "教室"];
  const rows = courses.map((c) => [
    c.application_no || "",
    c.teacher_name_cn,
    c.subject,
    c.form,
    c.day_of_week,
    c.venue || "",
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "已開課課程");
  XLSX.writeFile(workbook, `courses-${Date.now()}.xlsx`);
}

type TabType = "approvals" | "courses" | "teachers" | "classrooms";

const VALID_TABS: TabType[] = ["approvals", "courses", "teachers", "classrooms"];

const TEACHER_MANAGEMENT_URL = "https://master.teacher-management-portal.pages.dev/";

const COURSE_STATUS_LABELS: Record<string, string> = {
  approved: "✅ 已批准",
  active: "🚀 進行中",
  ended: "🏁 已結束",
};

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tab } = useParams<{ tab: string }>();

  const currentTab: TabType = VALID_TABS.includes(tab as TabType) ? (tab as TabType) : "approvals";
  const [error, setError] = useState<string | null>(null);

  // 所有課程（申請中／已開課），審批清單、已開課清單、教室佔用判斷都從這裡衍生
  const [allClasses, setAllClasses] = useState<TutionClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<TutionClass | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  // 可用教室清單（用於「指定上課地點」下拉選單）
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([]);

  const [endDateDrafts, setEndDateDrafts] = useState<Record<string, string>>({});
  const [savingEndDateId, setSavingEndDateId] = useState<string | null>(null);
  const [uploadingSignedFormId, setUploadingSignedFormId] = useState<string | null>(null);
  const [reviewingReceiptKey, setReviewingReceiptKey] = useState<string | null>(null);
  const [courseSortKey, setCourseSortKey] = useState<CourseSortKey>("default");

  const applications = allClasses.filter(
    (item) => item.approval_status === "pending" || item.approval_status === "reviewing",
  );
  const pendingCount = applications.filter((a) => a.approval_status === "pending").length;
  const courses = allClasses.filter(
    (item) =>
      item.approval_status === "approved" ||
      item.approval_status === "active" ||
      item.approval_status === "ended",
  );
  const sortedCourses = sortCourses(courses, courseSortKey);

  // 「上課日期＋教室」已被占用的組合（reviewing／approved／active 才算占用，ended 視為已釋出）
  const occupiedVenueDays = new Set(
    allClasses
      .filter(
        (item) =>
          ["reviewing", "approved", "active"].includes(item.approval_status) && item.venue,
      )
      .map((item) => `${item.day_of_week}|${item.venue}`),
  );

  // 權限檢查：只有 super_admin 才能訪問此頁面
  useEffect(() => {
    if (user && user.permission !== "super_admin") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const fetchAllClasses = async () => {
    try {
      setClassesLoading(true);
      setError(null);
      const response = await apiClient.get("/v1/classes");
      setAllClasses((response.data?.data as TutionClass[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入課程失敗");
      console.error("Fetch classes error:", err);
    } finally {
      setClassesLoading(false);
    }
  };

  const fetchClassrooms = async () => {
    try {
      const response = await apiClient.get("/classrooms?availableOnly=true");
      if (response.data?.success) {
        setClassrooms(response.data.data || []);
      }
    } catch (err) {
      console.error("Fetch classrooms error:", err);
    }
  };

  // 掛載時抓一次課程清單（同時作為審批分頁徽章、已開課清單、教室占用判斷的資料來源）
  useEffect(() => {
    if (user?.permission !== "super_admin") return;
    fetchAllClasses();
    fetchClassrooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.permission]);

  // 批准申請
  const handleApprove = async (classId: string) => {
    if (!window.confirm("確定要批准此申請嗎？")) {
      return;
    }

    try {
      await adminService.approveApplication(classId);
      await fetchAllClasses();
      alert("✅ 申請已批准");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "批准失敗";
      setError(errMsg);
      alert(`❌ ${errMsg}`);
      console.error("Approve error:", err);
    }
  };

  // 確定教室（指定上課地點，狀態轉為審核中）
  // 成功與否都由 ApprovalRow 就地顯示，這裡不彈窗，失敗時把錯誤往上拋讓呼叫端捕捉
  const handleAssignVenue = async (classId: string, venue: string) => {
    try {
      await adminService.assignVenue(classId, venue);
      await fetchAllClasses();
    } catch (err) {
      console.error("Assign venue error:", err);
      throw err instanceof Error ? err : new Error("確定教室失敗");
    }
  };

  // 刪除申請
  const handleDeleteApplication = async (classId: string) => {
    if (!window.confirm("確定要刪除此申請嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) {
      return;
    }

    try {
      await adminService.deleteApplication(classId);
      await fetchAllClasses();
      alert("✅ 申請已刪除");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "刪除失敗";
      alert(`❌ ${errMsg}`);
      console.error("Delete error:", err);
    }
  };

  // 刪除已開課的課程
  const handleDeleteCourse = async (classId: string) => {
    if (!window.confirm("確定要刪除此課程嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) {
      return;
    }

    try {
      await adminService.deleteApplication(classId);
      await fetchAllClasses();
      alert("✅ 課程已刪除");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "刪除失敗";
      alert(`❌ ${errMsg}`);
      console.error("Delete course error:", err);
    }
  };

  // 設定課程結束日期（供 ScheduleManagement 排課生成範圍使用）
  const handleSetEndDate = async (classId: string) => {
    const value = endDateDrafts[classId];
    if (!value) {
      alert("請先選擇結束日期");
      return;
    }

    setSavingEndDateId(classId);
    try {
      await apiClient.put(`/v1/classes/${classId}`, { end_date: value });
      await fetchAllClasses();
      alert("✅ 結束日期已更新");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "更新結束日期失敗";
      alert(`❌ ${errMsg}`);
      console.error("Set end date error:", err);
    } finally {
      setSavingEndDateId(null);
    }
  };

  // 上傳已簽核的紙本申請表掃描檔
  const handleUploadSignedForm = async (classId: string, file: File) => {
    setUploadingSignedFormId(classId);
    try {
      await adminService.uploadSignedForm(classId, file);
      await fetchAllClasses();
      alert("✅ 簽核檔已上傳");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "上傳失敗";
      alert(`❌ ${errMsg}`);
      console.error("Upload signed form error:", err);
    } finally {
      setUploadingSignedFormId(null);
    }
  };

  // 查看已存檔的簽核紙本掃描檔
  const handleViewSignedForm = async (classId: string) => {
    // 先開一個空白分頁，避免瀏覽器把非同步觸發的 window.open 當成彈窗封鎖
    const viewWindow = window.open("", "_blank");
    try {
      const blob = await adminService.downloadSignedForm(classId);
      const url = window.URL.createObjectURL(blob);
      if (viewWindow) {
        viewWindow.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    } catch (err) {
      viewWindow?.close();
      alert(`❌ ${err instanceof Error ? err.message : "下載失敗"}`);
      console.error("View signed form error:", err);
    }
  };

  // 查看申請人上傳的場地費收據
  const handleViewReceipt = async (classId: string, half: "h1" | "h2") => {
    const viewWindow = window.open("", "_blank");
    try {
      const blob = await adminService.downloadReceipt(classId, half);
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

  // 審核收據「正確／不正確」：正確即通過並記錄收據編號，不正確則退回、要求重新上傳
  const handleReviewReceipt = async (
    classId: string,
    half: "h1" | "h2",
    decision: "approved" | "rejected",
  ) => {
    let rejectionReason: string | undefined;
    if (decision === "rejected") {
      rejectionReason = window.prompt("請輸入退回原因（選填）：") || "";
      if (!window.confirm("確定要將此收據標記為「不正確」並退回嗎？申請人需重新上傳。")) {
        return;
      }
    } else if (!window.confirm("確認此收據正確無誤嗎？")) {
      return;
    }

    const key = `${classId}-${half}`;
    setReviewingReceiptKey(key);
    try {
      await adminService.reviewReceipt(classId, half, decision, rejectionReason);
      await fetchAllClasses();
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "審核失敗"}`);
      console.error("Review receipt error:", err);
    } finally {
      setReviewingReceiptKey(null);
    }
  };

  // 打開拒絕彈窗
  const handleRejectClick = (classId: string) => {
    const app = applications.find((a) => a.class_id === classId);
    setSelectedAppId(classId);
    setSelectedApp(app || null);
    setRejectModalOpen(true);
  };

  // 提交拒絕
  const handleRejectSubmit = async (reason: string) => {
    if (!selectedAppId) return;

    try {
      setRejectingId(selectedAppId);
      await adminService.rejectApplication(selectedAppId, reason);
      await fetchAllClasses();

      setRejectModalOpen(false);
      setSelectedAppId(null);
      setSelectedApp(null);

      alert("✅ 申請已拒絕");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "拒絕失敗";
      console.error("Reject error:", err);
      throw new Error(errMsg);
    } finally {
      setRejectingId(null);
    }
  };

  if (!user || user.permission !== "super_admin") {
    return null;
  }

  return (
    <Layout title="管理員儀表板">
      <div className="admin-panel">
        {/* 審批管理 */}
        {currentTab === "approvals" && (
          <section className="admin-section">
            <h2 className="section-title">
              審批管理{" "}
              {pendingCount > 0 && <span className="badge badge--danger">{pendingCount}</span>}
            </h2>
            <ApprovalList
              applications={applications}
              classrooms={classrooms}
              occupiedVenueDays={occupiedVenueDays}
              onApprove={handleApprove}
              onReject={handleRejectClick}
              onAssignVenue={handleAssignVenue}
              onDelete={handleDeleteApplication}
              loading={classesLoading}
              empty={!classesLoading && applications.length === 0}
            />

            {/* 拒絕彈窗 */}
            <RejectModal
              isOpen={rejectModalOpen}
              classId={selectedAppId || ""}
              className={
                selectedApp ? `${selectedApp.teacher_name_cn} - ${selectedApp.subject}` : ""
              }
              onConfirm={handleRejectSubmit}
              onCancel={() => {
                setRejectModalOpen(false);
                setSelectedAppId(null);
                setSelectedApp(null);
              }}
              loading={rejectingId !== null}
            />
          </section>
        )}

        {/* 已開課管理 */}
        {currentTab === "courses" && (
          <section className="admin-section">
            <h2 className="section-title">已開課管理</h2>
            {classesLoading ? (
              <div className="loading-text">載入中...</div>
            ) : courses.length === 0 ? (
              <div className="empty-state">暫無已開課的課程</div>
            ) : (
              <>
                <div className="course-list-toolbar">
                  <label className="course-list-toolbar__sort">
                    <span>排序：</span>
                    <select
                      value={courseSortKey}
                      onChange={(e) => setCourseSortKey(e.target.value as CourseSortKey)}
                    >
                      {(Object.keys(COURSE_SORT_LABELS) as CourseSortKey[]).map((key) => (
                        <option key={key} value={key}>
                          {COURSE_SORT_LABELS[key]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="btn btn-small"
                    onClick={() => exportCoursesToXLSX(sortedCourses)}
                  >
                    📥 匯出 Excel
                  </button>
                </div>
                <div className="course-list">
                  {sortedCourses.map((course) => (
                    <div key={course.class_id} className="course-row">
                      <div className="course-row__main">
                        <span className="course-row__no">{course.application_no || "-"}</span>
                        <span className="course-row__title">
                          {course.subject}（{course.form}）
                        </span>
                      <span className="course-row__badge">
                        {COURSE_STATUS_LABELS[course.approval_status] || course.approval_status}
                      </span>
                    </div>
                    <div className="course-row__meta">
                      <span>👨‍🏫 {course.teacher_name_cn}</span>
                      <span>📍 {course.venue || "-"}</span>
                      <span>
                        📅 {course.day_of_week} {course.time_start}-{course.time_end}
                      </span>
                      <span>🏁 結束日期：{course.end_date || "未設定"}</span>
                    </div>
                    <div className="course-row__receipts">
                      {(["h1", "h2"] as const)
                        .filter(
                          // 開課日期已經落在下學年（6/1 以後）的課程，從未經歷過上學年，
                          // 不需要繳交／顯示上學年收據。
                          (half) => half !== "h1" || getSemesterInfo(course.start_date).half === "h1",
                        )
                        .map((half) => {
                          const record = half === "h1" ? course.receipt_h1 : course.receipt_h2;
                          const halfLabel = half === "h1" ? "上學年" : "下學年";
                          const reviewKey = `${course.class_id}-${half}`;
                          return (
                            <div key={half} className="receipt-status-row">
                              <span className="receipt-status-row__label">{halfLabel}收據：</span>
                              {!record ? (
                                <span className="receipt-status-row__empty">尚未上傳</span>
                              ) : (
                                <>
                                  <span>編號 {record.receipt_no || "-"}</span>
                                  <span
                                    className={`badge badge-${record.status === "pending" ? "reviewing" : record.status === "approved" ? "approved" : "rejected"}`}
                                  >
                                    {record.status === "pending"
                                      ? "⏳ 審核中"
                                      : record.status === "approved"
                                        ? "✅ 已通過"
                                        : "❌ 已退回"}
                                  </span>
                                  <button
                                    className="btn btn-small"
                                    onClick={() => handleViewReceipt(course.class_id, half)}
                                  >
                                    📄 查看
                                  </button>
                                  {record.status === "pending" && (
                                    <>
                                      <button
                                        className="btn btn-small"
                                        disabled={reviewingReceiptKey === reviewKey}
                                        onClick={() => handleReviewReceipt(course.class_id, half, "approved")}
                                      >
                                        ✅ 收據正確
                                      </button>
                                      <button
                                        className="btn btn-small btn--danger"
                                        disabled={reviewingReceiptKey === reviewKey}
                                        onClick={() => handleReviewReceipt(course.class_id, half, "rejected")}
                                      >
                                        ❌ 收據不正確
                                      </button>
                                    </>
                                  )}
                                  {record.status === "rejected" && record.rejection_reason && (
                                    <span className="receipt-status-row__reason">
                                      原因：{record.rejection_reason}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          );
                        })}
                    </div>
                    <div className="course-row__end-date">
                      <input
                        type="date"
                        className="course-row__end-date-input"
                        value={endDateDrafts[course.class_id] ?? course.end_date ?? ""}
                        onChange={(e) =>
                          setEndDateDrafts((prev) => ({ ...prev, [course.class_id]: e.target.value }))
                        }
                      />
                      <button
                        className="btn btn-small"
                        disabled={savingEndDateId === course.class_id}
                        onClick={() => handleSetEndDate(course.class_id)}
                      >
                        {savingEndDateId === course.class_id ? "儲存中..." : "設定結束日期"}
                      </button>
                    </div>
                    <div className="course-row__actions">
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/roster`)}
                      >
                        👥 管理學生
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/schedule`)}
                      >
                        📅 開課記錄
                      </button>
                      <button
                        className="btn btn-small"
                        onClick={() => navigate(`/classes/${course.class_id}/attendance`)}
                      >
                        ✓ 點名
                      </button>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        style={{ display: "none" }}
                        id={`signed-form-input-${course.class_id}`}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadSignedForm(course.class_id, file);
                          e.target.value = "";
                        }}
                      />
                      <button
                        className="btn btn-small"
                        disabled={uploadingSignedFormId === course.class_id}
                        onClick={() =>
                          document.getElementById(`signed-form-input-${course.class_id}`)?.click()
                        }
                      >
                        {uploadingSignedFormId === course.class_id
                          ? "上傳中..."
                          : course.signed_form_key
                            ? "🔄 重新上傳簽核檔"
                            : "📎 上傳簽核檔"}
                      </button>
                      {course.signed_form_key && (
                        <button
                          className="btn btn-small"
                          onClick={() => handleViewSignedForm(course.class_id)}
                        >
                          📄 查看簽核檔
                        </button>
                      )}
                      <button
                        className="btn btn-small btn--danger"
                        onClick={() => handleDeleteCourse(course.class_id)}
                      >
                        🗑️ 刪除
                      </button>
                    </div>
                  </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 老師管理 */}
        {currentTab === "teachers" && (
          <section className="admin-section">
            <h2 className="section-title">老師管理</h2>
            <div className="teacher-management-card">
              <p>
                教師資料管理目前由獨立系統負責，尚未與本系統整合登入，需要用該系統的帳號另外登入一次。
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.open(TEACHER_MANAGEMENT_URL, "_blank", "noopener,noreferrer")}
              >
                前往教師管理系統 ↗
              </button>
            </div>
          </section>
        )}

        {/* 教室管理 */}
        {currentTab === "classrooms" && (
          <section className="admin-section">
            <ClassroomManagement />
          </section>
        )}

        {error && (
          <div className="error-banner">
            <span>⚠️ 出現錯誤：{error}</span>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminPanel;

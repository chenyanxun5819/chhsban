import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useAuth } from "@/shared/auth/AuthContext";
import { TutionPage } from "@/tution/components/TutionPage";
import { courseYearOptions, filterByYear, filterCourses, useTutionAdminData } from "@/tution/hooks";
import { adminService } from "@/tution/services/adminService";
import { settingsService } from "@/tution/services/settingsService";
import { getSemesterInfo } from "@/tution/utils/semester";
import type { TutionClass } from "@/tution/types";

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

const COURSE_STATUS_LABELS: Record<string, string> = {
  approved: "✅ 已批准",
  active: "🚀 進行中",
  ended: "🏁 已結束",
};

function sortCourses(courses: TutionClass[], sortKey: CourseSortKey): TutionClass[] {
  if (sortKey === "default") return courses;
  const sorted = [...courses];
  sorted.sort((a, b) => {
    switch (sortKey) {
      case "application_no":
        return (a.application_no || "").localeCompare(b.application_no || "", undefined, { numeric: true });
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

// 課程需要繳交的收據學期：開課日期已落在下學年（6/1 以後）的課程，從未經歷過上學年，不需要上學年收據。
function getApplicableReceiptHalves(course: TutionClass): ("h1" | "h2")[] {
  return (["h1", "h2"] as const).filter((half) => half !== "h1" || getSemesterInfo(course.start_date).half === "h1");
}

function hasMissingReceipt(course: TutionClass): boolean {
  return getApplicableReceiptHalves(course).some((half) => !(half === "h1" ? course.receipt_h1 : course.receipt_h2));
}

function exportCoursesToXLSX(courses: TutionClass[]): void {
  const headers = ["編號", "申請人", "科目", "年級", "上課日", "教室"];
  const rows = courses.map((c) => [c.application_no || "", c.teacher_name_cn, c.subject, c.form, c.day_of_week, c.venue || ""]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "已開課課程");
  XLSX.writeFile(workbook, `courses-${Date.now()}.xlsx`);
}

/** 用 blob 在新分頁開啟檔案（先開空白分頁，避免瀏覽器把非同步觸發的 window.open 當成彈窗封鎖） */
async function openBlobInNewTab(load: () => Promise<Blob>): Promise<void> {
  const viewWindow = window.open("", "_blank");
  try {
    const url = window.URL.createObjectURL(await load());
    if (viewWindow) {
      viewWindow.location.href = url;
    } else {
      window.open(url, "_blank");
    }
  } catch (err) {
    viewWindow?.close();
    alert(`❌ ${err instanceof Error ? err.message : "下載失敗"}`);
    console.error("Open file error:", err);
  }
}

/**
 * 已開課管理（原 tution-portal /admin/courses）。
 * 督察員（admin）只能查看：審核收據、上傳簽核檔、刪除、設定最後上課日期只給 super_admin。
 * 「學生總覽／排課狀態／出席狀況」兩種身分都只能看，資料由老師在 tution-portal 維護。
 */
const Courses: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.permission === "super_admin";
  const { allClasses, classesLoading, lastTeachingDate, setLastTeachingDate, error, fetchAllClasses } = useTutionAdminData();

  const [savingLastTeachingDate, setSavingLastTeachingDate] = useState(false);
  const [uploadingSignedFormId, setUploadingSignedFormId] = useState<string | null>(null);
  const [reviewingReceiptKey, setReviewingReceiptKey] = useState<string | null>(null);
  const [courseSortKey, setCourseSortKey] = useState<CourseSortKey>("day_of_week");
  const [courseFilterTeacher, setCourseFilterTeacher] = useState<string>("");
  const [courseFilterMissingReceipt, setCourseFilterMissingReceipt] = useState(false);
  // 預設只顯示今年，往年課程保留在資料裡但不預設顯示
  const [courseFilterYear, setCourseFilterYear] = useState<string>(String(new Date().getFullYear()));

  const courses = filterCourses(allClasses);
  const yearFilteredCourses = filterByYear(courses, courseFilterYear);
  const courseTeacherOptions = Array.from(new Set(yearFilteredCourses.map((c) => c.teacher_name_cn))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant"),
  );
  const sortedCourses = sortCourses(
    yearFilteredCourses
      .filter((c) => !courseFilterTeacher || c.teacher_name_cn === courseFilterTeacher)
      .filter((c) => !courseFilterMissingReceipt || hasMissingReceipt(c)),
    courseSortKey,
  );

  // 儲存全域「最後上課日期」：申請人沒自行設定 end_date 的課程，以此為預設終止日
  const handleSaveLastTeachingDate = async () => {
    if (!lastTeachingDate) {
      alert("請先選擇日期");
      return;
    }
    setSavingLastTeachingDate(true);
    try {
      await settingsService.setLastTeachingDate(lastTeachingDate);
      alert("✅ 已更新最後上課日期");
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "更新失敗"}`);
      console.error("Set last teaching date error:", err);
    } finally {
      setSavingLastTeachingDate(false);
    }
  };

  const handleDeleteCourse = async (classId: string) => {
    if (!window.confirm("確定要刪除此課程嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) return;
    try {
      await adminService.deleteApplication(classId);
      await fetchAllClasses();
      alert("✅ 課程已刪除");
    } catch (err) {
      alert(`❌ ${err instanceof Error ? err.message : "刪除失敗"}`);
      console.error("Delete course error:", err);
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
      alert(`❌ ${err instanceof Error ? err.message : "上傳失敗"}`);
      console.error("Upload signed form error:", err);
    } finally {
      setUploadingSignedFormId(null);
    }
  };

  // 審核收據「正確／不正確」：正確即通過並記錄收據編號，不正確則退回、要求重新上傳
  const handleReviewReceipt = async (classId: string, half: "h1" | "h2", decision: "approved" | "rejected") => {
    let rejectionReason: string | undefined;
    if (decision === "rejected") {
      rejectionReason = window.prompt("請輸入退回原因（選填）：") || "";
      if (!window.confirm("確定要將此收據標記為「不正確」並退回嗎？申請人需重新上傳。")) return;
    } else if (!window.confirm("確認此收據正確無誤嗎？")) {
      return;
    }

    setReviewingReceiptKey(`${classId}-${half}`);
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

  const openClassPage = (classId: string, page: "roster" | "schedule" | "attendance") =>
    navigate(`/tution/courses/${classId}/${page}`);

  return (
    <TutionPage title="已開課管理" error={error}>
      {classesLoading ? (
        <div className="loading-text">載入中...</div>
      ) : courses.length === 0 ? (
        <div className="empty-state">暫無已開課的課程</div>
      ) : (
        <>
          <div className="course-list-toolbar">
            <label className="course-list-toolbar__sort">
              <span>年份：</span>
              <select value={courseFilterYear} onChange={(e) => setCourseFilterYear(e.target.value)}>
                {courseYearOptions(courses).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
                <option value="all">全部年份</option>
              </select>
            </label>
            <label className="course-list-toolbar__sort">
              <span>排序：</span>
              <select value={courseSortKey} onChange={(e) => setCourseSortKey(e.target.value as CourseSortKey)}>
                {(Object.keys(COURSE_SORT_LABELS) as CourseSortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {COURSE_SORT_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="course-list-toolbar__sort">
              <span>申請人：</span>
              <select value={courseFilterTeacher} onChange={(e) => setCourseFilterTeacher(e.target.value)}>
                <option value="">全部申請人</option>
                {courseTeacherOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="course-list-toolbar__checkbox">
              <input
                type="checkbox"
                checked={courseFilterMissingReceipt}
                onChange={(e) => setCourseFilterMissingReceipt(e.target.checked)}
              />
              <span>只顯示未上傳收據</span>
            </label>
            {canEdit ? (
              <>
                <label className="course-list-toolbar__sort">
                  <span>最後上課日期：</span>
                  <input
                    type="date"
                    value={lastTeachingDate}
                    onChange={(e) => setLastTeachingDate(e.target.value)}
                    disabled={savingLastTeachingDate}
                  />
                </label>
                <button type="button" className="btn btn-small" onClick={handleSaveLastTeachingDate} disabled={savingLastTeachingDate}>
                  {savingLastTeachingDate ? "儲存中..." : "儲存"}
                </button>
              </>
            ) : (
              <span className="course-list-toolbar__sort">最後上課日期：{lastTeachingDate || "未設定"}</span>
            )}
            <button type="button" className="btn btn-small" onClick={() => exportCoursesToXLSX(sortedCourses)}>
              📥 匯出 Excel
            </button>
          </div>
          {sortedCourses.length === 0 && <div className="empty-state">此篩選條件下暫無課程</div>}
          <div className="course-list">
            {sortedCourses.map((course) => (
              <div key={course.class_id} className="course-row">
                <div className="course-row__main">
                  <span className="course-row__no">{course.application_no || "-"}</span>
                  <span className="course-row__title course-row__title--chip">
                    {course.subject}（{course.form}）
                  </span>
                  <span className="course-row__badge">{COURSE_STATUS_LABELS[course.approval_status] || course.approval_status}</span>
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
                  {getApplicableReceiptHalves(course).map((half) => {
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
                              {record.status === "pending" ? "⏳ 審核中" : record.status === "approved" ? "✅ 已通過" : "❌ 已退回"}
                            </span>
                            <button
                              className="btn btn-small"
                              onClick={() => openBlobInNewTab(() => adminService.downloadReceipt(course.class_id, half))}
                            >
                              📄 查看
                            </button>
                            {canEdit && record.status === "pending" && (
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
                              <span className="receipt-status-row__reason">原因：{record.rejection_reason}</span>
                            )}
                            {(record.received_from || record.description) && (
                              <div className="receipt-status-row__ocr-detail">
                                {record.received_from && <span>繳費人：{record.received_from}</span>}
                                {record.description && <span>項目：{record.description}</span>}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="course-row__actions">
                  <button className="btn btn-small" onClick={() => openClassPage(course.class_id, "roster")}>
                    👥 學生總覽
                  </button>
                  <button className="btn btn-small" onClick={() => openClassPage(course.class_id, "schedule")}>
                    📅 排課狀態
                  </button>
                  <button className="btn btn-small" onClick={() => openClassPage(course.class_id, "attendance")}>
                    ✓ 出席狀況
                  </button>
                  {canEdit && (
                    <>
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
                        onClick={() => document.getElementById(`signed-form-input-${course.class_id}`)?.click()}
                      >
                        {uploadingSignedFormId === course.class_id
                          ? "上傳中..."
                          : course.signed_form_key
                            ? "🔄 重新上傳簽核檔"
                            : "📎 上傳簽核檔"}
                      </button>
                    </>
                  )}
                  {course.signed_form_key && (
                    <button
                      className="btn btn-small"
                      onClick={() => openBlobInNewTab(() => adminService.downloadSignedForm(course.class_id))}
                    >
                      📄 查看簽核檔
                    </button>
                  )}
                  {canEdit && (
                    <button className="btn btn-small btn--danger" onClick={() => handleDeleteCourse(course.class_id)}>
                      🗑️ 刪除
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </TutionPage>
  );
};

export default Courses;

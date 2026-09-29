import React, { useState } from "react";
import { ApprovalList } from "@/tution/components/admin/ApprovalList";
import { RejectModal } from "@/tution/components/admin/RejectModal";
import { TutionPage } from "@/tution/components/TutionPage";
import { useTutionAdminData } from "@/tution/hooks";
import { adminService } from "@/tution/services/adminService";
import type { TutionClass } from "@/tution/types";

/** 審批管理（原 tution-portal /admin/approvals） */
const Approvals: React.FC = () => {
  const { allClasses, classesLoading, classrooms, error, setError, fetchAllClasses } = useTutionAdminData();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedApp, setSelectedApp] = useState<TutionClass | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const applications = allClasses.filter(
    (item) => item.approval_status === "pending" || item.approval_status === "reviewing",
  );
  const pendingCount = applications.filter((a) => a.approval_status === "pending").length;

  // 「上課日期＋教室」已被占用的組合（reviewing／approved／active 才算占用，ended 視為已釋出）
  const occupiedVenueDays = new Set(
    allClasses
      .filter((item) => ["reviewing", "approved", "active"].includes(item.approval_status) && item.venue)
      .map((item) => `${item.day_of_week}|${item.venue}`),
  );

  const handleApprove = async (classId: string) => {
    if (!window.confirm("確定要批准此申請嗎？")) return;
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

  const handleDelete = async (classId: string) => {
    if (!window.confirm("確定要刪除此申請嗎？此操作會一併清除 Cloudflare 中的資料，無法復原。")) return;
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

  const handleRejectClick = (classId: string) => {
    setSelectedApp(applications.find((a) => a.class_id === classId) || null);
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setSelectedApp(null);
  };

  const handleRejectSubmit = async (reason: string) => {
    if (!selectedApp) return;
    try {
      setRejectingId(selectedApp.class_id);
      await adminService.rejectApplication(selectedApp.class_id, reason);
      await fetchAllClasses();
      closeRejectModal();
      alert("✅ 申請已拒絕");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "拒絕失敗";
      console.error("Reject error:", err);
      throw new Error(errMsg);
    } finally {
      setRejectingId(null);
    }
  };

  return (
    <TutionPage
      title="審批管理"
      heading={
        <>
          審批管理 {pendingCount > 0 && <span className="badge badge--danger">{pendingCount}</span>}
        </>
      }
      error={error}
    >
      <ApprovalList
        applications={applications}
        classrooms={classrooms}
        occupiedVenueDays={occupiedVenueDays}
        onApprove={handleApprove}
        onReject={handleRejectClick}
        onAssignVenue={handleAssignVenue}
        onDelete={handleDelete}
        loading={classesLoading}
        empty={!classesLoading && applications.length === 0}
      />
      <RejectModal
        isOpen={rejectModalOpen}
        classId={selectedApp?.class_id || ""}
        className={selectedApp ? `${selectedApp.teacher_name_cn} - ${selectedApp.subject}` : ""}
        onConfirm={handleRejectSubmit}
        onCancel={closeRejectModal}
        loading={rejectingId !== null}
      />
    </TutionPage>
  );
};

export default Approvals;

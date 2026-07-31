import React, { useMemo, useState } from "react";
import type { TutionClass } from "@/types/index";
import "./admin.css";

interface ApprovalListProps {
  applications: TutionClass[];
  onApprove: (classId: string) => Promise<void>;
  onReject: (classId: string) => void;
  onAssignVenue: (classId: string, venue: string) => Promise<void>;
  onDelete: (classId: string) => void;
  loading?: boolean;
  empty?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "⏳ 待審批",
  reviewing: "🔍 審核中",
  approved: "✅ 已批准",
  rejected: "❌ 已拒絕",
  active: "🚀 進行中",
  ended: "🏁 已結束",
};

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface ApprovalRowProps {
  application: TutionClass;
  onApprove: (classId: string) => Promise<void>;
  onReject: (classId: string) => void;
  onAssignVenue: (classId: string, venue: string) => Promise<void>;
  onDelete: (classId: string) => void;
}

const ApprovalRow: React.FC<ApprovalRowProps> = ({
  application,
  onApprove,
  onReject,
  onAssignVenue,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [venueInput, setVenueInput] = useState(application.venue || "");
  const [assigning, setAssigning] = useState(false);
  const [approving, setApproving] = useState(false);

  const canDecide = application.approval_status === "pending" || application.approval_status === "reviewing";

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(application.class_id);
    } finally {
      setApproving(false);
    }
  };

  const handleAssignVenue = async () => {
    if (!venueInput.trim()) {
      alert("請輸入上課地點");
      return;
    }
    setAssigning(true);
    try {
      await onAssignVenue(application.class_id, venueInput.trim());
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="approval-row">
      <button
        type="button"
        className="approval-row__header"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="approval-row__teacher">{application.teacher_name_cn}</span>
        <span className="approval-row__subject">
          {application.subject}（{application.form}）
        </span>
        <span className="approval-row__badge">
          {STATUS_LABELS[application.approval_status] || application.approval_status}
        </span>
        <span className="approval-row__date">{formatDate(application.created_at)}</span>
        <span className="approval-row__chevron">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="approval-row__detail">
          <div className="application-detail-grid">
            <div className="detail-field">
              <span className="detail-label">申請編號</span>
              <span className="detail-value">
                {application.application_no || application.class_id}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">教師 ID</span>
              <span className="detail-value">{application.teacher_id}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">上課時間</span>
              <span className="detail-value">
                {application.day_of_week} {application.time_start}-{application.time_end}
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">開課日期</span>
              <span className="detail-value">{application.start_date}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">地點</span>
              <span className="detail-value">{application.venue || "-"}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">學費</span>
              <span className="detail-value">RM {application.fees}</span>
            </div>
            <div className="detail-field">
              <span className="detail-label">名單人數</span>
              <span className="detail-value">
                {application.initial_roster?.length || 0} 人
              </span>
            </div>
            <div className="detail-field">
              <span className="detail-label">建立時間</span>
              <span className="detail-value">{formatDate(application.created_at)}</span>
            </div>
            {application.rejection_reason && (
              <div className="detail-field detail-field--full">
                <span className="detail-label">拒絕原因</span>
                <span className="detail-value">{application.rejection_reason}</span>
              </div>
            )}
          </div>

          {application.approval_status === "pending" && (
            <div className="venue-assign">
              <span className="detail-label">指定上課地點</span>
              <div className="venue-assign__row">
                <input
                  type="text"
                  className="venue-assign__input"
                  value={venueInput}
                  onChange={(e) => setVenueInput(e.target.value)}
                  placeholder="輸入教室 / 地點"
                  disabled={assigning}
                />
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={handleAssignVenue}
                  disabled={assigning}
                >
                  {assigning ? "處理中..." : "指定地點"}
                </button>
              </div>
              <p className="venue-assign__hint">
                指定後申請狀態將轉為「審核中」，申請人將無法再編輯此申請。
              </p>
            </div>
          )}

          <div className="application-detail-actions">
            <button
              type="button"
              className="btn btn--secondary btn--small"
              onClick={() => window.open(`/applications/${application.class_id}`, "_blank")}
            >
              開啟完整頁面
            </button>
            {canDecide && (
              <>
                <button
                  type="button"
                  className="btn btn--danger btn--small"
                  onClick={() => onReject(application.class_id)}
                  disabled={approving}
                >
                  拒絕
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? "批准中..." : "批准"}
                </button>
              </>
            )}
            <button
              type="button"
              className="btn btn--danger btn--small"
              onClick={() => onDelete(application.class_id)}
            >
              🗑️ 刪除申請
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const ApprovalList: React.FC<ApprovalListProps> = ({
  applications,
  onApprove,
  onReject,
  onAssignVenue,
  onDelete,
  loading = false,
  empty = false,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  // 獲取所有科目列表用於篩選
  const subjects = useMemo(() => {
    const unique = new Set(applications.map((app) => app.subject));
    return Array.from(unique).sort();
  }, [applications]);

  // 篩選和搜尋應用
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesSearch =
        searchTerm === "" ||
        app.teacher_name_cn.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.class_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.application_no || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSubject = filterSubject === "" || app.subject === filterSubject;

      return matchesSearch && matchesSubject;
    });
  }, [applications, searchTerm, filterSubject]);

  if (empty) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <p className="empty-title">暫無待審申請</p>
        <p className="empty-description">所有申請都已處理完成</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>載入申請中...</p>
      </div>
    );
  }

  return (
    <div className="approval-list">
      {/* 搜尋和篩選區 */}
      <div className="list-filters">
        <div className="search-box">
          <input
            type="text"
            className="search-input"
            placeholder="搜尋教師名稱或申請代碼..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-box">
          <select
            className="filter-select"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="">所有科目</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        {(searchTerm || filterSubject) && (
          <button
            className="btn btn--secondary btn--small"
            onClick={() => {
              setSearchTerm("");
              setFilterSubject("");
            }}
          >
            清除篩選
          </button>
        )}
      </div>

      {/* 結果計數 */}
      <div className="list-count">
        顯示 <strong>{filteredApplications.length}</strong> / <strong>{applications.length}</strong> 項申請
      </div>

      {/* 申請清單（手風琴） */}
      {filteredApplications.length > 0 ? (
        <div className="approval-accordion">
          {filteredApplications.map((application) => (
            <ApprovalRow
              key={application.class_id}
              application={application}
              onApprove={onApprove}
              onReject={onReject}
              onAssignVenue={onAssignVenue}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">未找到符合條件的申請</p>
          <p className="empty-description">嘗試調整搜尋條件或篩選條件</p>
        </div>
      )}
    </div>
  );
};

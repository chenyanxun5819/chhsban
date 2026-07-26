import React from "react";
import type { TutionClass } from "@/types/index";

interface ApprovalCardProps {
  application: TutionClass;
  onApprove: (classId: string) => Promise<void>;
  onReject: (classId: string) => void;
  onViewDetail: (classId: string) => void;
  loading?: boolean;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  application,
  onApprove,
  onReject,
  onViewDetail,
  loading = false,
}) => {
  const [approving, setApproving] = React.useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await onApprove(application.class_id);
    } finally {
      setApproving(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getFormLabel = (form: string) => {
    const formLabels: Record<string, string> = {
      F1: "中一",
      F2: "中二",
      F3: "中三",
      F4: "中四",
      F5: "中五",
      F6: "中六",
    };
    return formLabels[form] || form;
  };

  return (
    <div className="approval-card">
      {/* 卡片頭部 - 基本信息 */}
      <div className="card-header">
        <div className="card-title-section">
          <h4 className="card-title">{application.teacher_name_cn}</h4>
          <span className="card-subject">{application.subject}</span>
        </div>
        <div className="card-date">
          申請於 {formatDate(application.created_at)}
        </div>
      </div>

      {/* 卡片內容 - 詳細信息 */}
      <div className="card-content">
        <div className="info-grid">
          {/* 班級信息 */}
          <div className="info-item">
            <span className="info-label">班級：</span>
            <span className="info-value">{getFormLabel(application.form)}</span>
          </div>

          {/* 時間信息 */}
          <div className="info-item">
            <span className="info-label">上課時間：</span>
            <span className="info-value">
              {application.day_of_week} {application.time_start} - {application.time_end}
            </span>
          </div>

          {/* 地點 */}
          <div className="info-item">
            <span className="info-label">地點：</span>
            <span className="info-value">{application.venue}</span>
          </div>

          {/* 收費 */}
          <div className="info-item">
            <span className="info-label">收費：</span>
            <span className="info-value">${application.fees.toLocaleString()}</span>
          </div>

          {/* 開課日期 */}
          <div className="info-item info-item--full">
            <span className="info-label">開課日期：</span>
            <span className="info-value">{application.start_date}</span>
          </div>

          {/* 申請代碼 */}
          <div className="info-item info-item--full">
            <span className="info-label">申請代碼：</span>
            <span className="info-value code">{application.class_id}</span>
          </div>
        </div>
      </div>

      {/* 卡片操作 */}
      <div className="card-actions">
        <button
          className="btn btn--secondary btn--small"
          onClick={() => onViewDetail(application.class_id)}
          disabled={approving || loading}
        >
          查看詳情
        </button>
        <button
          className="btn btn--danger btn--small"
          onClick={() => onReject(application.class_id)}
          disabled={approving || loading}
        >
          拒絕
        </button>
        <button
          className="btn btn--primary btn--small"
          onClick={handleApprove}
          disabled={approving || loading}
        >
          {approving ? "批准中..." : "批准"}
        </button>
      </div>
    </div>
  );
};

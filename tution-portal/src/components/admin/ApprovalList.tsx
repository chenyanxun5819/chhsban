import React, { useState, useMemo } from "react";
import type { TutionClass } from "@/types/index";
import { ApprovalCard } from "./ApprovalCard";

interface ApprovalListProps {
  applications: TutionClass[];
  onApprove: (classId: string) => Promise<void>;
  onReject: (classId: string) => void;
  onViewDetail: (classId: string) => void;
  loading?: boolean;
  empty?: boolean;
}

export const ApprovalList: React.FC<ApprovalListProps> = ({
  applications,
  onApprove,
  onReject,
  onViewDetail,
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
        app.class_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSubject =
        filterSubject === "" || app.subject === filterSubject;

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

      {/* 申請卡片列表 */}
      <div className="cards-grid">
        {filteredApplications.length > 0 ? (
          filteredApplications.map((application) => (
            <ApprovalCard
              key={application.class_id}
              application={application}
              onApprove={onApprove}
              onReject={onReject}
              onViewDetail={onViewDetail}
              loading={loading}
            />
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <p className="empty-title">未找到符合條件的申請</p>
            <p className="empty-description">
              嘗試調整搜尋條件或篩選條件
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

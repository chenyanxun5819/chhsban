import React from "react";
import { useTranslation } from "react-i18next";
import { ClassRosterEntry } from "@/types";
import { MAX_STUDENTS_PER_CLASS } from "@/utils/validators";
import RosterRow from "./RosterRow";

interface RosterTableProps {
  roster: ClassRosterEntry[];
  onAddStudent: (studentId: string) => Promise<void>;
  onWithdraw: (student: ClassRosterEntry) => Promise<void>;
  onExport: () => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
  /** 管理員（super_admin）只能檢視名單，不能新增／退出學生。 */
  readOnly?: boolean;
}

type FilterStatus = "all" | "active" | "withdrawn";

const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onAddStudent,
  onWithdraw,
  onExport,
  onRefresh,
  loading = false,
  readOnly = false,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("active");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [newStudentId, setNewStudentId] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  const ITEMS_PER_PAGE = 10;

  const filtered = React.useMemo(() => {
    let result = roster;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name_cn.toLowerCase().includes(term) ||
          s.name_en.toLowerCase().includes(term) ||
          s.student_no.includes(term)
      );
    }

    if (filterStatus === "active") {
      result = result.filter((s) => s.is_active);
    } else if (filterStatus === "withdrawn") {
      result = result.filter((s) => !s.is_active);
    }

    return result;
  }, [roster, searchTerm, filterStatus]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const activeCount = roster.filter((s) => s.is_active).length;
  const withdrawnCount = roster.filter((s) => !s.is_active).length;
  const atCapacity = activeCount >= MAX_STUDENTS_PER_CLASS;

  const handleAddStudent = async () => {
    if (!newStudentId.trim() || atCapacity) return;
    setAdding(true);
    try {
      await onAddStudent(newStudentId.trim());
      setNewStudentId("");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="roster-table">
      {/* 新增學生 */}
      <div className="table-toolbar">
        {!readOnly && (
          <div className="toolbar-left add-student-row">
            <input
              type="text"
              value={newStudentId}
              onChange={(e) => setNewStudentId(e.target.value)}
              placeholder={
                atCapacity
                  ? t("roster.maxCapacityReached", { max: MAX_STUDENTS_PER_CLASS })
                  : t("roster.addStudentPlaceholder")
              }
              disabled={loading || adding || atCapacity}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleAddStudent();
              }}
            />
            <button
              className="btn btn-primary"
              onClick={handleAddStudent}
              disabled={loading || adding || atCapacity}
            >
              {adding ? t("roster.adding") : t("roster.addStudent")}
            </button>
          </div>
        )}

        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={onExport} disabled={loading || roster.length === 0}>
            {t("roster.exportExcel")}
          </button>
          <button className="btn btn-outline-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? t("roster.reloading") : t("roster.reload")}
          </button>
        </div>
      </div>

      {!readOnly && atCapacity && (
        <p className="capacity-warning">
          {t("roster.maxCapacityReached", { max: MAX_STUDENTS_PER_CLASS })}
        </p>
      )}

      {/* 搜尋欄 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={t("roster.searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          disabled={loading}
        />
        {searchTerm && (
          <button className="clear-btn" onClick={() => setSearchTerm("")} disabled={loading}>
            ✕
          </button>
        )}
      </div>

      {/* 篩選標籤 */}
      <div className="filter-tags">
        <button
          className={`filter-tag ${filterStatus === "active" ? "active" : ""}`}
          onClick={() => setFilterStatus("active")}
          disabled={loading}
        >
          {t("roster.filterActive", { count: activeCount })}
        </button>
        <button
          className={`filter-tag ${filterStatus === "withdrawn" ? "active" : ""}`}
          onClick={() => setFilterStatus("withdrawn")}
          disabled={loading}
        >
          {t("roster.filterWithdrawn", { count: withdrawnCount })}
        </button>
        <button
          className={`filter-tag ${filterStatus === "all" ? "active" : ""}`}
          onClick={() => setFilterStatus("all")}
          disabled={loading}
        >
          {t("roster.filterAll", { count: roster.length })}
        </button>
      </div>

      {/* 學生列表 */}
      <div className="roster-container">
        {paginatedData.length > 0 ? (
          <div className="roster-list">
            {paginatedData.map((student) => (
              <RosterRow
                key={student.roster_id}
                student={student}
                onWithdraw={onWithdraw}
                loading={loading}
                readOnly={readOnly}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{roster.length === 0 ? t("roster.emptyNone") : t("roster.emptyFiltered")}</p>
          </div>
        )}
      </div>

      {/* 分頁控制 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            {t("roster.prevPage")}
          </button>
          <span className="page-info">
            {t("roster.pageInfo", { current: currentPage, total: totalPages })}
          </span>
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
          >
            {t("roster.nextPage")}
          </button>
        </div>
      )}

      <div className="table-footer">
        <p>
          {t("roster.totalRecords", { count: filtered.length })}
          {searchTerm && t("roster.searchResultSuffix")}
        </p>
      </div>
    </div>
  );
};

export default RosterTable;

import React from "react";
import { TutionRoster } from "@/types";
import RosterRow from "./RosterRow";

interface RosterTableProps {
  roster: TutionRoster[];
  classId?: string;
  onAdd: () => void;
  onImport: () => void;
  onExport: () => void;
  onEdit: (student: TutionRoster) => void;
  onRemove: (studentId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

type FilterStatus = "all" | "active" | "initial" | "dropped";

const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onAdd,
  onImport,
  onExport,
  onEdit,
  onRemove,
  onRefresh,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  const ITEMS_PER_PAGE = 10;

  // 篩選邏輯
  const filtered = React.useMemo(() => {
    let result = roster;

    // 搜尋 (姓名或學號)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.name_cn.toLowerCase().includes(term) ||
          s.name_en.toLowerCase().includes(term) ||
          s.student_no.includes(term)
      );
    }

    // 篩選狀態
    if (filterStatus !== "all") {
      result = result.filter((s) => s.status === filterStatus);
    }

    return result;
  }, [roster, searchTerm, filterStatus]);

  // 分頁邏輯
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  React.useEffect(() => {
    setCurrentPage(1); // 搜尋或篩選時重置頁碼
  }, [searchTerm, filterStatus]);

  const handleClearSearch = () => {
    setSearchTerm("");
  };

  return (
    <div className="roster-table">
      {/* 工具欄 */}
      <div className="table-toolbar">
        <div className="toolbar-left">
          <button
            className="btn btn-primary"
            onClick={onAdd}
            disabled={loading}
            aria-label="Add new student"
          >
            + 新增學生
          </button>
          <button
            className="btn btn-secondary"
            onClick={onImport}
            disabled={loading}
            aria-label="Import from CSV"
          >
            📤 匯入
          </button>
          <button
            className="btn btn-secondary"
            onClick={onExport}
            disabled={loading || roster.length === 0}
            aria-label="Export to CSV"
          >
            📥 匯出
          </button>
        </div>

        <div className="toolbar-right">
          <button
            className="btn btn-outline-secondary"
            onClick={onRefresh}
            disabled={loading}
            aria-label="Refresh"
          >
            {loading ? "重新加載中..." : "🔄 重新加載"}
          </button>
        </div>
      </div>

      {/* 搜尋欄 */}
      <div className="search-bar">
        <input
          type="text"
          placeholder="搜尋學生 (姓名或學號)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          disabled={loading}
        />
        {searchTerm && (
          <button
            className="clear-btn"
            onClick={handleClearSearch}
            disabled={loading}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* 篩選標籤 */}
      <div className="filter-tags">
        {(["all", "active", "initial", "dropped"] as FilterStatus[]).map(
          (status) => (
            <button
              key={status}
              className={`filter-tag ${filterStatus === status ? "active" : ""}`}
              onClick={() => setFilterStatus(status)}
              disabled={loading}
            >
              {status === "all" && `全部 (${roster.length})`}
              {status === "active" &&
                `活躍 (${roster.filter((s) => s.status === "active").length})`}
              {status === "initial" &&
                `新增 (${roster.filter((s) => s.status === "initial").length})`}
              {status === "dropped" &&
                `已移除 (${roster.filter((s) => s.status === "dropped").length})`}
            </button>
          )
        )}
      </div>

      {/* 學生列表 */}
      <div className="roster-container">
        {paginatedData.length > 0 ? (
          <div className="roster-list">
            {paginatedData.map((student) => (
              <RosterRow
                key={student.roster_id}
                student={student}
                onEdit={onEdit}
                onRemove={onRemove}
                loading={loading}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>
              {roster.length === 0
                ? "尚無學生名單"
                : "沒有符合條件的學生"}
            </p>
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
            ← 上一頁
          </button>

          <span className="page-info">
            第 {currentPage} / {totalPages} 頁
          </span>

          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || loading}
          >
            下一頁 →
          </button>
        </div>
      )}

      {/* 統計信息 */}
      <div className="table-footer">
        <p>
          共 <strong>{filtered.length}</strong> 筆記錄
          {searchTerm && ` (搜尋結果)`}
        </p>
      </div>
    </div>
  );
};

export default RosterTable;

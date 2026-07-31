import React from "react";
import { ClassRosterEntry } from "@/types";
import RosterRow from "./RosterRow";

interface RosterTableProps {
  roster: ClassRosterEntry[];
  onAddStudent: (studentId: string) => Promise<void>;
  onWithdraw: (student: ClassRosterEntry) => Promise<void>;
  onExport: () => void;
  onRefresh: () => Promise<void>;
  loading?: boolean;
}

type FilterStatus = "all" | "active" | "withdrawn";

const RosterTable: React.FC<RosterTableProps> = ({
  roster,
  onAddStudent,
  onWithdraw,
  onExport,
  onRefresh,
  loading = false,
}) => {
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

  const handleAddStudent = async () => {
    if (!newStudentId.trim()) return;
    setAdding(true);
    try {
      await onAddStudent(newStudentId.trim());
      setNewStudentId("");
    } finally {
      setAdding(false);
    }
  };

  const activeCount = roster.filter((s) => s.is_active).length;
  const withdrawnCount = roster.filter((s) => !s.is_active).length;

  return (
    <div className="roster-table">
      {/* 新增學生 */}
      <div className="table-toolbar">
        <div className="toolbar-left add-student-row">
          <input
            type="text"
            value={newStudentId}
            onChange={(e) => setNewStudentId(e.target.value)}
            placeholder="輸入學生 ID 新增"
            disabled={loading || adding}
            onKeyPress={(e) => {
              if (e.key === "Enter") handleAddStudent();
            }}
          />
          <button className="btn btn-primary" onClick={handleAddStudent} disabled={loading || adding}>
            {adding ? "新增中..." : "+ 新增學生"}
          </button>
        </div>

        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={onExport} disabled={loading || roster.length === 0}>
            📥 匯出
          </button>
          <button className="btn btn-outline-secondary" onClick={onRefresh} disabled={loading}>
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
          在讀 ({activeCount})
        </button>
        <button
          className={`filter-tag ${filterStatus === "withdrawn" ? "active" : ""}`}
          onClick={() => setFilterStatus("withdrawn")}
          disabled={loading}
        >
          已退出 ({withdrawnCount})
        </button>
        <button
          className={`filter-tag ${filterStatus === "all" ? "active" : ""}`}
          onClick={() => setFilterStatus("all")}
          disabled={loading}
        >
          全部 ({roster.length})
        </button>
      </div>

      {/* 學生列表 */}
      <div className="roster-container">
        {paginatedData.length > 0 ? (
          <div className="roster-list">
            {paginatedData.map((student) => (
              <RosterRow key={student.roster_id} student={student} onWithdraw={onWithdraw} loading={loading} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{roster.length === 0 ? "尚無學生名單" : "沒有符合條件的學生"}</p>
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

      <div className="table-footer">
        <p>
          共 <strong>{filtered.length}</strong> 筆記錄{searchTerm && ` (搜尋結果)`}
        </p>
      </div>
    </div>
  );
};

export default RosterTable;

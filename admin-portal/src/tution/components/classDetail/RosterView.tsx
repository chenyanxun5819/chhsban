import React from "react";
import { useTranslation } from "@/tution/i18n";
import type { ClassRosterEntry } from "@/tution/types";
import { formatDisplayDate } from "@/tution/utils/validators";

/**
 * 學生總覽（唯讀）：由 tution-portal 的 RosterStats／RosterTable／RosterRow 搬入，
 * 拿掉新增學生與退出學生（名冊由老師在 tution-portal 自行維護），保留搜尋、篩選、分頁與匯出。
 */

type FilterStatus = "all" | "active" | "withdrawn";

const ITEMS_PER_PAGE = 10;

export const RosterStats: React.FC<{ roster: ClassRosterEntry[] }> = ({ roster }) => {
  const { t } = useTranslation();
  const active = roster.filter((s) => s.is_active);
  const countByCode = (code: string) => active.filter((s) => s.gender_boarding === code).length;

  return (
    <div className="roster-stats-container">
      <div className="roster-stats-row">
        <div className="stat-item">
          <span className="stat-code">{t("roster.active")}</span>
          <span className="stat-amount">{active.length}</span>
        </div>
        <div className="stat-separator"></div>
        <div className="stat-item">
          <span className="stat-code">{t("roster.statWithdrawn")}</span>
          <span className="stat-amount">{roster.length - active.length}</span>
        </div>
      </div>

      <div className="roster-stats-row">
        {["L", "LH", "P", "PH"].map((code, i) => (
          <React.Fragment key={code}>
            {i > 0 && <div className="stat-separator"></div>}
            <div className="stat-item">
              <span className="stat-code">{code}</span>
              <span className="stat-amount">{countByCode(code)}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const RosterRow: React.FC<{ student: ClassRosterEntry }> = ({ student }) => {
  const { t } = useTranslation();
  return (
    <div className={`roster-row ${!student.is_active ? "roster-row--withdrawn" : ""}`}>
      <div className="row-content">
        <div className="student-line-1">
          <span className="student-no">{student.student_no}</span>
          <span className="separator-tab"></span>
          <span className="name-cn">{student.name_cn}</span>
          <span className="separator-tab"></span>
          <span className="name-en">{student.name_en}</span>
        </div>

        <div className="student-line-2">
          <span className="class-name">{student.real_class_name}</span>
          <span className="separator-tab"></span>
          <span className="gender-code">{student.gender_boarding}</span>
          <span className="separator-tab"></span>
          <span className={`status-badge ${student.is_active ? "success" : "danger"}`}>
            {student.is_active ? t("roster.active") : t("roster.statusWithdrawn")}
          </span>
          {student.student_status === "left" && (
            <>
              <span className="separator-tab"></span>
              <span className="status-badge danger">{t("roster.leftSchool")}</span>
            </>
          )}
        </div>

        <div className="student-line-3">
          <span className="date-info">
            {student.is_active
              ? t("roster.enrolledLabel", { date: formatDisplayDate(student.enrollment_date) })
              : t("roster.withdrawnLabel", {
                  date: student.withdrawal_date ? formatDisplayDate(student.withdrawal_date) : "-",
                })}
          </span>
        </div>
      </div>
    </div>
  );
};

export const RosterTable: React.FC<{
  roster: ClassRosterEntry[];
  onExport: () => void;
  onRefresh: () => void;
  loading?: boolean;
}> = ({ roster, onExport, onRefresh, loading = false }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("active");
  const [currentPage, setCurrentPage] = React.useState(1);

  const filtered = React.useMemo(() => {
    let result = roster;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (s) => s.name_cn.toLowerCase().includes(term) || s.name_en.toLowerCase().includes(term) || s.student_no.includes(term),
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
  const paginatedData = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const activeCount = roster.filter((s) => s.is_active).length;
  const filterOptions: [FilterStatus, string][] = [
    ["active", t("roster.filterActive", { count: activeCount })],
    ["withdrawn", t("roster.filterWithdrawn", { count: roster.length - activeCount })],
    ["all", t("roster.filterAll", { count: roster.length })],
  ];

  return (
    <div className="roster-table">
      <div className="table-toolbar">
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={onExport} disabled={loading || roster.length === 0}>
            {t("roster.exportExcel")}
          </button>
          <button className="btn btn-outline-secondary" onClick={onRefresh} disabled={loading}>
            {loading ? t("roster.reloading") : t("roster.reload")}
          </button>
        </div>
      </div>

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

      <div className="filter-tags">
        {filterOptions.map(([status, label]) => (
          <button
            key={status}
            className={`filter-tag ${filterStatus === status ? "active" : ""}`}
            onClick={() => setFilterStatus(status)}
            disabled={loading}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="roster-container">
        {paginatedData.length > 0 ? (
          <div className="roster-list">
            {paginatedData.map((student) => (
              <RosterRow key={student.roster_id} student={student} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>{roster.length === 0 ? t("roster.emptyNone") : t("roster.emptyFiltered")}</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || loading}
          >
            {t("roster.prevPage")}
          </button>
          <span className="page-info">{t("roster.pageInfo", { current: currentPage, total: totalPages })}</span>
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

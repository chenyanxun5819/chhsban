import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { reportService, type CourseReportRow, type CourseReportSummary } from "@/services/reportService";
import { useGradeLabel } from "@/i18n/labels";

function courseLabel(row: CourseReportRow, gradeLabel: (value: string) => string): string {
  return `${row.teacher_id} ${row.teacher_name_cn} - ${gradeLabel(row.form)}${row.subject}`;
}

function formatUpdatedAt(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function exportReportToXLSX(rows: CourseReportRow[], gradeLabel: (value: string) => string): void {
  const headers = [
    "課程",
    "應開課數",
    "實際開課數",
    "停課數",
    "未點名",
    "在讀",
    "退出",
    "出席率(P)",
    "缺席總數",
    "請假總數",
    "遲到總數",
    "結束日期",
  ];
  const data = rows.map((r) => [
    courseLabel(r, gradeLabel),
    r.expected_count,
    r.actual_held_count,
    r.cancelled_count,
    r.unconfirmed_attendance_count,
    r.active_roster_count,
    r.withdrawn_roster_count,
    r.attendance_rate === null ? "-" : `${r.attendance_rate}%`,
    r.absent_count,
    r.excuse_count,
    r.late_count,
    r.end_date || "未設定",
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "各課程開課報表");
  XLSX.writeFile(workbook, `course-report-${Date.now()}.xlsx`);
}

export const CourseReportTable: React.FC = () => {
  const gradeLabel = useGradeLabel();
  const [summary, setSummary] = useState<CourseReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reportService.getCourseSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "載入報表失敗");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedRows = useMemo(() => {
    if (!summary) return [];
    return [...summary.rows].sort((a, b) =>
      courseLabel(a, gradeLabel).localeCompare(courseLabel(b, gradeLabel), "zh-Hant")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  if (loading) {
    return <div className="loading-text">載入中...</div>;
  }

  if (error) {
    return (
      <div className="error-banner">
        <span>⚠️ 出現錯誤：{error}</span>
      </div>
    );
  }

  if (!summary) {
    return <div className="empty-state">尚未產生報表，請稍候系統於每日凌晨自動計算後再查看</div>;
  }

  return (
    <div className="course-report">
      <div className="course-list-toolbar">
        <span>資料更新時間：{formatUpdatedAt(summary.generated_at)}（每日凌晨自動更新一次）</span>
        <button type="button" className="btn btn-small" onClick={() => exportReportToXLSX(sortedRows, gradeLabel)}>
          📥 匯出 Excel
        </button>
      </div>

      {sortedRows.length === 0 ? (
        <div className="empty-state">暫無已開課的課程</div>
      ) : (
        <div className="course-report__table-container">
          <table className="course-report__table">
            <thead>
              <tr>
                <th>課程</th>
                <th>應開課數</th>
                <th>實際開課數</th>
                <th>停課數</th>
                <th>未點名</th>
                <th>在讀</th>
                <th>退出</th>
                <th>出席率(P)</th>
                <th>缺席總數</th>
                <th>請假總數</th>
                <th>遲到總數</th>
                <th>結束日期</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.class_id}>
                  <td>{courseLabel(row, gradeLabel)}</td>
                  <td>{row.expected_count}</td>
                  <td>{row.actual_held_count}</td>
                  <td>{row.cancelled_count}</td>
                  <td className={row.unconfirmed_attendance_count > 0 ? "course-report__cell--warning" : undefined}>
                    {row.unconfirmed_attendance_count}
                  </td>
                  <td>{row.active_roster_count}</td>
                  <td>{row.withdrawn_roster_count}</td>
                  <td>{row.attendance_rate === null ? "-" : `${row.attendance_rate}%`}</td>
                  <td>{row.absent_count}</td>
                  <td>{row.excuse_count}</td>
                  <td>{row.late_count}</td>
                  <td>{row.end_date || "未設定"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CourseReportTable;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { TutionPage } from "@/tution/components/TutionPage";
import { getCourseReport } from "@/optional/services/reportService";
import type { CourseReportRow, CourseReportSummary } from "@/optional/types";
import { currentYear, selectableYears } from "@/shared/utils/year";

// 選修課「各課程開課報表」：仿補習班的開課報表（tution/components/admin/CourseReportTable.tsx），
// 套用同一套 .tu-scope 樣式。選修課由學校行事曆統一控管上課期間，所以沒有「結束日期」欄。
// 與補習班不同，這裡不讀每日快照：出勤數字在老師儲存點名時已統計好，一次請求即時算出整年
// （見 worker 的 handleCourseReport）。

function courseLabel(row: CourseReportRow): string {
  const teacher = row.teacher_id ? `${row.teacher_id} ${row.teacher_name_cn || ""}` : "未綁定老師";
  return `${teacher} - ${row.subject}`;
}

function formatUpdatedAt(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function exportReportToXLSX(rows: CourseReportRow[], year: number): void {
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
  ];
  const data = rows.map((r) => [
    courseLabel(r),
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
  ]);
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "選修課開課報表");
  XLSX.writeFile(workbook, `optional-course-report-${year}-${Date.now()}.xlsx`);
}

const CourseReport: React.FC = () => {
  const [year, setYear] = useState(currentYear());
  const [summary, setSummary] = useState<CourseReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (targetYear: number, isCancelled: () => boolean = () => false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCourseReport(targetYear);
      if (!isCancelled()) setSummary(data);
    } catch (err: any) {
      if (!isCancelled()) setError(err.response?.data?.error || err.message || "載入報表失敗");
    } finally {
      if (!isCancelled()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    load(year, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [year, load]);

  const rows = summary?.rows ?? [];
  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => courseLabel(a).localeCompare(courseLabel(b), "zh-Hant")),
    [summary],
  );
  const calendarMissing = !!summary && !summary.calendar_ready && rows.length > 0;
  const noWeekday = rows.filter((r) => r.weekly_days.length === 0);

  return (
    <TutionPage title="選修課開課報表" error={error}>
      <div className="course-report">
        <div className="course-list-toolbar">
          <span>
            {loading
              ? "載入中..."
              : summary && `資料更新時間：${formatUpdatedAt(summary.generated_at)}（即時資料）`}
          </span>
          <div className="course-list-toolbar__sort">
            <label>
              年份：
              <select value={year} onChange={(e) => setYear(Number(e.target.value))} disabled={loading}>
                {selectableYears().map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-small" onClick={() => load(year)} disabled={loading}>
              {loading ? "更新中..." : "🔄 立即更新"}
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => exportReportToXLSX(sortedRows, year)}
              disabled={loading || sortedRows.length === 0}
            >
              📥 匯出 Excel
            </button>
          </div>
        </div>

        {!loading && calendarMissing && (
          <div className="empty-state">⚠️ {year} 年的學校行事曆尚未建立，無法推算上課日，開課數與未點名都會是 0。</div>
        )}
        {!loading && noWeekday.length > 0 && (
          <div className="empty-state">
            ⚠️ 有 {noWeekday.length} 門課尚未設定上課星期（{noWeekday.map((r) => r.subject).join("、")}），無法推算上課日。
          </div>
        )}

        {loading ? null : sortedRows.length === 0 ? (
          <div className="empty-state">{year} 年沒有已開放的選修課</div>
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
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.course_id}>
                    <td>{courseLabel(row)}</td>
                    <td>{row.expected_count}</td>
                    <td>{row.actual_held_count}</td>
                    <td>{row.cancelled_count}</td>
                    <td className="course-report__cell--danger">{row.unconfirmed_attendance_count}</td>
                    <td>{row.active_roster_count}</td>
                    <td>{row.withdrawn_roster_count}</td>
                    <td>{row.attendance_rate === null ? "-" : `${row.attendance_rate}%`}</td>
                    <td className="course-report__cell--danger">{row.absent_count}</td>
                    <td>{row.excuse_count}</td>
                    <td>{row.late_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </TutionPage>
  );
};

export default CourseReport;

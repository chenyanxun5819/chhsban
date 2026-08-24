import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/utils/api";
import { getClassRoster } from "@/services/rosterService";
import { scheduleService } from "@/services/scheduleService";
import {
  attendanceQueryService,
  ATTENDANCE_STATUS_META,
  EXCUSE_REASON_OPTIONS,
  type AttendanceQueryRecord,
  type AttendanceStatusCode,
} from "@/services/attendanceQueryService";
import { generateScheduleRows } from "@/utils/scheduleGenerator";
import type { ClassRosterEntry, TutionClass, TutionSchedule } from "@/types";
import "./attendance-sheet.css";

interface DraftEntry {
  status: AttendanceStatusCode;
  /** 僅 status = "excuse" 時有意義：選中的理由選項（"其他" 時要另外看 reasonOther） */
  reasonPreset: string;
  reasonOther: string;
}

function todayStr(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
    .toISOString()
    .slice(0, 10);
}

function formatDateWithWeekday(dateStr: string): string {
  const WEEKDAY_CN = ["日", "一", "二", "三", "四", "五", "六"];
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${dateStr}（${WEEKDAY_CN[date.getUTCDay()]}）`;
}

function emptyDraftEntry(): DraftEntry {
  return { status: "present", reasonPreset: EXCUSE_REASON_OPTIONS[0], reasonOther: "" };
}

/** 學生的加入日期若晚於指定上課日，代表當天該生尚未加入班級，不應被點名。 */
function isEnrolledByDate(student: ClassRosterEntry, dateStr: string): boolean {
  return student.enrollment_date <= dateStr;
}

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** 總覽表格日期表頭用：拆成「月份英文縮寫」+「日」兩段，方便疊成兩行、縮窄欄寬。 */
function formatMonthDayParts(dateStr: string): { month: string; day: string } {
  const [, m, d] = dateStr.split("-");
  return { month: MONTH_ABBR[Number(m) - 1] || m, day: d };
}

/** 總覽表格手機分頁用：每個月份的完整標籤（月份全拼 + 年），例如 "July 2026"。 */
function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${MONTH_FULL[m - 1] || m} ${y}`;
}

/** 排課狀態條列：依 row.status 組成一行文字，例如「2026-07-14 上課」「2026-07-29 調至 2026-07-30」。 */
function formatScheduleStatusLine(row: ReturnType<typeof generateScheduleRows>[number]): string {
  if (row.status === "cancelled") return `${row.scheduled_date} 停課`;
  if (row.status === "rescheduled") return `${row.scheduled_date} 調至 ${row.rescheduled_to}`;
  return `${row.scheduled_date} 上課`;
}

/** 手機斷點與桌機共用（見 attendance-sheet.css 的 @media max-width: 767px）。 */
const MOBILE_BREAKPOINT = 767;

/** 總覽表格在手機模式下，每個月固定佔用的日期欄數下限——通常一個月 4～5 堂課，欄數不足時
 * 補空白欄湊滿；若某月因為加課超過這個數字，照實際堂數顯示，不裁切資料。 */
const MOBILE_MATRIX_MONTH_COLS = 6;

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isMobile;
}

/** 把既有紀錄的 absence_reason 拆回「預設選項 / 其他文字」，供編輯既有點名結果時預填。 */
function decomposeReason(reason?: string): { reasonPreset: string; reasonOther: string } {
  if (reason && EXCUSE_REASON_OPTIONS.includes(reason) && reason !== "其他") {
    return { reasonPreset: reason, reasonOther: "" };
  }
  return { reasonPreset: "其他", reasonOther: reason || "" };
}

function composeReason(entry: DraftEntry): string {
  return entry.reasonPreset === "其他" ? entry.reasonOther.trim() : entry.reasonPreset;
}

export const AttendanceSheet: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const readOnly = user?.permission === "super_admin";

  const [classInfo, setClassInfo] = useState<TutionClass | null>(null);
  const [roster, setRoster] = useState<ClassRosterEntry[]>([]);
  const [exceptions, setExceptions] = useState<TutionSchedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [draft, setDraft] = useState<Map<string, DraftEntry>>(new Map());
  const [showOverview, setShowOverview] = useState(false);

  const loadStaticData = useCallback(async () => {
    if (!classId) {
      setError("課程 ID 未找到");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [classRes, rosterList, scheduleList, attendanceList] = await Promise.all([
        apiClient.get(`/v1/classes/${classId}`),
        getClassRoster(classId),
        scheduleService.getSchedules(classId),
        attendanceQueryService.listByClass(classId),
      ]);

      setClassInfo(classRes.data?.data || null);
      setRoster(rosterList);
      setExceptions(scheduleList);
      setAttendanceRecords(attendanceList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入點名資料失敗");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadStaticData();
  }, [loadStaticData]);

  const refreshAttendance = useCallback(async () => {
    if (!classId) return;
    const list = await attendanceQueryService.listByClass(classId);
    setAttendanceRecords(list);
  }, [classId]);

  const activeRoster = useMemo(() => roster.filter((r) => r.is_active), [roster]);

  // 當前選定日期「已經加入班級」的在讀學生 —— 只有這些人才能被點名。
  const enrolledRoster = useMemo(
    () =>
      selectedDate
        ? activeRoster.filter((s) => isEnrolledByDate(s, selectedDate))
        : activeRoster,
    [activeRoster, selectedDate]
  );

  const rows = useMemo(() => {
    if (!classInfo) return [];
    return generateScheduleRows({
      dayOfWeek: classInfo.day_of_week,
      startDate: classInfo.start_date,
      endDate: classInfo.end_date,
      exceptions,
    });
  }, [classInfo, exceptions]);

  const today = todayStr();

  // 只有「有開課」（非停課）且已到期的日期才需要點名；由新到舊排序（generateScheduleRows 本身即為新到舊）。
  const markableRows = useMemo(
    () => rows.filter((row) => row.status !== "cancelled" && row.actual_date <= today),
    [rows, today]
  );

  const attendedDateSet = useMemo(
    () => new Set(attendanceRecords.map((r) => r.class_date)),
    [attendanceRecords]
  );

  const recordsByKey = useMemo(() => {
    const map = new Map<string, AttendanceQueryRecord>();
    attendanceRecords.forEach((r) => map.set(`${r.student_id}|${r.class_date}`, r));
    return map;
  }, [attendanceRecords]);

  // 預設選中最新一個「未點名」的日期；若全部已點名，選最新一個日期（可修改後重新儲存）。
  useEffect(() => {
    if (selectedDate || markableRows.length === 0) return;
    const firstUnattended = markableRows.find((row) => !attendedDateSet.has(row.actual_date));
    setSelectedDate(firstUnattended ? firstUnattended.actual_date : markableRows[0].actual_date);
  }, [markableRows, attendedDateSet, selectedDate]);

  // 依選定日期＋現有紀錄，重建每位學生的草稿（既有紀錄則預填，支援事後修改）。
  useEffect(() => {
    if (!selectedDate) {
      setDraft(new Map());
      return;
    }
    const next = new Map<string, DraftEntry>();
    enrolledRoster.forEach((student) => {
      const existing = recordsByKey.get(`${student.student_id}|${selectedDate}`);
      if (!existing) {
        next.set(student.student_id, emptyDraftEntry());
        return;
      }
      if (existing.status === "excuse") {
        next.set(student.student_id, {
          status: "excuse",
          ...decomposeReason(existing.absence_reason),
        });
      } else {
        next.set(student.student_id, {
          status: existing.status,
          reasonPreset: EXCUSE_REASON_OPTIONS[0],
          reasonOther: "",
        });
      }
    });
    setDraft(next);
  }, [selectedDate, enrolledRoster, recordsByKey]);

  const updateDraft = (studentId: string, patch: Partial<DraftEntry>) => {
    setDraft((prev) => {
      const next = new Map(prev);
      const current = next.get(studentId) || emptyDraftEntry();
      next.set(studentId, { ...current, ...patch });
      return next;
    });
  };

  const handleMarkAllPresent = () => {
    setDraft((prev) => {
      const next = new Map(prev);
      enrolledRoster.forEach((student) => next.set(student.student_id, emptyDraftEntry()));
      return next;
    });
  };

  const handleSave = async () => {
    if (!classId || !selectedDate || readOnly) return;

    for (const student of enrolledRoster) {
      const entry = draft.get(student.student_id);
      if (entry?.status === "excuse" && !composeReason(entry)) {
        setError(`「${student.name_cn}」的請假原因尚未填寫`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const records = enrolledRoster.map((student) => {
        const entry = draft.get(student.student_id) || emptyDraftEntry();
        return {
          student_id: student.student_id,
          status: entry.status,
          absence_reason: entry.status === "excuse" ? composeReason(entry) : undefined,
        };
      });

      await attendanceQueryService.saveBulk(classId, selectedDate, records);
      await refreshAttendance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存點名失敗");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="點名">
        <div className="attendance-sheet">
          <div className="attendance-empty">正在載入點名資料...</div>
        </div>
      </Layout>
    );
  }

  if (!classInfo) {
    return (
      <Layout title="點名">
        <div className="attendance-sheet">
          <div className="alert alert-danger">{error || "找不到課程"}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="點名">
      <div className="attendance-sheet">
        <div className="attendance-page-header">
          <div>
            <h2>
              {classInfo.subject}（{classInfo.form}）
            </h2>
            <p className="attendance-subtitle">
              每{classInfo.day_of_week} {classInfo.time_start}-{classInfo.time_end} ・{" "}
              {classInfo.venue}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowOverview((v) => !v)}
          >
            {showOverview ? "返回點名" : "查看總覽表格"}
          </button>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
            <button type="button" className="alert-close" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        {markableRows.length === 0 ? (
          <div className="attendance-empty">目前沒有可點名的上課日期（尚未開課或全部已停課）</div>
        ) : showOverview ? (
          <AttendanceOverview
            rows={markableRows}
            allRows={rows}
            roster={activeRoster}
            recordsByKey={recordsByKey}
          />
        ) : (
          <>
            <div className="attendance-toolbar">
              <label className="attendance-date-picker">
                <span>點名日期</span>
                <select
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {markableRows.map((row) => (
                    <option key={row.actual_date} value={row.actual_date}>
                      {formatDateWithWeekday(row.actual_date)}
                      {attendedDateSet.has(row.actual_date) ? "（已點名）" : "（未點名）"}
                    </option>
                  ))}
                </select>
              </label>
              {!readOnly && (
                <button type="button" className="btn btn-secondary" onClick={handleMarkAllPresent}>
                  全部到課
                </button>
              )}
            </div>

            {activeRoster.length === 0 ? (
              <div className="attendance-empty">此班目前沒有在讀學生</div>
            ) : (
              <div className="attendance-list">
                {activeRoster.map((student) => {
                  if (!isEnrolledByDate(student, selectedDate)) {
                    return (
                      <div className="attendance-row attendance-row-disabled" key={student.student_id}>
                        <div className="attendance-row-main">
                          <div className="attendance-row-info">
                            <span className="attendance-row-name">{student.name_cn}</span>
                            <span className="attendance-row-no">{student.student_no}</span>
                          </div>
                          <span className="attendance-not-joined-badge" title={`加入日期：${student.enrollment_date}`}>
                            未加入
                          </span>
                        </div>
                      </div>
                    );
                  }

                  const entry = draft.get(student.student_id) || emptyDraftEntry();
                  return (
                    <div className="attendance-row" key={student.student_id}>
                      <div className="attendance-row-main">
                        <div className="attendance-row-info">
                          <span className="attendance-row-name">{student.name_cn}</span>
                          <span className="attendance-row-no">{student.student_no}</span>
                        </div>

                        <select
                          className="form-control attendance-status-select"
                          value={entry.status}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateDraft(student.student_id, {
                              status: e.target.value as AttendanceStatusCode,
                            })
                          }
                        >
                          {(Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatusCode[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {ATTENDANCE_STATUS_META[status].label} (
                                {ATTENDANCE_STATUS_META[status].code})
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {entry.status === "excuse" && (
                        <div className="attendance-reason">
                          <select
                            className="form-control"
                            value={entry.reasonPreset}
                            disabled={readOnly}
                            onChange={(e) =>
                              updateDraft(student.student_id, { reasonPreset: e.target.value })
                            }
                          >
                            {EXCUSE_REASON_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                          {entry.reasonPreset === "其他" && (
                            <input
                              type="text"
                              className="form-control"
                              placeholder="請填寫具體原因"
                              value={entry.reasonOther}
                              disabled={readOnly}
                              onChange={(e) =>
                                updateDraft(student.student_id, { reasonOther: e.target.value })
                              }
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!readOnly && (
              <div className="attendance-save-bar">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={saving || activeRoster.length === 0}
                  onClick={handleSave}
                >
                  {saving ? "儲存中..." : "儲存點名"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

interface AttendanceOverviewProps {
  rows: ReturnType<typeof generateScheduleRows>;
  /** 完整排課列表（含停課、未來場次），只用於下方「本月排課紀錄」條列，矩陣本身仍只用 rows。 */
  allRows: ReturnType<typeof generateScheduleRows>;
  roster: ClassRosterEntry[];
  recordsByKey: Map<string, AttendanceQueryRecord>;
}

interface MonthGroup {
  key: string; // "YYYY-MM"
  label: string; // 月份全拼 + 年，例如 "July 2026"
  rows: ReturnType<typeof generateScheduleRows>;
}

/** 「學生 × 日期」矩陣總覽，唯讀，僅供快速檢視整期出勤概況（例如管理員查核）；不在此處編輯。 */
const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({
  rows,
  allRows,
  roster,
  recordsByKey,
}) => {
  const chronological = useMemo(() => [...rows].reverse(), [rows]);
  const isMobile = useIsMobile();

  // 手機模式：以「月」分頁（上/下個月切換），每月欄數鎖死在 MOBILE_MATRIX_MONTH_COLS 以上，
  // 不靠橫向捲動；桌機維持原本一次全部顯示、超出寬度就橫向拉 bar。
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, ReturnType<typeof generateScheduleRows>>();
    chronological.forEach((row) => {
      const key = row.actual_date.slice(0, 7);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    });
    return Array.from(map.entries()).map(([key, monthRows]) => ({
      key,
      label: formatMonthLabel(key),
      rows: monthRows,
    }));
  }, [chronological]);

  const totalPages = isMobile ? Math.max(1, monthGroups.length) : 1;
  const [pageIndex, setPageIndex] = useState<number | null>(null);
  // 預設停在最後一頁（最新月份），沒手動翻頁前一律跟著資料筆數走。
  const currentPageIndex = Math.min(pageIndex ?? totalPages - 1, totalPages - 1);
  const currentMonth = isMobile ? monthGroups[currentPageIndex] : undefined;
  const visibleColumns = isMobile ? currentMonth?.rows ?? [] : chronological;

  // 表格下方的「本月排課紀錄」條列：用完整排課列表（含停課），依「原訂日期」分月分組，
  // 手機模式只顯示當前分頁那個月，桌機因為矩陣本身不分月，改為每個月各自列出。
  const scheduleMonthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, ReturnType<typeof generateScheduleRows>>();
    allRows.forEach((row) => {
      const key = row.scheduled_date.slice(0, 7);
      const bucket = map.get(key);
      if (bucket) bucket.push(row);
      else map.set(key, [row]);
    });
    return Array.from(map.entries())
      .map(([key, monthRows]) => ({
        key,
        label: formatMonthLabel(key),
        rows: [...monthRows].sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : 1)),
      }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
  }, [allRows]);

  const visibleScheduleGroups = isMobile
    ? scheduleMonthGroups.filter((group) => group.key === currentMonth?.key)
    : scheduleMonthGroups;
  // 一個月不滿 MOBILE_MATRIX_MONTH_COLS 欄時（多數月份只有 4～5 堂課），補空白欄湊滿，
  // 讓每個月的表格寬度都一致；若某月加課超過這個欄數，照實際堂數顯示，不裁切資料。
  const totalCols = isMobile ? Math.max(MOBILE_MATRIX_MONTH_COLS, visibleColumns.length) : visibleColumns.length;
  const padCount = isMobile ? Math.max(0, totalCols - visibleColumns.length) : 0;
  const padKeys = Array.from({ length: padCount }, (_, i) => `pad-${i}`);

  // 手機模式下欄寬用百分比算，讓表格永遠佈滿卡片寬度（名字欄加寬，日期欄平分剩餘空間）；
  // 桌機沿用 CSS 裡的固定 px 欄寬，欄數一多就交給外層橫向捲動，不用百分比硬擠。
  const NAME_COL_PERCENT = 26;
  const studentColStyle = isMobile ? { width: `${NAME_COL_PERCENT}%` } : undefined;
  const dateColStyle = isMobile ? { width: `${(100 - NAME_COL_PERCENT) / totalCols}%` } : undefined;

  if (roster.length === 0) {
    return <div className="attendance-empty">此班目前沒有在讀學生</div>;
  }

  return (
    <div className="attendance-overview">
      {isMobile && totalPages > 1 && (
        <div className="attendance-matrix-pagination">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setPageIndex(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex === 0}
          >
            ← 上個月
          </button>
          <span className="attendance-matrix-page-info">{currentMonth?.label}</span>
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex === totalPages - 1}
          >
            下個月 →
          </button>
        </div>
      )}

      <div className="attendance-overview-scroll">
        <table className={isMobile ? "attendance-matrix attendance-matrix--fill" : "attendance-matrix"}>
          <thead>
            <tr>
              <th className="attendance-matrix-student-col" style={studentColStyle}>
                學生
              </th>
              {visibleColumns.map((row) => {
                const { month, day } = formatMonthDayParts(row.actual_date);
                return (
                  <th
                    key={row.actual_date}
                    title={row.actual_date}
                    className="attendance-matrix-date-col"
                    style={dateColStyle}
                  >
                    <span className="attendance-date-chip">
                      <span className="attendance-date-month">{month}</span>
                      <span className="attendance-date-day">{day}</span>
                    </span>
                  </th>
                );
              })}
              {padKeys.map((key) => (
                <th
                  key={key}
                  className="attendance-matrix-date-col attendance-matrix-date-col-empty"
                  style={dateColStyle}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.student_id}>
                <td className="attendance-matrix-student-col" style={studentColStyle}>
                  <div className="attendance-matrix-student-name">{student.name_cn}</div>
                  <div className="attendance-matrix-student-meta">
                    <span className="attendance-matrix-student-no">{student.student_no}</span>
                    <span className="attendance-matrix-student-class">{student.real_class_name}</span>
                  </div>
                </td>
                {visibleColumns.map((row) => {
                  if (!isEnrolledByDate(student, row.actual_date)) {
                    return (
                      <td
                        key={row.actual_date}
                        className="attendance-matrix-cell attendance-matrix-cell-not-joined"
                        title={`${row.actual_date} 尚未加入班級（加入日期：${student.enrollment_date}）`}
                        style={dateColStyle}
                      >
                        -
                      </td>
                    );
                  }

                  const record = recordsByKey.get(`${student.student_id}|${row.actual_date}`);
                  const meta = record ? ATTENDANCE_STATUS_META[record.status] : null;
                  const title = meta
                    ? `${row.actual_date} ${meta.label}${
                        record?.absence_reason ? `：${record.absence_reason}` : ""
                      }`
                    : `${row.actual_date} 尚未點名`;
                  return (
                    <td
                      key={row.actual_date}
                      className="attendance-matrix-cell"
                      title={title}
                      style={{
                        background: meta ? meta.color : "#eee",
                        color: meta ? "#fff" : "#999",
                        ...dateColStyle,
                      }}
                    >
                      {meta ? meta.code : "·"}
                    </td>
                  );
                })}
                {padKeys.map((key) => (
                  <td
                    key={key}
                    className="attendance-matrix-cell attendance-matrix-cell-empty"
                    style={dateColStyle}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleScheduleGroups.map((group) => (
        <div className="attendance-schedule-log" key={group.key}>
          <h4 className="attendance-schedule-log-title">
            {isMobile ? "本月排課紀錄" : `${group.label} 排課紀錄`}
          </h4>
          {group.rows.length === 0 ? (
            <p className="attendance-schedule-log-empty">本月尚無排課紀錄</p>
          ) : (
            <ul className="attendance-schedule-log-list">
              {group.rows.map((row) => (
                <li key={row.scheduled_date} className={`attendance-schedule-log-item status-${row.status}`}>
                  {formatScheduleStatusLine(row)}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div className="attendance-legend">
        {(Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatusCode[]).map((status) => (
          <span className="attendance-legend-item" key={status}>
            <span
              className="attendance-legend-swatch"
              style={{ background: ATTENDANCE_STATUS_META[status].color }}
            >
              {ATTENDANCE_STATUS_META[status].code}
            </span>
            {ATTENDANCE_STATUS_META[status].label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default AttendanceSheet;

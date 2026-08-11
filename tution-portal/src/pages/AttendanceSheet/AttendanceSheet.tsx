import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
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
    activeRoster.forEach((student) => {
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
  }, [selectedDate, activeRoster, recordsByKey]);

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
      activeRoster.forEach((student) => next.set(student.student_id, emptyDraftEntry()));
      return next;
    });
  };

  const handleSave = async () => {
    if (!classId || !selectedDate) return;

    for (const student of activeRoster) {
      const entry = draft.get(student.student_id);
      if (entry?.status === "excuse" && !composeReason(entry)) {
        setError(`「${student.name_cn}」的請假原因尚未填寫`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const records = activeRoster.map((student) => {
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
              <button type="button" className="btn btn-secondary" onClick={handleMarkAllPresent}>
                全部到課
              </button>
            </div>

            {activeRoster.length === 0 ? (
              <div className="attendance-empty">此班目前沒有在讀學生</div>
            ) : (
              <div className="attendance-list">
                {activeRoster.map((student) => {
                  const entry = draft.get(student.student_id) || emptyDraftEntry();
                  return (
                    <div className="attendance-row" key={student.student_id}>
                      <div className="attendance-row-info">
                        <span className="attendance-row-name">{student.name_cn}</span>
                        <span className="attendance-row-no">{student.student_no}</span>
                      </div>

                      <select
                        className="form-control attendance-status-select"
                        value={entry.status}
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

                      {entry.status === "excuse" && (
                        <div className="attendance-reason">
                          <select
                            className="form-control"
                            value={entry.reasonPreset}
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
          </>
        )}
      </div>
    </Layout>
  );
};

interface AttendanceOverviewProps {
  rows: ReturnType<typeof generateScheduleRows>;
  roster: ClassRosterEntry[];
  recordsByKey: Map<string, AttendanceQueryRecord>;
}

/** 「學生 × 日期」矩陣總覽，唯讀，僅供快速檢視整期出勤概況（例如管理員查核）；不在此處編輯。 */
const AttendanceOverview: React.FC<AttendanceOverviewProps> = ({ rows, roster, recordsByKey }) => {
  const chronological = useMemo(() => [...rows].reverse(), [rows]);

  if (roster.length === 0) {
    return <div className="attendance-empty">此班目前沒有在讀學生</div>;
  }

  return (
    <div className="attendance-overview">
      <div className="attendance-overview-scroll">
        <table className="attendance-matrix">
          <thead>
            <tr>
              <th className="attendance-matrix-student-col">學生</th>
              {chronological.map((row) => (
                <th key={row.actual_date} title={row.actual_date}>
                  {row.actual_date.slice(5)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => (
              <tr key={student.student_id}>
                <td className="attendance-matrix-student-col">{student.name_cn}</td>
                {chronological.map((row) => {
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
                      }}
                    >
                      {meta ? meta.code : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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

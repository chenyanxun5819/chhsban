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
import { useTranslation } from "react-i18next";
import { useGradeLabel, useDayLabel, useAttendanceStatusLabel, useExcuseReasonLabel, useWeekdayShort } from "@/i18n/labels";
import { formatDisplayDate } from "@/utils/validators";
import { AttendanceOverview, isEnrolledByDate } from "@/components/attendance/AttendanceOverviewTable";
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
  const { user } = useAuth();
  const readOnly = user?.permission === "super_admin";
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const statusLabel = useAttendanceStatusLabel();
  const reasonLabel = useExcuseReasonLabel();
  const weekdayShort = useWeekdayShort();
  const formatDateWithWeekday = (dateStr: string): string => {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return `${dateStr}（${weekdayShort(date.getUTCDay())}）`;
  };

  const [classInfo, setClassInfo] = useState<TutionClass | null>(null);
  const [roster, setRoster] = useState<ClassRosterEntry[]>([]);
  const [exceptions, setExceptions] = useState<TutionSchedule[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceQueryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState("");
  const [draft, setDraft] = useState<Map<string, DraftEntry>>(new Map());
  // 管理員（唯讀）直接看總覽表格，不需要進到個別日期的點名畫面。
  const [showOverview, setShowOverview] = useState(readOnly);

  const loadStaticData = useCallback(async () => {
    if (!classId) {
      setError(t("attendanceSheet.errorNoClassId"));
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
      setError(err instanceof Error ? err.message : t("attendanceSheet.errorLoadFailed"));
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
        setError(t("attendanceSheet.errorReasonRequired", { name: student.name_cn }));
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
      setError(err instanceof Error ? err.message : t("attendanceSheet.errorSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const pageTitle = readOnly ? t("attendanceSheet.readOnlyTitle") : t("attendanceSheet.title");

  if (loading) {
    return (
      <Layout title={pageTitle}>
        <div className="attendance-sheet">
          <div className="attendance-empty">{t("attendanceSheet.loadingText")}</div>
        </div>
      </Layout>
    );
  }

  if (!classInfo) {
    return (
      <Layout title={pageTitle}>
        <div className="attendance-sheet">
          <div className="alert alert-danger">{error || t("attendanceSheet.notFound")}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle}>
      <div className="attendance-sheet">
        <div className="attendance-page-header">
          <div>
            <h2>
              {classInfo.subject}（{gradeLabel(classInfo.form)}）
            </h2>
            <p className="attendance-subtitle">
              {t("schedule.applicantLabel")}: {classInfo.teacher_name_cn} ・ {t("common.everyDayPrefix")}{dayLabel(classInfo.day_of_week)}{" "}
              {classInfo.time_start}-{classInfo.time_end} ・ {classInfo.venue}
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowOverview((v) => !v)}
            >
              {showOverview ? t("attendanceSheet.backToMarking") : t("attendanceSheet.viewOverview")}
            </button>
          )}
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
          <div className="attendance-empty">{t("attendanceSheet.noMarkableDates")}</div>
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
                <span>{t("attendanceSheet.datePickerLabel")}</span>
                <select
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                >
                  {markableRows.map((row) => (
                    <option key={row.actual_date} value={row.actual_date}>
                      {formatDateWithWeekday(row.actual_date)}
                      {attendedDateSet.has(row.actual_date) ? t("attendanceSheet.markedSuffix") : t("attendanceSheet.unmarkedSuffix")}
                    </option>
                  ))}
                </select>
              </label>
              {!readOnly && (
                <div className="attendance-toolbar-actions">
                  <button type="button" className="btn btn-secondary" onClick={handleMarkAllPresent}>
                    {t("attendanceSheet.markAllPresent")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={saving || activeRoster.length === 0}
                    onClick={handleSave}
                  >
                    {saving ? t("attendanceSheet.saving") : t("attendanceSheet.save")}
                  </button>
                </div>
              )}
            </div>

            {activeRoster.length === 0 ? (
              <div className="attendance-empty">{t("attendanceSheet.noActiveStudents")}</div>
            ) : (
              <div className="attendance-list">
                {activeRoster.map((student) => {
                  if (!isEnrolledByDate(student, selectedDate)) {
                    return (
                      <div className="attendance-row attendance-row-disabled" key={student.student_id}>
                        <div className="attendance-row-main">
                          <div className="attendance-row-info">
                            <div className="attendance-row-line1">
                              <span className="attendance-row-no">{student.student_no}</span>
                              <span className="attendance-row-name">{student.name_cn}</span>
                              <span className="attendance-row-name-en">{student.name_en}</span>
                            </div>
                            <div className="attendance-row-line2">
                              <span className="attendance-row-class">{student.real_class_name}</span>
                              <span className="attendance-row-gender">{student.gender_boarding}</span>
                            </div>
                          </div>
                          <span className="attendance-not-joined-badge" title={t("attendanceSheet.joinedDateTitle", { date: formatDisplayDate(student.enrollment_date) })}>
                            {t("attendanceSheet.notJoined")}
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
                          <div className="attendance-row-line1">
                            <span className="attendance-row-no">{student.student_no}</span>
                            <span className="attendance-row-name">{student.name_cn}</span>
                            <span className="attendance-row-name-en">{student.name_en}</span>
                          </div>
                          <div className="attendance-row-line2">
                            <span className="attendance-row-class">{student.real_class_name}</span>
                            <span className="attendance-row-gender">{student.gender_boarding}</span>
                          </div>
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
                                {statusLabel(ATTENDANCE_STATUS_META[status].label)} (
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
                                {reasonLabel(option)}
                              </option>
                            ))}
                          </select>
                          {entry.reasonPreset === "其他" && (
                            <input
                              type="text"
                              className="form-control"
                              placeholder={t("attendanceSheet.reasonPlaceholder")}
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
          </>
        )}
      </div>
    </Layout>
  );
};


export default AttendanceSheet;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import apiClient from "@/utils/api";
import { scheduleService } from "@/services/scheduleService";
import { attendanceQueryService } from "@/services/attendanceQueryService";
import {
  generateScheduleRows,
  summarizeSchedule,
  GeneratedScheduleRow,
} from "@/utils/scheduleGenerator";
import {
  ScheduleTable,
  RescheduleModal,
  CancelModal,
  ScheduleStats,
} from "@/components/schedule";
import type { TutionClass, TutionSchedule } from "@/types";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
import "@/components/schedule/schedule.css";
import "./schedule-management.css";

export const ScheduleManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const readOnly = user?.permission === "super_admin";
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();

  const [classInfo, setClassInfo] = useState<TutionClass | null>(null);
  const [exceptions, setExceptions] = useState<TutionSchedule[]>([]);
  const [attendedDates, setAttendedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<GeneratedScheduleRow | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<GeneratedScheduleRow | null>(null);

  const loadData = useCallback(async () => {
    if (!classId) {
      setError("課程 ID 未找到");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [classRes, scheduleList, attendanceList] = await Promise.all([
        apiClient.get(`/v1/classes/${classId}`),
        scheduleService.getSchedules(classId),
        attendanceQueryService.listByClass(classId),
      ]);

      setClassInfo(classRes.data?.data || null);
      setExceptions(scheduleList);
      setAttendedDates(new Set(attendanceList.map((a) => a.class_date)));
    } catch (err) {
      const message = err instanceof Error ? err.message : "載入排課資料失敗";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rows = useMemo(() => {
    if (!classInfo) return [];
    return generateScheduleRows({
      dayOfWeek: classInfo.day_of_week,
      startDate: classInfo.start_date,
      endDate: classInfo.end_date,
      exceptions,
    });
  }, [classInfo, exceptions]);

  const stats = useMemo(() => summarizeSchedule(rows, attendedDates), [rows, attendedDates]);

  // 用 POST/PUT 回傳的最新資料直接合併進本地狀態，不要在寫入後馬上重新 GET —
  // Cloudflare KV 在正式環境是最終一致性，寫入後立刻查詢有機率讀到舊資料，
  // 畫面會看起來「沒有即時更新」，要離開頁面再回來、等傳播完成才會看到最新狀態。
  // 用回應本身的資料更新，就不會受這個延遲影響。
  const applyExceptionUpdate = (updated: TutionSchedule) => {
    setExceptions((prev) => [
      ...prev.filter((e) => e.scheduled_date !== updated.scheduled_date),
      updated,
    ]);
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget || !classId || readOnly) return;
    setActionLoading(true);
    try {
      const updated = await scheduleService.markAsCancelled(
        classId,
        cancelTarget.scheduled_date,
        reason
      );
      applyExceptionUpdate(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleConfirm = async (newDate: string, reason: string) => {
    if (!rescheduleTarget || !classId || readOnly) return;
    setActionLoading(true);
    try {
      const updated = await scheduleService.markAsRescheduled(
        classId,
        rescheduleTarget.scheduled_date,
        newDate,
        reason
      );
      applyExceptionUpdate(updated);
    } finally {
      setActionLoading(false);
    }
  };

  const pageTitle = readOnly ? "排課狀態" : "排課管理";

  if (loading) {
    return (
      <Layout title={pageTitle}>
        <div className="schedule-management">
          <div className="schedule-table-empty">正在載入排課資料...</div>
        </div>
      </Layout>
    );
  }

  if (!classInfo) {
    return (
      <Layout title={pageTitle}>
        <div className="schedule-management">
          <div className="alert alert-danger">{error || "找不到課程"}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={pageTitle}>
      <div className="schedule-management">
        <div className="schedule-header">
          <div className="header-title">
            <h2>
              {classInfo.subject}（{gradeLabel(classInfo.form)}）
            </h2>
            <p className="subtitle">
              申請人: {classInfo.teacher_name_cn} ・ 每{dayLabel(classInfo.day_of_week)}{" "}
              {classInfo.time_start}-{classInfo.time_end} ・ {classInfo.venue}
              {classInfo.end_date ? ` ・ 結束日期 ${classInfo.end_date}` : ""}
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger">
            {error}
            <button className="alert-close" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        <ScheduleStats stats={stats} />

        <ScheduleTable
          rows={rows}
          attendedDates={attendedDates}
          onCancel={(row) => setCancelTarget(row)}
          onReschedule={(row) => setRescheduleTarget(row)}
          readOnly={readOnly}
        />

        {cancelTarget && (
          <CancelModal
            row={cancelTarget}
            open={!!cancelTarget}
            loading={actionLoading}
            onConfirm={handleCancelConfirm}
            onClose={() => setCancelTarget(null)}
          />
        )}

        {rescheduleTarget && (
          <RescheduleModal
            row={rescheduleTarget}
            open={!!rescheduleTarget}
            loading={actionLoading}
            onConfirm={handleRescheduleConfirm}
            onClose={() => setRescheduleTarget(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
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
import "@/components/schedule/schedule.css";
import "./schedule-management.css";

export const ScheduleManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();

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

  const handleCancelConfirm = async (reason: string) => {
    if (!cancelTarget || !classId) return;
    setActionLoading(true);
    try {
      await scheduleService.markAsCancelled(classId, cancelTarget.scheduled_date, reason);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleConfirm = async (
    newDate: string,
    newVenue: string,
    reason: string
  ) => {
    if (!rescheduleTarget || !classId) return;
    setActionLoading(true);
    try {
      await scheduleService.markAsRescheduled(
        classId,
        rescheduleTarget.scheduled_date,
        newDate,
        newVenue,
        reason
      );
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="排課管理">
        <div className="schedule-management">
          <div className="schedule-table-empty">正在載入排課資料...</div>
        </div>
      </Layout>
    );
  }

  if (!classInfo) {
    return (
      <Layout title="排課管理">
        <div className="schedule-management">
          <div className="alert alert-danger">{error || "找不到課程"}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="排課管理">
      <div className="schedule-management">
        <div className="schedule-header">
          <div className="header-title">
            <h2>
              {classInfo.subject}（{classInfo.form}）
            </h2>
            <p className="subtitle">
              每{classInfo.day_of_week} {classInfo.time_start}-{classInfo.time_end} ・{" "}
              {classInfo.venue}
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
            defaultVenue={classInfo.venue}
            onConfirm={handleRescheduleConfirm}
            onClose={() => setRescheduleTarget(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default ScheduleManagement;

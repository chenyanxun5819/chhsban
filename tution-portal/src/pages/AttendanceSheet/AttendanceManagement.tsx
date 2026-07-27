import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/common/Layout";
import { AttendanceSheet, AttendanceStats } from "@/components/attendance";
import apiClient from "@/utils/api";
import {
  TutionSchedule,
  TutionRoster,
  TutionAttendance,
  TutionClass,
} from "@/types";
import "../ScheduleManagement/schedule.css";
import "../AttendanceSheet/attendance-sheet.css";

interface PageState {
  schedule: TutionSchedule | null;
  roster: TutionRoster[];
  attendance: TutionAttendance[];
  classInfo: TutionClass | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export const AttendanceSheetPage: React.FC = () => {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>({
    schedule: null,
    roster: [],
    attendance: [],
    classInfo: null,
    loading: true,
    saving: false,
    error: null,
  });

  // 初始化：加載排期和學生名單
  useEffect(() => {
    if (!scheduleId) {
      setState((prev) => ({
        ...prev,
        error: "缺少排期 ID",
        loading: false,
      }));
      return;
    }

    fetchScheduleAndRoster();
  }, [scheduleId]);

  const fetchScheduleAndRoster = async () => {
    if (!scheduleId) return;

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      // 獲取排期信息
      const scheduleRes = await apiClient.get<TutionSchedule>(
        `/api/v1/schedules/${scheduleId}`
      );

      if (!scheduleRes.data) {
        throw new Error("找不到排期信息");
      }

      const schedule = scheduleRes.data;

      // 獲取課堂和學生名單
      const [classRes, rosterRes, attendanceRes] = await Promise.all([
        apiClient.get<TutionClass>(`/api/v1/classes/${schedule.class_id}`),
        apiClient.get<TutionRoster[]>(
          `/api/v1/rosters?class=${schedule.class_id}&status=active`
        ),
        apiClient.get<TutionAttendance[]>(
          `/api/v1/attendance?schedule=${scheduleId}`
        ),
      ]);

      setState((prev) => ({
        ...prev,
        schedule,
        classInfo: classRes.data || null,
        roster: rosterRes.data || [],
        attendance: attendanceRes.data || [],
        loading: false,
      }));
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "加載數據失敗，請重試";
      setState((prev) => ({ ...prev, error: errorMsg, loading: false }));
    }
  };

  const handleSubmitAttendance = useCallback(
    async (attendanceData: Partial<TutionAttendance>[]) => {
      setState((prev) => ({ ...prev, saving: true, error: null }));
      try {
        // 批量保存點名記錄
        const response = await apiClient.post(
          "/api/v1/attendance/bulk",
          attendanceData
        );

        if (!response.data) {
          throw new Error("保存失敗");
        }

        // 重新加載點名記錄
        await fetchScheduleAndRoster();

        // 顯示成功消息
        setState((prev) => ({
          ...prev,
          saving: false,
          error: null,
        }));

        // 2 秒後返回
        setTimeout(() => {
          navigate("/attendance");
        }, 2000);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "保存點名記錄失敗";
        setState((prev) => ({ ...prev, saving: false, error: errorMsg }));
      }
    },
    [navigate]
  );

  const handleCancel = () => {
    navigate("/attendance");
  };

  if (state.loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>加載點名表格中...</p>
        </div>
      </Layout>
    );
  }

  if (state.error && !state.schedule) {
    return (
      <Layout>
        <div className="error-container">
          <h2>錯誤</h2>
          <p>{state.error}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </Layout>
    );
  }

  if (!state.schedule || state.roster.length === 0) {
    return (
      <Layout>
        <div className="empty-container">
          <h2>無法顯示點名表格</h2>
          <p>{state.schedule ? "沒有學生記錄" : "缺少排期信息"}</p>
          <button className="btn btn-primary" onClick={() => navigate(-1)}>
            返回
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="attendance-page">
        <div className="page-header">
          <button className="btn-back" onClick={() => navigate(-1)}>
            ← 返回
          </button>
          <h1>點名記錄</h1>
        </div>

        {state.error && (
          <div className="alert alert-danger" role="alert">
            {state.error}
            <button
              className="alert-close"
              onClick={() => setState((prev) => ({ ...prev, error: null }))}
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )}

        {!state.saving && !state.error && state.attendance.length > 0 && (
          <div className="alert alert-success">
            ✓ 點名記錄已保存
          </div>
        )}

        <AttendanceSheet
          schedule={state.schedule}
          roster={state.roster}
          onSubmit={handleSubmitAttendance}
          onCancel={handleCancel}
          existingAttendance={state.attendance}
          classInfo={state.classInfo ? {
            subject: state.classInfo.subject,
            form: state.classInfo.form,
          } : undefined}
        />

        {state.roster.length > 0 && (
          <div className="stats-section">
            <h2>統計摘要</h2>
            <AttendanceStats
              attendance={state.attendance}
              roster={state.roster}
            />
          </div>
        )}
      </div>

      <style>{`
        .attendance-page {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        .page-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e0e0e0;
        }

        .btn-back {
          background: none;
          border: none;
          color: #007bff;
          cursor: pointer;
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.3s;
        }

        .btn-back:hover {
          background: #f0f0f0;
        }

        .page-header h1 {
          margin: 0;
          font-size: 24px;
          color: #333;
        }

        .alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .loading-container,
        .error-container,
        .empty-container {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 8px;
          margin: 20px 0;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #ddd;
          border-top-color: #007bff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .stats-section {
          margin-top: 40px;
          padding-top: 40px;
          border-top: 2px solid #e0e0e0;
        }

        .stats-section h2 {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
          color: #333;
        }

        @media (max-width: 768px) {
          .attendance-page {
            padding: 12px;
          }

          .page-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .page-header h1 {
            font-size: 20px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default AttendanceSheetPage;

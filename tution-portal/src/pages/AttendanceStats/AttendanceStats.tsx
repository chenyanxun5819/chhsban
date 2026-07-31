import React from "react";
import { useParams } from "react-router-dom";
import { TutionAttendance, TutionRoster } from "@/types";
import apiClient from "@/utils/api";
import { Layout } from "@/components/common/Layout";
import StatsSummary from "@/components/attendance/StatsSummary";
import AttendanceChart from "@/components/attendance/AttendanceChart";
import AttendanceHistory from "@/components/attendance/AttendanceHistory";
import "./attendance-stats.css";

interface PageState {
  attendance: TutionAttendance[];
  roster: TutionRoster[];
  loading: boolean;
  error: string;
  startDate: string;
  endDate: string;
}

const AttendanceStatsPage: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const [state, setState] = React.useState<PageState>({
    attendance: [],
    roster: [],
    loading: true,
    error: "",
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  // 加載出勤數據
  React.useEffect(() => {
    const fetchData = async () => {
      if (!classId) {
        setState((prev) => ({
          ...prev,
          error: "課程 ID 未找到",
          loading: false,
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: "" }));

        const [attendanceRes, rosterRes] = await Promise.all([
          apiClient.get(`/api/v1/attendance?class=${classId}`),
          apiClient.get(`/api/v1/rosters?class=${classId}&status=active`),
        ]);

        setState((prev) => ({
          ...prev,
          attendance: attendanceRes.data || [],
          roster: rosterRes.data || [],
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "加載失敗",
          loading: false,
        }));
      }
    };

    fetchData();
  }, [classId]);

  // 篩選日期範圍內的出勤記錄
  const filteredAttendance = React.useMemo(() => {
    const start = new Date(state.startDate).getTime();
    const end = new Date(state.endDate).getTime() + 24 * 60 * 60 * 1000;

    return state.attendance.filter(
      (a) => a.recorded_at >= start && a.recorded_at <= end
    );
  }, [state.attendance, state.startDate, state.endDate]);

  // 計算統計數據
  const stats = React.useMemo(() => {
    const totalRecords = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(
      (a) => a.status === "present"
    ).length;
    const lateCount = filteredAttendance.filter(
      (a) => a.status === "late"
    ).length;
    const absentCount = filteredAttendance.filter(
      (a) => a.status === "absent"
    ).length;
    const attendanceRate =
      totalRecords > 0
        ? Math.round(((presentCount + lateCount) / totalRecords) * 100)
        : 0;

    return {
      totalRecords,
      presentCount,
      lateCount,
      absentCount,
      attendanceRate,
    };
  }, [filteredAttendance]);

  // 按學生統計出勤
  const studentStats = React.useMemo(() => {
    const stats: Record<
      string,
      { name: string; present: number; late: number; absent: number; total: number }
    > = {};

    state.roster.forEach((student) => {
      stats[student.student_id] = {
        name: student.name_cn,
        present: 0,
        late: 0,
        absent: 0,
        total: 0,
      };
    });

    filteredAttendance.forEach((record) => {
      if (stats[record.student_id]) {
        stats[record.student_id].total++;
        if (record.status === "present") {
          stats[record.student_id].present++;
        } else if (record.status === "late") {
          stats[record.student_id].late++;
        } else if (record.status === "absent") {
          stats[record.student_id].absent++;
        }
      }
    });

    return Object.values(stats);
  }, [state.roster, filteredAttendance]);

  return (
    <Layout>
      <div className="attendance-stats-page">
        <div className="page-header">
          <h1>出勤統計分析</h1>
          <p className="subtitle">課程: {classId}</p>
        </div>

        {state.error && (
          <div className="alert alert-danger">
            <span>{state.error}</span>
            <button
              onClick={() => setState((prev) => ({ ...prev, error: "" }))}
              style={{ background: "none", border: "none", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>
        )}

        {state.loading ? (
          <div className="loading-state">
            <p>加載中...</p>
          </div>
        ) : (
          <>
            {/* 日期範圍選擇 */}
            <div className="date-range-selector">
              <div className="date-inputs">
                <label>
                  開始日期:
                  <input
                    type="date"
                    value={state.startDate}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </label>
                <label>
                  結束日期:
                  <input
                    type="date"
                    value={state.endDate}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setState((prev) => ({
                    ...prev,
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                      .toISOString()
                      .split("T")[0],
                  }))
                }
              >
                最近 30 天
              </button>
            </div>

            {/* 統計摘要 */}
            <StatsSummary stats={stats} studentCount={state.roster.length} />

            {/* 圖表 */}
            <AttendanceChart
              data={{
                present: stats.presentCount,
                late: stats.lateCount,
                absent: stats.absentCount,
              }}
            />

            {/* 出勤歷史 */}
            <AttendanceHistory
              records={filteredAttendance}
              studentStats={studentStats}
            />
          </>
        )}
      </div>
    </Layout>
  );
};

export default AttendanceStatsPage;

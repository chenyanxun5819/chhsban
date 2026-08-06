import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClassRosterEntry, TutionClass } from "@/types";
import apiClient from "@/utils/api";
import {
  getClassRoster,
  addRosterStudent,
  withdrawRosterStudent,
  exportRosterToCSV,
} from "@/services/rosterService";
import { RosterTable, RosterStats } from "@/components/roster";
import { Layout } from "@/components/common/Layout";
import "@/components/roster/roster.css";

interface PageState {
  roster: ClassRosterEntry[];
  classInfo?: TutionClass;
  loading: boolean;
  saving: boolean;
  error: string;
}

const RosterManagement: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [state, setState] = React.useState<PageState>({
    roster: [],
    loading: true,
    saving: false,
    error: "",
  });

  const fetchRoster = React.useCallback(async () => {
    if (!classId) {
      setState((prev) => ({ ...prev, error: "課程 ID 未找到", loading: false }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    try {
      const [roster, classRes] = await Promise.all([
        getClassRoster(classId),
        apiClient.get(`/v1/classes/${classId}`),
      ]);

      setState((prev) => ({
        ...prev,
        roster,
        classInfo: classRes.data?.data,
        loading: false,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.error || err.message || "載入失敗",
        loading: false,
      }));
    }
  }, [classId]);

  React.useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // 新增學生
  const handleAddStudent = async (studentId: string) => {
    if (!classId) return;
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      await addRosterStudent(classId, studentId);
      await fetchRoster();
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.error || err.message || "新增失敗",
        saving: false,
      }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  // 學生退出（記錄退出日期與原因）
  const handleWithdraw = async (student: ClassRosterEntry) => {
    if (!classId) return;
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      await withdrawRosterStudent(classId, student.roster_id, student.withdrawal_reason || "");
      await fetchRoster();
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.error || err.message || "退出失敗",
        saving: false,
      }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleExportCSV = () => {
    if (!classId) return;
    exportRosterToCSV(state.roster, classId);
  };

  const classNameDisplay = state.classInfo
    ? `${state.classInfo.subject} (${state.classInfo.form})`
    : "課程";

  return (
    <Layout>
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "24px" }}>
        {/* 頁面標題 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >

          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "24px" }}>
              {classNameDisplay} - 學生名單管理
            </h1>
            <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
              課程編號: {state.classInfo?.application_no || classId}
            </p>
          </div>
        </div>

        {/* 錯誤提示 */}
        {state.error && (
          <div
            style={{
              padding: "12px 16px",
              background: "#f8d7da",
              color: "#721c24",
              border: "1px solid #f5c6cb",
              borderRadius: "6px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{state.error}</span>
            <button
              onClick={() => setState((prev) => ({ ...prev, error: "" }))}
              style={{
                background: "none",
                border: "none",
                color: "#721c24",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 統計信息（含性別/走宿分佈） */}
        <RosterStats roster={state.roster} />

        {/* 主表格 */}
        {state.loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>加載中...</div>
        ) : (
          <RosterTable
            roster={state.roster}
            onAddStudent={handleAddStudent}
            onWithdraw={handleWithdraw}
            onExport={handleExportCSV}
            onRefresh={fetchRoster}
            loading={state.saving}
          />
        )}
      </div>
    </Layout>
  );
};

export default RosterManagement;

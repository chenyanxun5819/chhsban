import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TutionRoster, TutionClass } from "@/types";
import apiClient from "@/utils/api";
import {
  RosterTable,
  RosterForm,
  ImportModal,
  RosterStats,
} from "@/components/roster";
import { Layout } from "@/components/common/Layout";
import "@/components/roster/roster.css";

interface PageState {
  roster: TutionRoster[];
  classInfo?: TutionClass;
  loading: boolean;
  saving: boolean;
  error: string;
  showForm: boolean;
  editingStudent?: TutionRoster;
  showImportModal: boolean;
}

const RosterManagement: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [state, setState] = React.useState<PageState>({
    roster: [],
    loading: true,
    saving: false,
    error: "",
    showForm: false,
    showImportModal: false,
  });

  // 獲取學生名單
  const fetchRoster = React.useCallback(async () => {
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
      const [rosterRes, classRes] = await Promise.all([
        apiClient.get(`/api/v1/rosters?class=${classId}`),
        apiClient.get(`/api/v1/classes/${classId}`),
      ]);

      setState((prev) => ({
        ...prev,
        roster: rosterRes.data || [],
        classInfo: classRes.data,
        loading: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "加載失敗",
        loading: false,
      }));
    }
  }, [classId]);

  React.useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // 新增學生
  const handleAddStudent = () => {
    setState((prev) => ({
      ...prev,
      showForm: true,
      editingStudent: undefined,
    }));
  };

  // 編輯學生
  const handleEditStudent = (student: TutionRoster) => {
    setState((prev) => ({
      ...prev,
      showForm: true,
      editingStudent: student,
    }));
  };

  // 提交表單
  const handleSubmitForm = async (data: Partial<TutionRoster>) => {
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      if (state.editingStudent) {
        // 編輯現有學生
        await apiClient.put(
          `/api/v1/rosters/${state.editingStudent.roster_id}`,
          {
            ...state.editingStudent,
            ...data,
            updated_at: Date.now(),
          }
        );
      } else {
        // 新增學生
        await apiClient.post(`/api/v1/rosters`, {
          ...data,
          class_id: classId,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
      }

      await fetchRoster();
      setState((prev) => ({
        ...prev,
        showForm: false,
        editingStudent: undefined,
        saving: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "提交失敗",
        saving: false,
      }));
    }
  };

  // 移除學生
  const handleRemoveStudent = async (studentId: string) => {
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const student = state.roster.find((s) => s.student_id === studentId);
      if (!student) throw new Error("學生未找到");

      await apiClient.put(`/api/v1/rosters/${student.roster_id}`, {
        ...student,
        status: "dropped",
        dropped_at: Date.now(),
        updated_at: Date.now(),
      });

      await fetchRoster();
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "移除失敗",
        saving: false,
      }));
      throw err;
    }
  };

  // 匯入 CSV
  const handleImportCSV = async (file: File) => {
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const students: Partial<TutionRoster>[] = [];

      // 跳過表頭
      for (let i = 1; i < lines.length; i++) {
        const [student_no, name_cn, name_en, input_class_name] = lines[i]
          .split(",")
          .map((col) => col.trim().replace(/^"|"$/g, ""));

        if (student_no && name_cn && name_en) {
          students.push({
            class_id: classId,
            student_id: `STU-${Date.now()}-${Math.random()}`,
            student_no,
            name_cn,
            name_en,
            input_class_name: input_class_name || "未知",
            status: "initial",
          });
        }
      }

      if (students.length === 0) {
        throw new Error("CSV 中未找到有效的學生記錄");
      }

      // 批量新增
      await apiClient.post(`/api/v1/rosters/bulk`, students);

      await fetchRoster();
      setState((prev) => ({
        ...prev,
        showImportModal: false,
        saving: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "匯入失敗",
        saving: false,
      }));
      throw err;
    }
  };

  // 匯出 CSV
  const handleExportCSV = () => {
    const headers = ["學號", "中文姓名", "英文姓名", "班級", "狀態"];
    const rows = state.roster.map((s) => [
      s.student_no,
      s.name_cn,
      s.name_en,
      s.input_class_name,
      s.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `roster-${classId}-${Date.now()}.csv`;
    link.click();
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
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
            style={{ marginBottom: 0 }}
          >
            ← 返回
          </button>
          <div>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "24px" }}>
              {classNameDisplay} - 學生名單管理
            </h1>
            <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
              課程 ID: {classId}
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

        {/* 統計信息 */}
        <RosterStats roster={state.roster} />

        {/* 主表格 */}
        {state.loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#999",
            }}
          >
            加載中...
          </div>
        ) : (
          <RosterTable
            roster={state.roster}
            classId={classId}
            onAdd={handleAddStudent}
            onImport={() => setState((prev) => ({ ...prev, showImportModal: true }))}
            onExport={handleExportCSV}
            onEdit={handleEditStudent}
            onRemove={handleRemoveStudent}
            onRefresh={fetchRoster}
            loading={state.saving}
          />
        )}

        {/* 新增/編輯表單模態 */}
        {state.showForm && (
          <div className="modal-overlay" onClick={() =>
            setState((prev) => ({ ...prev, showForm: false }))
          }>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: "500px" }}
            >
              <div className="modal-header">
                <h3>
                  {state.editingStudent ? "編輯學生" : "新增學生"}
                </h3>
                <button
                  className="close-btn"
                  onClick={() =>
                    setState((prev) => ({ ...prev, showForm: false }))
                  }
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <RosterForm
                  student={state.editingStudent}
                  classId={classId}
                  onSubmit={handleSubmitForm}
                  onCancel={() =>
                    setState((prev) => ({ ...prev, showForm: false }))
                  }
                  loading={state.saving}
                />
              </div>
            </div>
          </div>
        )}

        {/* 匯入模態 */}
        <ImportModal
          show={state.showImportModal}
          onConfirm={handleImportCSV}
          onClose={() =>
            setState((prev) => ({ ...prev, showImportModal: false }))
          }
        />
      </div>
    </Layout>
  );
};

export default RosterManagement;

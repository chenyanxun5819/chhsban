import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ClassRosterEntry, TutionClass } from "@/types";
import apiClient from "@/utils/api";
import {
  getClassRoster,
  addRosterStudent,
  withdrawRosterStudent,
  exportRosterToXLSX,
} from "@/services/rosterService";
import { RosterTable, RosterStats } from "@/components/roster";
import { Layout } from "@/components/common/Layout";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { useGradeLabel, useDayLabel } from "@/i18n/labels";
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
  const { user } = useAuth();
  const readOnly = user?.permission === "super_admin";
  const { t } = useTranslation();
  const gradeLabel = useGradeLabel();
  const dayLabel = useDayLabel();
  const [state, setState] = React.useState<PageState>({
    roster: [],
    loading: true,
    saving: false,
    error: "",
  });

  const fetchRoster = React.useCallback(async () => {
    if (!classId) {
      setState((prev) => ({ ...prev, error: t("roster.errorNoClassId"), loading: false }));
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
        error: err.response?.data?.error || err.message || t("roster.errorLoadFailed"),
        loading: false,
      }));
    }
  }, [classId]);

  React.useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // 新增學生
  // 注意：新增後不能單純呼叫 fetchRoster() 重新整頁 —— 後端 roster 名單是用 Cloudflare KV
  // 的 list() 撈的，這個操作是最終一致性的，剛 put() 進去的新項目常常要等數十秒才會出現在
  // list() 結果裡，會讓使用者以為「新增後畫面沒更新」。這裡改成直接把後端回傳的新項目併入
  // 現有名單（樂觀更新），不必等 list() 追上。
  const handleAddStudent = async (studentId: string) => {
    if (!classId) return;
    setState((prev) => ({ ...prev, saving: true, error: "" }));
    try {
      const newEntry = await addRosterStudent(classId, studentId);
      setState((prev) => ({
        ...prev,
        roster: [...prev.roster.filter((s) => s.roster_id !== newEntry.roster_id), newEntry],
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        error: err.response?.data?.error || err.message || t("roster.errorAddFailed"),
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
        error: err.response?.data?.error || err.message || t("roster.errorWithdrawFailed"),
        saving: false,
      }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleExport = () => {
    if (!classId) return;
    exportRosterToXLSX(state.roster, classId);
  };

  const classNameDisplay = state.classInfo
    ? `${state.classInfo.subject} (${gradeLabel(state.classInfo.form)})`
    : t("roster.defaultClassName");
  const pageTitle = readOnly ? t("roster.overviewTitle") : t("roster.manageTitle");

  return (
    <Layout title={pageTitle}>
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
              {classNameDisplay} - {pageTitle}
            </h1>
            <p style={{ margin: "0", color: "#666", fontSize: "14px" }}>
              {t("roster.classNoLabel")}: {state.classInfo?.application_no || classId}
              {state.classInfo && (
                <>
                  {" ・ "}{t("schedule.applicantLabel")}: {state.classInfo.teacher_name_cn}
                  {" ・ "}{t("common.everyDayPrefix")}{dayLabel(state.classInfo.day_of_week)}
                  {" ・ "}
                  {state.classInfo.venue || "-"}
                </>
              )}
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
          <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>{t("welcome.loading")}</div>
        ) : (
          <RosterTable
            roster={state.roster}
            onAddStudent={handleAddStudent}
            onWithdraw={handleWithdraw}
            onExport={handleExport}
            onRefresh={fetchRoster}
            loading={state.saving}
            readOnly={readOnly}
          />
        )}
      </div>
    </Layout>
  );
};

export default RosterManagement;

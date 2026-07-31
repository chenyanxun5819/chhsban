import React from "react";
import { useParams } from "react-router-dom";
import { TutionClass, TutionRoster } from "@/types";
import apiClient from "@/utils/api";
import { Layout } from "@/components/common/Layout";
import "./pdf-download.css";

interface PageState {
  classInfo?: TutionClass;
  roster: TutionRoster[];
  loading: boolean;
  error: string;
  downloadType: "application" | "attendance" | "attendance-report";
  generatingPDF: boolean;
}

const PDFDownloadPage: React.FC = () => {
  const { id: classId } = useParams<{ id: string }>();
  const [state, setState] = React.useState<PageState>({
    loading: true,
    error: "",
    roster: [],
    downloadType: "application",
    generatingPDF: false,
  });

  // 加載課程信息
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

        const [classRes, rosterRes] = await Promise.all([
          apiClient.get(`/api/v1/classes/${classId}`),
          apiClient.get(`/api/v1/rosters?class=${classId}`),
        ]);

        setState((prev) => ({
          ...prev,
          classInfo: classRes.data,
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

  // 處理 PDF 下載
  const handleDownloadPDF = async () => {
    if (!classId) return;

    try {
      setState((prev) => ({ ...prev, generatingPDF: true, error: "" }));

      const response = await apiClient.get(
        `/api/v1/classes/${classId}/pdf?type=${state.downloadType}`,
        { responseType: "blob" }
      );

      // 建立下載連結
      const url = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;

      // 設定檔名
      const filename = `${
        state.downloadType === "application"
          ? "應用表"
          : state.downloadType === "attendance"
            ? "點名表"
            : "出勤報告"
      }-${classId}-${new Date().toISOString().split("T")[0]}.pdf`;

      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setState((prev) => ({ ...prev, generatingPDF: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "PDF 生成失敗",
        generatingPDF: false,
      }));
    }
  };

  return (
    <Layout>
      <div className="pdf-download-page">
        <div className="page-header">
          <h1>📄 PDF 下載</h1>
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
          <div className="pdf-download-container">
            {/* 課程信息 */}
            {state.classInfo && (
              <div className="class-info-card">
                <h2>{state.classInfo.subject} ({state.classInfo.form})</h2>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">科目:</span>
                    <span className="info-value">{state.classInfo.subject}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">年級:</span>
                    <span className="info-value">{state.classInfo.form}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">教師:</span>
                    <span className="info-value">
                      {state.classInfo.teacher_name_cn}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">學費:</span>
                    <span className="info-value">
                      RM {state.classInfo.fees}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">學生數:</span>
                    <span className="info-value">{state.roster.length}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">上課時間:</span>
                    <span className="info-value">
                      {state.classInfo.day_of_week} {state.classInfo.time_start}-{state.classInfo.time_end}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">地點:</span>
                    <span className="info-value">{state.classInfo.venue}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">狀態:</span>
                    <span className={`status-badge ${state.classInfo.approval_status}`}>
                      {state.classInfo.approval_status === "approved"
                        ? "✅ 已批准"
                        : state.classInfo.approval_status === "pending"
                          ? "⏳ 待審"
                          : "❌ 已拒絕"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PDF 下載選項 */}
            <div className="download-options">
              <h3>選擇要下載的文檔</h3>

              <div className="options-grid">
                {/* 申請表 */}
                <div
                  className={`option-card ${
                    state.downloadType === "application" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      downloadType: "application",
                    }))
                  }
                >
                  <div className="option-icon">📋</div>
                  <div className="option-title">申請表</div>
                  <div className="option-description">
                    包含課程基本信息和初始學生名單
                  </div>
                  <div className="option-size">~50 KB</div>
                </div>

                {/* 點名表 */}
                <div
                  className={`option-card ${
                    state.downloadType === "attendance" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      downloadType: "attendance",
                    }))
                  }
                >
                  <div className="option-icon">📝</div>
                  <div className="option-title">點名表</div>
                  <div className="option-description">
                    所有開課日期的學生點名記錄
                  </div>
                  <div className="option-size">~100 KB</div>
                </div>

                {/* 出勤報告 */}
                <div
                  className={`option-card ${
                    state.downloadType === "attendance-report" ? "selected" : ""
                  }`}
                  onClick={() =>
                    setState((prev) => ({
                      ...prev,
                      downloadType: "attendance-report",
                    }))
                  }
                >
                  <div className="option-icon">📊</div>
                  <div className="option-title">出勤報告</div>
                  <div className="option-description">
                    出勤率統計和學生出席情況分析
                  </div>
                  <div className="option-size">~80 KB</div>
                </div>
              </div>

              {/* 下載按鈕 */}
              <div className="download-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleDownloadPDF}
                  disabled={state.generatingPDF}
                >
                  {state.generatingPDF ? (
                    <>
                      <span className="spinner"></span> 生成中...
                    </>
                  ) : (
                    <>📥 下載 PDF</>
                  )}
                </button>

                <p className="download-note">
                  系統將生成 PDF 文檔並自動下載到您的設備
                </p>
              </div>
            </div>

            {/* 預覽信息 */}
            <div className="preview-info">
              <h4>📌 下載文檔包含的內容</h4>

              {state.downloadType === "application" && (
                <div className="content-list">
                  <ul>
                    <li>✅ 課程基本信息</li>
                    <li>✅ 教師聯絡方式</li>
                    <li>✅ 初始學生名單</li>
                    <li>✅ 上課時間表</li>
                    <li>✅ 批准時間戳</li>
                  </ul>
                </div>
              )}

              {state.downloadType === "attendance" && (
                <div className="content-list">
                  <ul>
                    <li>✅ 按日期整理的點名記錄</li>
                    <li>✅ 學生出席狀態 (出席/遲到/缺席)</li>
                    <li>✅ 每次上課的統計數據</li>
                    <li>✅ 出勤率摘要</li>
                    <li>✅ 打印友善的表格格式</li>
                  </ul>
                </div>
              )}

              {state.downloadType === "attendance-report" && (
                <div className="content-list">
                  <ul>
                    <li>✅ 整體出勤率統計</li>
                    <li>✅ 按學生的出勤詳情</li>
                    <li>✅ 缺席趨勢分析</li>
                    <li>✅ 圖表和視覺化數據</li>
                    <li>✅ 管理層級的摘要報告</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PDFDownloadPage;

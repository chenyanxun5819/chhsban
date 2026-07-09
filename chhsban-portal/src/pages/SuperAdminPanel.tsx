import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const SuperAdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="app-container">
      {/* 頭部 */}
      <div className="app-header">
        <h1 className="app-title">超級管理員面板</h1>
        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#d13438",
            padding: "8px 16px",
            borderRadius: "4px",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          登出
        </button>
      </div>

      {/* 內容區 */}
      <div className="app-content fade-in">
        {/* 歡迎卡片 */}
        <div className="card mb-4">
          <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
            歡迎，{user?.teacherName}（超級管理員）
          </h2>
          <p style={{ color: "#858585" }}>
            全系統管理員 - 完整訪問所有功能
          </p>
        </div>

        {/* 系統管理功能 */}
        <div>
          <h3 style={{ fontSize: "16px", marginBottom: "16px", color: "#d4d4d4" }}>系統管理</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* 用戶管理 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>👥 用戶管理</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                管理全校教師、管理員和權限分配
              </p>
              <button>管理用戶</button>
            </div>

            {/* 權限配置 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>🔐 權限配置</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                配置角色、權限和訪問控制
              </p>
              <button>配置權限</button>
            </div>

            {/* 數據備份 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>💾 數據備份</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                導出或導入系統數據
              </p>
              <button>備份</button>
            </div>

            {/* 系統設置 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>⚙️ 系統設置</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                配置系統參數和設置
              </p>
              <button>設置</button>
            </div>

            {/* 審計日誌 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>📝 審計日誌</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                查看系統操作日誌
              </p>
              <button>查看日誌</button>
            </div>

            {/* 維護工具 */}
            <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
              <h4 style={{ fontSize: "16px", marginBottom: "12px" }}>🔧 維護工具</h4>
              <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
                系統檢查和維護工具
              </p>
              <button>打開</button>
            </div>
          </div>
        </div>

        {/* 系統資訊 */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>系統資訊</h3>
          <div style={{ color: "#858585", fontSize: "12px", lineHeight: "1.6" }}>
            <p>• 角色: <strong>超級管理員</strong></p>
            <p>• 郵箱: <strong>{user?.email}</strong></p>
            <p>• 部門: <strong>{user?.department}</strong></p>
            <p>• 權限級別: <strong>4 (最高)</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminPanel;

import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const AdminPanel: React.FC = () => {
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
        <h1 className="app-title">管理員面板</h1>
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
            歡迎，{user?.teacherName}（管理員）
          </h2>
          <p style={{ color: "#858585" }}>
            部門: {user?.department || "全校"}
          </p>
        </div>

        {/* 管理員功能 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
          {/* 審批申請 */}
          <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>📋 審批申請</h3>
            <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
              檢查並審批待審核的申請表單
            </p>
            <button>進入</button>
          </div>

          {/* 數據檢視 */}
          <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>📊 數據檢視</h3>
            <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
              查看部門或全校的統計數據
            </p>
            <button>進入</button>
          </div>

          {/* 報表生成 */}
          <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>📈 報表生成</h3>
            <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
              生成月度或季度報表
            </p>
            <button>生成</button>
          </div>

          {/* 用戶管理 */}
          <div className="card" style={{ padding: "24px", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>👥 用戶管理</h3>
            <p style={{ color: "#858585", marginBottom: "16px", fontSize: "12px" }}>
              管理部門內的教師和管理員
            </p>
            <button>管理</button>
          </div>
        </div>

        {/* 系統資訊 */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>系統資訊</h3>
          <div style={{ color: "#858585", fontSize: "12px" }}>
            <p>• 角色: <strong>管理員</strong></p>
            <p>• 郵箱: <strong>{user?.email}</strong></p>
            <p>• 部門: <strong>{user?.department}</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

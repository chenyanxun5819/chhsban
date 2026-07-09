import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const permissionLabels: Record<string, string> = {
    teacher: "教師",
    viewer: "全局檢視",
    admin: "管理員",
    super_admin: "超級管理員",
  };

  return (
    <div className="app-container">
      {/* 頭部 */}
      <div className="app-header">
        <h1 className="app-title">CHHSBAN - 首頁</h1>
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
            歡迎，{user?.teacherName}
          </h2>
          <p style={{ color: "#858585" }}>
            角色: {permissionLabels[user?.permission || "teacher"]} | 部門: {user?.department || "未知"}
          </p>
        </div>

        {/* 功能按鈕 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "24px" }}>
          {/* 進入公文系統 */}
          <div className="card" style={{ padding: "24px", textAlign: "center", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>公文系統</h3>
            <p style={{ color: "#858585", marginBottom: "16px" }}>管理你的公文申請</p>
            <button onClick={() => window.location.href = "https://acadoc.astcws.workers.dev"}>
              進入系統
            </button>
          </div>

          {/* 進入補習班系統 */}
          <div className="card" style={{ padding: "24px", textAlign: "center", cursor: "pointer" }}>
            <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>補習班系統</h3>
            <p style={{ color: "#858585", marginBottom: "16px" }}>管理你的課程與出勤</p>
            <button onClick={() => window.location.href = "https://tution.astcws.workers.dev"}>
              進入系統
            </button>
          </div>
        </div>

        {/* 額外資訊 */}
        <div className="card" style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>系統資訊</h3>
          <p style={{ color: "#858585", fontSize: "12px", lineHeight: "1.6" }}>
            • 你的權限級別: <strong>{permissionLabels[user?.permission || "teacher"]}</strong><br />
            • 郵箱: <strong>{user?.email}</strong><br />
            • 上次登入: 今天<br />
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

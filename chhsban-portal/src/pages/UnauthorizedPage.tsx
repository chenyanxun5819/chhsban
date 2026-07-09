import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #1e1e1e 0%, #252526 100%)"
    }}>
      <div className="card" style={{
        width: "100%",
        maxWidth: "500px",
        padding: "40px",
        background: "#252526",
        textAlign: "center",
      }}>
        {/* 圖標 */}
        <div style={{
          fontSize: "64px",
          marginBottom: "24px",
        }}>
          🔒
        </div>

        {/* 標題和描述 */}
        <h1 style={{
          fontSize: "24px",
          fontWeight: "600",
          marginBottom: "12px",
          color: "#d4d4d4",
        }}>
          無法訪問
        </h1>

        <p style={{
          color: "#858585",
          marginBottom: "24px",
          lineHeight: "1.6",
        }}>
          你沒有足夠的權限訪問此頁面。<br />
          如果認為這是錯誤，請聯絡管理員。
        </p>

        {/* 按鈕 */}
        <div style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
        }}>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              backgroundColor: "#0e639c",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            返回首頁
          </button>

          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "#d13438",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
            }}
          >
            登出
          </button>
        </div>

        {/* 聯絡方式 */}
        <div style={{
          marginTop: "32px",
          padding: "16px",
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#858585",
        }}>
          <p>遇到問題？</p>
          <p style={{ marginTop: "8px", color: "#007acc" }}>
            📧 聯絡教務處: admin@chhsban.edu.my
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;

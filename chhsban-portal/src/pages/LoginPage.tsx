import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "../styles/App.css";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [manualInput, setManualInput] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(true);

  // 嘗試自動讀取系統登入 email
  useEffect(() => {
    const autoDetectEmail = async () => {
      try {
        // 嘗試使用 Credential Management API
        if (navigator.credentials) {
          const credential = await navigator.credentials.get({
            mediation: "silent",
            // @ts-ignore
            identity: {},
          } as any);

          if (credential) {
            console.log("Credential detected:", credential);
            // 從認證對象中提取 email
            // 這實際上取決於系統實現 - 這是一個簡化版本
          }
        }
      } catch (error) {
        console.log("Auto-detect failed, showing manual input");
      }

      // 檢查 Chrome 自動填充
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput?.value) {
        setEmail(emailInput.value);
      } else {
        // 如果無法自動偵測，顯示手動輸入
        setManualInput(true);
      }

      setIsAutoDetecting(false);
    };

    const timer = setTimeout(autoDetectEmail, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert("請輸入郵箱");
      return;
    }

    try {
      await login(email);
      // 登入成功，根據權限導向
      // 導向邏輯在 App.tsx 中處理
      navigate("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #1e1e1e 0%, #252526 100%)"
    }}>
      <div className="card" style={{
        width: "100%",
        maxWidth: "420px",
        padding: "40px",
        background: "#252526",
      }}>
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: "#d4d4d4" }}>
            CHHSBAN
          </h1>
          <p style={{ color: "#858585" }}>
            教務公文系統登入入口
          </p>
        </div>

        {/* 自動偵測狀態 */}
        {isAutoDetecting && (
          <div className="flex items-center justify-center mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="ml-3" style={{ color: "#858585" }}>正在讀取身份...</p>
          </div>
        )}

        {/* 登入表單 */}
        {!isAutoDetecting && (
          <form onSubmit={handleLogin}>
            {/* Email 輸入 */}
            <div className="mb-6">
              <label htmlFor="email" style={{ color: "#d4d4d4", display: "block", marginBottom: "8px" }}>
                教育郵箱
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@chhsban.edu.my"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isLoading}
                style={{
                  width: "100%",
                  backgroundColor: "#1e1e1e",
                  border: "1px solid #464546",
                  color: "#d4d4d4",
                  padding: "10px 12px",
                }}
              />
            </div>

            {/* 錯誤提示 */}
            {error && (
              <div style={{
                backgroundColor: "rgba(244, 135, 113, 0.1)",
                border: "1px solid #f48771",
                color: "#f48771",
                padding: "12px",
                borderRadius: "4px",
                marginBottom: "16px",
                fontSize: "12px",
              }}>
                {error}
              </div>
            )}

            {/* 登入按鈕 */}
            <button
              type="submit"
              disabled={isLoading || !email}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: isLoading ? "#0a5a80" : "#0e639c",
                color: "white",
                border: "none",
                borderRadius: "4px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading || !email ? 0.6 : 1,
                transition: "background-color 0.2s ease",
              }}
            >
              {isLoading ? "正在登入..." : "確認登入"}
            </button>
          </form>
        )}

        {/* 說明文本 */}
        <div style={{
          marginTop: "24px",
          padding: "16px",
          backgroundColor: "#1e1e1e",
          borderRadius: "4px",
          fontSize: "12px",
          color: "#858585",
          textAlign: "center",
        }}>
          <p>第一次使用？請使用你的教育郵箱登入</p>
          <p style={{ marginTop: "8px" }}>如有問題，請聯絡教務處</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

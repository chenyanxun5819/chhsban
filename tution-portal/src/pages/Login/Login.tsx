import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import "./login.css";

declare global {
  interface Window {
    google: any;
  }
}

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useManualInput, setUseManualInput] = useState(false);

  // 如果已認證，重定向到首頁
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // 初始化 Google Sign-In
  useEffect(() => {
    const initGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });

        const buttonElement = document.getElementById("google-signin-button");
        if (buttonElement) {
          window.google.accounts.id.renderButton(buttonElement, {
            theme: "outline",
            size: "large",
            width: "300",
          });
        }
      }
    };

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = initGoogleSignIn;
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    try {
      setLoading(true);
      setError(null);

      // 解碼 JWT token 獲取 email
      const decoded = JSON.parse(atob(response.credential.split(".")[1]));
      const googleEmail = decoded.email;

      // 調用登入邏輯
      await login(googleEmail);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Google 登入失敗，請重試"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError("請輸入 Email 地址");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "登入失敗，請檢查 Email 是否正確"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* Logo 和標題 */}
        <div className="login-header">
          <div className="logo">🎓</div>
          <h1>補習班管理系統</h1>
          <p className="subtitle">CHHSBAN Tution Portal</p>
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="error-banner">{error}</div>}

        {/* 登入選項切換 */}
        <div className="login-toggle">
          <button
            className={`toggle-btn ${!useManualInput ? "active" : ""}`}
            onClick={() => setUseManualInput(false)}
          >
            Google 登入
          </button>
          <button
            className={`toggle-btn ${useManualInput ? "active" : ""}`}
            onClick={() => setUseManualInput(true)}
          >
            手動登入
          </button>
        </div>

        {/* Google OAuth 登入 */}
        {!useManualInput && (
          <div className="login-section">
            <div id="google-signin-button" className="google-button-wrapper"></div>
            <div className="divider">或</div>
          </div>
        )}

        {/* 手動 Email 登入 */}
        {useManualInput && (
          <form onSubmit={handleManualLogin} className="login-section">
            <div className="form-group">
              <label htmlFor="email">學校 Email 地址</label>
              <input
                id="email"
                type="email"
                placeholder="ecchhs014@chhsban.edu.my"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError(null);
                }}
                disabled={loading}
                className="email-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
            >
              {loading ? "驗證中..." : "驗證並登入"}
            </button>
          </form>
        )}

        {/* 提示訊息 */}
        <div className="login-help">
          <p>💡 提示：</p>
          <ul>
            <li>使用已註冊的教師 Email 進行登入</li>
            <li>支持 Google 帳戶和手動 Email 驗證</li>
            <li>支持 mybazaar.my 和 chhsban.edu.my 域名</li>
          </ul>
        </div>

        {/* 底部信息 */}
        <div className="login-footer">
          <p>© 2026 CHHSBAN | 補習班管理系統 v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

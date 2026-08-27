import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { identifyTeacher, type AuthVerifyResponse } from "@/services/authService";
import { SetPasswordStep } from "./SetPasswordStep";
import { EnterPasswordStep } from "./EnterPasswordStep";
import "./login.css";

declare global {
  interface Window {
    google: any;
  }
}

type LoginStep =
  | { kind: "identify" }
  | { kind: "password_setup"; pendingToken: string; teacherName: string }
  | { kind: "password_login"; pendingToken: string; teacherName: string };

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { completeLogin, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useManualInput, setUseManualInput] = useState(true); // 預設用手動登入
  const [step, setStep] = useState<LoginStep>({ kind: "identify" });

  // 如果已認證，重定向到首頁
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleIdentified = useCallback((email: string) => async () => {
    const result = await identifyTeacher(email);
    if (result.stage === "password_setup") {
      setStep({ kind: "password_setup", pendingToken: result.pendingToken, teacherName: result.teacherName });
    } else {
      setStep({ kind: "password_login", pendingToken: result.pendingToken, teacherName: result.teacherName });
    }
  }, []);

  // 使用 useCallback 確保回調函數不會改變
  const handleGoogleResponse = useCallback(async (response: any) => {
    try {
      setLoading(true);
      setError(null);

      // 解碼 JWT token 獲取 email
      const decoded = JSON.parse(atob(response.credential.split(".")[1]));
      const googleEmail = decoded.email;

      await handleIdentified(googleEmail)();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("login.errorGoogleLoginFailed")
      );
    } finally {
      setLoading(false);
    }
  }, [handleIdentified, t]);

  // 初始化 Google Sign-In
  useEffect(() => {
    const initGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        // 只在尚未初始化時初始化
        try {
          window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
          });
        } catch (err) {
          console.warn("Google Sign-In already initialized");
        }

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

    // 檢查 Google 腳本是否已加載
    if (window.google?.accounts?.id) {
      initGoogleSignIn();
    } else {
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
    }
  }, [handleGoogleResponse]);

  // 當切換到 Google 登入時，重新渲染 Google 按鈕
  useEffect(() => {
    if (step.kind === "identify" && !useManualInput && window.google?.accounts?.id) {
      const buttonElement = document.getElementById("google-signin-button");
      if (buttonElement && buttonElement.innerHTML === "") {
        window.google.accounts.id.renderButton(buttonElement, {
          theme: "outline",
          size: "large",
          width: "300",
        });
      }
    }
  }, [useManualInput, step.kind]);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError(t("login.errorEmailRequired"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await handleIdentified(email)();
    } catch (err) {
      console.error("Manual login failed", {
        email: email.trim().toLowerCase(),
        error: err,
      });
      setError(
        err instanceof Error ? err.message : t("login.errorLoginFailed")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAuthDone = (authData: AuthVerifyResponse) => {
    completeLogin(authData);
    navigate("/");
  };

  const handleBackToIdentify = () => {
    setStep({ kind: "identify" });
    setError(null);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <LanguageToggle className="login-lang-toggle" />

        {/* Logo 和標題 */}
        <div className="login-header">
          <div className="logo">🎓</div>
          <h1>
            {step.kind === "password_setup"
              ? t("login.passwordSetupTitle")
              : step.kind === "password_login"
                ? t("login.passwordLoginTitle")
                : t("login.title")}
          </h1>
          <p className="subtitle">CHHSBAN Tution Portal</p>
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="error-banner">{error}</div>}

        {step.kind === "identify" && (
          <>
            {/* 登入選項切換 */}
            <div className="login-toggle">
              <button
                className={`toggle-btn ${!useManualInput ? "active" : ""}`}
                onClick={() => setUseManualInput(false)}
              >
                {t("login.googleLogin")}
              </button>
              <button
                className={`toggle-btn ${useManualInput ? "active" : ""}`}
                onClick={() => setUseManualInput(true)}
              >
                {t("login.manualLogin")}
              </button>
            </div>

            {/* Google OAuth 登入 */}
            {!useManualInput && (
              <div className="login-section">
                <div id="google-signin-button" className="google-button-wrapper"></div>
                <div className="divider">{t("login.or")}</div>
              </div>
            )}

            {/* 手動 Email 登入 */}
            {useManualInput && (
              <form onSubmit={handleManualLogin} className="login-section">
                <div className="form-group">
                  <label htmlFor="email">{t("login.emailLabel")}</label>
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
                  className={`submit-btn${loading ? " is-loading" : ""}`}
                >
                  {loading ? t("login.verifying") : t("login.verifyAndLogin")}
                </button>
              </form>
            )}

            {/* 提示訊息 */}
            <div className="login-help">
              <p>{t("login.tipsTitle")}</p>
              <ul>
                <li>{t("login.tip1")}</li>
                <li>{t("login.tip2")}</li>
                <li>{t("login.tip3")}</li>
              </ul>
            </div>
          </>
        )}

        {step.kind === "password_setup" && (
          <SetPasswordStep
            pendingToken={step.pendingToken}
            teacherName={step.teacherName}
            onDone={handleAuthDone}
            onError={setError}
          />
        )}

        {step.kind === "password_login" && (
          <EnterPasswordStep
            pendingToken={step.pendingToken}
            teacherName={step.teacherName}
            onDone={handleAuthDone}
          />
        )}

        {step.kind !== "identify" && (
          <button type="button" className="toggle-btn" onClick={handleBackToIdentify} style={{ width: "100%" }}>
            {t("login.back")}
          </button>
        )}

        {/* 底部信息 */}
        <div className="login-footer">
          <p>{t("login.footer")}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

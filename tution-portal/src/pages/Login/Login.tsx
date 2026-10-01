import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { identifyTeacher, loginWithGoogle, type AuthVerifyResponse } from "@/services/authService";
import { GoogleSignInButton } from "@/components/common/GoogleSignInButton";
import { SetPasswordStep } from "./SetPasswordStep";
import { EnterPasswordStep } from "./EnterPasswordStep";
import "./login.css";

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

  // 私人 Google 帳號登入：credential（ID token）交給後端驗證簽章，後端以綁定的 google_email 找到教師
  const handleGoogleCredential = async (credential: string) => {
    try {
      setLoading(true);
      setError(null);
      handleAuthDone(await loginWithGoogle(credential));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errorGoogleLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

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
            {/* 私人 Google 帳號登入（主要方式） */}
            <div className="login-section">
              <p>{t("login.googleHint")}</p>
              <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
              <div className="divider">{t("login.or")}</div>
            </div>

            {/* 過渡期：已設定密碼的老師用學校 Email + 密碼 */}
            {(
              <form onSubmit={handleManualLogin} className="login-section">
                <p className="login-fallback-hint">{t("login.passwordFallbackHint")}</p>
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

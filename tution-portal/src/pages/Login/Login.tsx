import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { loginWithGoogle } from "@/services/authService";
import { GoogleSignInButton } from "@/components/common/GoogleSignInButton";
import "./login.css";

/** 登入頁：唯一的登入方式是管理員開放並綁定的私人 Google 帳號（學校 Email + 密碼已於 2026-10-01 停用） */
export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { completeLogin, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 如果已認證，重定向到首頁
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // credential（Google ID token）交給後端驗證簽章，後端以綁定的 google_email 找到教師
  const handleGoogleCredential = async (credential: string) => {
    try {
      setLoading(true);
      setError(null);
      completeLogin(await loginWithGoogle(credential));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.errorGoogleLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <LanguageToggle className="login-lang-toggle" />

        {/* Logo 和標題 */}
        <div className="login-header">
          <div className="logo">🎓</div>
          <h1>{t("login.title")}</h1>
          <p className="subtitle">CHHSBAN Tution Portal</p>
        </div>

        {/* 錯誤訊息 */}
        {error && <div className="error-banner">{error}</div>}

        <div className="login-section">
          <p>{t("login.googleHint")}</p>
          <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
          {loading && <p>{t("login.verifying")}</p>}
        </div>

        {/* 提示訊息 */}
        <div className="login-help">
          <p>{t("login.tipsTitle")}</p>
          <ul>
            <li>{t("login.tip1")}</li>
            <li>{t("login.tip2")}</li>
          </ul>
        </div>

        {/* 底部信息 */}
        <div className="login-footer">
          <p>{t("login.footer")}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;

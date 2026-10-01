import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { loginWithGoogle } from "@/services/authService";
import { GoogleSignInButton } from "@/components/common/GoogleSignInButton";
import { LanguageToggle } from "@/components/common/LanguageToggle";

/** 登入頁：唯一的登入方式是管理員開放並綁定的私人 Google 帳號（學校 Email + 密碼已於 2026-10-01 停用） */
const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { completeLogin, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleGoogleCredential = async (credential: string) => {
    try {
      setLoading(true);
      setError(null);
      completeLogin(await loginWithGoogle(credential));
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.googleFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <LanguageToggle className="login-lang-toggle" />
        <h1>{t("common.appTitle")}</h1>
        <p className="subtitle">{t("login.subtitle")}</p>

        {error && <p className="error-text">{error}</p>}

        <p>{t("login.googleHint")}</p>
        <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
        {loading && <p style={{ marginTop: 12 }}>{t("login.loggingIn")}</p>}

        <p style={{ color: "#666", fontSize: 14, marginTop: 24 }}>{t("login.noAccessHint")}</p>
      </div>
    </div>
  );
};

export default Login;

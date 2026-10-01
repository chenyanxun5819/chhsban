import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/auth/AuthContext";
import { loginWithGoogle } from "@/shared/auth/authService";
import { GoogleSignInButton } from "@/shared/components/GoogleSignInButton";

/** 登入頁：唯一的登入方式是管理員開放並綁定的私人 Google 帳號（學校 Email + 密碼已於 2026-10-01 停用） */
const Login: React.FC = () => {
  const navigate = useNavigate();
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
      setError(err instanceof Error ? err.message : "Google 登入失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>行政管理站</h1>
        <p className="subtitle">CHHSBAN Admin Portal</p>

        {error && <p className="error-text">{error}</p>}

        <p>請使用管理員為您開放的私人 Google 帳號登入：</p>
        <GoogleSignInButton onCredential={handleGoogleCredential} onError={setError} />
        {loading && <p style={{ marginTop: 12 }}>登入中...</p>}

        <p style={{ color: "#666", fontSize: 14, marginTop: 24 }}>
          無法登入？請聯絡系統管理員，提供您的私人 Gmail 以開放登入。學校信箱不能用來登入。
        </p>
      </div>
    </div>
  );
};

export default Login;

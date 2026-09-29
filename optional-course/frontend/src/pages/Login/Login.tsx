import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  identifyTeacher,
  generateSystemPassword,
  setPassword,
  loginWithPassword,
  type AuthVerifyResponse,
} from "@/services/authService";
import eyeIcon from "@/assets/eye.svg";
import eyeClosedIcon from "@/assets/eye-closed.svg";

type LoginStep =
  | { kind: "identify" }
  | { kind: "password_setup"; pendingToken: string; teacherName: string }
  | { kind: "password_login"; pendingToken: string; teacherName: string };

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { completeLogin, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPasswordInput] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>({ kind: "identify" });

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated, navigate]);

  const handleAuthDone = (authData: AuthVerifyResponse) => {
    completeLogin(authData);
    navigate("/");
  };

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("請輸入 Email");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await identifyTeacher(email);
      if (result.stage === "password_setup") {
        setStep({ kind: "password_setup", pendingToken: result.pendingToken, teacherName: result.teacherName });
      } else {
        setStep({ kind: "password_login", pendingToken: result.pendingToken, teacherName: result.teacherName });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "驗證失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePassword = async () => {
    if (step.kind !== "password_setup") return;
    try {
      setLoading(true);
      setError(null);
      const generated = await generateSystemPassword(step.pendingToken);
      setPasswordInput(generated);
      setPassword2(generated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "產生密碼失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "password_setup") return;
    if (password !== password2) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const authData = await setPassword(step.pendingToken, password);
      handleAuthDone(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "設定密碼失敗");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "password_login") return;
    try {
      setLoading(true);
      setError(null);
      const authData = await loginWithPassword(step.pendingToken, password);
      handleAuthDone(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "登入失敗");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>
          {step.kind === "password_setup"
            ? "首次登入，設定密碼"
            : step.kind === "password_login"
              ? "輸入密碼"
              : "選修課點名系統"}
        </h1>
        <p className="subtitle">CHHSBAN Optional Course</p>

        {error && <p className="error-text">{error}</p>}

        {step.kind === "identify" && (
          <form onSubmit={handleIdentify}>
            <div className="form-row">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="ecchhs014@chhsban.edu.my"
              />
            </div>
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "驗證中..." : "驗證並登入"}
            </button>
          </form>
        )}

        {step.kind === "password_setup" && (
          <form onSubmit={handleSetPassword}>
            <p>{step.teacherName}，您好，這是您第一次登入，請設定密碼。</p>
            <div className="form-row">
              <label htmlFor="password">密碼（至少 10 碼，含大小寫字母、數字、符號）</label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password2">再次輸入密碼</label>
              <input
                id="password2"
                type="text"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="button" className="btn" onClick={handleGeneratePassword} disabled={loading}>
              幫我產生一組密碼
            </button>{" "}
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "設定中..." : "設定密碼並登入"}
            </button>
          </form>
        )}

        {step.kind === "password_login" && (
          <form onSubmit={handleLoginPassword}>
            <p>{step.teacherName}，您好，請輸入密碼。</p>
            <div className="form-row">
              <label htmlFor="password">密碼</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  tabIndex={-1}
                  aria-label={showPassword ? "隱藏密碼" : "顯示密碼"}
                  title={showPassword ? "隱藏密碼" : "顯示密碼"}
                >
                  <img src={showPassword ? eyeClosedIcon : eyeIcon} alt="" />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? "登入中..." : "登入"}
            </button>
          </form>
        )}

        {step.kind !== "identify" && (
          <p style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep({ kind: "identify" })}>
              返回
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;

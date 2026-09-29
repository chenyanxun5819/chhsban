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
      setError("请输入 Email");
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
      setError(err instanceof Error ? err.message : "验证失败，请稍后再试");
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
      setError(err instanceof Error ? err.message : "产生密码失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "password_setup") return;
    if (password !== password2) {
      setError("两次输入的密码不一致");
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const authData = await setPassword(step.pendingToken, password);
      handleAuthDone(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "设定密码失败");
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
      setError(err instanceof Error ? err.message : "登入失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>
          {step.kind === "password_setup"
            ? "首次登入，设定密码"
            : step.kind === "password_login"
              ? "输入密码"
              : "选修课点名系统"}
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
              {loading ? "验证中..." : "验证并登入"}
            </button>
          </form>
        )}

        {step.kind === "password_setup" && (
          <form onSubmit={handleSetPassword}>
            <p>{step.teacherName}，您好，这是您第一次登入，请设定密码。</p>
            <div className="form-row">
              <label htmlFor="password">密码（至少 10 码，含大小写字母、数字、符号）</label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password2">再次输入密码</label>
              <input
                id="password2"
                type="text"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="button" className="btn" onClick={handleGeneratePassword} disabled={loading}>
              帮我产生一组密码
            </button>{" "}
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "设定中..." : "设定密码并登入"}
            </button>
          </form>
        )}

        {step.kind === "password_login" && (
          <form onSubmit={handleLoginPassword}>
            <p>{step.teacherName}，您好，请输入密码。</p>
            <div className="form-row">
              <label htmlFor="password">密码</label>
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
                  aria-label={showPassword ? "隐藏密码" : "显示密码"}
                  title={showPassword ? "隐藏密码" : "显示密码"}
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

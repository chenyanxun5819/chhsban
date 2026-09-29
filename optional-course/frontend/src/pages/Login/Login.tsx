import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { LanguageToggle } from "@/components/common/LanguageToggle";

type LoginStep =
  | { kind: "identify" }
  | { kind: "password_setup"; pendingToken: string; teacherName: string }
  | { kind: "password_login"; pendingToken: string; teacherName: string };

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
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
      setError(t("login.emailRequired"));
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
      setError(err instanceof Error ? err.message : t("login.verifyFailed"));
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
      setError(err instanceof Error ? err.message : t("login.generateFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step.kind !== "password_setup") return;
    if (password !== password2) {
      setError(t("login.passwordMismatch"));
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const authData = await setPassword(step.pendingToken, password);
      handleAuthDone(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("login.setPasswordFailed"));
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
      setError(err instanceof Error ? err.message : t("login.loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <LanguageToggle className="login-lang-toggle" />
        <h1>
          {step.kind === "password_setup"
            ? t("login.setupTitle")
            : step.kind === "password_login"
              ? t("login.passwordTitle")
              : t("common.appTitle")}
        </h1>
        <p className="subtitle">{t("login.subtitle")}</p>

        {error && <p className="error-text">{error}</p>}

        {step.kind === "identify" && (
          <form onSubmit={handleIdentify}>
            <div className="form-row">
              <label htmlFor="email">{t("login.email")}</label>
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
              {loading ? t("login.verifying") : t("login.verifyAndLogin")}
            </button>
          </form>
        )}

        {step.kind === "password_setup" && (
          <form onSubmit={handleSetPassword}>
            <p>{t("login.firstLoginHello", { name: step.teacherName })}</p>
            <div className="form-row">
              <label htmlFor="password">{t("login.passwordRule")}</label>
              <input
                id="password"
                type="text"
                value={password}
                onChange={(e) => setPasswordInput(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="form-row">
              <label htmlFor="password2">{t("login.passwordAgain")}</label>
              <input
                id="password2"
                type="text"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                disabled={loading}
              />
            </div>
            <button type="button" className="btn" onClick={handleGeneratePassword} disabled={loading}>
              {t("login.generatePassword")}
            </button>{" "}
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? t("login.settingPassword") : t("login.setPasswordAndLogin")}
            </button>
          </form>
        )}

        {step.kind === "password_login" && (
          <form onSubmit={handleLoginPassword}>
            <p>{t("login.passwordHello", { name: step.teacherName })}</p>
            <div className="form-row">
              <label htmlFor="password">{t("login.password")}</label>
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
                  aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                  title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                >
                  <img src={showPassword ? eyeClosedIcon : eyeIcon} alt="" />
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn--primary" disabled={loading} style={{ width: "100%" }}>
              {loading ? t("login.loggingIn") : t("login.login")}
            </button>
          </form>
        )}

        {step.kind !== "identify" && (
          <p style={{ marginTop: 16 }}>
            <button type="button" className="btn btn--ghost" onClick={() => setStep({ kind: "identify" })}>
              {t("login.back")}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;

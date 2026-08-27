import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { loginWithPassword, type AuthVerifyResponse } from "@/services/authService";

interface EnterPasswordStepProps {
  pendingToken: string;
  teacherName: string;
  onDone: (authData: AuthVerifyResponse) => void;
}

export const EnterPasswordStep: React.FC<EnterPasswordStepProps> = ({
  pendingToken,
  teacherName,
  onDone,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError(t("login.errorPasswordRequired"));
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const authData = await loginWithPassword(pendingToken, password);
      onDone(authData);
    } catch (err) {
      const anyErr = err as Error & { remainingAttempts?: number; retryAfterSeconds?: number };
      if (typeof anyErr.remainingAttempts === "number") {
        setError(t("login.remainingAttempts", { count: anyErr.remainingAttempts }));
      } else if (typeof anyErr.retryAfterSeconds === "number") {
        setError(t("login.tooManyAttempts", { seconds: anyErr.retryAfterSeconds }));
      } else {
        setError(anyErr.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-section">
      <p className="subtitle" style={{ marginBottom: 16 }}>
        {t("login.passwordLoginSubtitle", { name: teacherName })}
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="login-password">{t("login.passwordLabel")}</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            disabled={loading}
            className="email-input"
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading} className={`submit-btn${loading ? " is-loading" : ""}`}>
          {loading ? t("login.loggingIn") : t("login.submitPasswordButton")}
        </button>
      </form>
    </div>
  );
};

export default EnterPasswordStep;

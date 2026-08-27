import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { validatePasswordStrength } from "@chhsban/kv-utils/validation";
import type { PasswordRuleError } from "@chhsban/kv-utils/types";
import { generateSystemPassword, setPassword, type AuthVerifyResponse } from "@/services/authService";
import { PasswordInput } from "./PasswordInput";

interface SetPasswordStepProps {
  pendingToken: string;
  teacherName: string;
  onDone: (authData: AuthVerifyResponse) => void;
  onError: (message: string) => void;
}

const ALL_RULES: PasswordRuleError[] = [
  "TOO_SHORT",
  "MISSING_LOWERCASE",
  "MISSING_UPPERCASE",
  "MISSING_DIGIT",
  "MISSING_SYMBOL",
];

export const SetPasswordStep: React.FC<SetPasswordStepProps> = ({
  pendingToken,
  teacherName,
  onDone,
  onError,
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"custom" | "generate">("custom");
  const [loading, setLoading] = useState(false);

  // 自訂密碼 tab
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const validation = validatePasswordStrength(password);

  // 系統產生 tab
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmedRemembered, setConfirmedRemembered] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const pwd = await generateSystemPassword(pendingToken);
      setGeneratedPassword(pwd);
      setCopied(false);
      setConfirmedRemembered(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
    } catch {
      // 剪貼簿權限不可用時忽略，使用者仍可手動選取複製
    }
  };

  const submitPassword = async (finalPassword: string) => {
    try {
      setLoading(true);
      const authData = await setPassword(pendingToken, finalPassword);
      onDone(authData);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      onError(t("login.passwordMismatch"));
      return;
    }
    void submitPassword(password);
  };

  const handleGeneratedContinue = () => {
    if (!generatedPassword) return;
    void submitPassword(generatedPassword);
  };

  return (
    <div className="login-section">
      <p className="subtitle" style={{ marginBottom: 16 }}>
        {t("login.passwordSetupSubtitle", { name: teacherName })}
      </p>

      <div className="login-toggle">
        <button
          type="button"
          className={`toggle-btn ${mode === "custom" ? "active" : ""}`}
          onClick={() => setMode("custom")}
        >
          {t("login.tabCustomPassword")}
        </button>
        <button
          type="button"
          className={`toggle-btn ${mode === "generate" ? "active" : ""}`}
          onClick={() => setMode("generate")}
        >
          {t("login.tabGeneratePassword")}
        </button>
      </div>

      {mode === "custom" && (
        <form onSubmit={handleCustomSubmit}>
          <div className="form-group">
            <label htmlFor="new-password">{t("login.passwordLabel")}</label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPasswordValue(e.target.value)}
              disabled={loading}
              showLabel={t("login.showPassword")}
              hideLabel={t("login.hidePassword")}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">{t("login.confirmPasswordLabel")}</label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              showLabel={t("login.showPassword")}
              hideLabel={t("login.hidePassword")}
            />
          </div>

          {password.length > 0 && (
            <ul className="login-help" style={{ listStyle: "none", padding: 12, margin: "0 0 16px 0" }}>
              {ALL_RULES.map((rule) => (
                <li key={rule} style={{ color: validation.errors.includes(rule) ? "#dc2626" : "#16a34a" }}>
                  {validation.errors.includes(rule) ? "✗" : "✓"} {t(`login.passwordRule.${rule}`)}
                </li>
              ))}
            </ul>
          )}

          <button
            type="submit"
            disabled={loading || !validation.valid || password !== confirmPassword || password.length === 0}
            className={`submit-btn${loading ? " is-loading" : ""}`}
          >
            {loading ? t("login.settingPassword") : t("login.continueButton")}
          </button>
        </form>
      )}

      {mode === "generate" && (
        <div>
          {!generatedPassword && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className={`submit-btn${loading ? " is-loading" : ""}`}
            >
              {loading ? t("login.generatingPassword") : t("login.generatePasswordButton")}
            </button>
          )}

          {generatedPassword && (
            <>
              <div className="form-group">
                <label>{t("login.generatedPasswordLabel")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    readOnly
                    value={generatedPassword}
                    className="email-input"
                    style={{ fontFamily: "monospace", flex: 1 }}
                  />
                  <button type="button" className="toggle-btn" onClick={handleCopy}>
                    {copied ? t("login.copied") : t("login.copyButton")}
                  </button>
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={confirmedRemembered}
                  onChange={(e) => setConfirmedRemembered(e.target.checked)}
                />
                {t("login.confirmRememberedPassword")}
              </label>

              <button
                type="button"
                onClick={handleGeneratedContinue}
                disabled={loading || !confirmedRemembered}
                className={`submit-btn${loading ? " is-loading" : ""}`}
              >
                {loading ? t("login.settingPassword") : t("login.continueButton")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SetPasswordStep;

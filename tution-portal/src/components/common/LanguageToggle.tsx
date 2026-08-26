import React from "react";
import { useTranslation } from "react-i18next";
import { LANG_STORAGE_KEY } from "@/i18n";
import "./language-toggle.css";

interface LanguageToggleProps {
  className?: string;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith("en");

  const toggleLanguage = () => {
    const next = isEnglish ? "zh" : "en";
    i18n.changeLanguage(next);
    localStorage.setItem(LANG_STORAGE_KEY, next);
  };

  const label = isEnglish ? t("common.switchToChinese") : t("common.switchToEnglish");

  return (
    <button
      type="button"
      className={className ? `lang-toggle ${className}` : "lang-toggle"}
      onClick={toggleLanguage}
      aria-label={label}
      title={label}
    >
      {isEnglish ? "中" : "EN"}
    </button>
  );
};

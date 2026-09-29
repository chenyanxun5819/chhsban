import React from "react";
import { useTranslation } from "react-i18next";
import { LANG_STORAGE_KEY } from "@/i18n";

interface LanguageToggleProps {
  className?: string;
}

// 與 tution-portal 的 LanguageToggle 相同：中文時顯示「EN」，英文時顯示「中」
export const LanguageToggle: React.FC<LanguageToggleProps> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const isEnglish = i18n.language.startsWith("en");

  const toggleLanguage = () => {
    const next = isEnglish ? "zh" : "en";
    i18n.changeLanguage(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // 無法寫入時只影響下次開啟的預設語言
    }
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

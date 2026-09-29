import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./locales/zh.json";
import en from "./locales/en.json";

// 與 tution-portal 的 src/i18n/index.ts 相同的模式：語言存在 localStorage，首次依瀏覽器語言判斷
export const LANG_STORAGE_KEY = "lang";

function detectInitialLanguage(): "zh" | "en" {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // localStorage 不可用時退回瀏覽器語言
  }
  return navigator.language.toLowerCase().startsWith("en") ? "en" : "zh";
}

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: "zh",
  interpolation: {
    escapeValue: false,
  },
});

// <html lang> 與分頁標題跟著語言切換
const applyDocumentLanguage = (lng: string) => {
  document.documentElement.lang = lng === "en" ? "en" : "zh-CN";
  document.title = `${i18n.t("common.appTitle")} - CHHSBAN`;
};
applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;

/**
 * 只有中文的翻譯替代品：管理站只給行政人員使用，不做中英切換。
 * 介面與 react-i18next 的 useTranslation 相容，從 tution-portal 搬來的元件不用改寫翻譯呼叫；
 * 文字取自 tution-portal 的 zh.json（同步複製一份在 ./zh.json）。
 */
import zh from "./zh.json";

type Options = { defaultValue?: string; count?: number; [key: string]: unknown };

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node && typeof node === "object") return (node as Record<string, unknown>)[part];
    return undefined;
  }, zh);
}

export function t(key: string, options: Options = {}): string {
  const found = lookup(key) ?? lookup(`${key}_other`);
  const text = typeof found === "string" ? found : options.defaultValue ?? key;
  return text.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
    const value = options[name];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function useTranslation() {
  return { t };
}

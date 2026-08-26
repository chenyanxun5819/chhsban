import { useTranslation } from "react-i18next";
import { GRADE_CODE_MAP } from "@/utils/validators";

/** 將年級中文值（如 "初一"）依當前語言轉為顯示文字 */
export function useGradeLabel() {
  const { t } = useTranslation();
  return (value: string): string => {
    const code = GRADE_CODE_MAP[value];
    return code ? t(`grade.${code}`) : value;
  };
}

/** 將星期值（如 "Monday"）依當前語言轉為顯示文字 */
export function useDayLabel() {
  const { t } = useTranslation();
  return (value: string): string => t(`day.${value}`, { defaultValue: value });
}

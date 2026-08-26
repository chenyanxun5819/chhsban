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

const WEEKDAY_CODES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** 依 Date.getUTCDay() 索引（0=週日）取得星期簡稱，供日期後綴顯示用 */
export function useWeekdayShort() {
  const { t } = useTranslation();
  return (dayIndex: number): string => t(`weekdayShort.${WEEKDAY_CODES[dayIndex]}`);
}

const ATTENDANCE_STATUS_CODE_MAP: Record<string, string> = {
  "到課": "present",
  "缺席": "absent",
  "遲到": "late",
  "請假": "excuse",
};

/** 將出勤狀態中文值（如 "到課"）依當前語言轉為顯示文字 */
export function useAttendanceStatusLabel() {
  const { t } = useTranslation();
  return (value: string): string => {
    const code = ATTENDANCE_STATUS_CODE_MAP[value];
    return code ? t(`attendanceStatus.${code}`) : value;
  };
}

const EXCUSE_REASON_CODE_MAP: Record<string, string> = {
  "事假": "personal",
  "病假": "sick",
  "公假": "official",
  "特假": "special",
  "喪假": "bereavement",
  "活動開會": "activity",
  "其他": "other",
};

/** 將請假理由中文值依當前語言轉為顯示文字（實際比對/儲存值仍為中文，不受此影響） */
export function useExcuseReasonLabel() {
  const { t } = useTranslation();
  return (value: string): string => {
    const code = EXCUSE_REASON_CODE_MAP[value];
    return code ? t(`excuseReason.${code}`) : value;
  };
}

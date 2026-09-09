/**
 * 選修課點名系統 - 本地型別定義
 *
 * 刻意不放進共用的 @chhsban/kv-utils：目前只有本專案會用到這些型別，
 * 等真的有第二個消費者需要時，再考慮升級成共用套件（避免對三個既有專案
 * 都依賴的共用套件做不必要的變動）。
 *
 * 形狀參考 @chhsban/kv-utils 的 TutionClass/TutionRoster/TutionSchedule/TutionAttendance，
 * 拿掉收費（fees）欄位，approval_status 改為 window_status（課程窗口狀態）。
 */

/**
 * 課程窗口狀態
 * pending：行政人員已建課，但尚未綁定授課老師
 * open：已綁定老師且行政人員開放窗口，老師可自行管理名冊/排課/點名
 * closed：行政人員關閉窗口，後續唯讀
 */
export enum CourseWindowStatus {
  PENDING = "pending",
  OPEN = "open",
  CLOSED = "closed",
}

export interface OptionalCourse {
  course_id: string; // course_<ts>_<rand>
  teacher_id?: string; // FK -> TEACHER_KV（共用），未綁定前為空
  teacher_name_cn?: string;
  subject: string; // 選修課名稱
  form?: "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
  day_of_week?:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  time_start?: string;
  time_end?: string;
  start_date?: string; // YYYY-MM-DD，綁定老師後由老師自行設定
  end_date?: string;
  venue?: string;
  max_students?: number;
  window_status: CourseWindowStatus;
  created_by: string; // 建課的行政人員 teacher_id
  bound_at?: number;
  opened_at?: number;
  closed_at?: number;
  created_at: number;
  updated_at: number;
}

export interface OptionalCourseRoster {
  roster_id: string; // roster_<ts>_<rand>
  course_id: string; // FK -> OptionalCourse
  student_id: string; // FK -> STUDENT_KV（共用，KV 主鍵，內部編號如 "5801"）
  student_no: string; // 學校發放的學號（STUDENT_KV 記錄的 student_no 欄位，如 "21342"），畫面顯示用
  student_name_cn: string;
  student_name_en: string;
  student_class: string;
  enrollment_date: string; // YYYY-MM-DD
  withdrawal_date?: string;
  withdrawal_reason?: string;
  is_active: boolean; // 動態計算：無 withdrawal_date = true
  created_at: number;
  updated_at: number;
}

/**
 * 排課例外記錄：只儲存「例外」（停課／調課），沒有例外記錄的上課日一律視為有開課
 * （由前端依 day_of_week + start_date 推算，不寫入 KV），與 tution 系統的排課邏輯一致。
 */
export enum CourseScheduleStatus {
  CANCELLED = "cancelled",
  RESCHEDULED = "rescheduled",
}

export interface OptionalCourseSchedule {
  schedule_id: string; // schedule_<ts>_<rand>
  course_id: string; // FK -> OptionalCourse
  scheduled_date: string; // YYYY-MM-DD，原本該上課的日期
  status: CourseScheduleStatus;
  cancellation_reason?: string; // status=cancelled 時必填
  rescheduled_to?: string; // status=rescheduled 時必填
  rescheduled_venue?: string;
  reschedule_reason?: string;
  created_at: number;
  updated_at: number;
}

export enum CourseAttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  EXCUSE = "excuse",
}

export interface OptionalCourseAttendance {
  attendance_id: string; // attendance_<ts>_<rand>
  course_id: string; // FK -> OptionalCourse
  student_id: string; // FK -> STUDENT_KV / OptionalCourseRoster
  class_date: string; // YYYY-MM-DD
  status: CourseAttendanceStatus;
  absence_reason?: string;
  recorded_at: number;
  recorded_by?: string; // 記錄者 teacher_id
}

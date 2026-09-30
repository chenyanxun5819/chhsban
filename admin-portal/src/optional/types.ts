// 選修課管理的型別：對應 optional-course/worker/src/types.ts（前後端各自宣告，以 API 回應為準）

export type CourseWindowStatus = "pending" | "open" | "closed";

export type Weekday =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export interface OptionalCourse {
  course_id: string;
  course_no: string; // 如 optional-26-01
  year: number;
  teacher_id?: string;
  teacher_name_cn?: string;
  subject: string;
  day_of_week?: Weekday;
  time_start?: string;
  time_end?: string;
  start_date?: string;
  end_date?: string;
  venue?: string;
  window_status: CourseWindowStatus;
  created_at: number;
  updated_at: number;
}

export interface TeacherOption {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  email: string;
  department: string;
}

export type CourseScheduleStatus = "cancelled" | "rescheduled";

export interface OptionalCourseSchedule {
  schedule_id: string;
  course_id: string;
  scheduled_date: string;
  status: CourseScheduleStatus;
  cancellation_reason?: string;
  rescheduled_to?: string;
  rescheduled_venue?: string;
  reschedule_reason?: string;
  created_at: number;
  updated_at: number;
}

// ===== 名冊／點名（點名總覽用，唯讀） =====

export interface OptionalCourseRoster {
  roster_id: string;
  course_id: string;
  student_id: string;
  student_no: string;
  student_name_cn: string;
  student_name_en: string;
  student_class: string;
  enrollment_date: string;
  withdrawal_date?: string;
  withdrawal_reason?: string;
  is_active: boolean;
}

export type CourseAttendanceStatus = "present" | "absent" | "late" | "excuse";

export interface OptionalCourseAttendance {
  attendance_id: string;
  course_id: string;
  student_id: string;
  class_date: string;
  status: CourseAttendanceStatus;
  absence_reason?: string;
}

// ===== 學校行事曆 =====

export type HolidayType = "public" | "school_break" | "event";

export interface SchoolHoliday {
  holiday_id: string; // 新增時前端先給空字串，由 worker 產生
  start_date: string;
  end_date: string;
  name: string;
  type: HolidayType;
}

export interface SchoolMakeupDay {
  date: string;
  follows_weekday: Weekday;
  note?: string;
}

export interface SchoolCalendar {
  year: number;
  term_start?: string;
  term_end?: string;
  holidays: SchoolHoliday[];
  makeup_days: SchoolMakeupDay[];
  updated_at: number;
  updated_by?: string;
}

export interface CalendarConflict {
  course_id: string;
  course_no: string;
  subject: string;
  teacher_name_cn?: string;
  date: string;
}

export interface CourseSession {
  date: string;
  rescheduled_from?: string;
  venue?: string;
  recorded: boolean;
  missing: boolean; // 應該已經點名但沒有紀錄
}

export interface CourseSessionsInfo {
  calendar_ready: boolean;
  day_of_week: Weekday | null;
  today: string;
  sessions: CourseSession[];
}

export interface CourseAttendanceSummary {
  course_id: string;
  course_no: string;
  subject: string;
  teacher_id?: string;
  teacher_name_cn?: string;
  day_of_week: Weekday | null;
  window_status: CourseWindowStatus;
  total_sessions: number;
  due_count: number;
  recorded_count: number;
  missing_dates: string[];
}

export interface AttendanceSummary {
  calendar_ready: boolean;
  today: string;
  courses: CourseAttendanceSummary[];
}

// ===== 各課程開課報表（GET /v1/reports/course-summary，欄位對齊補習班的開課報表，沒有結束日期） =====

export interface CourseReportRow {
  course_id: string;
  course_no: string;
  teacher_id?: string;
  teacher_name_cn?: string;
  subject: string;
  window_status: CourseWindowStatus;
  day_of_week: Weekday | null;
  expected_count: number;
  actual_held_count: number;
  cancelled_count: number;
  unconfirmed_attendance_count: number;
  active_roster_count: number;
  withdrawn_roster_count: number;
  /** 百分比 0-100（到課+遲到 / 已點名總筆數）；尚無任何點名紀錄時為 null */
  attendance_rate: number | null;
  absent_count: number;
  excuse_count: number;
  late_count: number;
}

export interface CourseReportSummary {
  calendar_ready: boolean;
  generated_at: number;
  rows: CourseReportRow[];
}

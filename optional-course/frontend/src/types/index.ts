// 認證相關型別：與 tution-portal 的 src/types/index.ts 完全一致（共用同一套登入系統）
export type Permission = "teacher" | "viewer" | "admin" | "super_admin" | "classroom_manager";

export interface AuthUser {
  teacherId: string;
  teacherName: string;
  permission: Permission;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ========== 選修課點名系統業務型別 ==========
// 形狀對應 worker/src/types.ts 的 OptionalCourse 系列（前後端各自宣告，
// 沿用 tution-portal 對 worker 型別的處理方式：以 API 回應內容為準，不共用型別定義）

export type CourseWindowStatus = "pending" | "open" | "closed";

export interface OptionalCourse {
  course_id: string;
  teacher_id?: string;
  teacher_name_cn?: string;
  subject: string;
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
  start_date?: string;
  end_date?: string;
  venue?: string;
  max_students?: number;
  window_status: CourseWindowStatus;
  created_by: string;
  bound_at?: number;
  opened_at?: number;
  closed_at?: number;
  created_at: number;
  updated_at: number;
}

export interface OptionalCourseRoster {
  roster_id: string;
  course_id: string;
  student_id: string;
  student_name_cn: string;
  student_name_en: string;
  student_class: string;
  enrollment_date: string;
  withdrawal_date?: string;
  withdrawal_reason?: string;
  is_active: boolean;
  created_at: number;
  updated_at: number;
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

export type CourseAttendanceStatus = "present" | "absent" | "late" | "excuse";

export interface OptionalCourseAttendance {
  attendance_id: string;
  course_id: string;
  student_id: string;
  class_date: string;
  status: CourseAttendanceStatus;
  absence_reason?: string;
  recorded_at: number;
  recorded_by?: string;
}

export interface TeacherOption {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  email: string;
  department: string;
  permission: Permission;
}

export interface StudentRecord {
  student_id: string;
  name_cn: string;
  name_en: string;
  class: string;
  email?: string;
  phone?: string;
}

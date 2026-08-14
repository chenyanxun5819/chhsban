import type { TutionSchedule as TutionScheduleKV } from "@chhsban/kv-utils/types";

export type Permission = "teacher" | "viewer" | "admin" | "super_admin";

export interface AuthUser {
  teacherId: string;
  teacherName: string;
  permission: Permission;
  email: string;
  department?: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LoginResponse {
  token: string;
  permission: Permission;
  redirectUrl?: string;
}

// ========== Tution Portal 特有類型 ==========

export type TutionStatus =
  | "pending"
  | "reviewing"
  | "approved"
  | "rejected"
  | "active"
  | "ended";
export type ScheduleStatus = "held" | "cancelled" | "rescheduled";
export type AttendanceStatus = "present" | "absent" | "late";
export type RosterStatus = "initial" | "active" | "dropped";

export interface TutionClass {
  class_id: string;
  application_no?: string;
  teacher_id: string;
  teacher_name_cn: string;
  form: "F1" | "F2" | "F3" | "F4" | "F5" | "F6";
  subject: string;
  day_of_week: string;
  time_start: string;
  time_end: string;
  start_date: string;
  fees: number;
  venue: string;
  approval_status: TutionStatus;
  approved_by?: string;
  approved_at?: number;
  rejection_reason?: string;
  initial_roster?: TutionRosterSnapshot[];
  end_date?: string; // YYYY-MM-DD，課程結束日期，管理員設定；未設定則視為尚未訂結束日
  created_at: number;
  updated_at: number;
}

export interface TutionRosterSnapshot {
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en?: string;
  real_class_name?: string;
  input_class_name?: string;
  gender_boarding?: string;
}

/**
 * 已開課課程的學生名單條目（含加入/退出日期），
 * 用於 RosterManagement 頁面。與 TutionRoster（出勤功能沿用的舊型別）分開，避免互相影響。
 */
export interface ClassRosterEntry {
  roster_id: string;
  class_id: string;
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  real_class_name: string;
  gender_boarding: string;
  enrollment_date: string;
  withdrawal_date: string | null;
  withdrawal_reason: string | null;
  is_active: boolean;
}

export interface TutionRoster {
  roster_id: string;
  class_id: string;
  student_id: string;
  student_no: string;
  name_cn: string;
  name_en: string;
  input_class_name: string;
  status: RosterStatus;
  added_at: number;
  dropped_at?: number;
  created_at: number;
  updated_at: number;
}

// 排課例外記錄：統一從 @chhsban/kv-utils 引入，避免前後端各自維護一份不一致的定義
// （schedule_id / class_id / scheduled_date / status(cancelled|rescheduled) /
//   cancellation_reason / rescheduled_to / rescheduled_venue / reschedule_reason /
//   created_at / updated_at）
export type TutionSchedule = TutionScheduleKV;

export interface TutionAttendance {
  attendance_id: string;
  schedule_id: string;
  class_id: string;
  student_id: string;
  status: AttendanceStatus;
  recorded_at: number;
  created_at: number;
  updated_at: number;
}

// ========== Phase 3: 管理功能類型 ==========

export type AdminStatistic = {
  totalTeachers: number;
  totalClasses: number;
  totalStudents: number;
  pendingApplications: number;
};

export type RecentActivity = {
  activity_id: string;
  type: "application" | "schedule" | "attendance" | "class_update";
  title: string;
  description: string;
  timestamp: number;
  actor?: string;
  relatedId?: string;
};

// ========== Phase 3: 時間表管理類型 ==========

export type RecurrenceType = "weekly" | "monthly" | "custom";

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number;
  endDate?: string;
  exceptions?: string[];
}

export interface TutionScheduleExtended extends Omit<TutionSchedule, "status"> {
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  status: ScheduleStatus | "scheduled" | "ongoing" | "completed";
  recurrence?: RecurrenceRule;
}

export interface ConflictResult {
  hasConflict: boolean;
  conflicts: Array<{
    type: "venue" | "teacher" | "student";
    message: string;
    conflictingScheduleId?: string;
  }>;
  warnings: string[];
}

// ========== Phase 3: 出席表管理類型 ==========

export type AttendanceRecordStatus =
  | "present"
  | "absent"
  | "late"
  | "early"
  | "not_attended";

export interface AttendanceRecord {
  record_id: string;
  class_id: string;
  schedule_id: string;
  student_id: string;
  status: AttendanceRecordStatus;
  date: string;
  remarks?: string;
  updated_at: string;
}

export interface AttendanceStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  earlyCount: number;
  attendanceRate: number;
  lastUpdated: string;
}

export interface AttendanceChange {
  recordId: string;
  oldStatus: AttendanceRecordStatus;
  newStatus: AttendanceRecordStatus;
}

// ========== 教室管理類型 ==========

export interface ClassroomRecord {
  classroom_id: string;           // 唯一識別 (e.g., "ROOM-001")
  classroom_name: string;         // 教室名稱 (e.g., "演講廳A")
  class_name: string;            // 班級名稱 (e.g., "中一A班")
  number_of_desks: number;       // 桌數 (e.g., 40)
  available_for_tution: boolean; // 是否可用於補習（管理員勾選）
  last_updated: number;          // 最後更新時間戳（毫秒）
}

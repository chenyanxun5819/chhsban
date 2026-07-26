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
  | "approved"
  | "rejected"
  | "active"
  | "ended";
export type ScheduleStatus = "held" | "cancelled" | "rescheduled";
export type AttendanceStatus = "present" | "absent" | "late";
export type RosterStatus = "initial" | "active" | "dropped";

export interface TutionClass {
  class_id: string;
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

export interface TutionSchedule {
  schedule_id: string;
  class_id: string;
  scheduled_date: string;
  status: ScheduleStatus;
  cancellation_reason?: string;
  rescheduled_to?: string;
  reschedule_reason?: string;
  created_at: number;
  updated_at: number;
}

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

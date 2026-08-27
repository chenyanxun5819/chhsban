/**
 * Cloudflare KV Namespace 類型定義
 * 根據 Cloudflare Workers 文檔
 */
export interface KVNamespace {
  get(key: string, options?: Record<string, string>): Promise<string | null>;
  getWithMetadata(
    key: string,
    options?: Record<string, string>,
  ): Promise<{ value: string | null; metadata: any }>;
  put(
    key: string,
    value: string | ReadableStream<Uint8Array> | ArrayBuffer,
    options?: { expirationTtl?: number; metadata?: any },
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }): Promise<any>;
}

/**
 * 权限类型定义（四级）
 */
export type Permission = "teacher" | "viewer" | "admin" | "super_admin";

/**
 * 认证相关类型定义
 */
export interface SessionToken {
  token: string;
  teacherId: string;
  teacherName: string;
  permission: Permission;
  redirectUrl?: string;
  expiresAt: number; // Unix 时间戳（毫秒）
  createdAt: number;
}

export interface AuthSessionData {
  teacher_id: string;
  teacher_name_cn?: string;
  teacher_name_en?: string;
  permission: Permission;
  redirect_url?: string;
  expires_at: number;
}

/**
 * 学生数据类型
 */
export interface StudentRecord {
  student_id: string;
  name_cn: string;
  name_en: string;
  class: string; // 如 "J1A", "J1B"
  email?: string;
  phone?: string;
}

/**
 * 教师数据类型
 */
export interface TeacherRecord {
  teacher_id: string;
  name_cn: string;
  name_en: string;
  department: string; // 如 "中文系", "数学系"
  email: string;
  permission: Permission;
  // 密码相关（缺省 = 尚未设定密码，需要走 password_setup 流程）
  password_hash?: string; // base64
  password_salt?: string; // base64
  password_algorithm?: "PBKDF2-SHA256";
  password_iterations?: number; // 该密码创建时使用的迭代次数（非全局常量，方便未来调高迭代次数而不需一次性 migrate 旧密码）
  password_created_at?: number; // Unix 时间戳（毫秒）
  password_updated_at?: number; // Unix 时间戳（毫秒）
}

/**
 * 密码哈希结果（PBKDF2-SHA256）
 */
export interface HashedPassword {
  hash: string; // base64
  salt: string; // base64
  algorithm: "PBKDF2-SHA256";
  iterations: number;
}

/**
 * 密码强度校验规则错误码（不含已翻译文案，由前端依 code 渲染）
 */
export type PasswordRuleError =
  | "TOO_SHORT"
  | "MISSING_LOWERCASE"
  | "MISSING_UPPERCASE"
  | "MISSING_DIGIT"
  | "MISSING_SYMBOL";

export interface PasswordValidationResult {
  valid: boolean;
  errors: PasswordRuleError[];
}

/**
 * 两阶段登入用的 pending token payload（HMAC 签名，无状态，不写入 KV）
 */
export interface PendingTokenPayload {
  teacherId: string;
  email: string;
  purpose: "password_setup" | "password_login";
  iat: number; // 秒
  exp: number; // 秒
}

export interface LockoutStatus {
  locked: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
}

/**
 * 教室管理 - 基本資料
 */
export interface ClassroomRecord {
  classroom_id: string;           // 唯一識別 (e.g., "ROOM-001")
  classroom_name: string;         // 教室名稱 (e.g., "演講廳A")
  class_name: string;            // 班級名稱 (e.g., "中一A班")
  number_of_desks: number;       // 桌數 (e.g., 40)
  available_for_tution: boolean; // 是否可用於補習（管理員勾選）
  last_updated: number;          // 最後更新時間戳（毫秒）
}

/**
 * 共用常量
 */
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000, // 24 小时（毫秒）
  SESSION_PREFIX: "session:",
  STUDENT_PREFIX: "student:",
  TEACHER_PREFIX: "teacher:",
  CLASSROOM_PREFIX: "classroom:",
  TUTION_CLASS_PREFIX: "tution_class:",
  TUTION_ROSTER_PREFIX: "tution_roster:",
  TUTION_ATTENDANCE_PREFIX: "tution_attendance:",
  TUTION_SCHEDULE_PREFIX: "tution_schedule:",
  // 密码策略
  PASSWORD_MIN_LENGTH: 10,
  // OWASP 2023 建議值是 210,000，但 Cloudflare Workers 正式執行環境的 PBKDF2
  // 實作有上限 100,000（本地 wrangler dev 用 Node WebCrypto 沒有這個限制，
  // 不會在本地測出來），所以這裡用 Workers 允許的最大值
  PBKDF2_ITERATIONS: 100_000,
  GENERATED_PASSWORD_LENGTH: 14,
  // pending token（无状态，不进 KV）
  PENDING_TOKEN_TTL_SECONDS: 15 * 60, // 15 分钟
  // 暴力破解防护（唯一真正写 KV 的部分）
  LOCKOUT_PREFIX: "lockout:",
  LOCKOUT_MAX_ATTEMPTS: 5,
  LOCKOUT_WINDOW_SECONDS: 15 * 60,
} as const;

/**
 * =====================================
 * 補習班系統類型定義
 * =====================================
 */

/**
 * 補習班狀態枚舉
 */
export enum TutionClassStatus {
  PENDING = "pending",           // 待批准
  REVIEWING = "reviewing",       // 審核中（已指定上課地點）
  APPROVED = "approved",         // 已批准
  REJECTED = "rejected",         // 已駁回
  ACTIVE = "active",             // 進行中
  ENDED = "ended",               // 已結束
}

/**
 * 補習班開課記錄（主表）
 */
export interface TutionClass {
  class_id: string;                                      // 系統自動生成
  teacher_id: string;                                    // FK -> TEACHER_KV
  form: "F1" | "F2" | "F3" | "F4" | "F5" | "F6";        // 補習年級
  subject: string;                                       // 補習科目（如「數學」）
  day_of_week: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday"; // 上課日
  time_start: string;                                    // 固定 "19:00"
  time_end: string;                                      // 固定 "21:00"
  start_date: string;                                    // YYYY-MM-DD 格式
  fees: number;                                          // 補習收費（RM）
  venue: string;                                         // 使用地點（教室編號）
  approval_status: TutionClassStatus;                   // 審批狀態
  end_date?: string;                                     // YYYY-MM-DD，課程結束日期（管理員設定，未設定則視為尚未訂結束日）
  created_at: number;                                    // Unix 時間戳（毫秒）
  updated_at: number;                                    // Unix 時間戳（毫秒）
}

/**
 * 補習班學生名單（子表1）
 */
export interface TutionRoster {
  roster_id: string;                                     // 系統自動生成
  class_id: string;                                      // FK -> TutionClass
  student_id: string;                                    // FK -> STUDENT_KV
  student_name_cn: string;                               // 學生中文名
  student_name_en: string;                               // 學生英文名
  student_class: string;                                 // 學生班級（如「J1A」）
  enrollment_date: string;                               // YYYY-MM-DD 報名日期
  withdrawal_date?: string;                              // YYYY-MM-DD 退出日期（可選）
  withdrawal_reason?: string;                            // 退出原因（可選）
  is_active: boolean;                                    // 動態計算：無 withdrawal_date = true
  created_at: number;                                    // Unix 時間戳（毫秒）
  updated_at: number;                                    // Unix 時間戳（毫秒）
}

/**
 * 排課狀態枚舉
 */
export enum ScheduleStatus {
  HELD = "held",                                         // 有開課（預設值，不會實際寫入 KV）
  CANCELLED = "cancelled",                               // 無開課（停課）
  RESCHEDULED = "rescheduled",                           // 調課
}

/**
 * 補習班排課例外記錄（子表3）
 *
 * 只儲存「例外」：老師主動標記過無開課／調課的日期。
 * 沒有例外記錄的上課日一律視為「有開課」（由 day_of_week + start_date 推算，不寫入 KV）。
 */
export interface TutionSchedule {
  schedule_id: string;                                   // 系統自動生成
  class_id: string;                                      // FK -> TutionClass
  scheduled_date: string;                                // YYYY-MM-DD，這堂課「原本」該上課的日期
  status: ScheduleStatus.CANCELLED | ScheduleStatus.RESCHEDULED; // 例外記錄只會是 cancelled 或 rescheduled
  cancellation_reason?: string;                          // status=cancelled 時必填
  rescheduled_to?: string;                               // YYYY-MM-DD，status=rescheduled 時必填：新日期
  rescheduled_venue?: string;                             // status=rescheduled 時必填：新地點
  reschedule_reason?: string;                            // status=rescheduled 時必填：調課原因
  created_at: number;                                    // Unix 時間戳（毫秒）
  updated_at: number;                                    // Unix 時間戳（毫秒）
}

/**
 * 出勤狀態枚舉
 */
export enum AttendanceStatus {
  PRESENT = "present",                                   // 到課
  ABSENT = "absent",                                     // 缺課
  LATE = "late",                                         // 遲到
  EXCUSE = "excuse",                                     // 有理由缺席
}

/**
 * 補習班學生出勤紀錄（子表2）
 */
export interface TutionAttendance {
  attendance_id: string;                                 // 系統自動生成
  class_id: string;                                      // FK -> TutionClass
  student_id: string;                                    // FK -> STUDENT_KV / TutionRoster
  class_date: string;                                    // YYYY-MM-DD 上課日期
  status: AttendanceStatus;                              // 出勤狀態
  absence_reason?: string;                               // 未出席原因（可選）
  recorded_at: number;                                   // Unix 時間戳（毫秒） - 簽到時間
  recorded_by?: string;                                  // 記錄者 ID（可選）
}

/**
 * PDF 欄位數據類型枚舉
 */
export enum PDFFieldDataType {
  TEXT = "text",
  DATE = "date",
  NUMBER = "number",
  SELECT = "select",
  CHECKBOX = "checkbox",
}

/**
 * PDF 欄位映射表（子表3）
 */
export interface TutionPDFFieldMap {
  field_id: string;                                      // 唯一標識（如 "teacher_name"）
  pdf_field_name: string;                                // PDF 表單字段名
  form_field: string;                                    // 對應表單項（如 "教師姓名"）
  page_number: number;                                   // PDF 頁碼
  x_coordinate: number;                                  // X 坐標
  y_coordinate: number;                                  // Y 坐標
  width: number;                                         // 欄位寬度
  height: number;                                        // 欄位高度
  data_type: PDFFieldDataType;                           // 數據類型
  source_table: "main" | "roster" | "attendance";       // 數據來源表
  source_field: string;                                  // 源欄位名（如 "teacher_id"）
  is_repeating: boolean;                                 // 是否重複（用於學生名單列表）
  max_repeat_count?: number;                             // 最多重複次數（可選）
}

/**
 * 出勤統計結果
 */
export interface AttendanceStats {
  total_classes: number;                                 // 總上課次數
  present_count: number;                                 // 到課次數
  absent_count: number;                                  // 缺課次數
  late_count: number;                                    // 遲到次數
  excuse_count: number;                                  // 有理由缺席次數
  attendance_rate: number;                               // 出勤率（百分比 0-100）
}

/**
 * Tution KV 管理器接口
 * 定義所有 KV 操作方法
 */
export interface TutionKVManager {
  // ===== 補習班主表操作 =====
  createClass(classData: Omit<TutionClass, "class_id" | "created_at" | "updated_at">): Promise<TutionClass>;
  getClass(classId: string): Promise<TutionClass | null>;
  updateClass(classId: string, updates: Partial<TutionClass>): Promise<TutionClass>;
  deleteClass(classId: string): Promise<void>;
  listClassesByTeacher(teacherId: string): Promise<TutionClass[]>;
  listClassesByStatus(status: TutionClassStatus): Promise<TutionClass[]>;

  // ===== 學生名單操作 =====
  addRosterEntry(rosterData: Omit<TutionRoster, "roster_id" | "created_at" | "updated_at">): Promise<TutionRoster>;
  getRosterEntry(rosterId: string): Promise<TutionRoster | null>;
  listRosterByClass(classId: string): Promise<TutionRoster[]>;
  updateRosterEntry(rosterId: string, updates: Partial<TutionRoster>): Promise<TutionRoster>;
  removeStudentFromRoster(rosterId: string, withdrawalReason: string): Promise<void>;

  // ===== 出勤紀錄操作 =====
  recordAttendance(attendanceData: Omit<TutionAttendance, "attendance_id">): Promise<TutionAttendance>;
  getAttendanceRecord(attendanceId: string): Promise<TutionAttendance | null>;
  listAttendanceByStudent(studentId: string, classId: string): Promise<TutionAttendance[]>;
  listAttendanceByClass(classId: string): Promise<TutionAttendance[]>;
  updateAttendanceRecord(attendanceId: string, updates: Partial<TutionAttendance>): Promise<TutionAttendance>;
  getAttendanceStats(studentId: string, classId: string): Promise<AttendanceStats>;

  // ===== 排課例外記錄操作 =====
  createSchedule(scheduleData: Omit<TutionSchedule, "schedule_id" | "created_at" | "updated_at">): Promise<TutionSchedule>;
  getSchedule(scheduleId: string): Promise<TutionSchedule | null>;
  listSchedulesByClass(classId: string): Promise<TutionSchedule[]>;
  updateSchedule(scheduleId: string, updates: Partial<TutionSchedule>): Promise<TutionSchedule>;
  deleteSchedule(scheduleId: string): Promise<void>;

  // ===== PDF 欄位映射操作 =====
  getPDFFieldMaps(): Promise<TutionPDFFieldMap[]>;
  getPDFFieldMap(fieldId: string): Promise<TutionPDFFieldMap | null>;

  // ===== 通用操作 =====
  search(query: string, type: "class" | "student" | "attendance"): Promise<any[]>;
}

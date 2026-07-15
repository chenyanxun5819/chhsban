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
  google_email?: string; // 可選: 用於 Google OAuth 登入的個人 email (例: teacher@gmail.com)
  permission: Permission;
}

/**
 * 共用常量
 */
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000, // 24 小时（毫秒）
  SESSION_PREFIX: "session:",
  STUDENT_PREFIX: "student:",
  TEACHER_PREFIX: "teacher:",
  TUTION_CLASS_PREFIX: "tution_class:",
  TUTION_ROSTER_PREFIX: "tution_roster:",
  TUTION_ATTENDANCE_PREFIX: "tution_attendance:",
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
  updateAttendanceRecord(attendanceId: string, updates: Partial<TutionAttendance>): Promise<TutionAttendance>;
  getAttendanceStats(studentId: string, classId: string): Promise<AttendanceStats>;

  // ===== PDF 欄位映射操作 =====
  getPDFFieldMaps(): Promise<TutionPDFFieldMap[]>;
  getPDFFieldMap(fieldId: string): Promise<TutionPDFFieldMap | null>;

  // ===== 通用操作 =====
  search(query: string, type: "class" | "student" | "attendance"): Promise<any[]>;
}

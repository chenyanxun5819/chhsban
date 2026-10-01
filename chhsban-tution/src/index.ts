/**
 * 補習班系統 - Cloudflare Worker 入口點
 * 功能：開課管理、學生點名、排課例外、收據／簽核檔、PDF 生成
 *
 * ⚠️ 資料儲存（2026-09-30 起）
 * - 補習班的班級、名單、排課例外、點名、設定：D1（env.DB，見 tution-service.ts、migrations/）
 * - 登入 session、教師、學生名錄、教室：仍是跨系統共用的 KV
 *   KV 免費版每天 1,000 次寫入是全帳號共用，登入時建立 session 等仍會用到，別在 KV 上加新的大量寫入。
 * - D1 免費版單次請求最多 50 次查詢：列表類端點一律批次查詢，不要逐筆查。
 */

import { createAuthKVManager, createTeacherKVManager, createStudentDirectory, isLeftSchool, studentStatus, createClassroomKVManager, TutionClassStatus, AttendanceStatus, verifyGoogleIdToken, type TutionClass, type TutionSchedule } from "@chhsban/kv-utils";
import { TutionService } from "./tution-service";
import { generatePDFResponse } from "./pdf-generator";
import { buildSignedFormKey, getSignedFormResponse, isAllowedContentType } from "./signed-form";
import { getSemesterInfo } from "./semester";
import { buildReceiptKey, getReceiptResponse, isAllowedReceiptContentType, isSemesterHalf, type ReceiptRecord } from "./receipt";
import { ocrReceiptImage } from "./google-vision";
import { computeCourseReport, generateScheduleRows } from "./course-report";
import {
  BOARDING_VIEW_PERMISSIONS,
  computeBoardingAttendance,
  computeStudentAttendance,
  isValidDateString,
  resolveRosterStudentInfo,
} from "./boarding-attendance";
import { logAudit } from "./audit";
import { handleStudentSync, type StudentSyncService } from "./student-sync";
import { handleLegacyCleanup } from "./legacy-cleanup"; // 一次性工具，舊學生資料清完即可移除

interface Env {
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  CLASSROOM_KV: KVNamespace;
  ASSETS_KV: KVNamespace;
  AUDIT_LOG_KV: KVNamespace;
  DB: D1Database;
  SIGNED_FORMS_BUCKET: R2Bucket;
  STUDENT_SYNC: StudentSyncService;
  GOOGLE_VISION_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string; // Google 登入的 OAuth 用戶端 ID（公開值，見 wrangler.toml [vars]）
}

interface IncomingRosterSnapshot {
  student_id: string;
  student_no?: string;
  name_cn: string;
  name_en?: string;
  real_class_name?: string;
  input_class_name?: string;
  gender_boarding?: string;
}

const FIXED_TIME_START = "19:00";
const FIXED_TIME_END = "21:00";
const MAX_STUDENTS_PER_CLASS = 30;

// 資料保留：今年＋往前 2 年（與選修課一致），更早開課的班級由每日排程清理；
// 每班刪除約 6 次 D1 查詢，一次最多清 5 班，未清完的隔天繼續
const RETENTION_PAST_YEARS = 2;
const PURGE_CLASSES_PER_RUN = 5;

// 可以點名的課程狀態（與開課報表一致：審批通過後才算有開課）
const ATTENDANCE_CLASS_STATUSES = new Set<string>([
  TutionClassStatus.APPROVED,
  TutionClassStatus.ACTIVE,
  TutionClassStatus.ENDED,
]);

// 排課例外記錄可由外部設定的欄位
const SCHEDULE_EDITABLE_FIELDS = [
  "scheduled_date",
  "status",
  "cancellation_reason",
  "rescheduled_to",
  "rescheduled_venue",
  "reschedule_reason",
];

// 申請表內容欄位：建立申請時可填、待審批階段可修改
const CLASS_FORM_FIELDS = ["form", "subject", "day_of_week", "start_date", "fees", "venue"];

function pickFields(body: Record<string, any>, fields: string[]): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const field of fields) {
    if (field in body) picked[field] = body[field];
  }
  return picked;
}

/** 名單學生必須在學生名錄裡、未離校、不重複；有問題回傳錯誤 Response，沒問題回傳 null */
async function validateRosterStudents(env: Env, students: IncomingRosterSnapshot[]): Promise<Response | null> {
  const directory = createStudentDirectory(env.STUDENT_KV);
  const seen = new Set<string>();
  for (const student of students) {
    const id = String(student?.student_id ?? "").trim();
    const found = id ? (await directory.getStudent(id)) || (student.student_no ? await directory.getByNo(student.student_no) : null) : null;
    if (!found) {
      return jsonResponse({ error: "STUDENT_NOT_FOUND", student_id: id }, 400);
    }
    if (isLeftSchool(found)) {
      return jsonResponse({ error: "STUDENT_LEFT_SCHOOL", student_id: id }, 409);
    }
    if (seen.has(id)) {
      return jsonResponse({ error: "DUPLICATE_STUDENT", student_id: id }, 400);
    }
    seen.add(id);
  }
  return null;
}

/** 前端送來的名單快照 → 名單條目 */
function toRosterItem(classId: string, enrollmentDate: string, student: IncomingRosterSnapshot): any {
  return {
    class_id: classId,
    student_id: student.student_id,
    student_name_cn: student.name_cn,
    student_name_en: student.name_en || "-",
    student_class: student.real_class_name || student.input_class_name || "-",
    enrollment_date: enrollmentDate,
    is_active: true,
    student_no: student.student_no || student.student_id,
    gender_boarding: student.gender_boarding || "-",
  };
}

/** 刪除班級：先刪 R2 的簽核檔與收據，再刪 D1 的班級與所有關聯資料 */
async function deleteClassWithFiles(env: Env, service: TutionService, tutionClass: any): Promise<void> {
  const fileKeys = [
    tutionClass.signed_form_key,
    tutionClass.receipt_h1?.key,
    tutionClass.receipt_h2?.key,
  ].filter((key): key is string => typeof key === "string" && key.length > 0);
  if (fileKeys.length > 0) {
    await env.SIGNED_FORMS_BUCKET.delete(fileKeys);
  }
  await service.deleteClass(tutionClass.class_id);
}

/**
 * 補上班級回應需要的教師姓名與 initial_roster（開課時的名單快照；舊資料沒有快照時由名單組出）。
 * 整批處理：名單只查 1 次 D1，教師每位只讀 1 次 KV，避免列表頁逐班查詢超過 D1 單次請求上限。
 */
async function buildClassResponses(
  env: Env,
  service: TutionService,
  classes: any[],
): Promise<any[]> {
  const hasSnapshot = (c: any) => Array.isArray(c.initial_roster) && c.initial_roster.length > 0;
  const needRoster = classes.filter((c) => !hasSnapshot(c)).map((c) => c.class_id);
  const directory = createStudentDirectory(env.STUDENT_KV);
  const rosterByClass = new Map<string, IncomingRosterSnapshot[]>();
  for (const entry of await service.listRosterByClasses(needRoster)) {
    const student = (await directory.getById(entry.student_id)) || (await directory.getStudent(entry.student_id));
    const list = rosterByClass.get(entry.class_id) || [];
    list.push({
      student_id: entry.student_id,
      student_no: student?.student_no || (entry as any).student_no || entry.student_id,
      name_cn: entry.student_name_cn,
      name_en: entry.student_name_en,
      real_class_name: entry.student_class,
      input_class_name: entry.student_class,
    });
    rosterByClass.set(entry.class_id, list);
  }

  const teacherManager = createTeacherKVManager(env.TEACHER_KV);
  const teacherIds = Array.from(new Set(classes.filter((c) => !c.teacher_name_cn && c.teacher_id).map((c) => c.teacher_id)));
  const teachers = new Map(
    await Promise.all(teacherIds.map(async (id) => [id, await teacherManager.getTeacher(id)] as const)),
  );

  return classes.map((c) => {
    const teacher = teachers.get(c.teacher_id);
    return {
      ...c,
      teacher_name_cn: c.teacher_name_cn || teacher?.name_cn || teacher?.name_en || "",
      initial_roster: hasSnapshot(c) ? c.initial_roster : rosterByClass.get(c.class_id) || [],
    };
  });
}

async function buildClassResponse(env: Env, service: TutionService, tutionClass: any): Promise<any> {
  const [hydrated] = await buildClassResponses(env, service, [tutionClass]);
  return hydrated;
}

/**
 * CORS 回應頭
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Filename",
    "Content-Type": "application/json; charset=utf-8",
  };
}

/**
 * 快速 JSON 響應（含 CORS 頭）
 */
function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCorsHeaders(),
  });
}

/**
 * 完成登入的共用收尾：建立正式 session，回傳與 /auth/verify 成功響應同構的資料
 */
async function finalizeLogin(
  env: Env,
  teacher: { teacher_id: string; name_cn: string; name_en: string; email: string; permission?: string },
): Promise<Response> {
  const authManager = createAuthKVManager(env.AUTH_KV);
  const session = await authManager.createSession(
    teacher.teacher_id,
    teacher.name_cn || teacher.name_en || "Unknown",
    (teacher.permission as any) || "teacher",
  );

  console.log(`[AUTH] Session created: ${session.token}`);

  return jsonResponse({
    success: true,
    data: {
      token: session.token,
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.name_cn || teacher.name_en || "Unknown",
      email: teacher.email,
      permission: teacher.permission || "teacher",
    },
    timestamp: new Date().toISOString(),
  });
}

const PASSWORD_LOGIN_REMOVED_MESSAGE =
  "學校 Email 與密碼登入已停用，請重新整理頁面後改用私人 Google 帳號登入（需先由管理員開放）。";

/**
 * 私人 Google 帳號登入（唯一的登入方式）：前端 Google 按鈕取得的 ID token（credential）交給後端驗證
 * 簽章與用戶端 ID，再以教師資料裡綁定的 google_email 找到教師，且該教師已「開放登入」才建立 session。
 * 學校網域不開放第三方登入，所以綁定的是老師的私人 Gmail：老師要開課或需要使用系統時告知管理員，
 * 由管理員在行政管理站「老師管理」填入 Gmail 並開放登入。
 */
async function handleAuthGoogle(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!env.GOOGLE_CLIENT_ID) {
    return jsonResponse({ error: "Google 登入尚未設定（缺少 GOOGLE_CLIENT_ID）" }, 500);
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { credential?: string };
    const identity = await verifyGoogleIdToken(body.credential || "", env.GOOGLE_CLIENT_ID);
    if (!identity) {
      return jsonResponse({ error: "Google 登入驗證失敗，請重新登入" }, 401);
    }
    const teacher = await createTeacherKVManager(env.TEACHER_KV).findTeacherByGoogleEmail(identity.email);
    if (!teacher) {
      return jsonResponse(
        { error: `此 Google 帳號（${identity.email}）尚未綁定教師資料，請聯絡管理員`, code: "GOOGLE_NOT_BOUND" },
        403,
      );
    }
    // 綁了 Google 帳號還要管理員「開放登入」才能進來（老師管理頁的開關）
    if (teacher.login_enabled !== true) {
      return jsonResponse({ error: "此帳號尚未開放登入，請聯絡管理員", code: "LOGIN_DISABLED" }, 403);
    }
    return finalizeLogin(env, teacher);
  } catch (error) {
    console.error("[AUTH] Error in google login:", error);
    return jsonResponse({ error: "Google 登入失敗，請稍後再試" }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 處理 CORS 預檢
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    // 登入端點不需要 token：唯一的登入方式是私人 Google 帳號
    if (pathname === "/api/auth/google") {
      return handleAuthGoogle(request, env);
    }
    // 學校 Email + 密碼登入已於 2026-10-01 停用（舊版前端若還在快取中，會看到這個訊息）
    if (pathname.startsWith("/api/auth/")) {
      return jsonResponse({ error: PASSWORD_LOGIN_REMOVED_MESSAGE, code: "PASSWORD_LOGIN_REMOVED" }, 410);
    }

    // 健康檢查不需要 token
    if (pathname === "/api/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "tution-system" }),
        { status: 200, headers: getCorsHeaders() },
      );
    }

    // 其他端點需要身份驗證
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing token" }),
        { status: 401, headers: getCorsHeaders() },
      );
    }

    try {
      const authManager = createAuthKVManager(env.AUTH_KV);
      const session = await authManager.verifySession(token);

      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: getCorsHeaders(),
        });
      }

      // 路由處理
      if (pathname.startsWith("/api/v1/students")) {
        return handleStudents(request, env, session);
      }

      if (pathname.startsWith("/api/v1/my/classes")) {
        return handleMyClasses(request, env, session);
      }

      if (pathname.startsWith("/api/v1/classes")) {
        return handleClasses(request, env, session, ctx);
      }

      if (pathname.startsWith("/api/v1/settings")) {
        return handleSettings(request, env, session);
      }

      if (pathname.startsWith("/api/v1/reports")) {
        return handleReports(request, env, session);
      }

      if (pathname.startsWith("/api/v1/schedules")) {
        return handleSchedules(request, env, session);
      }

      if (pathname.startsWith("/api/v1/attendance")) {
        return handleAttendance(request, env, session);
      }

      if (
        pathname.startsWith("/api/v1/boarding-attendance") ||
        pathname.startsWith("/api/v1/student-attendance")
      ) {
        return handleBoardingAttendance(request, env, session);
      }

      if (pathname.startsWith("/api/v1/classrooms") || pathname.startsWith("/api/classrooms")) {
        return handleClassrooms(request, env, session);
      }

      if (pathname.startsWith("/api/admin/student-sync")) {
        return handleStudentSync(request, env, session, getCorsHeaders());
      }

      // 一次性工具：舊學生資料清理（清完即可移除，見 legacy-cleanup.ts）
      if (pathname.startsWith("/api/admin/legacy-cleanup")) {
        return handleLegacyCleanup(request, env, session, getCorsHeaders());
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },

  // 每日凌晨（見 wrangler.toml 的 [triggers] crons）：
  // 1. 清理超過保留年限（今年＋往前 2 年，依開課日期）的班級，連同名單、點名、排課例外、R2 檔案
  // 2. 重新計算「各課程開課報表」並存入 D1，前端一律讀這份快照
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        const service = new TutionService(env.DB);
        try {
          const minYear = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCFullYear() - RETENTION_PAST_YEARS;
          const expired = await service.listExpiredClasses(minYear, PURGE_CLASSES_PER_RUN);
          for (const cls of expired) {
            await deleteClassWithFiles(env, service, cls);
          }
          if (expired.length > 0) {
            console.log(`Purged ${expired.length} expired classes:`, expired.map((c) => c.class_id).join(", "));
          }
        } catch (error) {
          console.error("Scheduled purge failed:", error);
        }
        try {
          const teacherManager = createTeacherKVManager(env.TEACHER_KV);
          const summary = await computeCourseReport(service, teacherManager);
          await service.setCourseReportSummary(summary);
          console.log(`Course report summary refreshed: ${summary.rows.length} courses`);
        } catch (error) {
          console.error("Scheduled course report refresh failed:", error);
        }
      })(),
    );
  },
};

/**
 * 處理學生查詢端點
 */
async function handleStudents(
  request: Request,
  env: Env,
  _session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/");
  const studentIdentifier = pathParts[4]; // /api/v1/students/{studentId or studentNo}

  // 只支持 GET 方法
  if (method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: getCorsHeaders() },
    );
  }

  // 如果沒有指定學生標識，返回錯誤
  if (!studentIdentifier) {
    return new Response(
      JSON.stringify({ error: "Student ID or Student No is required" }),
      { status: 400, headers: getCorsHeaders() },
    );
  }

  try {
    // 學生名錄（students_by_no）：學號或 SMS 內部編號都可以查
    const directory = createStudentDirectory(env.STUDENT_KV);
    const student = await directory.getStudent(studentIdentifier);

    if (!student) {
      return jsonResponse({ error: "Student not found" }, 404);
    }

    // 查這支 API 是為了把學生加進名單（申請開課／加人），已離校的學生不能再加
    if (isLeftSchool(student)) {
      return jsonResponse({ error: "該學生已離校", student_status: "left" }, 410);
    }

    // 確保返回格式包含所有必要欄位
    const studentData = {
      ...student,
      name_en: student.name_en || "-",
      real_class_name: student.real_class_name || "-",
      gender_boarding: student.gender_boarding || "-",
      student_status: studentStatus(student),
    };

    return jsonResponse({ data: studentData }, 200);
  } catch (error) {
    console.error(`[STUDENTS] Error fetching student ${studentIdentifier}:`, error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: getCorsHeaders() },
    );
  }
}

async function handleClasses(
  request: Request,
  env: Env,
  session: any,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/");
  const classId = pathParts[4]; // /api/v1/classes/{classId}
  const subAction = pathParts[5]; // /api/v1/classes/{classId}/{pdf|roster}
  const subId = pathParts[6]; // /api/v1/classes/{classId}/roster/{rosterId}
  const subSubAction = pathParts[7]; // /api/v1/classes/{classId}/roster/{rosterId}/withdraw

  const service = new TutionService(env.DB);

  try {
    // POST /api/v1/classes - 建立新補習班
    if (method === "POST" && !classId) {
      // 只接受申請表欄位，其餘（approval_status、receipt_*、signed_form_* 等）一律由系統設定
      const body = (await request.json()) as Record<string, any>;
      const data = pickFields(body, [...CLASS_FORM_FIELDS, "time_start", "time_end", "end_date", "initial_roster"]);

      // 驗證必填欄位
      if (
        !data.form ||
        !data.subject ||
        !data.day_of_week ||
        !data.start_date ||
        !data.fees
      ) {
        return jsonResponse({ error: "Missing required fields" }, 400);
      }

      if (data.end_date && !isValidDateString(data.end_date)) {
        return jsonResponse({ error: "INVALID_END_DATE" }, 400);
      }
      if (!isValidDateString(data.start_date)) {
        return jsonResponse({ error: "INVALID_START_DATE" }, 400);
      }

      const teacher = await createTeacherKVManager(env.TEACHER_KV).getTeacher(session.teacher_id);
      const teacherNameCn = teacher?.name_cn || teacher?.name_en || "";

      // 每學年（以 7/1 為界的上/下學年）每位申請人最多 2 堂已批准（含進行中）的課程，
      // 依新申請的 start_date 判斷落在哪個學年
      const semester = getSemesterInfo(data.start_date);
      const teacherClasses = await service.listClassesByTeacher(session.teacher_id);
      const approvedThisSemester = teacherClasses.filter(
        (c) =>
          (c.approval_status === "approved" || c.approval_status === "active") &&
          getSemesterInfo(c.start_date).key === semester.key,
      ).length;
      if (approvedThisSemester >= 2) {
        return jsonResponse(
          { error: `已達${semester.label}申請上限（最多 2 堂已批准課程），無法再提出新申請` },
          400,
        );
      }

      const initialRoster: IncomingRosterSnapshot[] = Array.isArray(data.initial_roster) ? data.initial_roster : [];
      if (initialRoster.length > MAX_STUDENTS_PER_CLASS) {
        return jsonResponse(
          { error: `學生名單共 ${initialRoster.length} 人，超過每堂課最多 ${MAX_STUDENTS_PER_CLASS} 人上限` },
          400,
        );
      }
      const rosterError = await validateRosterStudents(env, initialRoster);
      if (rosterError) return rosterError;

      // 申請代碼 tution-{年份後兩碼}-{序號}，計數器只增不減，刪除申請後號碼不會重複
      const applicationNo = await service.nextApplicationNo(new Date().getFullYear());

      const newClass = await service.createClass({
        ...data,
        teacher_id: session.teacher_id,
        teacher_name_cn: teacherNameCn,
        approval_status: TutionClassStatus.PENDING,
        time_start: data.time_start || FIXED_TIME_START,
        time_end: data.time_end || FIXED_TIME_END,
        application_no: applicationNo,
      } as any);

      await service.addRosterEntries(initialRoster.map((student) => toRosterItem(newClass.class_id, newClass.start_date, student)));

      const hydratedClass = await buildClassResponse(env, service, newClass);
      return jsonResponse({ data: hydratedClass }, 201);
    }

    // GET /api/v1/classes/{classId} - 取得補習班詳情
    if (method === "GET" && classId && !subAction) {
      const tutionClass = await service.getClass(classId);

      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      // 驗證權限：只有教師或管理員可以查看
      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const hydratedClass = await buildClassResponse(env, service, tutionClass);
      return jsonResponse({ data: hydratedClass }, 200);
    }

    // PUT /api/v1/classes/{classId} - 更新補習班
    if (method === "PUT" && classId && !subAction) {
      const tutionClass = await service.getClass(classId);

      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // 欄位白名單：結束日期隨時可改；申請表內容只有待審批時可改。
      // 審批狀態、地點指定、收據、簽核檔都有各自的端點，這裡一律不接受。
      const body = (await request.json()) as Record<string, any>;
      const allowed = tutionClass.approval_status === TutionClassStatus.PENDING
        ? ["end_date", ...CLASS_FORM_FIELDS]
        : ["end_date"];
      const rejected = Object.keys(body).filter((key) => !allowed.includes(key));
      if (rejected.length > 0) {
        return jsonResponse({ error: "FIELDS_NOT_EDITABLE", fields: rejected }, 400);
      }
      if (body.end_date && !isValidDateString(body.end_date)) {
        return jsonResponse({ error: "INVALID_END_DATE" }, 400);
      }
      if ("start_date" in body && !isValidDateString(body.start_date)) {
        return jsonResponse({ error: "INVALID_START_DATE" }, 400);
      }

      const updated = await service.updateClass(classId, body);
      return jsonResponse({ data: updated }, 200);
    }

    // DELETE /api/v1/classes/{classId} - 刪除補習班
    if (method === "DELETE" && classId && !subAction) {
      const tutionClass = await service.getClass(classId);

      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      // 管理員可刪任何狀態；申請人只能刪自己「待審批／被退回」的申請（已開課的課有點名紀錄，不能自行刪）
      const isAdmin = session.permission === "admin" || session.permission === "super_admin";
      const isOwner = tutionClass.teacher_id === session.teacher_id;
      if (!isAdmin && !isOwner) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      if (
        !isAdmin &&
        tutionClass.approval_status !== TutionClassStatus.PENDING &&
        tutionClass.approval_status !== TutionClassStatus.REJECTED
      ) {
        return jsonResponse({ error: "只有待審批或被退回的申請可以刪除，已進入審核或開課的課程請聯絡管理員" }, 409);
      }

      await deleteClassWithFiles(env, service, tutionClass);

      ctx.waitUntil(
        logAudit(env, {
          action: "class.delete",
          target_type: "class",
          target_id: classId,
          actor_id: session.teacher_id,
          actor_permission: session.permission,
          before: { approval_status: tutionClass.approval_status, application_no: (tutionClass as any).application_no },
        }),
      );

      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    // PUT /api/v1/classes/{classId}/approve 或 /reject - 管理員審批
    if (method === "PUT" && classId && (subAction === "approve" || subAction === "reject")) {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      const body = (await request.json()) as { rejection_reason?: string };
      const updates: Record<string, unknown> =
        subAction === "approve"
          ? {
              approval_status: "approved",
              approved_by: session.teacher_id,
              approved_at: Date.now(),
            }
          : {
              approval_status: "rejected",
              approved_by: session.teacher_id,
              approved_at: Date.now(),
              rejection_reason: body.rejection_reason || "",
            };

      const updated = await service.updateClass(classId, updates);

      ctx.waitUntil(
        logAudit(env, {
          action: subAction === "approve" ? "class.approve" : "class.reject",
          target_type: "class",
          target_id: classId,
          actor_id: session.teacher_id,
          actor_permission: session.permission,
          before: { approval_status: tutionClass.approval_status },
          after: updates,
        }),
      );


      return jsonResponse({ data: updated }, 200);
    }

    // PUT /api/v1/classes/{classId}/venue - 管理員指定上課地點，進入審核中
    if (method === "PUT" && classId && subAction === "venue") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      const body = (await request.json()) as { venue?: string };
      if (!body.venue) {
        return jsonResponse({ error: "Missing venue" }, 400);
      }

      const updated = await service.updateClass(classId, {
        venue: body.venue,
        approval_status: "reviewing" as TutionClassStatus,
      });


      return jsonResponse({ data: updated }, 200);
    }

    // PUT /api/v1/classes/{classId}/roster - 申請人（待審批階段）重新提交學生名單
    if (method === "PUT" && classId && subAction === "roster" && !subId) {
      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      if (tutionClass.approval_status !== "pending") {
        return jsonResponse({ error: "只有待審批的申請可以修改學生名單" }, 400);
      }

      const body = (await request.json()) as { students?: IncomingRosterSnapshot[] };
      const students = Array.isArray(body.students) ? body.students : [];

      if (students.length > MAX_STUDENTS_PER_CLASS) {
        return jsonResponse(
          { error: `學生名單共 ${students.length} 人，超過每堂課最多 ${MAX_STUDENTS_PER_CLASS} 人上限` },
          400,
        );
      }

      const rosterError = await validateRosterStudents(env, students);
      if (rosterError) return rosterError;

      await service.replaceRoster(
        classId,
        students.map((student) => toRosterItem(classId, tutionClass.start_date, student)),
      );

      const updated = await service.updateClass(classId, {
        initial_roster: students,
      } as any);

      const hydratedClass = await buildClassResponse(env, service, updated);
      return jsonResponse({ data: hydratedClass }, 200);
    }

    // GET /api/v1/classes/{classId}/roster - 查詢已開課課程的學生名單（含在讀 + 已退出）
    if (method === "GET" && classId && subAction === "roster" && !subId) {
      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const entries = await service.listRosterByClass(classId);
      const directory = createStudentDirectory(env.STUDENT_KV);

      // 學號／真實班級／住宿代碼／在校狀態以學生名錄為準（見 resolveRosterStudentInfo）
      const hydrated = await Promise.all(
        entries.map(async (entry) => {
          const info = await resolveRosterStudentInfo(entry, tutionClass, directory);
          return {
            roster_id: entry.roster_id,
            class_id: entry.class_id,
            ...info,
            enrollment_date: entry.enrollment_date,
            withdrawal_date: entry.withdrawal_date || null,
            withdrawal_reason: entry.withdrawal_reason || null,
            is_active: entry.is_active,
          };
        }),
      );

      hydrated.sort((a, b) => (a.enrollment_date < b.enrollment_date ? -1 : 1));

      return jsonResponse({ data: hydrated }, 200);
    }

    // POST /api/v1/classes/{classId}/roster - 已開課課程新增學生（記錄加入日期）
    if (method === "POST" && classId && subAction === "roster") {
      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const body = (await request.json()) as { student_id?: string };
      if (!body.student_id) {
        return jsonResponse({ error: "Missing student_id" }, 400);
      }

      // 學生名錄（students_by_no）：body.student_id 可以是學號或 SMS 內部編號
      const directory = createStudentDirectory(env.STUDENT_KV);
      const student: any = await directory.getStudent(body.student_id);
      if (!student) {
        return jsonResponse({ error: "Student not found" }, 404);
      }
      if (isLeftSchool(student)) {
        return jsonResponse({ error: "該學生已離校，無法加入名單" }, 409);
      }

      const resolvedStudentId = student.student_id || body.student_id;

      const existingEntries = await service.listRosterByClass(classId);
      const existingEntry = existingEntries.find((entry) => entry.student_id === resolvedStudentId);
      if (existingEntry?.is_active) {
        return jsonResponse({ error: "該學生已在名單中" }, 400);
      }

      // 走到這裡代表 existingEntry 不存在或已退出，即將新增一筆在讀紀錄，需檢查人數上限
      const activeCount = existingEntries.filter((entry) => entry.is_active).length;
      if (activeCount >= MAX_STUDENTS_PER_CLASS) {
        return jsonResponse(
          { error: `已達每堂課最多 ${MAX_STUDENTS_PER_CLASS} 人上限，無法再新增` },
          400,
        );
      }

      const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0]; // 馬來西亞日期
      // 若學生先前已退出，重新加入時復用同一筆名冊紀錄（清除退出資訊、更新加入日期），
      // 避免「已退出」名單把同一位學生的每次進出都疊成一筆新紀錄、無限累加。
      const entry = existingEntry
        ? await service.updateRosterEntry(existingEntry.roster_id, {
            student_name_cn: student.name_cn,
            student_name_en: student.name_en || "-",
            student_class: student.real_class_name || student.class || "-",
            student_no: student.student_no || body.student_id,
            gender_boarding: student.gender_boarding || "-",
            enrollment_date: today,
            withdrawal_date: undefined,
            withdrawal_reason: undefined,
          } as any)
        : await service.addRosterEntry({
            class_id: classId,
            student_id: resolvedStudentId,
            student_name_cn: student.name_cn,
            student_name_en: student.name_en || "-",
            student_class: student.real_class_name || student.class || "-",
            enrollment_date: today,
            is_active: true,
            student_no: student.student_no || body.student_id,
            gender_boarding: student.gender_boarding || "-",
          } as any);

      ctx.waitUntil(
        logAudit(env, {
          action: "roster.add",
          target_type: "roster",
          target_id: entry.roster_id,
          actor_id: session.teacher_id,
          actor_permission: session.permission,
          metadata: { class_id: classId, student_id: resolvedStudentId },
          after: { roster_id: entry.roster_id, enrollment_date: entry.enrollment_date },
        }),
      );


      return jsonResponse({
        data: {
          roster_id: entry.roster_id,
          class_id: entry.class_id,
          student_id: entry.student_id,
          student_no: student.student_no || body.student_id,
          name_cn: student.name_cn,
          name_en: student.name_en || "-",
          real_class_name: student.real_class_name || student.class || "-",
          gender_boarding: student.gender_boarding || "-",
          enrollment_date: entry.enrollment_date,
          withdrawal_date: null,
          withdrawal_reason: null,
          is_active: true,
        },
      }, 201);
    }

    // PUT /api/v1/classes/{classId}/roster/{rosterId}/withdraw - 已開課課程學生退出（記錄退出日期）
    if (method === "PUT" && classId && subAction === "roster" && subId && subSubAction === "withdraw") {
      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const entry = await service.getRosterEntry(subId);
      if (!entry || entry.class_id !== classId) {
        return jsonResponse({ error: "Roster entry not found" }, 404);
      }

      // 退出日期可事後補登（不一定是當天），但不能晚於今天（馬來西亞時間），也不能早於加入日期
      const body = (await request.json().catch(() => ({}))) as { reason?: string; withdrawal_date?: string };
      const todayMYT = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
      const withdrawalDate = body.withdrawal_date || todayMYT;
      const parsed = new Date(`${withdrawalDate}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(withdrawalDate) ||
        Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().split("T")[0] !== withdrawalDate ||
        withdrawalDate > todayMYT
      ) {
        return jsonResponse({ error: "INVALID_WITHDRAWAL_DATE" }, 400);
      }
      if (entry.enrollment_date && withdrawalDate < entry.enrollment_date) {
        return jsonResponse({ error: "WITHDRAWAL_BEFORE_ENROLLMENT" }, 400);
      }
      await service.removeStudentFromRoster(subId, body.reason || "", withdrawalDate);

      ctx.waitUntil(
        logAudit(env, {
          action: "roster.withdraw",
          target_type: "roster",
          target_id: subId,
          actor_id: session.teacher_id,
          actor_permission: session.permission,
          metadata: { class_id: classId, student_id: entry.student_id },
          before: { withdrawal_date: entry.withdrawal_date ?? null, withdrawal_reason: entry.withdrawal_reason ?? null },
          after: { withdrawal_date: withdrawalDate, withdrawal_reason: body.reason || "" },
        }),
      );


      return jsonResponse({ success: true }, 200);
    }

    // GET /api/v1/classes/{classId}/pdf - 套印申請表 PDF（供審核中階段列印紙本用）
    if (method === "GET" && classId && subAction === "pdf") {
      const tutionClass = await service.getClass(classId);

      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const hydratedClass = await buildClassResponse(env, service, tutionClass);
      return generatePDFResponse(hydratedClass, env.ASSETS_KV);
    }

    // PUT /api/v1/classes/{classId}/signed-form - 上傳已簽核紙本申請表掃描檔（存檔備份）
    if (method === "PUT" && classId && subAction === "signed-form") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!isAllowedContentType(contentType)) {
        return jsonResponse(
          { error: "Unsupported file type. Only PDF, JPEG, PNG are accepted." },
          400,
        );
      }
      if (!request.body) {
        return jsonResponse({ error: "Missing file body" }, 400);
      }

      const filename = decodeURIComponent(request.headers.get("X-Filename") || "");
      const key = buildSignedFormKey(classId, tutionClass.created_at, contentType);

      await env.SIGNED_FORMS_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      const updated = await service.updateClass(classId, {
        signed_form_key: key,
        signed_form_filename: filename || undefined,
        signed_form_content_type: contentType,
        signed_form_uploaded_at: Date.now(),
        signed_form_uploaded_by: session.teacher_id,
      } as any);

      return jsonResponse({ data: updated }, 200);
    }

    // GET /api/v1/classes/{classId}/signed-form - 下載已存檔的簽核紙本掃描檔
    if (method === "GET" && classId && subAction === "signed-form") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = (await service.getClass(classId)) as any;
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!tutionClass.signed_form_key) {
        return jsonResponse({ error: "No signed form uploaded for this class" }, 404);
      }

      return getSignedFormResponse(
        env.SIGNED_FORMS_BUCKET,
        tutionClass.signed_form_key,
        tutionClass.signed_form_filename,
      );
    }

    // POST /api/v1/classes/receipt-ocr - 辨識收據照片上的 Receipt No. 與申請人工號（僅輔助預填，不寫入任何資料）
    if (method === "POST" && classId === "receipt-ocr" && !subAction) {
      if (!env.GOOGLE_VISION_API_KEY) {
        return jsonResponse({ error: "OCR 功能尚未設定（缺少 GOOGLE_VISION_API_KEY）" }, 500);
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!isAllowedReceiptContentType(contentType)) {
        return jsonResponse(
          { error: "Unsupported file type. Only PDF, JPEG, PNG are accepted." },
          400,
        );
      }
      if (!request.body) {
        return jsonResponse({ error: "Missing file body" }, 400);
      }

      try {
        const imageBytes = await request.arrayBuffer();
        const result = await ocrReceiptImage(imageBytes, env.GOOGLE_VISION_API_KEY);

        // 比對收據上「RECEIVED FROM」後面的工號是否跟目前登入的申請人一致
        let teacherMatch: boolean | null = null;
        if (result.extracted_teacher_no) {
          const teacherManager = createTeacherKVManager(env.TEACHER_KV);
          const teacher = await teacherManager.getTeacher(session.teacher_id);
          const applicantTeacherId = (teacher?.teacher_id || session.teacher_id || "").toUpperCase();
          teacherMatch = result.extracted_teacher_no === applicantTeacherId;
        }

        return jsonResponse({ data: { ...result, teacher_match: teacherMatch } }, 200);
      } catch (err) {
        console.error("Receipt OCR error:", err);
        return jsonResponse(
          { error: err instanceof Error ? err.message : "收據辨識失敗" },
          500,
        );
      }
    }

    // PUT /api/v1/classes/{classId}/receipt - 申請人上傳場地費收據（上傳後即進入審核中，無法再更改）
    if (method === "PUT" && classId && subAction === "receipt" && !subId) {
      const tutionClass = (await service.getClass(classId)) as any;
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      // 只有課程本人或管理員可以上傳
      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const half = url.searchParams.get("half");
      if (!isSemesterHalf(half)) {
        return jsonResponse({ error: "Missing or invalid 'half' query param (h1|h2)" }, 400);
      }

      const existing: ReceiptRecord | undefined =
        half === "h1" ? tutionClass.receipt_h1 : tutionClass.receipt_h2;
      if (existing && (existing.status === "pending" || existing.status === "approved")) {
        return jsonResponse(
          { error: "此學期收據已上傳且審核中或已通過，無法重複上傳。如需更正，請聯絡管理員退回後再重新上傳。" },
          400,
        );
      }

      const contentType = request.headers.get("Content-Type") || "";
      if (!isAllowedReceiptContentType(contentType)) {
        return jsonResponse(
          { error: "Unsupported file type. Only PDF, JPEG, PNG are accepted." },
          400,
        );
      }
      if (!request.body) {
        return jsonResponse({ error: "Missing file body" }, 400);
      }
      if (!env.GOOGLE_VISION_API_KEY) {
        return jsonResponse({ error: "OCR 功能尚未設定（缺少 GOOGLE_VISION_API_KEY）" }, 500);
      }

      const imageBytes = await request.arrayBuffer();

      // 收據編號一律由後端重新對圖片跑 OCR 取得，不信任前端回傳的文字，且不再開放手動輸入
      let ocrResult;
      try {
        ocrResult = await ocrReceiptImage(imageBytes, env.GOOGLE_VISION_API_KEY);
      } catch (err) {
        console.error("Receipt OCR error (upload):", err);
        return jsonResponse({ error: "收據辨識失敗，請重新拍攝更清晰的照片後再試" }, 500);
      }
      if (!ocrResult.extracted_receipt_no) {
        return jsonResponse(
          { error: "無法從照片辨識出收據編號，請確認照片清晰、完整拍到 Receipt No. 欄位後重新上傳" },
          400,
        );
      }

      const filename = decodeURIComponent(request.headers.get("X-Filename") || "");
      const key = buildReceiptKey(classId, half, new Date().getFullYear(), contentType);

      await env.SIGNED_FORMS_BUCKET.put(key, imageBytes, {
        httpMetadata: { contentType },
      });

      const receiptRecord = {
        key,
        filename: filename || undefined,
        content_type: contentType,
        receipt_no: ocrResult.extracted_receipt_no,
        received_from: ocrResult.extracted_received_from || undefined,
        description: ocrResult.extracted_description || undefined,
        status: "pending" as const,
        uploaded_at: Date.now(),
        uploaded_by: session.teacher_id,
      };

      const updated = await service.updateClass(classId, {
        [half === "h1" ? "receipt_h1" : "receipt_h2"]: receiptRecord,
      } as any);

      return jsonResponse({ data: updated }, 200);
    }

    // GET /api/v1/classes/{classId}/receipt?half=h1|h2 - 下載收據檔案
    if (method === "GET" && classId && subAction === "receipt" && !subId) {
      const tutionClass = (await service.getClass(classId)) as any;
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      if (
        tutionClass.teacher_id !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const half = url.searchParams.get("half");
      if (!isSemesterHalf(half)) {
        return jsonResponse({ error: "Missing or invalid 'half' query param (h1|h2)" }, 400);
      }

      const receipt = half === "h1" ? tutionClass.receipt_h1 : tutionClass.receipt_h2;
      if (!receipt?.key) {
        return jsonResponse({ error: "No receipt uploaded for this semester" }, 404);
      }

      return getReceiptResponse(env.SIGNED_FORMS_BUCKET, receipt.key, receipt.filename);
    }

    // PUT /api/v1/classes/{classId}/receipt/review - 管理員審核收據「正確／不正確」
    if (method === "PUT" && classId && subAction === "receipt" && subId === "review") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = (await service.getClass(classId)) as any;
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      const body = (await request.json()) as any;
      const half = body?.half;
      const decision = body?.decision;
      if (!isSemesterHalf(half)) {
        return jsonResponse({ error: "Missing or invalid 'half' (h1|h2)" }, 400);
      }
      if (decision !== "approved" && decision !== "rejected") {
        return jsonResponse({ error: "Missing or invalid 'decision' (approved|rejected)" }, 400);
      }

      const fieldName = half === "h1" ? "receipt_h1" : "receipt_h2";
      const existing = tutionClass[fieldName];
      if (!existing) {
        return jsonResponse({ error: "尚未上傳此學期的收據" }, 400);
      }

      const updatedReceipt = {
        ...existing,
        status: decision,
        reviewed_at: Date.now(),
        reviewed_by: session.teacher_id,
        rejection_reason: decision === "rejected" ? body?.rejection_reason || "" : undefined,
      };

      const updated = await service.updateClass(classId, {
        [fieldName]: updatedReceipt,
      } as any);

      ctx.waitUntil(
        logAudit(env, {
          action: "receipt.review",
          target_type: "class",
          target_id: classId,
          actor_id: session.teacher_id,
          actor_permission: session.permission,
          metadata: { half },
          before: existing,
          after: updatedReceipt,
        }),
      );

      return jsonResponse({ data: updated }, 200);
    }

    // GET /api/v1/classes?teacher={teacherId} - 列表查詢
    if (method === "GET" && !classId) {
      const teacherId = url.searchParams.get("teacher");

      // super_admin、admin 可以查詢所有課程；classroom_manager 只讀取全部課程供「每日教室使用總覽」繪製佔用表
      if (!teacherId) {
        if (
          session.permission === "super_admin" ||
          session.permission === "admin" ||
          session.permission === "classroom_manager"
        ) {
          // 查詢所有課程
          const hydratedClasses = await buildClassResponses(env, service, await service.listAllClasses());
          return jsonResponse({
            success: true,
            data: hydratedClasses,
            timestamp: new Date().toISOString(),
          }, 200);
        }

        return jsonResponse({
          success: false,
          error: "Missing teacher parameter",
        }, 400);
      }

      // 查詢特定教師的課程：只能查自己的（管理員可查任何人），課程資料含學生名單
      if (
        teacherId !== session.teacher_id &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const hydratedClasses = await buildClassResponses(env, service, await service.listClassesByTeacher(teacherId));
      return jsonResponse({
        success: true,
        data: hydratedClasses,
        timestamp: new Date().toISOString(),
      }, 200);
    }

    return jsonResponse({ success: false, error: "Invalid endpoint" }, 400);
  } catch (error) {
    console.error("Classes handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

async function handleMyClasses(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const service = new TutionService(env.DB);

  try {
    const hydratedClasses = await buildClassResponses(env, service, await service.listClassesByTeacher(session.teacher_id));

    return jsonResponse({
      success: true,
      data: hydratedClasses,
      timestamp: new Date().toISOString(),
    }, 200);
  } catch (error) {
    console.error("My classes handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 點名（出勤紀錄）查詢與寫入
 *
 * GET  /api/v1/attendance?class={id}  - 查詢整班出勤紀錄（唯讀，排課表格/出勤統計頁使用）；
 *                                        每位學生每堂課一筆（目前狀態）。
 * POST /api/v1/attendance/bulk        - 批次寫入某班某日期的點名結果。歷史全部保留在
 *                                        tution_attendance_log，目前狀態覆寫 tution_attendance。
 *                                        只能點：已批准的課、實際上課日（含調課、不含停課）、今天以前、
 *                                        當天在名單上的學生。
 */
async function handleAttendance(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const subAction = pathParts[4]; // /api/v1/attendance/{bulk}

  const service = new TutionService(env.DB);

  const canManageClass = (tutionClass: TutionClass) =>
    tutionClass.teacher_id === session.teacher_id ||
    session.permission === "admin" ||
    session.permission === "super_admin";

  try {
    // GET /api/v1/attendance?class={id} - 查詢整班出勤紀錄
    if (request.method === "GET" && !subAction) {
      const classId = url.searchParams.get("class");
      if (!classId) {
        return jsonResponse({ error: "Missing required query param: class" }, 400);
      }

      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const records = await service.listAttendanceByClass(classId);
      return jsonResponse({ data: records }, 200);
    }

    // POST /api/v1/attendance/bulk - 批次寫入（覆寫）某班某日期的點名結果
    if (request.method === "POST" && subAction === "bulk") {
      const body = (await request.json()) as {
        class_id?: string;
        class_date?: string;
        records?: Array<{
          student_id: string;
          status: AttendanceStatus;
          absence_reason?: string;
        }>;
      };

      if (!body.class_id || !isValidDateString(body.class_date ?? null) || !Array.isArray(body.records)) {
        return jsonResponse(
          { error: "Missing required fields: class_id, class_date (YYYY-MM-DD), records" },
          400,
        );
      }
      const classDate = body.class_date as string;

      const validStatuses = new Set<string>(Object.values(AttendanceStatus));
      for (const record of body.records) {
        if (!record.student_id || !validStatuses.has(record.status)) {
          return jsonResponse({ error: `Invalid record: ${JSON.stringify(record)}` }, 400);
        }
        if (record.status === AttendanceStatus.EXCUSE && !record.absence_reason) {
          return jsonResponse(
            {
              error: `absence_reason is required when status is 'excuse' (student ${record.student_id})`,
            },
            400,
          );
        }
      }

      const tutionClass = await service.getClass(body.class_id);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      if (!ATTENDANCE_CLASS_STATUSES.has(tutionClass.approval_status)) {
        return jsonResponse({ error: "CLASS_NOT_APPROVED" }, 409);
      }

      // 只能點實際上課日（依上課星期推算，套用停課／調課），且不能是未來日期（馬來西亞時間）
      const todayMYT = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split("T")[0];
      if (classDate > todayMYT) {
        return jsonResponse({ error: "FUTURE_DATE" }, 400);
      }
      const [schedules, rosterEntries] = await Promise.all([
        service.listSchedulesByClass(tutionClass.class_id),
        service.listRosterByClass(tutionClass.class_id),
      ]);
      const sessionRows = generateScheduleRows({
        dayOfWeek: tutionClass.day_of_week,
        startDate: tutionClass.start_date,
        endDate: tutionClass.end_date,
        exceptions: schedules,
        today: new Date(`${todayMYT}T00:00:00Z`),
        // 往後多推 60 天，涵蓋「後面的課提前調到今天以前」的情況（未來日期上面已擋）
        horizonDays: 60,
      });
      if (!sessionRows.some((row) => row.status !== "cancelled" && row.actual_date === classDate)) {
        return jsonResponse({ error: "NOT_A_SESSION_DATE" }, 400);
      }

      // 學生當天必須在名單上：加入日 ≤ 上課日，且未退出或退出日晚於上課日
      const enrolled = new Set(
        rosterEntries
          .filter(
            (entry) =>
              (!entry.enrollment_date || entry.enrollment_date <= classDate) &&
              (!entry.withdrawal_date || entry.withdrawal_date > classDate),
          )
          .map((entry) => entry.student_id),
      );
      const notEnrolled = body.records.filter((record) => !enrolled.has(record.student_id)).map((r) => r.student_id);
      if (notEnrolled.length > 0) {
        return jsonResponse({ error: "STUDENT_NOT_ON_ROSTER", student_ids: notEnrolled }, 400);
      }

      const saved = await service.recordAttendanceBatch(
        tutionClass.class_id,
        classDate,
        body.records.map((record) => ({
          student_id: record.student_id,
          status: record.status,
          absence_reason: record.status === AttendanceStatus.EXCUSE ? record.absence_reason : undefined,
        })),
        session.teacher_id,
      );

      return jsonResponse({ data: saved }, 200);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Attendance handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 住宿生點名控管、學號出席查詢（唯讀；督察員、超級管理員、舍監可用），計算邏輯見 boarding-attendance.ts
 *
 * GET /api/v1/boarding-attendance?date=YYYY-MM-DD - 某日有課的補習班裡住宿生（LH/PH）的點名狀態
 * GET /api/v1/student-attendance?student_no=XXXXX - 以學號查詢該生所有補習班的出席狀況（不限住宿生）
 */
async function handleBoardingAttendance(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!BOARDING_VIEW_PERMISSIONS.includes(session.permission)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const url = new URL(request.url);
  const service = new TutionService(env.DB);
  const directory = createStudentDirectory(env.STUDENT_KV);

  try {
    if (url.pathname === "/api/v1/boarding-attendance") {
      const date = url.searchParams.get("date");
      if (!isValidDateString(date)) {
        return jsonResponse({ error: "Invalid or missing query param: date (YYYY-MM-DD)" }, 400);
      }
      const result = await computeBoardingAttendance(service, directory, date);
      return jsonResponse({ data: result }, 200);
    }

    if (url.pathname === "/api/v1/student-attendance") {
      const studentNo = (url.searchParams.get("student_no") || "").trim();
      if (!studentNo) {
        return jsonResponse({ error: "Missing required query param: student_no" }, 400);
      }
      const result = await computeStudentAttendance(service, directory, studentNo);
      if (!result.student && result.classes.length === 0) {
        return jsonResponse({ error: "Student not found" }, 404);
      }
      return jsonResponse({ data: result }, 200);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Boarding attendance handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 系統設定
 *
 * GET  /api/v1/settings/last-teaching-date - 最後上課日期（所有已登入使用者可讀）
 * PUT  /api/v1/settings/last-teaching-date - 設定最後上課日期（僅 admin/super_admin）
 *
 * 用途：申請人（教師）可在 Welcome 頁自行設定自己課程的 end_date；
 * 沒有自行設定的課程，前端以這裡的全域「最後上課日期」當預設終止日。
 */
async function handleSettings(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/");
  const settingKey = pathParts[4]; // /api/v1/settings/{key}

  const service = new TutionService(env.DB);

  try {
    if (settingKey === "last-teaching-date") {
      if (method === "GET") {
        const date = await service.getLastTeachingDate();
        return jsonResponse({ data: { date } }, 200);
      }

      if (method === "PUT") {
        if (session.permission !== "admin" && session.permission !== "super_admin") {
          return jsonResponse({ error: "Forbidden" }, 403);
        }

        const body = (await request.json()) as { date?: string };
        if (!isValidDateString(body.date ?? null)) {
          return jsonResponse({ error: "Missing or invalid date (YYYY-MM-DD)" }, 400);
        }

        await service.setLastTeachingDate(body.date as string);
        return jsonResponse({ data: { date: body.date } }, 200);
      }
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Settings handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 「各課程開課報表」——僅 admin/super_admin 可讀。
 *
 * GET  /api/v1/reports/course-summary          讀取快取（每日凌晨 Cron 重算一次，見 scheduled handler）
 * POST /api/v1/reports/course-summary/refresh  立即重算並覆寫快取（僅 super_admin，供部署後手動補一次，
 *                                               或緊急需要最新資料時使用；前端目前沒有暴露按鈕）
 */
async function handleReports(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  if (session.permission !== "admin" && session.permission !== "super_admin") {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const reportKey = pathParts[4]; // /api/v1/reports/{key}
  const subAction = pathParts[5]; // /api/v1/reports/{key}/{refresh}

  const service = new TutionService(env.DB);
  const teacherManager = createTeacherKVManager(env.TEACHER_KV);

  try {
    if (reportKey !== "course-summary") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    if (request.method === "GET" && !subAction) {
      const summary = await service.getCourseReportSummary();
      return jsonResponse({ data: summary }, 200);
    }

    if (request.method === "POST" && subAction === "refresh") {
      if (session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const summary = await computeCourseReport(service, teacherManager);
      await service.setCourseReportSummary(summary);
      return jsonResponse({ data: summary }, 200);
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Reports handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 排課例外記錄（無開課／調課）
 *
 * 只儲存例外：老師標記過的無開課/調課日期。「有開課」的日期不會出現在這裡，
 * 由前端依 day_of_week + start_date 推算，不需要伺服器端記錄。
 */
async function handleSchedules(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/");
  const scheduleId = pathParts[4]; // /api/v1/schedules/{scheduleId}

  const service = new TutionService(env.DB);

  const canManageClass = (tutionClass: TutionClass) =>
    tutionClass.teacher_id === session.teacher_id ||
    session.permission === "admin" ||
    session.permission === "super_admin";

  try {
    // GET /api/v1/schedules?class={classId} - 列出該課程的所有例外記錄
    // GET /api/v1/schedules（不帶 class）- 列出全系統例外記錄，admin/super_admin/classroom_manager 可用
    //   （供管理員／教室管理員的每日教室使用總覽判斷調課／停課）
    if (method === "GET" && !scheduleId) {
      const classId = url.searchParams.get("class");

      if (!classId) {
        if (
          session.permission !== "admin" &&
          session.permission !== "super_admin" &&
          session.permission !== "classroom_manager"
        ) {
          return jsonResponse({ error: "Missing required query param: class" }, 400);
        }
        const allSchedules = await service.listAllSchedules();
        return jsonResponse({ data: allSchedules }, 200);
      }

      const tutionClass = await service.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const schedules = await service.listSchedulesByClass(classId);
      return jsonResponse({ data: schedules }, 200);
    }

    // POST /api/v1/schedules - 建立例外記錄（無開課／調課）
    if (method === "POST" && !scheduleId) {
      // 欄位白名單：schedule_id、created_at 等由系統產生，不接受外部傳入
      const data = pickFields((await request.json()) as Record<string, any>, [
        "class_id",
        ...SCHEDULE_EDITABLE_FIELDS,
      ]) as Partial<TutionSchedule>;

      if (!data.class_id || !isValidDateString(data.scheduled_date ?? null) || !data.status) {
        return jsonResponse(
          { error: "Missing required fields: class_id, scheduled_date, status" },
          400,
        );
      }
      if (data.status !== "cancelled" && data.status !== "rescheduled") {
        return jsonResponse(
          { error: "status must be 'cancelled' or 'rescheduled'" },
          400,
        );
      }
      if (data.status === "cancelled" && !data.cancellation_reason) {
        return jsonResponse({ error: "cancellation_reason is required" }, 400);
      }
      if (
        data.status === "rescheduled" &&
        (!isValidDateString(data.rescheduled_to ?? null) || !data.reschedule_reason)
      ) {
        return jsonResponse(
          { error: "rescheduled_to (YYYY-MM-DD) and reschedule_reason are required" },
          400,
        );
      }

      const tutionClass = await service.getClass(data.class_id);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // 同一課程同一天只能有一筆例外記錄：若已存在則直接更新，避免重複
      const existing = await service.listSchedulesByClass(data.class_id);
      const duplicate = existing.find((s) => s.scheduled_date === data.scheduled_date);
      if (duplicate) {
        const updated = await service.updateSchedule(duplicate.schedule_id, data);
        return jsonResponse({ data: updated }, 200);
      }

      const created = await service.createSchedule(
        data as Omit<TutionSchedule, "schedule_id" | "created_at" | "updated_at">,
      );
      return jsonResponse({ data: created }, 201);
    }

    // PUT /api/v1/schedules/{scheduleId} - 更新例外記錄
    if (method === "PUT" && scheduleId) {
      const existing = await service.getSchedule(scheduleId);
      if (!existing) {
        return jsonResponse({ error: "Schedule not found" }, 404);
      }

      const tutionClass = await service.getClass(existing.class_id);
      if (!tutionClass) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // 欄位白名單：不能改 class_id（把例外記錄搬到別的課）、schedule_id、created_at
      const body = (await request.json()) as Record<string, any>;
      const rejectedFields = Object.keys(body).filter((key) => !SCHEDULE_EDITABLE_FIELDS.includes(key));
      if (rejectedFields.length > 0) {
        return jsonResponse({ error: "FIELDS_NOT_EDITABLE", fields: rejectedFields }, 400);
      }
      const updates = body as Partial<TutionSchedule>;
      if (updates.status && updates.status !== "cancelled" && updates.status !== "rescheduled") {
        return jsonResponse({ error: "status must be 'cancelled' or 'rescheduled'" }, 400);
      }
      if (updates.scheduled_date !== undefined && !isValidDateString(updates.scheduled_date)) {
        return jsonResponse({ error: "INVALID_SCHEDULED_DATE" }, 400);
      }
      if (updates.rescheduled_to !== undefined && !isValidDateString(updates.rescheduled_to)) {
        return jsonResponse({ error: "INVALID_RESCHEDULED_TO" }, 400);
      }

      // classroom_manager 是窄範圍角色：只能在「每日教室使用總覽」為已調課的例外記錄指定教室，
      // 不能像 admin/super_admin 一樣改動其他欄位（狀態、原因、調課日期等）。
      const isClassroomManagerVenueAssignment =
        session.permission === "classroom_manager" &&
        existing.status === "rescheduled" &&
        Object.keys(updates).every((key) => key === "rescheduled_venue");

      if (!canManageClass(tutionClass) && !isClassroomManagerVenueAssignment) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      if (updates.status === "cancelled" && !updates.cancellation_reason && !existing.cancellation_reason) {
        return jsonResponse({ error: "cancellation_reason is required" }, 400);
      }
      if (
        updates.status === "rescheduled" &&
        !(updates.rescheduled_to || existing.rescheduled_to)
      ) {
        return jsonResponse({ error: "rescheduled_to is required" }, 400);
      }

      const updated = await service.updateSchedule(scheduleId, updates);
      return jsonResponse({ data: updated }, 200);
    }

    // DELETE /api/v1/schedules/{scheduleId} - 移除例外記錄（改回「有開課」）
    if (method === "DELETE" && scheduleId) {
      const existing = await service.getSchedule(scheduleId);
      if (!existing) {
        return jsonResponse({ error: "Schedule not found" }, 404);
      }

      const tutionClass = await service.getClass(existing.class_id);
      if (!tutionClass || !canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      await service.deleteSchedule(scheduleId);
      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    return jsonResponse({ error: "Not found" }, 404);
  } catch (error) {
    console.error("Schedules handler error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

/**
 * 處理教室管理端點
 * 
 * 路由：
 * - POST   /api/classrooms              - 新增教室（admin/super_admin）
 * - GET    /api/classrooms              - 列出所有教室（所有用戶）
 * - GET    /api/classrooms/:id          - 查詢單一教室（所有用戶）
 * - PUT    /api/classrooms/:id          - 更新教室（admin/super_admin）
 * - PATCH  /api/classrooms/:id/tution   - 切換補習選用（admin/super_admin）
 * - DELETE /api/classrooms/:id          - 刪除教室（admin/super_admin）
 * - POST   /api/classrooms/batch-update - Excel 批量更新（admin/super_admin）
 */
async function handleClassrooms(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/").filter(p => p);
  
  // 提取路由參數
  // pathParts: ["api", "classrooms", ...] 或 ["api", "v1", "classrooms", ...]
  const classroomsIndex = pathParts.indexOf("classrooms");
  const classroomId = pathParts[classroomsIndex + 1]; // classrooms/{id}
  const action = pathParts[classroomsIndex + 2]; // classrooms/{id}/{action}

  const classroomManager = createClassroomKVManager(env.CLASSROOM_KV);

  // 權限檢查輔助函數
  const requireAdmin = () => {
    if (!["admin", "super_admin"].includes(session.permission)) {
      return jsonResponse({ 
        success: false, 
        error: "Forbidden: Admin permission required" 
      }, 403);
    }
    return null;
  };

  try {
    // POST /api/classrooms - 新增教室
    if (method === "POST" && !classroomId) {
      const permissionError = requireAdmin();
      if (permissionError) return permissionError;

      const data = await request.json() as any;

      // 驗證必填欄位
      if (!data.classroom_id || !data.classroom_name || !data.class_name || data.number_of_desks === undefined) {
        return jsonResponse({ 
          success: false, 
          error: "Missing required fields: classroom_id, classroom_name, class_name, number_of_desks" 
        }, 400);
      }

      // 檢查教室 ID 是否已存在
      const existing = await classroomManager.getClassroom(data.classroom_id);
      if (existing) {
        return jsonResponse({ 
          success: false, 
          error: `Classroom ID already exists: ${data.classroom_id}` 
        }, 409);
      }

      const classroom = await classroomManager.createClassroom({
        classroom_id: data.classroom_id,
        classroom_name: data.classroom_name,
        class_name: data.class_name,
        number_of_desks: Number(data.number_of_desks),
        available_for_tution: Boolean(data.available_for_tution),
        last_updated: Date.now(),
      });

      return jsonResponse({ success: true, data: classroom }, 201);
    }

    // POST /api/classrooms/batch-update - Excel 批量更新
    if (method === "POST" && classroomId === "batch-update") {
      const permissionError = requireAdmin();
      if (permissionError) return permissionError;

      const data = await request.json() as any;

      if (!Array.isArray(data.classrooms)) {
        return jsonResponse({ 
          success: false, 
          error: "Invalid format: expected { classrooms: [...] }" 
        }, 400);
      }

      const result = await classroomManager.batchUpdateClassrooms(data.classrooms, {
        createIfMissing: data.createIfMissing === true,
      });

      return jsonResponse({ 
        success: true, 
        stats: result 
      }, 200);
    }

    // GET /api/classrooms - 列出所有教室
    if (method === "GET" && !classroomId) {
      const availableOnly = url.searchParams.get("availableOnly") === "true";
      const classrooms = await classroomManager.listAllClassrooms(availableOnly);

      return jsonResponse({ success: true, data: classrooms }, 200);
    }

    // GET /api/classrooms/:id - 查詢單一教室
    if (method === "GET" && classroomId && !action) {
      const classroom = await classroomManager.getClassroom(classroomId);

      if (!classroom) {
        return jsonResponse({ 
          success: false, 
          error: "Classroom not found" 
        }, 404);
      }

      return jsonResponse({ success: true, data: classroom }, 200);
    }

    // PUT /api/classrooms/:id - 更新教室
    if (method === "PUT" && classroomId && !action) {
      const permissionError = requireAdmin();
      if (permissionError) return permissionError;

      const data = await request.json() as any;

      // 移除不應被更新的欄位
      delete data.classroom_id;

      const updated = await classroomManager.updateClassroom(classroomId, data);

      return jsonResponse({ success: true, data: updated }, 200);
    }

    // PATCH /api/classrooms/:id/tution - 切換補習選用
    if (method === "PATCH" && classroomId && action === "tution") {
      const permissionError = requireAdmin();
      if (permissionError) return permissionError;

      const data = await request.json() as any;

      if (typeof data.available !== "boolean") {
        return jsonResponse({ 
          success: false, 
          error: "Missing required field: available (boolean)" 
        }, 400);
      }

      const updated = await classroomManager.toggleAvailableForTution(classroomId, data.available);

      return jsonResponse({ success: true, data: updated }, 200);
    }

    // DELETE /api/classrooms/:id - 刪除教室
    if (method === "DELETE" && classroomId && !action) {
      const permissionError = requireAdmin();
      if (permissionError) return permissionError;

      const success = await classroomManager.deleteClassroom(classroomId);

      if (!success) {
        return jsonResponse({ 
          success: false, 
          error: "Classroom not found" 
        }, 404);
      }

      return jsonResponse({ 
        success: true, 
        message: "Classroom deleted successfully" 
      }, 200);
    }

    // 未匹配到任何路由
    return jsonResponse({ 
      success: false, 
      error: "Not found or method not allowed" 
    }, 404);

  } catch (error) {
    console.error("Classrooms handler error:", error);
    return jsonResponse({ 
      success: false, 
      error: "Internal server error",
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
}

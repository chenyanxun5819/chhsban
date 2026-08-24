/**
 * 補習班系統 - Cloudflare Worker 入口點
 * 功能：開課管理、學生點名、課程預約、Google Sheets 同步、PDF 生成
 * 
 * ⚠️ 重要限制
 * 
 * KV PUT 額度：1,000/天（帳號全域）
 * 此系統與其他所有系統共享此限額
 * 詳見: /memories/repo/PUT操作成本清單.md
 * 
 * 登入成本:
 * - 已有帳號登入: 1 PUT (session 創建)
 * - 首次登入: 2 PUT (email 索引 + session)
 * 
 * 其他操作成本:
 * - 提交申請: 1 PUT (createClass)
 * - 更新班級: 1 PUT (updateClass)
 * - 建立記錄: 1 PUT 
 */

import { createAuthKVManager, createTeacherKVManager, createStudentKVManager, createClassroomKVManager, TutionClassStatus, AttendanceStatus, type TutionClass, type TutionSchedule } from "@chhsban/kv-utils";
import { KV_NAMESPACES } from "@chhsban/cloudflare-config";
import { TutionSheetsSync } from "./sheets-sync";
import { TutionKVService } from "./tution-service";
import { generatePDFResponse } from "./pdf-generator";
import { buildSignedFormKey, getSignedFormResponse, isAllowedContentType } from "./signed-form";
import { getSemesterInfo } from "./semester";
import { buildReceiptKey, getReceiptResponse, isAllowedReceiptContentType, isSemesterHalf, type ReceiptRecord } from "./receipt";
import { ocrReceiptImage } from "./google-vision";

interface Env {
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  TUTION_CLASS_KV: KVNamespace;
  TUTION_ROSTER_KV: KVNamespace;
  TUTION_ATTENDANCE_KV: KVNamespace;
  TUTION_SCHEDULE_KV: KVNamespace;
  CLASSROOM_KV: KVNamespace;
  ASSETS_KV: KVNamespace;
  SIGNED_FORMS_BUCKET: R2Bucket;
  GOOGLE_SHEETS_API_KEY?: string;
  GOOGLE_SHEETS_SPREADSHEET_ID: string;
  GOOGLE_SHEETS_SHEET_CLASSES: string;
  GOOGLE_SHEETS_SHEET_ROSTER: string;
  GOOGLE_SHEETS_SHEET_ATTENDANCE: string;
  GOOGLE_SERVICE_ACCOUNT_EMAIL?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?: string;
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID?: string;
  GOOGLE_VISION_API_KEY?: string;
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

async function buildRosterSnapshots(
  env: Env,
  kvService: TutionKVService,
  classId: string,
): Promise<IncomingRosterSnapshot[]> {
  const studentManager = createStudentKVManager(env.STUDENT_KV);
  const rosterEntries = await kvService.listRosterByClass(classId);

  return Promise.all(
    rosterEntries.map(async (entry) => {
      const student = await studentManager.getStudent(entry.student_id);

      return {
        student_id: entry.student_id,
        student_no: student?.student_id || entry.student_id,
        name_cn: entry.student_name_cn,
        name_en: entry.student_name_en,
        real_class_name: entry.student_class,
        input_class_name: entry.student_class,
      };
    }),
  );
}

async function buildClassResponse(
  env: Env,
  kvService: TutionKVService,
  tutionClass: any,
): Promise<any> {
  const teacherManager = createTeacherKVManager(env.TEACHER_KV);
  const teacher = tutionClass.teacher_id
    ? await teacherManager.getTeacher(tutionClass.teacher_id)
    : null;

  const initialRoster = Array.isArray(tutionClass.initial_roster) && tutionClass.initial_roster.length > 0
    ? tutionClass.initial_roster
    : await buildRosterSnapshots(env, kvService, tutionClass.class_id);

  return {
    ...tutionClass,
    teacher_name_cn:
      tutionClass.teacher_name_cn ||
      teacher?.name_cn ||
      teacher?.name_en ||
      "",
    initial_roster: initialRoster,
  };
}

/**
 * CORS 回應頭
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Filename, X-Receipt-No",
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

async function syncClassDataToSheets(env: Env, kvService: TutionKVService): Promise<void> {
  if (!env.GOOGLE_SHEETS_API_KEY && !env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
    console.warn("[SHEETS] No Google Sheets credentials are configured; skipping sync");
    return;
  }

  const sheetsSync = new TutionSheetsSync({
    apiKey: env.GOOGLE_SHEETS_API_KEY,
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
    serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    serviceAccountPrivateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
    serviceAccountPrivateKeyId: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
    sheetNames: {
      classes: env.GOOGLE_SHEETS_SHEET_CLASSES,
      roster: env.GOOGLE_SHEETS_SHEET_ROSTER,
      attendance: env.GOOGLE_SHEETS_SHEET_ATTENDANCE,
    },
  });

  const [classes, roster] = await Promise.all([
    kvService.listAllClasses(),
    kvService.listAllRoster(),
  ]);

  await Promise.all([
    sheetsSync.syncClasses(classes),
    sheetsSync.syncRoster(roster),
  ]);
}

/**
 * 處理認證驗證 (Email 驗證)
 */
async function handleAuthVerify(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: getCorsHeaders(),
      });
    }

    const body = (await request.json()) as { email?: string };

    if (!body.email) {
      return new Response(JSON.stringify({ error: "Missing email field" }), {
        status: 400,
        headers: getCorsHeaders(),
      });
    }

    const email = String(body.email).trim().toLowerCase();
    console.log(`[AUTH] Verifying email: ${email}`);

    // 優化查詢：先嘗試從 email 索引查找
    const emailKey = `email:${email}`;
    const teacherIdFromIndex = await env.TEACHER_KV.get(emailKey);
    
    let teacher = null;
    
    if (teacherIdFromIndex) {
      // 從索引找到 teacher_id，直接獲取教師資料
      console.log(`[AUTH] Found teacher_id from email index: ${teacherIdFromIndex}`);
      const teacherManager = createTeacherKVManager(env.TEACHER_KV);
      teacher = await teacherManager.getTeacher(teacherIdFromIndex);
    } else {
      // 索引不存在，回退到掃描所有教師（慢）
      console.log(`[AUTH] Email index not found, falling back to full scan`);
      const teacherManager = createTeacherKVManager(env.TEACHER_KV);
      const startTime = Date.now();
      
      const allTeachers = await teacherManager.getAllTeachers();
      const loadTime = Date.now() - startTime;
      console.log(`[AUTH] Loaded ${allTeachers.length} teachers in ${loadTime}ms`);
      
      teacher = allTeachers.find((t) => t.email.toLowerCase() === email);
      
      // 如果找到教師，建立索引供下次使用
      if (teacher) {
        console.log(`[AUTH] Creating email index for future logins`);
        await env.TEACHER_KV.put(emailKey, teacher.teacher_id);
      }
    }

    if (!teacher) {
      console.log(`[AUTH] Teacher not found for email: ${email}`);
      return new Response(
        JSON.stringify({ error: "Email not registered in system" }),
        { status: 401, headers: getCorsHeaders() },
      );
    }

    console.log(`[AUTH] Found teacher: ${teacher.teacher_id}`);

    // 生成 token
    const authManager = createAuthKVManager(env.AUTH_KV);

    // 創建會話（使用 createSession 而非 saveSession）
    const session = await authManager.createSession(
      teacher.teacher_id,
      teacher.name_cn || teacher.name_en || "Unknown",
      teacher.permission || "teacher",
    );

    console.log(`[AUTH] Session created: ${session.token}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          token: session.token,
          teacher_id: teacher.teacher_id,
          teacher_name: teacher.name_cn || teacher.name_en || "Unknown",
          email: teacher.email,
          permission: teacher.permission || "teacher",
        },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: getCorsHeaders() },
    );
  } catch (error) {
    console.error("[AUTH] Error in auth verify:", error);
    return new Response(
      JSON.stringify({ 
        error: "Authentication failed",
        details: error instanceof Error ? error.message : "Unknown error"
      }), 
      {
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 處理 CORS 預檢
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: getCorsHeaders(),
      });
    }

    // 認證端點不需要 token
    if (pathname === "/api/auth/verify") {
      return handleAuthVerify(request, env);
    }

    // 健康檢查不需要 token
    if (pathname === "/api/health") {
      return new Response(
        JSON.stringify({ status: "ok", service: "tution-system" }),
        { status: 200, headers: getCorsHeaders() },
      );
    }

    // 初始化路由不需要 token（但需要初始化密钥）
    if (pathname.startsWith("/api/sync")) {
      const url = new URL(request.url);
      const action = url.searchParams.get("action");
      
      if (action === "init") {
        const initKey = url.searchParams.get("key") || request.headers.get("X-Init-Key");
        const expectedKey = env.GOOGLE_SHEETS_API_KEY ? "init-" + env.GOOGLE_SHEETS_API_KEY.substring(0, 8) : "init-default";
        
        if (initKey === expectedKey || initKey === "init") {
          return handleSync(request, env, null);
        }
        
        return jsonResponse({ error: "Unauthorized: Invalid init key" }, 401);
      }
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
      if (pathname === "/api/health") {
        return handleHealth();
      }
      
      if (pathname.startsWith("/api/sync")) {
        return handleSync(request, env, session);
      }

      if (pathname.startsWith("/api/v1/students")) {
        return handleStudents(request, env, session);
      }

      if (pathname.startsWith("/api/v1/my/classes")) {
        return handleMyClasses(request, env, session);
      }

      if (pathname.startsWith("/api/v1/classes")) {
        return handleClasses(request, env, session);
      }

      if (pathname.startsWith("/api/v1/schedules")) {
        return handleSchedules(request, env, session);
      }

      if (pathname.startsWith("/api/v1/attendance")) {
        return handleAttendance(request, env, session);
      }

      if (pathname.startsWith("/api/v1/classrooms") || pathname.startsWith("/api/classrooms")) {
        return handleClassrooms(request, env, session);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
};

function handleHealth(): Response {
  return jsonResponse({ status: "ok", service: "tution-system" });
}

/**
 * 處理學生查詢端點
 */
async function handleStudents(
  request: Request,
  env: Env,
  session: any,
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
    const studentManager = createStudentKVManager(env.STUDENT_KV);
    let student = null;
    
    // 先嘗試作為 student_id 查詢
    student = await studentManager.getStudent(studentIdentifier);
    
    // 如果沒找到，嘗試作為 student_no 查詢（通過索引）
    if (!student) {
      const studentIdFromIndex = await env.STUDENT_KV.get(`student_no:${studentIdentifier}`);
      if (studentIdFromIndex) {
        student = await studentManager.getStudent(studentIdFromIndex);
      }
    }

    if (!student) {
      return jsonResponse({ error: "Student not found" }, 404);
    }

    // 確保返回格式包含所有必要欄位
    const studentData = {
      ...student,
      name_en: student.name_en || "-",
      real_class_name: student.real_class_name || "-",
      gender_boarding: student.gender_boarding || "-",
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
): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split("/");
  const classId = pathParts[4]; // /api/v1/classes/{classId}
  const subAction = pathParts[5]; // /api/v1/classes/{classId}/{pdf|roster}
  const subId = pathParts[6]; // /api/v1/classes/{classId}/roster/{rosterId}
  const subSubAction = pathParts[7]; // /api/v1/classes/{classId}/roster/{rosterId}/withdraw

  const kvService = new TutionKVService(
    env.TUTION_CLASS_KV,
    env.TUTION_ROSTER_KV,
    env.TUTION_ATTENDANCE_KV,
    env.TUTION_SCHEDULE_KV,
  );

  try {
    // POST /api/v1/classes - 建立新補習班
    if (method === "POST" && !classId) {
      const data = await request.json();

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

      // 如果沒有提供教師中文名字，從 TEACHER_KV 中查詢
      let teacherNameCn = data.teacher_name_cn;
      if (!teacherNameCn) {
        try {
          const teacherManager = createTeacherKVManager(env.TEACHER_KV);
          const teacher = await teacherManager.getTeacher(session.teacher_id);
          teacherNameCn = teacher?.name_cn || teacher?.name_en || "";
        } catch (e) {
          console.warn("Failed to fetch teacher name:", e);
          teacherNameCn = "";
        }
      }

      // 每學年（以 7/1 為界的上/下學年）每位申請人最多 2 堂已批准（含進行中）的課程，
      // 依新申請的 start_date 判斷落在哪個學年
      const semester = getSemesterInfo(data.start_date);
      const teacherClasses = await kvService.listClassesByTeacher(session.teacher_id);
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

      // 產生可讀的申請代碼：tution-{年份後兩碼}-{該年度序號}
      const currentYear = new Date().getFullYear();
      const existingClasses = await kvService.listAllClasses();
      const sameYearCount = existingClasses.filter(
        (c) => new Date(c.created_at).getFullYear() === currentYear,
      ).length;
      const applicationNo = `tution-${String(currentYear).slice(-2)}-${String(sameYearCount + 1).padStart(2, "0")}`;

      const classData = {
        ...data,
        teacher_id: session.teacher_id,
        teacher_name_cn: teacherNameCn,
        approval_status: "pending",
        time_start: data.time_start || FIXED_TIME_START,
        time_end: data.time_end || FIXED_TIME_END,
        application_no: applicationNo,
      };

      const newClass = await kvService.createClass(classData);

      const initialRoster = Array.isArray(data.initial_roster)
        ? (data.initial_roster as IncomingRosterSnapshot[])
        : [];

      if (initialRoster.length > 0) {
        await Promise.all(
          initialRoster.map((student) =>
            kvService.addRosterEntry({
              class_id: newClass.class_id,
              student_id: student.student_id,
              student_name_cn: student.name_cn,
              student_name_en: student.name_en || "-",
              student_class: student.real_class_name || student.input_class_name || "-",
              enrollment_date: newClass.start_date,
              is_active: true,
              student_no: student.student_no || student.student_id,
              gender_boarding: student.gender_boarding || "-",
            } as any),
          ),
        );
      }

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after class creation:", syncError);
      }

      const hydratedClass = await buildClassResponse(env, kvService, newClass);
      return jsonResponse({ data: hydratedClass }, 201);
    }

    // GET /api/v1/classes/{classId} - 取得補習班詳情
    if (method === "GET" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

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

      const hydratedClass = await buildClassResponse(env, kvService, tutionClass);
      return jsonResponse({ data: hydratedClass }, 200);
    }

    // PUT /api/v1/classes/{classId} - 更新補習班
    if (method === "PUT" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

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

      const updates = await request.json();
      const updated = await kvService.updateClass(classId, updates);

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after class update:", syncError);
      }

      return jsonResponse({ data: updated }, 200);
    }

    // DELETE /api/v1/classes/{classId} - 刪除補習班
    if (method === "DELETE" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

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

      const rosterEntries = await kvService.listRosterByClass(classId);
      await Promise.all(rosterEntries.map((entry) => kvService.deleteRosterEntry(entry.roster_id)));

      await kvService.deleteClass(classId);

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after class deletion:", syncError);
      }

      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    // PUT /api/v1/classes/{classId}/approve 或 /reject - 管理員審批
    if (method === "PUT" && classId && (subAction === "approve" || subAction === "reject")) {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await kvService.getClass(classId);
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

      const updated = await kvService.updateClass(classId, updates);

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after approval decision:", syncError);
      }

      return jsonResponse({ data: updated }, 200);
    }

    // PUT /api/v1/classes/{classId}/venue - 管理員指定上課地點，進入審核中
    if (method === "PUT" && classId && subAction === "venue") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await kvService.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }

      const body = (await request.json()) as { venue?: string };
      if (!body.venue) {
        return jsonResponse({ error: "Missing venue" }, 400);
      }

      const updated = await kvService.updateClass(classId, {
        venue: body.venue,
        approval_status: "reviewing" as TutionClassStatus,
      });

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after venue assignment:", syncError);
      }

      return jsonResponse({ data: updated }, 200);
    }

    // PUT /api/v1/classes/{classId}/roster - 申請人（待審批階段）重新提交學生名單
    if (method === "PUT" && classId && subAction === "roster" && !subId) {
      const tutionClass = await kvService.getClass(classId);
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

      const existingEntries = await kvService.listRosterByClass(classId);
      await Promise.all(existingEntries.map((entry) => kvService.deleteRosterEntry(entry.roster_id)));

      await Promise.all(
        students.map((student) =>
          kvService.addRosterEntry({
            class_id: classId,
            student_id: student.student_id,
            student_name_cn: student.name_cn,
            student_name_en: student.name_en || "-",
            student_class: student.real_class_name || student.input_class_name || "-",
            enrollment_date: tutionClass.start_date,
            is_active: true,
            student_no: student.student_no || student.student_id,
            gender_boarding: student.gender_boarding || "-",
          } as any),
        ),
      );

      const updated = await kvService.updateClass(classId, {
        initial_roster: students,
      } as any);

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after roster update:", syncError);
      }

      const hydratedClass = await buildClassResponse(env, kvService, updated);
      return jsonResponse({ data: hydratedClass }, 200);
    }

    // GET /api/v1/classes/{classId}/roster - 查詢已開課課程的學生名單（含在讀 + 已退出）
    if (method === "GET" && classId && subAction === "roster" && !subId) {
      const tutionClass = await kvService.getClass(classId);
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

      const entries = await kvService.listRosterByClass(classId);
      const studentManager = createStudentKVManager(env.STUDENT_KV);

      // STUDENT_KV 對同一位學生存在兩種 key 慣例：
      // - student:{student_no} 是原始完整資料（含 gender_boarding / real_class_name）
      // - student:{student_id} 是後來另一批只含核心欄位的精簡資料（沒有 gender_boarding）
      // 用 student_id 直接查通常只會查到精簡版。申請當下驗證名單時是用 student_no
      // 查到完整版並存進 class 的 initial_roster 快照，這裡優先拿那份快照當資料來源。
      const initialRosterMap = new Map<string, any>(
        (Array.isArray((tutionClass as any).initial_roster) ? (tutionClass as any).initial_roster : []).map(
          (s: any) => [s.student_id, s],
        ),
      );

      const hydrated = await Promise.all(
        entries.map(async (entry) => {
          const snapshot = initialRosterMap.get(entry.student_id);
          const storedGenderBoarding = (entry as any).gender_boarding;

          let genderBoarding = storedGenderBoarding || snapshot?.gender_boarding;
          let studentNo = (entry as any).student_no || snapshot?.student_no;
          let realClassName = snapshot?.real_class_name || entry.student_class;

          if (!genderBoarding) {
            const student: any = await studentManager.getStudent(entry.student_id);
            genderBoarding = student?.gender_boarding;
            studentNo = studentNo || student?.student_no;
            realClassName = student?.real_class_name || realClassName;
          }

          return {
            roster_id: entry.roster_id,
            class_id: entry.class_id,
            student_id: entry.student_id,
            student_no: studentNo || entry.student_id,
            name_cn: entry.student_name_cn,
            name_en: entry.student_name_en,
            real_class_name: realClassName,
            gender_boarding: genderBoarding || "-",
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
      const tutionClass = await kvService.getClass(classId);
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

      // 跟 handleStudents 一樣做雙重查詢：先當 student_no 直接查（完整資料通常存在這裡），
      // 找不到再透過索引反查 student_id。
      const studentManager = createStudentKVManager(env.STUDENT_KV);
      let student: any = await studentManager.getStudent(body.student_id);
      if (!student) {
        const studentIdFromIndex = await env.STUDENT_KV.get(`student_no:${body.student_id}`);
        if (studentIdFromIndex) {
          student = await studentManager.getStudent(studentIdFromIndex);
        }
      }
      if (!student) {
        return jsonResponse({ error: "Student not found" }, 404);
      }

      const resolvedStudentId = student.student_id || body.student_id;

      const existingEntries = await kvService.listRosterByClass(classId);
      if (existingEntries.some((entry) => entry.student_id === resolvedStudentId && entry.is_active)) {
        return jsonResponse({ error: "該學生已在名單中" }, 400);
      }

      const today = new Date().toISOString().split("T")[0];
      const entry = await kvService.addRosterEntry({
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

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after roster add:", syncError);
      }

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
      const tutionClass = await kvService.getClass(classId);
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

      const entry = await kvService.getRosterEntry(subId);
      if (!entry || entry.class_id !== classId) {
        return jsonResponse({ error: "Roster entry not found" }, 404);
      }

      const body = (await request.json().catch(() => ({}))) as { reason?: string };
      await kvService.removeStudentFromRoster(subId, body.reason || "");

      try {
        await syncClassDataToSheets(env, kvService);
      } catch (syncError) {
        console.error("[SHEETS] Failed to sync after roster withdrawal:", syncError);
      }

      return jsonResponse({ success: true }, 200);
    }

    // GET /api/v1/classes/{classId}/pdf - 套印申請表 PDF（供審核中階段列印紙本用）
    if (method === "GET" && classId && subAction === "pdf") {
      const tutionClass = await kvService.getClass(classId);

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

      const hydratedClass = await buildClassResponse(env, kvService, tutionClass);
      return generatePDFResponse(hydratedClass, env.ASSETS_KV);
    }

    // PUT /api/v1/classes/{classId}/signed-form - 上傳已簽核紙本申請表掃描檔（存檔備份）
    if (method === "PUT" && classId && subAction === "signed-form") {
      if (session.permission !== "admin" && session.permission !== "super_admin") {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const tutionClass = await kvService.getClass(classId);
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

      const updated = await kvService.updateClass(classId, {
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

      const tutionClass = (await kvService.getClass(classId)) as any;
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

    // POST /api/v1/classes/receipt-ocr - 辨識收據照片上的 Receipt No.（僅輔助預填，不寫入任何資料）
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
        return jsonResponse({ data: result }, 200);
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
      const tutionClass = (await kvService.getClass(classId)) as any;
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

      const receiptNo = decodeURIComponent(request.headers.get("X-Receipt-No") || "").trim();
      if (!receiptNo) {
        return jsonResponse({ error: "Missing X-Receipt-No header" }, 400);
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

      const filename = decodeURIComponent(request.headers.get("X-Filename") || "");
      const key = buildReceiptKey(classId, half, new Date().getFullYear(), contentType);

      await env.SIGNED_FORMS_BUCKET.put(key, request.body, {
        httpMetadata: { contentType },
      });

      const receiptRecord = {
        key,
        filename: filename || undefined,
        content_type: contentType,
        receipt_no: receiptNo,
        status: "pending" as const,
        uploaded_at: Date.now(),
        uploaded_by: session.teacher_id,
      };

      const updated = await kvService.updateClass(classId, {
        [half === "h1" ? "receipt_h1" : "receipt_h2"]: receiptRecord,
      } as any);

      return jsonResponse({ data: updated }, 200);
    }

    // GET /api/v1/classes/{classId}/receipt?half=h1|h2 - 下載收據檔案
    if (method === "GET" && classId && subAction === "receipt" && !subId) {
      const tutionClass = (await kvService.getClass(classId)) as any;
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

      const tutionClass = (await kvService.getClass(classId)) as any;
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

      const updated = await kvService.updateClass(classId, {
        [fieldName]: updatedReceipt,
      } as any);

      return jsonResponse({ data: updated }, 200);
    }

    // GET /api/v1/classes?teacher={teacherId} - 列表查詢
    if (method === "GET" && !classId) {
      const teacherId = url.searchParams.get("teacher");

      // super_admin 和 admin 可以查詢所有課程
      if (!teacherId) {
        if (
          session.permission === "super_admin" ||
          session.permission === "admin"
        ) {
          // 查詢所有課程
          const allClasses = await kvService.listAllClasses();
          const hydratedClasses = await Promise.all(
            allClasses.map((item) => buildClassResponse(env, kvService, item)),
          );
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

      // 查詢特定教師的課程
      const classes = await kvService.listClassesByTeacher(teacherId);
      const hydratedClasses = await Promise.all(
        classes.map((item) => buildClassResponse(env, kvService, item)),
      );
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

  const kvService = new TutionKVService(
    env.TUTION_CLASS_KV,
    env.TUTION_ROSTER_KV,
    env.TUTION_ATTENDANCE_KV,
    env.TUTION_SCHEDULE_KV,
  );

  try {
    const classes = await kvService.listClassesByTeacher(session.teacher_id);
    const hydratedClasses = await Promise.all(
      classes.map((item) => buildClassResponse(env, kvService, item)),
    );

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
 * GET  /api/v1/attendance?class={id}  - 查詢整班出勤紀錄（唯讀，排課表格/出勤統計頁使用）
 * POST /api/v1/attendance/bulk        - 批次寫入（覆寫）某班某日期全體學生的點名結果，
 *                                        不保留修改歷史；同一學生同一日期已有紀錄則直接覆寫。
 */
async function handleAttendance(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const subAction = pathParts[4]; // /api/v1/attendance/{bulk}

  const kvService = new TutionKVService(
    env.TUTION_CLASS_KV,
    env.TUTION_ROSTER_KV,
    env.TUTION_ATTENDANCE_KV,
    env.TUTION_SCHEDULE_KV,
  );

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

      const tutionClass = await kvService.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const records = await kvService.listAttendanceByClass(classId);
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

      if (!body.class_id || !body.class_date || !Array.isArray(body.records)) {
        return jsonResponse(
          { error: "Missing required fields: class_id, class_date, records" },
          400,
        );
      }

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

      const tutionClass = await kvService.getClass(body.class_id);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // 停課日期不可點名（「有開課」的日期不落地儲存，只需檢查是否被標記為停課）
      const schedules = await kvService.listSchedulesByClass(body.class_id);
      const isCancelled = schedules.some(
        (s) => s.scheduled_date === body.class_date && s.status === "cancelled",
      );
      if (isCancelled) {
        return jsonResponse({ error: "This date is cancelled and cannot be marked" }, 400);
      }

      // 覆寫語意：同一班同一日期同一學生若已有紀錄，直接更新；否則新增
      const existing = await kvService.listAttendanceByClass(body.class_id);
      const existingByStudent = new Map(
        existing
          .filter((r) => r.class_date === body.class_date)
          .map((r) => [r.student_id, r] as const),
      );

      const now = Date.now();
      const classId = body.class_id;
      const classDate = body.class_date;
      const saved = await Promise.all(
        body.records.map((record) => {
          const absenceReason =
            record.status === AttendanceStatus.EXCUSE ? record.absence_reason : undefined;
          const found = existingByStudent.get(record.student_id);
          if (found) {
            return kvService.updateAttendanceRecord(found.attendance_id, {
              status: record.status,
              absence_reason: absenceReason,
              recorded_at: now,
              recorded_by: session.teacher_id,
            });
          }
          return kvService.recordAttendance({
            class_id: classId,
            student_id: record.student_id,
            class_date: classDate,
            status: record.status,
            absence_reason: absenceReason,
            recorded_at: now,
            recorded_by: session.teacher_id,
          });
        }),
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

  const kvService = new TutionKVService(
    env.TUTION_CLASS_KV,
    env.TUTION_ROSTER_KV,
    env.TUTION_ATTENDANCE_KV,
    env.TUTION_SCHEDULE_KV,
  );

  const canManageClass = (tutionClass: TutionClass) =>
    tutionClass.teacher_id === session.teacher_id ||
    session.permission === "admin" ||
    session.permission === "super_admin";

  try {
    // GET /api/v1/schedules?class={classId} - 列出該課程的所有例外記錄
    if (method === "GET" && !scheduleId) {
      const classId = url.searchParams.get("class");
      if (!classId) {
        return jsonResponse({ error: "Missing required query param: class" }, 400);
      }

      const tutionClass = await kvService.getClass(classId);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const schedules = await kvService.listSchedulesByClass(classId);
      return jsonResponse({ data: schedules }, 200);
    }

    // POST /api/v1/schedules - 建立例外記錄（無開課／調課）
    if (method === "POST" && !scheduleId) {
      const data = (await request.json()) as Partial<TutionSchedule>;

      if (!data.class_id || !data.scheduled_date || !data.status) {
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
        (!data.rescheduled_to || !data.reschedule_reason)
      ) {
        return jsonResponse(
          { error: "rescheduled_to and reschedule_reason are required" },
          400,
        );
      }

      const tutionClass = await kvService.getClass(data.class_id);
      if (!tutionClass) {
        return jsonResponse({ error: "Class not found" }, 404);
      }
      if (!canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      // 同一課程同一天只能有一筆例外記錄：若已存在則直接更新，避免重複
      const existing = await kvService.listSchedulesByClass(data.class_id);
      const duplicate = existing.find((s) => s.scheduled_date === data.scheduled_date);
      if (duplicate) {
        const updated = await kvService.updateSchedule(duplicate.schedule_id, data);
        return jsonResponse({ data: updated }, 200);
      }

      const created = await kvService.createSchedule(
        data as Omit<TutionSchedule, "schedule_id" | "created_at" | "updated_at">,
      );
      return jsonResponse({ data: created }, 201);
    }

    // PUT /api/v1/schedules/{scheduleId} - 更新例外記錄
    if (method === "PUT" && scheduleId) {
      const existing = await kvService.getSchedule(scheduleId);
      if (!existing) {
        return jsonResponse({ error: "Schedule not found" }, 404);
      }

      const tutionClass = await kvService.getClass(existing.class_id);
      if (!tutionClass || !canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      const updates = (await request.json()) as Partial<TutionSchedule>;
      if (updates.status === "cancelled" && !updates.cancellation_reason && !existing.cancellation_reason) {
        return jsonResponse({ error: "cancellation_reason is required" }, 400);
      }
      if (
        updates.status === "rescheduled" &&
        !(updates.rescheduled_to || existing.rescheduled_to)
      ) {
        return jsonResponse({ error: "rescheduled_to is required" }, 400);
      }

      const updated = await kvService.updateSchedule(scheduleId, updates);
      return jsonResponse({ data: updated }, 200);
    }

    // DELETE /api/v1/schedules/{scheduleId} - 移除例外記錄（改回「有開課」）
    if (method === "DELETE" && scheduleId) {
      const existing = await kvService.getSchedule(scheduleId);
      if (!existing) {
        return jsonResponse({ error: "Schedule not found" }, 404);
      }

      const tutionClass = await kvService.getClass(existing.class_id);
      if (!tutionClass || !canManageClass(tutionClass)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }

      await kvService.deleteSchedule(scheduleId);
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

/**
 * 處理 Google Sheets 同步
 */
async function handleSync(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  try {
    // 只有初始化不需要 session
    if (action !== "init" && !session) {
      return jsonResponse({ error: "Unauthorized: Missing token" }, 401);
    }

    const sheetsSync = new TutionSheetsSync({
      apiKey: env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
      serviceAccountEmail: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      serviceAccountPrivateKey: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      serviceAccountPrivateKeyId: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
      sheetNames: {
        classes: env.GOOGLE_SHEETS_SHEET_CLASSES,
        roster: env.GOOGLE_SHEETS_SHEET_ROSTER,
        attendance: env.GOOGLE_SHEETS_SHEET_ATTENDANCE,
      },
    });

    const kvService = new TutionKVService(
      env.TUTION_CLASS_KV,
      env.TUTION_ROSTER_KV,
      env.TUTION_ATTENDANCE_KV,
      env.TUTION_SCHEDULE_KV,
    );

    if (action === "init") {
      // 初始化 Google Sheet 結構
      await sheetsSync.initializeSheets();
      return jsonResponse({
        success: true,
        message: "Google Sheet initialized with 3 worksheets",
      }, 200);
    }

    if (action === "sync-all") {
      // 同步所有數據到 Google Sheet
      const classesResult = await env.TUTION_CLASS_KV.list({
        prefix: "class_",
      });
      const rosterResult = await env.TUTION_ROSTER_KV.list({
        prefix: "roster_",
      });
      const attendanceResult = await env.TUTION_ATTENDANCE_KV.list({
        prefix: "attendance_",
      });

      // 讀取所有數據
      const classes = await Promise.all(
        classesResult.keys.map((k) =>
          env.TUTION_CLASS_KV.get(k.name).then((v) =>
            v ? JSON.parse(v) : null,
          ),
        ),
      );
      const roster = await Promise.all(
        rosterResult.keys.map((k) =>
          env.TUTION_ROSTER_KV.get(k.name).then((v) =>
            v ? JSON.parse(v) : null,
          ),
        ),
      );
      const attendance = await Promise.all(
        attendanceResult.keys.map((k) =>
          env.TUTION_ATTENDANCE_KV.get(k.name).then((v) =>
            v ? JSON.parse(v) : null,
          ),
        ),
      );

      // 同步到 Google Sheet
      await Promise.all([
        sheetsSync.syncClasses(classes.filter(Boolean)),
        sheetsSync.syncRoster(roster.filter(Boolean)),
        sheetsSync.syncAttendance(attendance.filter(Boolean)),
      ]);

      return jsonResponse({
        success: true,
        message: "All data synced to Google Sheet",
        stats: {
          classes: classes.length,
          roster: roster.length,
          attendance: attendance.length,
        },
      }, 200);
    }

    if (action === "sync-classes") {
      // 同步補習班主表
      const classesResult = await env.TUTION_CLASS_KV.list({
        prefix: "class_",
      });
      const classes = await Promise.all(
        classesResult.keys.map((k) =>
          env.TUTION_CLASS_KV.get(k.name).then((v) =>
            v ? JSON.parse(v) : null,
          ),
        ),
      );
      await sheetsSync.syncClasses(classes.filter(Boolean));

      return jsonResponse({
        success: true,
        message: "Classes synced to Google Sheet",
        count: classes.length,
      }, 200);
    }

    return jsonResponse({
      error: "Invalid action",
      validActions: ["init", "sync-all", "sync-classes"],
    }, 400);
  } catch (error) {
    console.error("Sync error:", error);
    return jsonResponse({ error: String(error) }, 500);
  }
}

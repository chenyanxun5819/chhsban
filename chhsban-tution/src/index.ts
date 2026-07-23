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

import { createAuthKVManager, createTeacherKVManager, createStudentKVManager } from "@chhsban/kv-utils";
import { KV_NAMESPACES } from "@chhsban/cloudflare-config";
import { TutionSheetsSync } from "./sheets-sync";
import { TutionKVService } from "./tution-service";
import { generatePDFResponse } from "./pdf-generator";

interface Env {
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  TUTION_CLASS_KV: KVNamespace;
  TUTION_ROSTER_KV: KVNamespace;
  TUTION_ATTENDANCE_KV: KVNamespace;
  GOOGLE_SHEETS_API_KEY: string;
  GOOGLE_SHEETS_SPREADSHEET_ID: string;
  GOOGLE_SHEETS_SHEET_CLASSES: string;
  GOOGLE_SHEETS_SHEET_ROSTER: string;
  GOOGLE_SHEETS_SHEET_ATTENDANCE: string;
}

/**
 * CORS 回應頭
 */
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Content-Type": "application/json; charset=utf-8",
  };
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

      if (pathname.startsWith("/api/v1/classes")) {
        return handleClasses(request, env, session);
      }

      if (pathname.startsWith("/api/attendance")) {
        return handleAttendance(request, env, session);
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error:", error);
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

function handleHealth(): Response {
  return new Response(
    JSON.stringify({ status: "ok", service: "tution-system" }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
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
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404, headers: getCorsHeaders() },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: student,
      }),
      { status: 200, headers: getCorsHeaders() },
    );
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
  const subAction = pathParts[5]; // /api/v1/classes/{classId}/{pdf|pdf}

  const kvService = new TutionKVService(
    env.TUTION_CLASS_KV,
    env.TUTION_ROSTER_KV,
    env.TUTION_ATTENDANCE_KV,
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
        !data.fees ||
        !data.venue
      ) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      // 如果沒有提供教師中文名字，從 TEACHER_KV 中查詢
      let teacherNameCn = data.teacher_name_cn;
      if (!teacherNameCn) {
        try {
          const teacherData = await env.TEACHER_KV.get(session.teacherId);
          if (teacherData) {
            const teacher = JSON.parse(teacherData);
            teacherNameCn = teacher.name_cn || teacher.name || "";
          }
        } catch (e) {
          console.warn("Failed to fetch teacher name:", e);
          teacherNameCn = "";
        }
      }

      const classData = {
        ...data,
        teacher_id: session.teacherId,
        teacher_name_cn: teacherNameCn,
        approval_status: "pending",
      };

      const newClass = await kvService.createClass(classData);
      return new Response(JSON.stringify(newClass), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    // GET /api/v1/classes/{classId} - 取得補習班詳情
    if (method === "GET" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

      if (!tutionClass) {
        return new Response(JSON.stringify({ error: "Class not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 驗證權限：只有教師或管理員可以查看
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(tutionClass), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // PUT /api/v1/classes/{classId} - 更新補習班
    if (method === "PUT" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

      if (!tutionClass) {
        return new Response(JSON.stringify({ error: "Class not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin"
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      const updates = await request.json();
      const updated = await kvService.updateClass(classId, updates);

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // DELETE /api/v1/classes/{classId} - 刪除補習班
    if (method === "DELETE" && classId && !subAction) {
      const tutionClass = await kvService.getClass(classId);

      if (!tutionClass) {
        return new Response(JSON.stringify({ error: "Class not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin"
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      await kvService.deleteClass(classId);

      return new Response(null, { status: 204 });
    }

    // GET /api/v1/classes/{classId}/pdf - 生成 PDF
    if (method === "GET" && classId && subAction === "pdf") {
      const tutionClass = await kvService.getClass(classId);

      if (!tutionClass) {
        return new Response(JSON.stringify({ error: "Class not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

      return generatePDFResponse(tutionClass);
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
          return new Response(
            JSON.stringify({
              success: true,
              data: allClasses,
              timestamp: new Date().toISOString(),
            }),
            { status: 200, headers: getCorsHeaders() },
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing teacher parameter",
          }),
          { status: 400, headers: getCorsHeaders() },
        );
      }

      // 查詢特定教師的課程
      const classes = await kvService.listClassesByTeacher(teacherId);
      return new Response(
        JSON.stringify({
          success: true,
          data: classes,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: getCorsHeaders() },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid endpoint" }),
      { status: 400, headers: getCorsHeaders() },
    );
  } catch (error) {
    console.error("Classes handler error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function handleAttendance(
  request: Request,
  env: Env,
  session: any,
): Promise<Response> {
  // TODO: 實現點名邏輯
  return new Response(JSON.stringify({ message: "Attendance endpoint" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
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
    const sheetsSync = new TutionSheetsSync({
      apiKey: env.GOOGLE_SHEETS_API_KEY,
      spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID,
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
    );

    if (action === "init") {
      // 初始化 Google Sheet 結構
      await sheetsSync.initializeSheets();
      return new Response(
        JSON.stringify({
          success: true,
          message: "Google Sheet initialized with 3 worksheets",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
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

      return new Response(
        JSON.stringify({
          success: true,
          message: "All data synced to Google Sheet",
          stats: {
            classes: classes.length,
            roster: roster.length,
            attendance: attendance.length,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
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

      return new Response(
        JSON.stringify({
          success: true,
          message: "Classes synced to Google Sheet",
          count: classes.length,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: "Invalid action",
        validActions: ["init", "sync-all", "sync-classes"],
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

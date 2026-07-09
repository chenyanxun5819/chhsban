/**
 * 補習班系統 - Cloudflare Worker 入口點
 * 功能：開課管理、學生點名、課程預約、Google Sheets 同步、PDF 生成
 */

import { createAuthKVManager } from "@chhsban/kv-utils";
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 身份驗證檢查
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const authManager = createAuthKVManager(env.AUTH_KV);
      const session = await authManager.getSession(token);

      if (!session) {
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // 路由處理
      if (pathname === "/api/health") {
        return handleHealth();
      }

      if (pathname.startsWith("/api/sync")) {
        return handleSync(request, env, session);
      }

      if (pathname.startsWith("/api/classes")) {
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
  return new Response(JSON.stringify({ status: "ok", service: "tution-system" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleClasses(
  request: Request,
  env: Env,
  session: any
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
      if (!data.form || !data.subject || !data.day_of_week || !data.start_date || !data.fees || !data.venue) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
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
        return new Response(
          JSON.stringify({ error: "Class not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 驗證權限：只有教師或管理員可以查看
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "Class not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 驗證權限
      if (tutionClass.teacher_id !== session.teacherId && session.permission !== "admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
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
        return new Response(
          JSON.stringify({ error: "Class not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 驗證權限
      if (tutionClass.teacher_id !== session.teacherId && session.permission !== "admin") {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      await kvService.deleteClass(classId);
      
      return new Response(null, { status: 204 });
    }

    // GET /api/v1/classes/{classId}/pdf - 生成 PDF
    if (method === "GET" && classId && subAction === "pdf") {
      const tutionClass = await kvService.getClass(classId);
      
      if (!tutionClass) {
        return new Response(
          JSON.stringify({ error: "Class not found" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // 驗證權限
      if (
        tutionClass.teacher_id !== session.teacherId &&
        session.permission !== "admin" &&
        session.permission !== "super_admin"
      ) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      return generatePDFResponse(tutionClass);
    }

    // GET /api/v1/classes?teacher={teacherId} - 列表查詢
    if (method === "GET" && !classId) {
      const teacherId = url.searchParams.get("teacher");
      
      if (teacherId) {
        const classes = await kvService.listClassesByTeacher(teacherId);
        return new Response(JSON.stringify(classes), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ error: "Missing teacher parameter" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid endpoint" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Classes handler error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleAttendance(
  request: Request,
  env: Env,
  session: any
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
  session: any
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
      const classesResult = await env.TUTION_CLASS_KV.list({ prefix: "class_" });
      const rosterResult = await env.TUTION_ROSTER_KV.list({ prefix: "roster_" });
      const attendanceResult = await env.TUTION_ATTENDANCE_KV.list({ prefix: "attendance_" });

      // 讀取所有數據
      const classes = await Promise.all(
        classesResult.keys.map((k) =>
          env.TUTION_CLASS_KV.get(k.name).then((v) => (v ? JSON.parse(v) : null)),
        ),
      );
      const roster = await Promise.all(
        rosterResult.keys.map((k) =>
          env.TUTION_ROSTER_KV.get(k.name).then((v) => (v ? JSON.parse(v) : null)),
        ),
      );
      const attendance = await Promise.all(
        attendanceResult.keys.map((k) =>
          env.TUTION_ATTENDANCE_KV.get(k.name).then((v) => (v ? JSON.parse(v) : null)),
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
      const classesResult = await env.TUTION_CLASS_KV.list({ prefix: "class_" });
      const classes = await Promise.all(
        classesResult.keys.map((k) =>
          env.TUTION_CLASS_KV.get(k.name).then((v) => (v ? JSON.parse(v) : null)),
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

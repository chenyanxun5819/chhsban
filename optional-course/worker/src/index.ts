/**
 * 選修課點名系統 - Cloudflare Worker 入口點
 * 功能：行政人員開課程窗口＋綁定授課老師；授課老師自行管理名冊、排課、點名。
 *
 * 與 chhsban-tution 的差異：不收費、不需要老師個人申請書，因此沒有
 * receipt.ts / signed-form.ts / sheets-sync.ts / pdf-generator.ts 這類對應物。
 *
 * 身分驗證直接沿用 chhsban-tution 共用的 @chhsban/kv-utils：
 * - AUTH_KV/TEACHER_KV/STUDENT_KV/CLASSROOM_KV 綁定同一組 namespace id，
 *   session token、教師密碼、學生資料完全共用，不重複建立一套帳號系統。
 * - /api/auth/* 系列端點的邏輯直接照抄 chhsban-tution/src/index.ts。
 */

import {
  createAuthKVManager,
  createTeacherKVManager,
  createStudentKVManager,
  createPendingToken,
  verifyPendingToken,
  hashPassword,
  verifyPassword,
  generateStrongPassword,
  validatePasswordStrength,
  type AuthSessionData,
  type TeacherRecord,
} from "@chhsban/kv-utils";
import { OptionalCourseService } from "./optional-course-service";
import { CourseWindowStatus, CourseScheduleStatus, CourseAttendanceStatus } from "./types";

interface Env {
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  CLASSROOM_KV: KVNamespace;
  OPTIONAL_COURSE_KV: KVNamespace;
  OPTIONAL_COURSE_ROSTER_KV: KVNamespace;
  OPTIONAL_COURSE_SCHEDULE_KV: KVNamespace;
  OPTIONAL_COURSE_ATTENDANCE_KV: KVNamespace;
  AUTH_PENDING_SECRET: string;
}

function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  };
}

function jsonResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getCorsHeaders(),
  });
}

function isAdmin(session: AuthSessionData): boolean {
  return session.permission === "admin" || session.permission === "super_admin";
}

function ownsCourseOrIsAdmin(
  session: AuthSessionData,
  teacherId: string | undefined,
): boolean {
  return teacherId === session.teacher_id || isAdmin(session);
}

// ============================================
// 認證端點（直接照抄 chhsban-tution/src/index.ts，純粹操作共用的 TEACHER_KV/AUTH_KV）
// ============================================

async function handleAuthVerify(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    const body = (await request.json()) as { email?: string };
    if (!body.email) {
      return jsonResponse({ error: "Missing email field" }, 400);
    }

    const email = String(body.email).trim().toLowerCase();
    const emailKey = `email:${email}`;
    const teacherIdFromIndex = await env.TEACHER_KV.get(emailKey);

    const teacherManager = createTeacherKVManager(env.TEACHER_KV);
    let teacher: TeacherRecord | null = null;

    if (teacherIdFromIndex) {
      teacher = await teacherManager.getTeacher(teacherIdFromIndex);
    } else {
      const allTeachers = await teacherManager.getAllTeachers();
      teacher = allTeachers.find((t) => t.email.toLowerCase() === email) || null;
      if (teacher) {
        await env.TEACHER_KV.put(emailKey, teacher.teacher_id);
      }
    }

    if (!teacher) {
      return jsonResponse({ error: "Email not registered in system" }, 401);
    }

    const purpose: "password_setup" | "password_login" = teacher.password_hash
      ? "password_login"
      : "password_setup";

    const pendingToken = await createPendingToken(
      { teacherId: teacher.teacher_id, email: teacher.email, purpose },
      env.AUTH_PENDING_SECRET,
    );

    return jsonResponse({
      success: true,
      data: {
        stage: purpose,
        pendingToken,
        teacher_name: teacher.name_cn || teacher.name_en || "Unknown",
        email: teacher.email,
        expiresIn: 15 * 60,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AUTH] Error in auth verify:", error);
    return jsonResponse(
      { error: "Authentication failed", details: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
}

async function finalizeLogin(env: Env, teacher: TeacherRecord): Promise<Response> {
  const authManager = createAuthKVManager(env.AUTH_KV);
  const session = await authManager.createSession(
    teacher.teacher_id,
    teacher.name_cn || teacher.name_en || "Unknown",
    teacher.permission || "teacher",
  );

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

async function handleAuthGeneratePassword(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    const body = (await request.json()) as { pendingToken?: string };
    if (!body.pendingToken) {
      return jsonResponse({ error: "Missing pendingToken field" }, 400);
    }
    const payload = await verifyPendingToken(body.pendingToken, env.AUTH_PENDING_SECRET);
    if (!payload || payload.purpose !== "password_setup") {
      return jsonResponse({ error: "Invalid or expired pendingToken" }, 400);
    }
    const password = generateStrongPassword();
    return jsonResponse({ success: true, data: { password } });
  } catch (error) {
    console.error("[AUTH] Error in generate-password:", error);
    return jsonResponse(
      { error: "Failed to generate password", details: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
}

async function handleAuthSetPassword(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    const body = (await request.json()) as { pendingToken?: string; password?: string };
    if (!body.pendingToken || !body.password) {
      return jsonResponse({ error: "Missing pendingToken or password field" }, 400);
    }
    const payload = await verifyPendingToken(body.pendingToken, env.AUTH_PENDING_SECRET);
    if (!payload || payload.purpose !== "password_setup") {
      return jsonResponse({ error: "Invalid or expired pendingToken" }, 400);
    }

    const teacherManager = createTeacherKVManager(env.TEACHER_KV);
    const teacher = await teacherManager.getTeacher(payload.teacherId);
    if (!teacher) {
      return jsonResponse({ error: "Teacher not found" }, 404);
    }
    if (teacher.password_hash) {
      return jsonResponse({ error: "PASSWORD_ALREADY_SET" }, 409);
    }

    const validation = validatePasswordStrength(body.password);
    if (!validation.valid) {
      return jsonResponse({ error: "WEAK_PASSWORD", details: validation.errors }, 400);
    }

    const hashed = await hashPassword(body.password);
    const now = Date.now();
    await teacherManager.saveTeacher({
      ...teacher,
      password_hash: hashed.hash,
      password_salt: hashed.salt,
      password_algorithm: hashed.algorithm,
      password_iterations: hashed.iterations,
      password_created_at: now,
      password_updated_at: now,
    });

    return finalizeLogin(env, teacher);
  } catch (error) {
    console.error("[AUTH] Error in set-password:", error);
    return jsonResponse(
      { error: "Failed to set password", details: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
}

async function handleAuthLoginPassword(request: Request, env: Env): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    const body = (await request.json()) as { pendingToken?: string; password?: string };
    if (!body.pendingToken || !body.password) {
      return jsonResponse({ error: "Missing pendingToken or password field" }, 400);
    }
    const payload = await verifyPendingToken(body.pendingToken, env.AUTH_PENDING_SECRET);
    if (!payload || payload.purpose !== "password_login") {
      return jsonResponse({ error: "Invalid or expired pendingToken" }, 400);
    }

    const authManager = createAuthKVManager(env.AUTH_KV);
    const lockout = await authManager.checkLockout(payload.teacherId);
    if (lockout.locked) {
      return jsonResponse(
        { error: "TOO_MANY_ATTEMPTS", retryAfterSeconds: lockout.retryAfterSeconds },
        429,
      );
    }

    const teacherManager = createTeacherKVManager(env.TEACHER_KV);
    const teacher = await teacherManager.getTeacher(payload.teacherId);
    if (
      !teacher ||
      !teacher.password_hash ||
      !teacher.password_salt ||
      !teacher.password_algorithm ||
      !teacher.password_iterations
    ) {
      return jsonResponse({ error: "PASSWORD_NOT_SET" }, 409);
    }

    const isValid = await verifyPassword(body.password, {
      hash: teacher.password_hash,
      salt: teacher.password_salt,
      algorithm: teacher.password_algorithm,
      iterations: teacher.password_iterations,
    });

    if (!isValid) {
      const status = await authManager.recordFailedAttempt(payload.teacherId);
      return jsonResponse(
        { error: "INVALID_PASSWORD", remainingAttempts: status.remainingAttempts },
        401,
      );
    }

    await authManager.clearLockout(payload.teacherId);
    return finalizeLogin(env, teacher);
  } catch (error) {
    console.error("[AUTH] Error in login-password:", error);
    return jsonResponse(
      { error: "Failed to login", details: error instanceof Error ? error.message : "Unknown error" },
      500,
    );
  }
}

// ============================================
// 業務端點
// ============================================

function buildService(env: Env): OptionalCourseService {
  return new OptionalCourseService(
    env.OPTIONAL_COURSE_KV,
    env.OPTIONAL_COURSE_ROSTER_KV,
    env.OPTIONAL_COURSE_SCHEDULE_KV,
    env.OPTIONAL_COURSE_ATTENDANCE_KV,
  );
}

/** GET /api/v1/students/{identifier} - 任何已登入身分皆可查（名冊加人時用來核對學生） */
async function handleStudentLookup(
  request: Request,
  env: Env,
  identifier: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const studentManager = createStudentKVManager(env.STUDENT_KV);
  let student = await studentManager.getStudent(identifier);

  if (!student) {
    const studentIdFromIndex = await env.STUDENT_KV.get(`student_no:${identifier}`);
    if (studentIdFromIndex) {
      student = await studentManager.getStudent(studentIdFromIndex);
    }
  }

  if (!student) {
    return jsonResponse({ error: "Student not found" }, 404);
  }

  return jsonResponse({ success: true, data: student });
}

/** GET /api/v1/teachers - 僅 admin，供綁定老師時選擇用 */
async function handleTeacherList(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!isAdmin(session)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const teacherManager = createTeacherKVManager(env.TEACHER_KV);
  const teachers = await teacherManager.getAllTeachers();
  const data = teachers.map((t) => ({
    teacher_id: t.teacher_id,
    name_cn: t.name_cn,
    name_en: t.name_en,
    email: t.email,
    department: t.department,
    permission: t.permission,
  }));
  return jsonResponse({ success: true, data });
}

/** /api/v1/courses[/...] - 建課、綁定老師、開關窗口（admin），課程詳情（teacher owner 或 admin） */
async function handleCourses(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","v1","courses", courseId?, action?]
  const courseId = parts[3];
  const action = parts[4];
  const method = request.method;
  const service = buildService(env);

  if (!courseId) {
    if (method === "POST") {
      if (!isAdmin(session)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const body = (await request.json()) as {
        subject?: string;
        form?: any;
        day_of_week?: any;
        time_start?: string;
        time_end?: string;
        venue?: string;
        max_students?: number;
      };
      if (!body.subject) {
        return jsonResponse({ error: "Missing subject field" }, 400);
      }
      const course = await service.createCourse({
        subject: body.subject,
        form: body.form,
        day_of_week: body.day_of_week,
        time_start: body.time_start,
        time_end: body.time_end,
        venue: body.venue,
        max_students: body.max_students,
        created_by: session.teacher_id,
      });
      return jsonResponse({ success: true, data: course }, 201);
    }

    if (method === "GET") {
      if (!isAdmin(session)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const courses = await service.listAllCourses();
      return jsonResponse({ success: true, data: courses });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const course = await service.getCourse(courseId);
  if (!course) {
    return jsonResponse({ error: "Course not found" }, 404);
  }

  if (!action) {
    if (method !== "GET") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    return jsonResponse({ success: true, data: course });
  }

  if (action === "bind-teacher" && method === "PUT") {
    if (!isAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const body = (await request.json()) as { teacher_id?: string };
    if (!body.teacher_id) {
      return jsonResponse({ error: "Missing teacher_id field" }, 400);
    }
    const teacherManager = createTeacherKVManager(env.TEACHER_KV);
    const teacher = await teacherManager.getTeacher(body.teacher_id);
    if (!teacher) {
      return jsonResponse({ error: "Teacher not found" }, 404);
    }
    const updated = await service.updateCourse(courseId, {
      teacher_id: teacher.teacher_id,
      teacher_name_cn: teacher.name_cn || teacher.name_en,
      bound_at: Date.now(),
    });
    return jsonResponse({ success: true, data: updated });
  }

  if (action === "open" && method === "PUT") {
    if (!isAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (!course.teacher_id) {
      return jsonResponse({ error: "COURSE_NOT_BOUND" }, 409);
    }
    const updated = await service.updateCourse(courseId, {
      window_status: CourseWindowStatus.OPEN,
      opened_at: Date.now(),
    });
    return jsonResponse({ success: true, data: updated });
  }

  if (action === "close" && method === "PUT") {
    if (!isAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const updated = await service.updateCourse(courseId, {
      window_status: CourseWindowStatus.CLOSED,
      closed_at: Date.now(),
    });
    return jsonResponse({ success: true, data: updated });
  }

  if (action === "roster") {
    return handleRoster(request, env, session, course, parts[5]);
  }

  if (action === "schedules") {
    return handleSchedules(request, env, session, course, parts[5]);
  }

  if (action === "attendance") {
    return handleAttendance(request, env, session, course);
  }

  return jsonResponse({ error: "Not found" }, 404);
}

/** GET /api/v1/my/courses - 授課老師自己綁定到的課程 */
async function handleMyCourses(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  const service = buildService(env);
  const courses = await service.listCoursesByTeacher(session.teacher_id);
  return jsonResponse({ success: true, data: courses });
}

async function handleRoster(
  request: Request,
  env: Env,
  session: AuthSessionData,
  course: import("./types").OptionalCourse,
  rosterId: string | undefined,
): Promise<Response> {
  const method = request.method;
  const service = buildService(env);

  if (!rosterId) {
    if (method === "GET") {
      if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const roster = await service.listRosterByCourse(course.course_id);
      return jsonResponse({ success: true, data: roster });
    }

    if (method === "POST") {
      if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      if (course.window_status !== CourseWindowStatus.OPEN) {
        return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
      }
      const body = (await request.json()) as { student_id?: string };
      if (!body.student_id) {
        return jsonResponse({ error: "Missing student_id field" }, 400);
      }

      const studentManager = createStudentKVManager(env.STUDENT_KV);
      let student = await studentManager.getStudent(body.student_id);
      if (!student) {
        const studentIdFromIndex = await env.STUDENT_KV.get(`student_no:${body.student_id}`);
        if (studentIdFromIndex) {
          student = await studentManager.getStudent(studentIdFromIndex);
        }
      }
      if (!student) {
        return jsonResponse({ error: "Student not found" }, 404);
      }

      const entry = await service.addRosterEntry({
        course_id: course.course_id,
        student_id: student.student_id,
        student_name_cn: student.name_cn,
        student_name_en: student.name_en,
        student_class: student.class,
        enrollment_date: new Date().toISOString().split("T")[0],
      });
      return jsonResponse({ success: true, data: entry }, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (method === "PUT" && new URL(request.url).pathname.endsWith("/withdraw")) {
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const entry = await service.getRosterEntry(rosterId);
    if (!entry || entry.course_id !== course.course_id) {
      return jsonResponse({ error: "Roster entry not found" }, 404);
    }
    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    const updated = await service.withdrawRosterEntry(rosterId, body.reason || "");
    return jsonResponse({ success: true, data: updated });
  }

  return jsonResponse({ error: "Not found" }, 404);
}

async function handleSchedules(
  request: Request,
  env: Env,
  session: AuthSessionData,
  course: import("./types").OptionalCourse,
  scheduleId: string | undefined,
): Promise<Response> {
  const method = request.method;
  const service = buildService(env);

  if (scheduleId) {
    return jsonResponse({ error: "Not found" }, 404);
  }

  if (method === "GET") {
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const schedules = await service.listSchedulesByCourse(course.course_id);
    return jsonResponse({ success: true, data: schedules });
  }

  if (method === "POST") {
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (course.window_status !== CourseWindowStatus.OPEN) {
      return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
    }
    const body = (await request.json()) as {
      scheduled_date?: string;
      status?: CourseScheduleStatus;
      cancellation_reason?: string;
      rescheduled_to?: string;
      rescheduled_venue?: string;
      reschedule_reason?: string;
    };
    if (!body.scheduled_date || !body.status) {
      return jsonResponse({ error: "Missing scheduled_date or status field" }, 400);
    }
    const schedule = await service.createSchedule({
      course_id: course.course_id,
      scheduled_date: body.scheduled_date,
      status: body.status,
      cancellation_reason: body.cancellation_reason,
      rescheduled_to: body.rescheduled_to,
      rescheduled_venue: body.rescheduled_venue,
      reschedule_reason: body.reschedule_reason,
    });
    return jsonResponse({ success: true, data: schedule }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

async function handleAttendance(
  request: Request,
  env: Env,
  session: AuthSessionData,
  course: import("./types").OptionalCourse,
): Promise<Response> {
  const method = request.method;
  const service = buildService(env);

  if (method === "GET") {
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const records = await service.listAttendanceByCourse(course.course_id);
    return jsonResponse({ success: true, data: records });
  }

  if (method === "POST") {
    if (!ownsCourseOrIsAdmin(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (course.window_status !== CourseWindowStatus.OPEN) {
      return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
    }
    const body = (await request.json()) as {
      class_date?: string;
      records?: Array<{ student_id: string; status: CourseAttendanceStatus; absence_reason?: string }>;
    };
    if (!body.class_date || !Array.isArray(body.records) || body.records.length === 0) {
      return jsonResponse({ error: "Missing class_date or records field" }, 400);
    }

    const now = Date.now();
    const saved = await Promise.all(
      body.records.map((r) =>
        service.recordAttendance({
          course_id: course.course_id,
          student_id: r.student_id,
          class_date: body.class_date!,
          status: r.status,
          absence_reason: r.absence_reason,
          recorded_at: now,
          recorded_by: session.teacher_id,
        }),
      ),
    );
    return jsonResponse({ success: true, data: saved }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

// ============================================
// 路由分派
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: getCorsHeaders() });
    }

    if (pathname === "/api/health") {
      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    // 公開的登入流程端點
    if (pathname === "/api/auth/verify") return handleAuthVerify(request, env);
    if (pathname === "/api/auth/generate-password") return handleAuthGeneratePassword(request, env);
    if (pathname === "/api/auth/set-password") return handleAuthSetPassword(request, env);
    if (pathname === "/api/auth/login-password") return handleAuthLoginPassword(request, env);

    // 其他端點需要身份驗證
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return jsonResponse({ error: "Unauthorized: Missing token" }, 401);
    }

    try {
      const authManager = createAuthKVManager(env.AUTH_KV);
      const session = await authManager.verifySession(token);
      if (!session) {
        return jsonResponse({ error: "Invalid token" }, 401);
      }

      if (pathname.startsWith("/api/v1/students/")) {
        const identifier = pathname.split("/")[4];
        return handleStudentLookup(request, env, identifier);
      }

      if (pathname === "/api/v1/teachers") {
        return handleTeacherList(request, env, session);
      }

      if (pathname.startsWith("/api/v1/my/courses")) {
        return handleMyCourses(request, env, session);
      }

      if (pathname.startsWith("/api/v1/courses")) {
        return handleCourses(request, env, session);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },
};

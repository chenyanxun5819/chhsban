/**
 * 選修課點名系統 - Cloudflare Worker 入口點
 * 功能：行政人員開課程窗口＋綁定授課老師；授課老師自行管理名冊、排課、點名。
 *
 * 與 chhsban-tution 的差異：不收費、不需要老師個人申請書，因此沒有
 * receipt.ts / signed-form.ts / sheets-sync.ts / pdf-generator.ts 這類對應物。
 *
 * 身分驗證直接沿用 chhsban-tution 共用的 @chhsban/kv-utils：
 * - AUTH_KV/TEACHER_KV/STUDENT_KV/CLASSROOM_KV 綁定同一組 namespace id，
 *   session token、教師資料、學生資料完全共用，不重複建立一套帳號系統。
 * - 登入只有 /api/auth/google（私人 Google 帳號），邏輯與 chhsban-tution/src/index.ts 相同。
 */

import {
  createAuthKVManager,
  createTeacherKVManager,
  verifyGoogleIdToken,
  type AuthSessionData,
  type TeacherRecord,
} from "@chhsban/kv-utils";
import { OptionalCourseService } from "./optional-course-service";
import {
  CourseWindowStatus,
  CourseScheduleStatus,
  CourseAttendanceStatus,
  type OptionalCourse,
  type OptionalCourseRoster,
  type SchoolCalendar,
  type SchoolHoliday,
  type SchoolMakeupDay,
  type HolidayType,
  type Weekday,
} from "./types";
import { findStudentByNo, getStudentClass, isLeftSchool, studentStatus } from "./student-lookup";
import { currentYear, isQueryableYear } from "./year";
import {
  dueRange,
  isCalendarReady,
  isValidDate,
  listCourseSessions,
  todayMYT,
  weekdayOf,
} from "./calendar";

// 選修課的上課星期（星期日一律休息，不能排課）
const SCHOOL_WEEKDAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOLIDAY_TYPES: HolidayType[] = ["public", "school_break", "event"];

interface Env {
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  AUTH_KV: KVNamespace;
  CLASSROOM_KV: KVNamespace;
  OPTIONAL_COURSE_KV: KVNamespace;
  OPTIONAL_COURSE_ROSTER_KV: KVNamespace;
  OPTIONAL_COURSE_SCHEDULE_KV: KVNamespace;
  OPTIONAL_COURSE_ATTENDANCE_KV: KVNamespace;
  GOOGLE_CLIENT_ID?: string; // Google 登入的 OAuth 用戶端 ID（公開值，見 wrangler.toml [vars]）
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

// 權限與補習系統一致：super_admin 才能建課／綁定老師／開關窗口；
// admin（督察員）只能查看所有課程，不能做任何修改。
function isSuperAdmin(session: AuthSessionData): boolean {
  return session.permission === "super_admin";
}

function canViewAllCourses(session: AuthSessionData): boolean {
  return session.permission === "admin" || session.permission === "super_admin";
}

/** 查看單一課程（名冊／排課／點名）：授課老師本人、督察員、超級管理員 */
function canViewCourse(session: AuthSessionData, teacherId: string | undefined): boolean {
  return teacherId === session.teacher_id || canViewAllCourses(session);
}

/** 修改單一課程的名冊／排課／點名：授課老師本人、超級管理員（督察員不行） */
function canEditCourse(session: AuthSessionData, teacherId: string | undefined): boolean {
  return teacherId === session.teacher_id || isSuperAdmin(session);
}

// ============================================
// 認證端點（直接照抄 chhsban-tution/src/index.ts，純粹操作共用的 TEACHER_KV/AUTH_KV）
// ============================================

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

const PASSWORD_LOGIN_REMOVED_MESSAGE =
  "學校 Email 與密碼登入已停用，請重新整理頁面後改用私人 Google 帳號登入（需先由管理員開放）。";

/** 私人 Google 帳號登入，唯一的登入方式（與 chhsban-tution 的 handleAuthGoogle 相同，說明見該處） */
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
    if (teacher.login_enabled !== true) {
      return jsonResponse({ error: "此帳號尚未開放登入，請聯絡管理員", code: "LOGIN_DISABLED" }, 403);
    }
    return finalizeLogin(env, teacher);
  } catch (error) {
    console.error("[AUTH] Error in google login:", error);
    return jsonResponse({ error: "Google 登入失敗，請稍後再試" }, 500);
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

/**
 * GET /api/v1/students/{student_no} - 任何已登入身分皆可查（名冊加人時用來核對學生）
 * 只接受學號（student_no），見 student-lookup.ts 的說明。
 */
async function handleStudentLookup(
  request: Request,
  env: Env,
  identifier: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const student = await findStudentByNo(env.STUDENT_KV, decodeURIComponent(identifier).trim());
  if (!student) {
    return jsonResponse({ error: "Student not found" }, 404);
  }
  // 查這支 API 是為了把學生加進名冊，已離校的學生不能再加
  if (isLeftSchool(student)) {
    return jsonResponse({ error: "STUDENT_LEFT_SCHOOL" }, 410);
  }

  return jsonResponse({ success: true, data: { ...student, class: getStudentClass(student) } });
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
  if (!isSuperAdmin(session)) {
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

/** ?year=YYYY，未帶時為今年；超出保留範圍回傳 null */
function parseYearParam(url: URL): number | null {
  const raw = url.searchParams.get("year");
  const year = raw ? Number(raw) : currentYear();
  return isQueryableYear(year) ? year : null;
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
      if (!isSuperAdmin(session)) {
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
        year?: number;
      };
      if (!body.subject) {
        return jsonResponse({ error: "Missing subject field" }, 400);
      }
      if (body.day_of_week && !SCHOOL_WEEKDAYS.includes(body.day_of_week)) {
        return jsonResponse({ error: "INVALID_DAY_OF_WEEK" }, 400);
      }
      // 只能建今年或明年（年底先建好下一年）的課
      const thisYear = currentYear();
      const year = body.year === undefined ? thisYear : Number(body.year);
      if (year !== thisYear && year !== thisYear + 1) {
        return jsonResponse({ error: "INVALID_YEAR" }, 400);
      }
      const course = await service.createCourse({
        subject: body.subject,
        form: body.form,
        day_of_week: body.day_of_week || undefined,
        time_start: body.time_start,
        time_end: body.time_end,
        venue: body.venue,
        max_students: body.max_students,
        created_by: session.teacher_id,
      }, year);
      return jsonResponse({ success: true, data: course }, 201);
    }

    if (method === "GET") {
      if (!canViewAllCourses(session)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const year = parseYearParam(url);
      if (year === null) {
        return jsonResponse({ error: "INVALID_YEAR" }, 400);
      }
      const courses = await service.listCoursesByYear(year);
      return jsonResponse({ success: true, data: courses });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const course = await service.getCourse(courseId);
  if (!course) {
    return jsonResponse({ error: "Course not found" }, 404);
  }

  if (!action) {
    if (method === "DELETE") {
      // 刪除課程（連同名冊／排課／點名，無法復原），只限 super_admin；編號空著不再使用
      if (!isSuperAdmin(session)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      await service.deleteCourse(courseId);
      return jsonResponse({ success: true });
    }
    if (method === "GET") {
      if (!canViewCourse(session, course.teacher_id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      return jsonResponse({ success: true, data: course });
    }

    // PUT：超級管理員設定上課時段（上課星期決定這門課的應點名日期）
    if (method === "PUT") {
      if (!isSuperAdmin(session)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      const updates: Partial<OptionalCourse> = {};
      if ("day_of_week" in body) {
        if (body.day_of_week !== null && body.day_of_week !== "" && !SCHOOL_WEEKDAYS.includes(body.day_of_week as Weekday)) {
          return jsonResponse({ error: "INVALID_DAY_OF_WEEK" }, 400);
        }
        updates.day_of_week = (body.day_of_week || undefined) as Weekday | undefined;
      }
      for (const field of ["start_date", "end_date"] as const) {
        if (field in body) {
          if (body[field] && !isValidDate(body[field])) {
            return jsonResponse({ error: "INVALID_DATE", field }, 400);
          }
          updates[field] = (body[field] as string) || undefined;
        }
      }
      for (const field of ["time_start", "time_end", "venue"] as const) {
        if (field in body) {
          updates[field] = body[field] ? String(body[field]).trim() : undefined;
        }
      }
      const updated = await service.updateCourse(courseId, updates);
      return jsonResponse({ success: true, data: updated });
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (action === "bind-teacher" && method === "PUT") {
    if (!isSuperAdmin(session)) {
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
    if (!isSuperAdmin(session)) {
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
    if (!isSuperAdmin(session)) {
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

  if (action === "sessions") {
    return handleCourseSessions(request, env, session, course);
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
  const year = parseYearParam(new URL(request.url));
  if (year === null) {
    return jsonResponse({ error: "INVALID_YEAR" }, 400);
  }
  const service = buildService(env);
  const courses = await service.listCoursesByTeacher(session.teacher_id, year);
  return jsonResponse({ success: true, data: courses });
}

// 學生名錄整份只讀 1 次 KV（見 student-lookup.ts），名冊整批只寫 1 次；限制筆數避免名冊過大
const ROSTER_BATCH_MAX = 200;

type RosterBatchStatus = "ok" | "added" | "already_in_roster" | "not_found" | "left_school" | "duplicate_in_file";

/**
 * POST /api/v1/courses/{id}/roster/batch
 * body: { student_nos: string[], dry_run?: boolean }
 * dry_run=true 只核對學號、回報每筆結果（前端預覽用）；false 才實際把狀態為 ok 的學生寫入名冊。
 * 同一份清單內的重複學號只算第一次，後面的標記為 duplicate_in_file。
 */
/** 課程有設定人數上限時，加入 adding 人後不能超過上限；超過回傳錯誤 Response */
function checkCapacity(course: OptionalCourse, roster: OptionalCourseRoster[], adding: number): Response | null {
  const max = Number(course.max_students);
  if (!Number.isFinite(max) || max <= 0 || adding === 0) return null;
  const active = roster.filter((r) => r.is_active).length;
  if (active + adding > max) {
    return jsonResponse({ error: "COURSE_FULL", max_students: max, active_count: active, adding }, 409);
  }
  return null;
}

async function handleRosterBatch(
  request: Request,
  env: Env,
  service: OptionalCourseService,
  course: OptionalCourse,
): Promise<Response> {
  const courseId = course.course_id;
  const body = (await request.json().catch(() => ({}))) as {
    student_nos?: unknown;
    dry_run?: boolean;
  };
  if (!Array.isArray(body.student_nos)) {
    return jsonResponse({ error: "Missing student_nos field" }, 400);
  }
  const studentNos = body.student_nos.map((s) => String(s ?? "").trim()).filter(Boolean);
  if (studentNos.length === 0) {
    return jsonResponse({ error: "EMPTY_STUDENT_LIST" }, 400);
  }
  if (studentNos.length > ROSTER_BATCH_MAX) {
    return jsonResponse({ error: "TOO_MANY_STUDENTS", max: ROSTER_BATCH_MAX }, 400);
  }

  const existingRoster = await service.getRoster(courseId);
  const enrolledIds = new Set(existingRoster.filter((r) => r.is_active).map((r) => r.student_id));

  const seen = new Set<string>();
  const uniqueNos = studentNos.filter((no) => !seen.has(no) && seen.add(no));
  const lookups = new Map(
    await Promise.all(
      uniqueNos.map(async (no) => [no, await findStudentByNo(env.STUDENT_KV, no)] as const),
    ),
  );

  const counted = new Set<string>();
  const enrollmentDate = new Date().toISOString().split("T")[0];
  const results: Array<Record<string, any> & { status: RosterBatchStatus }> = [];
  // 要寫入的學生先收集起來，最後整批寫入名冊（1 次 KV 寫入）
  const toAdd: Array<{ resultIdx: number; item: Parameters<OptionalCourseService["addRosterEntries"]>[1][number] }> = [];

  for (const studentNo of studentNos) {
    if (counted.has(studentNo)) {
      results.push({ student_no: studentNo, status: "duplicate_in_file" as RosterBatchStatus });
      continue;
    }
    counted.add(studentNo);

    const student = lookups.get(studentNo);
    if (!student) {
      results.push({ student_no: studentNo, status: "not_found" as RosterBatchStatus });
      continue;
    }

    const info = {
      student_no: studentNo,
      student_name_cn: student.name_cn,
      student_name_en: student.name_en,
      student_class: getStudentClass(student),
    };

    if (isLeftSchool(student)) {
      results.push({ ...info, status: "left_school" as RosterBatchStatus });
      continue;
    }

    if (enrolledIds.has(student.student_id)) {
      results.push({ ...info, status: "already_in_roster" as RosterBatchStatus });
      continue;
    }

    if (body.dry_run) {
      results.push({ ...info, status: "ok" as RosterBatchStatus });
      continue;
    }

    enrolledIds.add(student.student_id);
    toAdd.push({
      resultIdx: results.length,
      item: { student_id: student.student_id, ...info, enrollment_date: enrollmentDate },
    });
    results.push({ ...info, status: "added" });
  }

  const capacityError = checkCapacity(course, existingRoster, toAdd.length);
  if (capacityError) return capacityError;

  if (toAdd.length > 0) {
    const entries = await service.addRosterEntries(courseId, toAdd.map((t) => t.item));
    toAdd.forEach((t, i) => {
      results[t.resultIdx].entry = entries[i];
    });
  }

  return jsonResponse({ success: true, data: results });
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

  if (rosterId === "batch") {
    if (method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    if (!canEditCourse(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (course.window_status !== CourseWindowStatus.OPEN) {
      return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
    }
    return handleRosterBatch(request, env, service, course);
  }

  if (!rosterId) {
    if (method === "GET") {
      if (!canViewCourse(session, course.teacher_id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      const roster = await service.getRoster(course.course_id);
      // 附上學生名錄的在校狀態（active／left／excluded），讓老師知道名冊裡有學生已離校；
      // 名冊本身的姓名、班級是加入當時的快照，不改
      // gender_boarding（L／LH／P／PH）也取自學生名錄，給行政端學生總覽統計用
      const students = await Promise.all(roster.map((r) => findStudentByNo(env.STUDENT_KV, r.student_no)));
      return jsonResponse({
        success: true,
        data: roster.map((r, i) => ({
          ...r,
          student_status: studentStatus(students[i]),
          gender_boarding: students[i]?.gender_boarding || "-",
        })),
      });
    }

    if (method === "POST") {
      if (!canEditCourse(session, course.teacher_id)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      if (course.window_status !== CourseWindowStatus.OPEN) {
        return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
      }
      const body = (await request.json()) as { student_no?: string };
      const studentNo = body.student_no?.trim();
      if (!studentNo) {
        return jsonResponse({ error: "Missing student_no field" }, 400);
      }

      const student = await findStudentByNo(env.STUDENT_KV, studentNo);
      if (!student) {
        return jsonResponse({ error: "Student not found" }, 404);
      }
      if (isLeftSchool(student)) {
        return jsonResponse({ error: "STUDENT_LEFT_SCHOOL" }, 409);
      }

      // 同一個學生若已經在這門課的名冊裡（且尚未退出），不重複加入
      const existingRoster = await service.getRoster(course.course_id);
      const alreadyEnrolled = existingRoster.some(
        (r) => r.student_id === student.student_id && r.is_active,
      );
      if (alreadyEnrolled) {
        return jsonResponse({ error: "STUDENT_ALREADY_IN_ROSTER" }, 409);
      }
      const capacityError = checkCapacity(course, existingRoster, 1);
      if (capacityError) return capacityError;

      const [entry] = await service.addRosterEntries(course.course_id, [
        {
          student_id: student.student_id,
          student_no: student.student_no,
          student_name_cn: student.name_cn,
          student_name_en: student.name_en,
          student_class: getStudentClass(student),
          enrollment_date: new Date().toISOString().split("T")[0],
        },
      ]);
      return jsonResponse({ success: true, data: entry }, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (method === "PUT" && new URL(request.url).pathname.endsWith("/withdraw")) {
    if (!canEditCourse(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    // 退出日期可事後補登（不一定是當天），但不能晚於今天；原因必填
    const body = (await request.json().catch(() => ({}))) as { reason?: string; withdrawal_date?: string };
    const reason = (body.reason || "").trim();
    if (!reason) {
      return jsonResponse({ error: "MISSING_WITHDRAWAL_REASON" }, 400);
    }
    const withdrawalDate = body.withdrawal_date || todayMYT();
    if (!isValidDate(withdrawalDate) || withdrawalDate > todayMYT()) {
      return jsonResponse({ error: "INVALID_WITHDRAWAL_DATE" }, 400);
    }
    const entry = (await service.getRoster(course.course_id)).find((r) => r.roster_id === rosterId);
    if (entry?.enrollment_date && withdrawalDate < entry.enrollment_date) {
      return jsonResponse({ error: "WITHDRAWAL_BEFORE_ENROLLMENT" }, 400);
    }
    const updated = await service.withdrawRosterEntry(course.course_id, rosterId, reason, withdrawalDate);
    if (!updated) {
      return jsonResponse({ error: "Roster entry not found" }, 404);
    }
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

  // 課程級停課／調課只有 super_admin 能登記（選修課跟學校統一排課，老師不能自行停課；督察員只能看）
  if (scheduleId) {
    if (method !== "DELETE") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }
    if (!isSuperAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const deleted = await service.deleteSchedule(course.course_id, scheduleId);
    if (!deleted) {
      return jsonResponse({ error: "Schedule not found" }, 404);
    }
    return jsonResponse({ success: true });
  }

  if (method === "GET") {
    if (!canViewCourse(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const schedules = await service.listSchedulesByCourse(course.course_id);
    return jsonResponse({ success: true, data: schedules });
  }

  if (method === "POST") {
    if (!isSuperAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const body = (await request.json()) as {
      scheduled_date?: string;
      status?: CourseScheduleStatus;
      cancellation_reason?: string;
      rescheduled_to?: string;
      rescheduled_venue?: string;
      reschedule_reason?: string;
    };
    if (!isValidDate(body.scheduled_date) || !body.status) {
      return jsonResponse({ error: "Missing scheduled_date or status field" }, 400);
    }
    if (body.status !== CourseScheduleStatus.CANCELLED && body.status !== CourseScheduleStatus.RESCHEDULED) {
      return jsonResponse({ error: "INVALID_STATUS" }, 400);
    }
    if (body.status === CourseScheduleStatus.RESCHEDULED && !isValidDate(body.rescheduled_to)) {
      return jsonResponse({ error: "Missing rescheduled_to field" }, 400);
    }

    // 原訂日期必須是這門課依行事曆本來就要上課的日子（行事曆未建立時不檢查）
    const [calendar, schedules] = await Promise.all([
      service.getCalendar(course.year),
      service.listSchedulesByCourse(course.course_id),
    ]);
    if (schedules.some((s) => s.scheduled_date === body.scheduled_date)) {
      return jsonResponse({ error: "SCHEDULE_ALREADY_EXISTS" }, 409);
    }
    if (isCalendarReady(calendar) && course.day_of_week) {
      const regular = listCourseSessions(calendar, course, []);
      if (!regular.some((s) => s.date === body.scheduled_date)) {
        return jsonResponse({ error: "NOT_A_SESSION_DATE" }, 409);
      }
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
    if (!canViewCourse(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const records = await service.listAttendanceByCourse(course.course_id);
    return jsonResponse({ success: true, data: records });
  }

  if (method === "POST") {
    if (!canEditCourse(session, course.teacher_id)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (course.window_status !== CourseWindowStatus.OPEN) {
      return jsonResponse({ error: "COURSE_NOT_OPEN" }, 409);
    }
    const body = (await request.json()) as {
      class_date?: string;
      records?: Array<{ student_id: string; status: CourseAttendanceStatus; absence_reason?: string }>;
    };
    if (!isValidDate(body.class_date) || !Array.isArray(body.records) || body.records.length === 0) {
      return jsonResponse({ error: "Missing class_date or records field" }, 400);
    }
    const classDate = body.class_date as string;
    if (classDate > todayMYT()) {
      return jsonResponse({ error: "FUTURE_DATE" }, 400);
    }

    // 狀態值必須合法；學生當天必須在名冊上（加入日 ≤ 上課日，且未退出或退出日晚於上課日）
    const validStatuses = new Set<string>(Object.values(CourseAttendanceStatus));
    const invalid = body.records.filter((r) => !r?.student_id || !validStatuses.has(r.status));
    if (invalid.length > 0) {
      return jsonResponse({ error: "INVALID_RECORD", records: invalid }, 400);
    }
    const roster = await service.getRoster(course.course_id);
    const enrolled = new Set(
      roster
        .filter(
          (r) =>
            (!r.enrollment_date || r.enrollment_date <= classDate) &&
            (!r.withdrawal_date || r.withdrawal_date > classDate),
        )
        .map((r) => r.student_id),
    );
    const notEnrolled = body.records.filter((r) => !enrolled.has(r.student_id)).map((r) => r.student_id);
    if (notEnrolled.length > 0) {
      return jsonResponse({ error: "STUDENT_NOT_ON_ROSTER", student_ids: notEnrolled }, 400);
    }

    // 只能點「應點名日期」；行事曆尚未建立或課程未設定上課星期時不擋，避免上線初期卡住老師
    const [calendar, schedules] = await Promise.all([
      service.getCalendar(course.year),
      service.listSchedulesByCourse(course.course_id),
    ]);
    if (isCalendarReady(calendar) && course.day_of_week) {
      const sessions = listCourseSessions(calendar, course, schedules);
      if (!sessions.some((s) => s.date === body.class_date)) {
        return jsonResponse({ error: "NOT_A_SESSION_DATE" }, 409);
      }
    }

    const now = Date.now();
    const saved = await service.recordAttendance(
      course.course_id,
      body.class_date,
      body.records.map((r) => ({
        student_id: r.student_id,
        status: r.status,
        absence_reason: r.absence_reason,
        recorded_at: now,
        recorded_by: session.teacher_id,
      })),
    );
    return jsonResponse({ success: true, data: saved }, 201);
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

/**
 * GET /api/v1/courses/{id}/sessions - 這門課的應點名日期，附每天是否已點名
 * missing = 應該已經點名（窗口開放後、今天以前）但沒有點名紀錄
 */
async function handleCourseSessions(
  request: Request,
  env: Env,
  session: AuthSessionData,
  course: OptionalCourse,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!canViewCourse(session, course.teacher_id)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const service = buildService(env);
  const [calendar, schedules, recordedDates] = await Promise.all([
    service.getCalendar(course.year),
    service.listSchedulesByCourse(course.course_id),
    service.listAttendanceDates(course.course_id),
  ]);
  const recorded = new Set(recordedDates);
  const due = dueRange(course);
  const sessions = listCourseSessions(calendar, course, schedules).map((s) => {
    const isRecorded = recorded.has(s.date);
    const isDue = !!due && s.date >= due.from && s.date <= due.to;
    return { ...s, recorded: isRecorded, missing: isDue && !isRecorded };
  });
  return jsonResponse({
    success: true,
    data: {
      calendar_ready: isCalendarReady(calendar),
      day_of_week: course.day_of_week || null,
      today: todayMYT(),
      sessions,
    },
  });
}

/**
 * GET /api/v1/reports/course-summary?year=YYYY - 「各課程開課報表」（super_admin／督察員）
 *
 * 欄位與 tution 的 course-report.ts 對齊（沒有結束日期），但上課日由學校行事曆統一推算：
 * - 應開課數：開課期間內、到今天為止按上課星期應上課的日子（含停課）
 * - 停課數：其中被課程級停課的日子；實際開課數 = 應開課數 - 停課數
 * - 未點名：與「選修課點名追蹤」同一套規則（窗口開放後、今天以前、沒有點名紀錄）
 *
 * 出勤數字讀 stats:{course_id}（老師儲存點名時已更新好），不逐日讀點名紀錄，
 * 每門課只要讀名冊、排課例外、出勤統計 3 次 KV，所以可以即時計算、不需要像 tution 每日存快照。
 */
async function handleCourseReport(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!canViewAllCourses(session)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const year = parseYearParam(new URL(request.url));
  if (year === null) {
    return jsonResponse({ error: "INVALID_YEAR" }, 400);
  }

  const service = buildService(env);
  const [calendar, courses] = await Promise.all([service.getCalendar(year), service.listCoursesByYear(year)]);
  // 尚未開放窗口（未綁定老師）的課不列入，與點名追蹤一致
  const active = courses.filter((c) => c.window_status !== CourseWindowStatus.PENDING);
  const today = todayMYT();

  const rows = await Promise.all(
    active.map(async (course) => {
      const [schedules, roster, stats] = await Promise.all([
        service.listSchedulesByCourse(course.course_id),
        service.getRoster(course.course_id),
        service.getAttendanceStats(course.course_id),
      ]);

      // 不帶例外記錄 = 原訂的所有上課日
      const regularDates = listCourseSessions(calendar, course, [])
        .map((s) => s.date)
        .filter((d) => d <= today);
      const regular = new Set(regularDates);
      const cancelledCount = schedules.filter(
        (s) => s.status === CourseScheduleStatus.CANCELLED && regular.has(s.scheduled_date),
      ).length;

      const due = dueRange(course);
      const unconfirmedCount = due
        ? listCourseSessions(calendar, course, schedules).filter(
            (s) => s.date >= due.from && s.date <= due.to && !stats.by_date[s.date],
          ).length
        : 0;

      const counts = { present: 0, absent: 0, late: 0, excuse: 0 };
      for (const day of Object.values(stats.by_date)) {
        counts.present += day.present;
        counts.absent += day.absent;
        counts.late += day.late;
        counts.excuse += day.excuse;
      }
      const totalMarked = counts.present + counts.absent + counts.late + counts.excuse;

      return {
        course_id: course.course_id,
        course_no: course.course_no,
        teacher_id: course.teacher_id,
        teacher_name_cn: course.teacher_name_cn,
        subject: course.subject,
        window_status: course.window_status,
        day_of_week: course.day_of_week || null,
        expected_count: regularDates.length,
        actual_held_count: regularDates.length - cancelledCount,
        cancelled_count: cancelledCount,
        unconfirmed_attendance_count: unconfirmedCount,
        active_roster_count: roster.filter((r) => r.is_active).length,
        withdrawn_roster_count: roster.filter((r) => !r.is_active).length,
        // 百分比 0-100（到課+遲到 / 已點名總筆數）；尚無任何點名紀錄時為 null
        attendance_rate: totalMarked > 0 ? Math.round(((counts.present + counts.late) / totalMarked) * 100) : null,
        absent_count: counts.absent,
        excuse_count: counts.excuse,
        late_count: counts.late,
      };
    }),
  );

  return jsonResponse({
    success: true,
    data: { calendar_ready: isCalendarReady(calendar), generated_at: Date.now(), rows },
  });
}

// ============================================
// 學校行事曆
// ============================================

type CalendarInput = Pick<SchoolCalendar, "term_start" | "term_end" | "holidays" | "makeup_days">;

function generateCalendarId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/** 檢查並整理前端送來的行事曆，回傳錯誤碼或整理好的內容 */
function normalizeCalendarInput(year: number, body: any): { error: string; detail?: string } | CalendarInput {
  const termStart = body.term_start || undefined;
  const termEnd = body.term_end || undefined;
  if ((termStart && !isValidDate(termStart)) || (termEnd && !isValidDate(termEnd))) {
    return { error: "INVALID_TERM_DATE" };
  }
  if (!!termStart !== !!termEnd) {
    return { error: "TERM_INCOMPLETE" };
  }
  if (termStart && termEnd) {
    if (termStart > termEnd) return { error: "TERM_START_AFTER_END" };
    if (!termStart.startsWith(`${year}-`) || !termEnd.startsWith(`${year}-`)) {
      return { error: "TERM_OUT_OF_YEAR" };
    }
  }

  if (!Array.isArray(body.holidays) || !Array.isArray(body.makeup_days)) {
    return { error: "Missing holidays or makeup_days field" };
  }

  const holidays: SchoolHoliday[] = [];
  for (const h of body.holidays) {
    const name = String(h?.name ?? "").trim();
    if (!name || !isValidDate(h.start_date) || !isValidDate(h.end_date) || h.start_date > h.end_date) {
      return { error: "INVALID_HOLIDAY", detail: name || h?.start_date };
    }
    if (!HOLIDAY_TYPES.includes(h.type)) {
      return { error: "INVALID_HOLIDAY_TYPE", detail: name };
    }
    holidays.push({
      holiday_id: typeof h.holiday_id === "string" && h.holiday_id ? h.holiday_id : generateCalendarId("holiday"),
      start_date: h.start_date,
      end_date: h.end_date,
      name,
      type: h.type,
    });
  }

  const makeupDays: SchoolMakeupDay[] = [];
  const seen = new Set<string>();
  for (const m of body.makeup_days) {
    if (!isValidDate(m?.date) || !SCHOOL_WEEKDAYS.includes(m.follows_weekday)) {
      return { error: "INVALID_MAKEUP_DAY", detail: m?.date };
    }
    if (weekdayOf(m.date) === "Sunday") {
      return { error: "MAKEUP_DAY_ON_SUNDAY", detail: m.date };
    }
    if (seen.has(m.date)) {
      return { error: "DUPLICATE_MAKEUP_DAY", detail: m.date };
    }
    seen.add(m.date);
    const note = m.note ? String(m.note).trim() : "";
    makeupDays.push({ date: m.date, follows_weekday: m.follows_weekday, ...(note ? { note } : {}) });
  }

  holidays.sort((a, b) => a.start_date.localeCompare(b.start_date));
  makeupDays.sort((a, b) => a.date.localeCompare(b.date));
  return { term_start: termStart, term_end: termEnd, holidays, makeup_days: makeupDays };
}

interface CalendarConflict {
  course_id: string;
  course_no: string;
  subject: string;
  teacher_name_cn?: string;
  date: string;
}

/**
 * 修改行事曆的影響檢查：已經點過名、原本是上課日，改完後卻不再是這門課上課日的日期。
 * 舊行事曆尚未建立時，所有「新行事曆下不是上課日」的點名紀錄都列出來。
 * 每門課約 2 次 KV 操作（排課例外 1 次讀、點名 key 1 次 list）。
 */
async function findCalendarConflicts(
  service: OptionalCourseService,
  oldCalendar: SchoolCalendar,
  newCalendar: SchoolCalendar,
): Promise<CalendarConflict[]> {
  const courses = (await service.listCoursesByYear(newCalendar.year)).filter((c) => c.day_of_week);
  const oldReady = isCalendarReady(oldCalendar);
  const perCourse = await Promise.all(
    courses.map(async (course) => {
      const [schedules, recordedDates] = await Promise.all([
        service.listSchedulesByCourse(course.course_id),
        service.listAttendanceDates(course.course_id),
      ]);
      if (recordedDates.length === 0) return [];
      const oldDates = new Set(listCourseSessions(oldCalendar, course, schedules).map((s) => s.date));
      const newDates = new Set(listCourseSessions(newCalendar, course, schedules).map((s) => s.date));
      return recordedDates
        .filter((d) => (!oldReady || oldDates.has(d)) && !newDates.has(d))
        .map((date) => ({
          course_id: course.course_id,
          course_no: course.course_no,
          subject: course.subject,
          teacher_name_cn: course.teacher_name_cn,
          date,
        }));
    }),
  );
  return perCourse
    .flat()
    .sort((a, b) => a.date.localeCompare(b.date) || a.course_no.localeCompare(b.course_no));
}

/**
 * GET /api/v1/calendar?year=YYYY - 任何登入者可讀（未建立時回傳空行事曆）
 * PUT /api/v1/calendar/{year}    - 僅 super_admin，整份覆寫
 *   body: { term_start, term_end, holidays, makeup_days, updated_at, force? }
 *   updated_at 必須等於目前儲存的版本（樂觀鎖），否則回 409 CALENDAR_VERSION_CONFLICT；
 *   會影響已點名日期時回 409 CALENDAR_AFFECTS_ATTENDANCE（附 conflicts），確認後帶 force=true 再送。
 */
async function handleCalendar(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/").filter(Boolean); // ["api","v1","calendar", year?]
  const service = buildService(env);

  if (request.method === "GET" && !parts[3]) {
    const year = parseYearParam(url);
    if (year === null) {
      return jsonResponse({ error: "INVALID_YEAR" }, 400);
    }
    return jsonResponse({ success: true, data: await service.getCalendar(year) });
  }

  if (request.method === "PUT" && parts[3]) {
    if (!isSuperAdmin(session)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    // 只能編輯今年或明年的行事曆，往年的只能看
    const year = Number(parts[3]);
    const thisYear = currentYear();
    if (year !== thisYear && year !== thisYear + 1) {
      return jsonResponse({ error: "INVALID_YEAR" }, 400);
    }

    const body = (await request.json().catch(() => ({}))) as any;
    const input = normalizeCalendarInput(year, body);
    if ("error" in input) {
      return jsonResponse(input, 400);
    }

    const existing = await service.getCalendar(year);
    if (Number(body.updated_at ?? 0) !== existing.updated_at) {
      return jsonResponse({ error: "CALENDAR_VERSION_CONFLICT" }, 409);
    }

    const updated: SchoolCalendar = {
      year,
      ...input,
      updated_at: Date.now(),
      updated_by: session.teacher_id,
    };

    if (!body.force) {
      const conflicts = await findCalendarConflicts(service, existing, updated);
      if (conflicts.length > 0) {
        return jsonResponse({ error: "CALENDAR_AFFECTS_ATTENDANCE", conflicts }, 409);
      }
    }

    await service.putCalendar(updated);
    return jsonResponse({ success: true, data: updated });
  }

  return jsonResponse({ error: "Method not allowed" }, 405);
}

/**
 * GET /api/v1/attendance/summary?year=YYYY - super_admin／督察員
 * 每門已開放（或已關閉）課程的應點名／已點名堂數，以及漏點名的日期。
 */
async function handleAttendanceSummary(
  request: Request,
  env: Env,
  session: AuthSessionData,
): Promise<Response> {
  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!canViewAllCourses(session)) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }
  const year = parseYearParam(new URL(request.url));
  if (year === null) {
    return jsonResponse({ error: "INVALID_YEAR" }, 400);
  }

  const service = buildService(env);
  const [calendar, courses] = await Promise.all([service.getCalendar(year), service.listCoursesByYear(year)]);
  const active = courses.filter((c) => c.window_status !== CourseWindowStatus.PENDING);

  const data = await Promise.all(
    active.map(async (course) => {
      const [schedules, recordedDates] = await Promise.all([
        service.listSchedulesByCourse(course.course_id),
        service.listAttendanceDates(course.course_id),
      ]);
      const recorded = new Set(recordedDates);
      const due = dueRange(course);
      const sessions = listCourseSessions(calendar, course, schedules);
      const dueDates = due ? sessions.map((s) => s.date).filter((d) => d >= due.from && d <= due.to) : [];
      return {
        course_id: course.course_id,
        course_no: course.course_no,
        subject: course.subject,
        teacher_id: course.teacher_id,
        teacher_name_cn: course.teacher_name_cn,
        day_of_week: course.day_of_week || null,
        window_status: course.window_status,
        total_sessions: sessions.length,
        due_count: dueDates.length,
        recorded_count: dueDates.filter((d) => recorded.has(d)).length,
        missing_dates: dueDates.filter((d) => !recorded.has(d)),
      };
    }),
  );

  return jsonResponse({
    success: true,
    data: { calendar_ready: isCalendarReady(calendar), today: todayMYT(), courses: data },
  });
}

// 每門課清理約 40 次 KV 操作，每天最多清 10 門，未清完的隔天繼續
const PURGE_COURSES_PER_RUN = 10;

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
    if (pathname === "/api/auth/google") return handleAuthGoogle(request, env);
    // 學校 Email + 密碼登入已於 2026-10-01 停用（舊版前端若還在快取中，會看到這個訊息）
    if (pathname.startsWith("/api/auth/")) {
      return jsonResponse({ error: PASSWORD_LOGIN_REMOVED_MESSAGE, code: "PASSWORD_LOGIN_REMOVED" }, 410);
    }

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
        return await handleStudentLookup(request, env, identifier);
      }

      if (pathname === "/api/v1/teachers") {
        return await handleTeacherList(request, env, session);
      }

      if (pathname.startsWith("/api/v1/my/courses")) {
        return await handleMyCourses(request, env, session);
      }

      if (pathname.startsWith("/api/v1/courses")) {
        return await handleCourses(request, env, session);
      }

      if (pathname === "/api/v1/calendar" || pathname.startsWith("/api/v1/calendar/")) {
        return await handleCalendar(request, env, session);
      }

      if (pathname === "/api/v1/attendance/summary") {
        return await handleAttendanceSummary(request, env, session);
      }

      if (pathname === "/api/v1/reports/course-summary") {
        return await handleCourseReport(request, env, session);
      }

      return jsonResponse({ error: "Not found" }, 404);
    } catch (error) {
      console.error("Error:", error);
      return jsonResponse({ error: "Internal server error" }, 500);
    }
  },

  /** 每日排程：刪除超過保留年限（今年＋往前 2 年）的課程及其名冊／排課／點名 */
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      buildService(env)
        .purgeExpiredCourses(PURGE_COURSES_PER_RUN)
        .then((ids) => {
          if (ids.length > 0) console.log(`Purged ${ids.length} expired courses:`, ids.join(", "));
        }),
    );
    ctx.waitUntil(
      buildService(env)
        .purgeExpiredCalendars()
        .then((years) => {
          if (years.length > 0) console.log(`Purged expired calendars:`, years.join(", "));
        }),
    );
  },
};

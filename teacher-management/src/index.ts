/**
 * 教師資料管理系統 - Cloudflare Worker
 * 功能：新增、查詢、修改、刪除教師資料
 *
 * API 端點：
 * - GET  /api/health - 健康檢查
 * - GET  /api/teachers - 取得所有教師
 * - GET  /api/teachers/:id - 取得單個教師
 * - POST /api/teachers - 新增教師
 * - PUT  /api/teachers/:id - 修改教師
 * - DELETE /api/teachers/:id - 刪除教師
 *
 * 授權（二擇一，見 authorize）：
 * - 行政管理站（admin-portal）登入後的 session token，且身分是 super_admin —— 平常都走這個
 * - secret ADMIN_API_KEY —— 備用鑰匙（例如所有 super_admin 都登不進去時，用舊的教師管理 portal 救援）
 */

import {
  TeacherKVManager,
  createAuthKVManager,
  createTeacherKVManager,
  type TeacherRecord,
} from "@chhsban/kv-utils";

/**
 * 環境變數接口
 */
interface Env {
  KV_BINDING: KVNamespace;
  AUTH_KV: KVNamespace;
  ENVIRONMENT: string;
  // 備用管理 API Key（wrangler secret put ADMIN_API_KEY）。未設定時只能用 super_admin 的 session
  ADMIN_API_KEY?: string;
}

/** 通過授權的操作者：session 登入時是該教師的 ID；用 API Key 時為 null */
interface Actor {
  teacherId: string | null;
}

const PERMISSIONS = ["teacher", "viewer", "admin", "super_admin", "classroom_manager", "dorm_supervisor"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 回傳給前端的教師資料：拿掉密碼相關欄位（密碼登入已於 2026-10-01 移除，舊資料裡可能還留著雜湊），
 * login_enabled 一律給明確的 true／false（舊資料沒有這個欄位，視為未開放）
 */
function sanitizeTeacher(teacher: TeacherRecord) {
  const {
    password_hash: _hash,
    password_salt: _salt,
    password_algorithm: _algorithm,
    password_iterations: _iterations,
    password_created_at: _createdAt,
    password_updated_at: _updatedAt,
    ...rest
  } = teacher;
  return { ...rest, login_enabled: teacher.login_enabled === true };
}

/** 私人 Google 帳號：去空白轉小寫；空字串代表清除；格式錯誤回傳 null */
function normalizeGoogleEmail(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  const email = String(value ?? "").trim().toLowerCase();
  if (email === "") return "";
  return EMAIL_RE.test(email) ? email : null;
}

/**
 * 教師 email／Google 帳號有變更後，讓登入用的 email 對照表失效（見 kv-utils 的 findTeacherByGoogleEmail），
 * 剛綁定的老師就能馬上登入。失敗只記錄，不影響教師資料本身已存檔。
 */
async function invalidateLoginDirectory(manager: TeacherKVManager): Promise<void> {
  try {
    await manager.invalidateEmailDirectory();
  } catch (error) {
    console.error("Failed to invalidate email directory:", error);
  }
}

/** 檢查這個 Google 帳號有沒有被別的教師綁定；有的話回傳該教師 ID */
function findGoogleEmailOwner(teachers: TeacherRecord[], googleEmail: string, exceptTeacherId?: string): string | null {
  const owner = teachers.find(
    (t) => t.teacher_id !== exceptTeacherId && t.google_email?.trim().toLowerCase() === googleEmail,
  );
  return owner ? owner.teacher_id : null;
}

/**
 * 請求上下文
 */
interface RequestContext {
  env: Env;
  url: URL;
  method: string;
  pathname: string;
  searchParams: URLSearchParams;
}

/**
 * 統一的 API 回應格式
 */
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 部門主檔資料（獨立於教師資料，是「所有部門」下拉選單與教師表單部門選項的唯一資料來源）
 */
interface DepartmentRecord {
  department_id: string;
  name: string;
  created_at: number;
  updated_at: number;
}

const DEPARTMENT_PREFIX = "department:";

/**
 * API Key 驗證：必須與 secret ADMIN_API_KEY 完全相同（定時比對，避免逐字元猜測）。
 * 2026-10-01 之前這裡只檢查「有沒有帶 key」，任何字串都會通過，等於整個教師資料庫對外公開。
 */
function verifyApiKey(provided: string, env: Env): boolean {
  const expected = env.ADMIN_API_KEY;
  if (!expected) return false;
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * 授權檢查：回傳操作者，或直接回傳要送出的錯誤回應。
 * session 有效但不是 super_admin 回 403（不是 401：admin-portal 收到 401 會把使用者登出）。
 */
async function authorize(request: Request, env: Env): Promise<Actor | Response> {
  const provided =
    request.headers.get("X-API-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "") ||
    "";
  if (!provided) return errorResponse("未授權：請先登入", 401);
  if (verifyApiKey(provided, env)) return { teacherId: null };

  const session = await createAuthKVManager(env.AUTH_KV).verifySession(provided);
  if (!session) return errorResponse("未授權：登入已失效或 API Key 不正確", 401);
  if (session.permission !== "super_admin") return errorResponse("只有超級管理員可以管理教師資料", 403);
  return { teacherId: session.teacher_id };
}

/**
 * 建立 JSON 回應
 */
function jsonResponse<T>(data: ApiResponse<T>, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
  });
}

/**
 * 建立錯誤回應
 */
function errorResponse(error: string, status: number = 400): Response {
  return jsonResponse(
    {
      success: false,
      error,
      timestamp: new Date().toISOString(),
    },
    status,
  );
}

/**
 * 建立成功回應
 */
function successResponse<T>(data: T, message?: string): Response {
  return jsonResponse(
    {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
    },
    200,
  );
}

/**
 * 處理健康檢查
 */
function handleHealth(): Response {
  return successResponse({
    status: "ok",
    service: "teacher-management",
    version: "1.0.0",
  });
}

/**
 * 處理 OPTIONS 請求（CORS 預檢）
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  });
}

/**
 * 獲取所有教師
 */
async function handleGetAllTeachers(
  manager: TeacherKVManager,
  ctx: RequestContext,
): Promise<Response> {
  try {
    const department = ctx.searchParams.get("department");
    let teachers: TeacherRecord[];

    if (department) {
      teachers = await manager.getTeachersByDepartment(department);
    } else {
      teachers = await manager.getAllTeachers();
    }

    return successResponse(teachers.map(sanitizeTeacher), `取得 ${teachers.length} 位教師`);
  } catch (error) {
    console.error("Error getting teachers:", error);
    return errorResponse("取得教師列表失敗", 500);
  }
}

/**
 * 獲取單個教師
 */
async function handleGetTeacher(
  manager: TeacherKVManager,
  ctx: RequestContext,
): Promise<Response> {
  try {
    const id = decodeURIComponent(ctx.pathname.split("/").pop() || "").trim();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }

    const teacher = await manager.getTeacher(id);
    if (!teacher) {
      return errorResponse("教師不存在", 404);
    }

    return successResponse(sanitizeTeacher(teacher));
  } catch (error) {
    console.error("Error getting teacher:", error);
    return errorResponse("取得教師失敗", 500);
  }
}

/**
 * 新增教師
 */
async function handleCreateTeacher(
  manager: TeacherKVManager,
  request: Request,
): Promise<Response> {
  try {
    const body = await request.json();

    // 驗證必填欄位
    if (!body.teacher_id || !body.name_cn || !body.email || !body.department) {
      return errorResponse(
        "缺少必填欄位：teacher_id, name_cn, email, department",
      );
    }

    const teacherId = String(body.teacher_id).trim();

    // 檢查教師是否已存在
    const existing = await manager.getTeacher(teacherId);
    if (existing) {
      return errorResponse("教師已存在", 409);
    }

    if (body.permission && !PERMISSIONS.includes(body.permission)) {
      return errorResponse("權限值不正確");
    }
    const googleEmail = normalizeGoogleEmail(body.google_email);
    if (googleEmail === null) {
      return errorResponse("私人 Google 帳號格式不正確");
    }
    if (googleEmail) {
      const owner = findGoogleEmailOwner(await manager.getAllTeachers(), googleEmail);
      if (owner) return errorResponse(`此 Google 帳號已綁定給教師 ${owner}`, 409);
    }

    // 新增教師
    const teacher: TeacherRecord = {
      teacher_id: teacherId,
      name_cn: String(body.name_cn).trim(),
      name_en: body.name_en ? String(body.name_en).trim() : "",
      department: String(body.department).trim(),
      email: String(body.email).trim(),
      ...(googleEmail ? { google_email: googleEmail } : {}),
      // 開放登入：沒指定時，有填 Google 帳號就視為要開放
      login_enabled: typeof body.login_enabled === "boolean" ? body.login_enabled : !!googleEmail,
      permission: body.permission || "teacher",
    };

    await manager.saveTeacher(teacher);
    await invalidateLoginDirectory(manager);

    return jsonResponse(
      {
        success: true,
        data: sanitizeTeacher(teacher),
        message: "教師新增成功",
        timestamp: new Date().toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("Error creating teacher:", error);
    return errorResponse("新增教師失敗", 500);
  }
}

/**
 * 修改教師
 */
async function handleUpdateTeacher(
  manager: TeacherKVManager,
  request: Request,
  ctx: RequestContext,
  actor: Actor,
): Promise<Response> {
  try {
    const id = decodeURIComponent(ctx.pathname.split("/").pop() || "").trim();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }

    // 獲取現有教師
    const existing = await manager.getTeacher(id);
    if (!existing) {
      return errorResponse("教師不存在", 404);
    }

    const body = await request.json();

    if (body.permission && !PERMISSIONS.includes(body.permission)) {
      return errorResponse("權限值不正確");
    }
    // 不能改掉自己的超級管理員身分，避免手滑把自己鎖在外面
    if (actor.teacherId === id && body.permission && body.permission !== existing.permission) {
      return errorResponse("不能修改自己的權限，請由另一位超級管理員操作", 409);
    }
    // 同理，不能關閉自己的登入、不能解除自己的 Google 帳號（那是唯一的登入方式）
    if (actor.teacherId === id && (body.login_enabled === false || body.google_email === "")) {
      return errorResponse("不能關閉自己的登入或解除自己的 Google 帳號", 409);
    }
    // google_email：沒帶 = 不變；空字串 = 解除綁定；有值 = 綁定（不能與其他教師重複）
    const googleEmail = normalizeGoogleEmail(body.google_email);
    if (googleEmail === null) {
      return errorResponse("私人 Google 帳號格式不正確");
    }
    if (googleEmail) {
      const owner = findGoogleEmailOwner(await manager.getAllTeachers(), googleEmail, id);
      if (owner) return errorResponse(`此 Google 帳號已綁定給教師 ${owner}`, 409);
    }

    // 合併更新
    const updated: TeacherRecord = {
      ...existing,
      name_cn: body.name_cn ? String(body.name_cn).trim() : existing.name_cn,
      name_en: body.name_en ? String(body.name_en).trim() : existing.name_en,
      department: body.department
        ? String(body.department).trim()
        : existing.department,
      email: body.email ? String(body.email).trim() : existing.email,
      permission: body.permission || existing.permission,
    };
    if (googleEmail !== undefined) {
      if (googleEmail) updated.google_email = googleEmail;
      else delete updated.google_email;
    }
    // 開放登入：有明確指定就照指定；沒指定時，第一次綁上 Google 帳號視為要開放。沒有 Google 帳號一律關閉
    if (typeof body.login_enabled === "boolean") {
      updated.login_enabled = body.login_enabled;
    } else if (googleEmail && !existing.google_email) {
      updated.login_enabled = true;
    }
    if (!updated.google_email) updated.login_enabled = false;

    await manager.saveTeacher(updated);
    if (updated.email !== existing.email || updated.google_email !== existing.google_email) {
      await invalidateLoginDirectory(manager);
    }

    return successResponse(sanitizeTeacher(updated), "教師修改成功");
  } catch (error) {
    console.error("Error updating teacher:", error);
    return errorResponse("修改教師失敗", 500);
  }
}

/**
 * 刪除教師
 */
async function handleDeleteTeacher(
  manager: TeacherKVManager,
  ctx: RequestContext,
  actor: Actor,
): Promise<Response> {
  try {
    const id = decodeURIComponent(ctx.pathname.split("/").pop() || "").trim();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }
    if (actor.teacherId === id) {
      return errorResponse("不能刪除自己的帳號", 409);
    }

    // 檢查教師是否存在
    const existing = await manager.getTeacher(id);
    if (!existing) {
      return errorResponse("教師不存在", 404);
    }

    await manager.deleteTeacher(id);
    await invalidateLoginDirectory(manager);

    return successResponse({ teacher_id: id }, "教師刪除成功");
  } catch (error) {
    console.error("Error deleting teacher:", error);
    return errorResponse("刪除教師失敗", 500);
  }
}

/**
 * 批量導入教師
 * 請求體: { teachers: [{ teacher_id, name_cn, email, department }, ...] }
 */
async function handleBulkImportTeachers(
  manager: TeacherKVManager,
  request: Request,
): Promise<Response> {
  try {
    const body = await request.json();

    if (!Array.isArray(body.teachers)) {
      return errorResponse("缺少 teachers 陣列");
    }

    const results = {
      total: body.teachers.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { teacher_id: string; error: string }[],
    };

    // 私人 Google 帳號重複檢查：以目前資料為底，匯入過程中新綁定的也要算進去
    const allTeachers = await manager.getAllTeachers();
    const googleOwners = new Map<string, string>();
    for (const t of allTeachers) {
      if (t.google_email) googleOwners.set(t.google_email.trim().toLowerCase(), t.teacher_id);
    }

    for (const data of body.teachers) {
      try {
        // 必填：teacher_id；新教師另外需要 name_cn、email、department（既有教師可只填要更新的欄位）
        if (!data.teacher_id) {
          results.errors.push({ teacher_id: "未知", error: "缺少 School ID" });
          continue;
        }

        const teacherId = String(data.teacher_id).trim();
        const department = data.department ? String(data.department).trim() : "";

        // 私人 Google 帳號（選填）：空白 = 不變更
        const googleEmail = normalizeGoogleEmail(data.google_email);
        if (googleEmail === null) {
          results.errors.push({ teacher_id: teacherId, error: "私人 Google 帳號格式不正確" });
          continue;
        }
        if (googleEmail) {
          const owner = googleOwners.get(googleEmail);
          if (owner && owner !== teacherId) {
            results.errors.push({ teacher_id: teacherId, error: `Google 帳號已綁定給教師 ${owner}` });
            continue;
          }
        }

        // 檢查教師是否已存在
        const existing = await manager.getTeacher(teacherId);

        if (existing) {
          const departmentChanged = !!department && existing.department !== department;
          const googleChanged = !!googleEmail && existing.google_email !== googleEmail;
          if (departmentChanged || googleChanged) {
            const updated: TeacherRecord = {
              ...existing,
              ...(department ? { department } : {}),
              // 匯入新的 Google 帳號 = 管理員要讓這位老師使用系統，一併開放登入
              ...(googleChanged ? { google_email: googleEmail as string, login_enabled: true } : {}),
            };
            await manager.saveTeacher(updated);
            if (googleEmail) googleOwners.set(googleEmail, teacherId);
            results.updated++;
          } else {
            // 跳過（部門與 Google 帳號都未變更）
            results.skipped++;
          }
        } else {
          if (!data.name_cn || !data.email || !department) {
            results.errors.push({ teacher_id: teacherId, error: "新教師缺少必填欄位（Name、email、department）" });
            continue;
          }
          // 新增教師
          const teacher: TeacherRecord = {
            teacher_id: teacherId,
            name_cn: String(data.name_cn).trim(),
            name_en: data.name_en ? String(data.name_en).trim() : "",
            department,
            email: String(data.email).trim(),
            ...(googleEmail ? { google_email: googleEmail } : {}),
            login_enabled: !!googleEmail,
            permission: "teacher",
          };
          if (googleEmail) googleOwners.set(googleEmail, teacherId);
          await manager.saveTeacher(teacher);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          teacher_id: data.teacher_id || "未知",
          error: String(error),
        });
      }
    }

    if (results.created > 0 || results.updated > 0) {
      await invalidateLoginDirectory(manager);
    }

    return successResponse(results, "批量匯入完成");
  } catch (error) {
    console.error("Error bulk importing teachers:", error);
    return errorResponse("批量匯入失敗", 500);
  }
}

/**
 * 列出所有部門（依 name 排序）
 */
async function listDepartments(kv: KVNamespace): Promise<DepartmentRecord[]> {
  const departments: DepartmentRecord[] = [];
  let cursor: string | undefined;

  do {
    const result: any = await kv.list({ prefix: DEPARTMENT_PREFIX, cursor });

    for (const item of result.keys) {
      const data = await kv.get(item.name);
      if (data) {
        try {
          departments.push(JSON.parse(data) as DepartmentRecord);
        } catch (error) {
          console.error(`Failed to parse department data for ${item.name}:`, error);
        }
      }
    }

    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return departments.sort((a, b) => a.name.localeCompare(b.name, "zh-Hant"));
}

/**
 * 獲取所有部門
 */
async function handleGetAllDepartments(env: Env): Promise<Response> {
  try {
    const departments = await listDepartments(env.KV_BINDING);
    return successResponse(departments, `取得 ${departments.length} 個部門`);
  } catch (error) {
    console.error("Error getting departments:", error);
    return errorResponse("取得部門列表失敗", 500);
  }
}

/**
 * 新增部門
 */
async function handleCreateDepartment(
  env: Env,
  request: Request,
): Promise<Response> {
  try {
    const body = await request.json();
    const name = body.name ? String(body.name).trim() : "";

    if (!name) {
      return errorResponse("缺少必填欄位：name");
    }

    const existing = await listDepartments(env.KV_BINDING);
    if (existing.some((d) => d.name === name)) {
      return errorResponse("部門已存在", 409);
    }

    const now = Date.now();
    const department: DepartmentRecord = {
      department_id: crypto.randomUUID(),
      name,
      created_at: now,
      updated_at: now,
    };

    await env.KV_BINDING.put(
      `${DEPARTMENT_PREFIX}${department.department_id}`,
      JSON.stringify(department),
    );

    return jsonResponse(
      {
        success: true,
        data: department,
        message: "部門新增成功",
        timestamp: new Date().toISOString(),
      },
      201,
    );
  } catch (error) {
    console.error("Error creating department:", error);
    return errorResponse("新增部門失敗", 500);
  }
}

/**
 * 修改部門（改名時，一併更新所有使用舊名稱的教師紀錄，避免資料脫節）
 */
async function handleUpdateDepartment(
  env: Env,
  request: Request,
  ctx: RequestContext,
  manager: TeacherKVManager,
): Promise<Response> {
  try {
    const id = decodeURIComponent(ctx.pathname.split("/").pop() || "").trim();
    if (!id) {
      return errorResponse("缺少部門 ID");
    }

    const key = `${DEPARTMENT_PREFIX}${id}`;
    const data = await env.KV_BINDING.get(key);
    if (!data) {
      return errorResponse("部門不存在", 404);
    }
    const existing = JSON.parse(data) as DepartmentRecord;

    const body = await request.json();
    const name = body.name ? String(body.name).trim() : existing.name;
    if (!name) {
      return errorResponse("缺少必填欄位：name");
    }

    if (name !== existing.name) {
      const allDepartments = await listDepartments(env.KV_BINDING);
      const collision = allDepartments.find(
        (d) => d.department_id !== id && d.name === name,
      );

      // 改名對象已經是另一個既有部門：視為合併，而不是報錯擋下來——
      // 把目前掛在這筆部門下的教師全部轉到那個既有部門，再刪掉這筆重複記錄
      if (collision) {
        const affectedTeachers = await manager.getTeachersByDepartment(existing.name);
        for (const teacher of affectedTeachers) {
          await manager.saveTeacher({ ...teacher, department: collision.name });
        }
        await env.KV_BINDING.delete(key);
        return successResponse(
          collision,
          `已合併至既有部門「${collision.name}」，共轉移 ${affectedTeachers.length} 位教師`,
        );
      }
    }

    const updated: DepartmentRecord = { ...existing, name, updated_at: Date.now() };
    await env.KV_BINDING.put(key, JSON.stringify(updated));

    if (name !== existing.name) {
      const affectedTeachers = await manager.getTeachersByDepartment(existing.name);
      for (const teacher of affectedTeachers) {
        await manager.saveTeacher({ ...teacher, department: name });
      }
    }

    return successResponse(updated, "部門修改成功");
  } catch (error) {
    console.error("Error updating department:", error);
    return errorResponse("修改部門失敗", 500);
  }
}

/**
 * 刪除部門（仍有教師使用中則拒絕，避免留下無法對應的孤兒資料）
 */
async function handleDeleteDepartment(
  env: Env,
  ctx: RequestContext,
  manager: TeacherKVManager,
): Promise<Response> {
  try {
    const id = decodeURIComponent(ctx.pathname.split("/").pop() || "").trim();
    if (!id) {
      return errorResponse("缺少部門 ID");
    }

    const key = `${DEPARTMENT_PREFIX}${id}`;
    const data = await env.KV_BINDING.get(key);
    if (!data) {
      return errorResponse("部門不存在", 404);
    }
    const existing = JSON.parse(data) as DepartmentRecord;

    const teachersInUse = await manager.getTeachersByDepartment(existing.name);
    if (teachersInUse.length > 0) {
      return errorResponse(
        `仍有 ${teachersInUse.length} 位教師使用此部門，請先變更他們的部門後再刪除`,
        409,
      );
    }

    await env.KV_BINDING.delete(key);

    return successResponse({ department_id: id }, "部門刪除成功");
  } catch (error) {
    console.error("Error deleting department:", error);
    return errorResponse("刪除部門失敗", 500);
  }
}

/**
 * 從現有教師資料同步部門主檔：把教師記錄裡目前使用中、但部門主檔還沒有的部門名稱補進去。
 * 用於部門主檔剛上線時的資料回填，也可在日後透過 Excel 批量匯入教師產生新部門字串時重複執行來補救。
 */
async function handleSyncDepartmentsFromTeachers(
  env: Env,
  manager: TeacherKVManager,
): Promise<Response> {
  try {
    const [teachers, existingDepartments] = await Promise.all([
      manager.getAllTeachers(),
      listDepartments(env.KV_BINDING),
    ]);

    const existingNames = new Set(existingDepartments.map((d) => d.name));
    const distinctNames = new Set<string>();
    teachers.forEach((t) => {
      if (t.department && t.department.trim()) {
        distinctNames.add(t.department.trim());
      }
    });

    let created = 0;
    for (const name of distinctNames) {
      if (existingNames.has(name)) continue;

      const now = Date.now();
      const department: DepartmentRecord = {
        department_id: crypto.randomUUID(),
        name,
        created_at: now,
        updated_at: now,
      };
      await env.KV_BINDING.put(
        `${DEPARTMENT_PREFIX}${department.department_id}`,
        JSON.stringify(department),
      );
      existingNames.add(name);
      created++;
    }

    return successResponse(
      {
        total_distinct: distinctNames.size,
        created,
        skipped: distinctNames.size - created,
      },
      `同步完成，新增 ${created} 個部門`,
    );
  } catch (error) {
    console.error("Error syncing departments from teachers:", error);
    return errorResponse("同步部門失敗", 500);
  }
}

/**
 * 路由主要處理邏輯
 */
async function handleRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;
  const searchParams = url.searchParams;

  // 建立上下文
  const ctx: RequestContext = {
    env,
    url,
    method,
    pathname,
    searchParams,
  };

  // 初始化 TeacherKVManager
  const manager = createTeacherKVManager(env.KV_BINDING);

  // 處理 CORS 預檢
  if (method === "OPTIONS") {
    return handleOptions();
  }

  // 健康檢查（不需要 API Key）
  if (pathname === "/api/health") {
    return handleHealth();
  }

  // 其餘所有端點都需要 super_admin 的登入 session 或備用 API Key
  const actor = await authorize(request, env);
  if (actor instanceof Response) return actor;

  // 教師資料 API
  if (pathname === "/api/teachers" || pathname.startsWith("/api/teachers/")) {
    if (pathname === "/api/teachers") {
      if (method === "GET") {
        return handleGetAllTeachers(manager, ctx);
      } else if (method === "POST") {
        return handleCreateTeacher(manager, request);
      } else {
        return errorResponse("方法不允許", 405);
      }
    } else if (pathname === "/api/teachers/import") {
      if (method === "POST") {
        return handleBulkImportTeachers(manager, request);
      } else {
        return errorResponse("方法不允許", 405);
      }
    } else {
      if (method === "GET") {
        return handleGetTeacher(manager, ctx);
      } else if (method === "PUT") {
        return handleUpdateTeacher(manager, request, ctx, actor);
      } else if (method === "DELETE") {
        return handleDeleteTeacher(manager, ctx, actor);
      } else {
        return errorResponse("方法不允許", 405);
      }
    }
  }

  // 部門主檔 API
  if (pathname === "/api/departments" || pathname.startsWith("/api/departments/")) {
    if (pathname === "/api/departments") {
      if (method === "GET") {
        return handleGetAllDepartments(env);
      } else if (method === "POST") {
        return handleCreateDepartment(env, request);
      } else {
        return errorResponse("方法不允許", 405);
      }
    } else if (pathname === "/api/departments/sync-from-teachers") {
      if (method === "POST") {
        return handleSyncDepartmentsFromTeachers(env, manager);
      } else {
        return errorResponse("方法不允許", 405);
      }
    } else {
      if (method === "PUT") {
        return handleUpdateDepartment(env, request, ctx, manager);
      } else if (method === "DELETE") {
        return handleDeleteDepartment(env, ctx, manager);
      } else {
        return errorResponse("方法不允許", 405);
      }
    }
  }

  // 404 Not Found
  return errorResponse("找不到該路由", 404);
}

/**
 * Cloudflare Worker 匯出
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (error) {
      console.error("Unhandled error:", error);
      return errorResponse("伺服器內部錯誤", 500);
    }
  },
};

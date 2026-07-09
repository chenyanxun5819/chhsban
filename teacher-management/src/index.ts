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
 */

import {
  TeacherKVManager,
  createTeacherKVManager,
  type TeacherRecord,
} from "@chhsban/kv-utils";

/**
 * 環境變數接口
 */
interface Env {
  KV_BINDING: KVNamespace;
  ENVIRONMENT: string;
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
 * 簡單的 API Key 驗證（後續可改為 JWT）
 */
function verifyApiKey(request: Request): boolean {
  const apiKey =
    request.headers.get("X-API-Key") ||
    request.headers.get("Authorization")?.replace("Bearer ", "");

  // 簡單驗證：檢查 API Key 是否存在
  // 在生產環境中應該對比真實的 API Key
  return !!apiKey;
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

    return successResponse(teachers, `取得 ${teachers.length} 位教師`);
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
    const id = ctx.pathname.split("/").pop();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }

    const teacher = await manager.getTeacher(id);
    if (!teacher) {
      return errorResponse("教師不存在", 404);
    }

    return successResponse(teacher);
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

    // 檢查教師是否已存在
    const existing = await manager.getTeacher(body.teacher_id);
    if (existing) {
      return errorResponse("教師已存在", 409);
    }

    // 新增教師
    const teacher: TeacherRecord = {
      teacher_id: body.teacher_id,
      name_cn: body.name_cn,
      name_en: body.name_en || "",
      department: body.department,
      email: body.email,
      permission: body.permission || "teacher",
    };

    await manager.saveTeacher(teacher);

    return jsonResponse(
      {
        success: true,
        data: teacher,
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
): Promise<Response> {
  try {
    const id = ctx.pathname.split("/").pop();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }

    // 獲取現有教師
    const existing = await manager.getTeacher(id);
    if (!existing) {
      return errorResponse("教師不存在", 404);
    }

    const body = await request.json();

    // 合併更新
    const updated: TeacherRecord = {
      ...existing,
      name_cn: body.name_cn || existing.name_cn,
      name_en: body.name_en || existing.name_en,
      department: body.department || existing.department,
      email: body.email || existing.email,
      permission: body.permission || existing.permission,
    };

    await manager.saveTeacher(updated);

    return successResponse(updated, "教師修改成功");
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
): Promise<Response> {
  try {
    const id = ctx.pathname.split("/").pop();
    if (!id) {
      return errorResponse("缺少教師 ID");
    }

    // 檢查教師是否存在
    const existing = await manager.getTeacher(id);
    if (!existing) {
      return errorResponse("教師不存在", 404);
    }

    await manager.deleteTeacher(id);

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

    for (const data of body.teachers) {
      try {
        // 驗證必填欄位
        if (
          !data.teacher_id ||
          !data.name_cn ||
          !data.email ||
          !data.department
        ) {
          results.errors.push({
            teacher_id: data.teacher_id || "未知",
            error: "缺少必填欄位",
          });
          continue;
        }

        // 檢查教師是否已存在
        const existing = await manager.getTeacher(data.teacher_id);

        if (existing) {
          // 檢查 department 是否變更
          if (existing.department !== data.department) {
            // 更新 department
            const updated: TeacherRecord = {
              ...existing,
              department: data.department,
            };
            await manager.saveTeacher(updated);
            results.updated++;
          } else {
            // 跳過（部門未變更）
            results.skipped++;
          }
        } else {
          // 新增教師
          const teacher: TeacherRecord = {
            teacher_id: data.teacher_id,
            name_cn: data.name_cn,
            name_en: data.name_en || "",
            department: data.department,
            email: data.email,
            permission: "teacher",
          };
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

    return successResponse(results, "批量匯入完成");
  } catch (error) {
    console.error("Error bulk importing teachers:", error);
    return errorResponse("批量匯入失敗", 500);
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

  // 驗證 API Key（除了健康檢查）
  if (!pathname.includes("/health") && !verifyApiKey(request)) {
    return errorResponse("未授權：缺少有效的 API Key", 401);
  }

  // 健康檢查
  if (pathname === "/api/health") {
    return handleHealth();
  }

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
        return handleUpdateTeacher(manager, request, ctx);
      } else if (method === "DELETE") {
        return handleDeleteTeacher(manager, ctx);
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

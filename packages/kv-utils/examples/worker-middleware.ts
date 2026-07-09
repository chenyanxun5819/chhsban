/**
 * Cloudflare Worker Middleware 示例
 * 展示如何在 Worker 中集成 @chhsban/kv-utils 进行认证和权限管理
 * 
 * 使用方式：
 * 1. 复制本文件到你的 Worker 项目
 * 2. 安装依赖：npm install @chhsban/kv-utils
 * 3. 在 wrangler.toml 中配置 KV 绑定
 * 4. 根据需要修改路由和权限逻辑
 */

import {
  createAuthKVManager,
  createStudentKVManager,
  createTeacherKVManager,
  type AuthSessionData,
  type Permission,
} from "@chhsban/kv-utils";

/**
 * 环境变量和 KV 绑定类型
 */
interface Env {
  AUTH_KV: KVNamespace;
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  // 其他可选绑定...
}

/**
 * 扩展的请求上下文，包含用户信息
 */
interface AuthenticatedRequest extends Request {
  user?: {
    teacherId: string;
    permission: Permission;
    expiresAt: number;
    sessionData?: AuthSessionData;
  };
  rawToken?: string;
}

/**
 * 从请求中提取认证令牌
 * 支持两种方式：
 * 1. Authorization 头：Bearer {token}
 * 2. Cookie：session_token={token}
 */
function extractToken(request: Request): string | null {
  // 优先从 Authorization 头提取
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // 其次从 Cookie 中提取
  const cookies = request.headers.get("Cookie") || "";
  const match = cookies.match(/session_token=([^;]+)/);
  if (match) {
    return decodeURIComponent(match[1]);
  }

  return null;
}

/**
 * 认证 Middleware
 * 验证令牌并将用户信息附加到请求对象
 */
async function authMiddleware(
  request: AuthenticatedRequest,
  env: Env
): Promise<Response | null> {
  const token = extractToken(request);

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Missing authentication token",
        message: "Please provide token via Authorization header or session_token cookie",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    const sessionData = await authMgr.verifySession(token);

    if (!sessionData) {
      return new Response(
        JSON.stringify({
          error: "Invalid or expired token",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 将用户信息和 token 附加到请求对象
    request.user = {
      teacherId: sessionData.teacher_id,
      permission: sessionData.permission,
      expiresAt: sessionData.expires_at,
      sessionData,
    };
    request.rawToken = token;

    return null; // 继续处理请求
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return new Response(
      JSON.stringify({
        error: "Authentication failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * 权限检查 Middleware
 * 确保用户拥有指定的权限等级
 */
async function requirePermission(
  request: AuthenticatedRequest,
  requiredPermission: Permission,
  env: Env
): Promise<Response | null> {
  if (!request.user || !request.rawToken) {
    return new Response(
      JSON.stringify({
        error: "User not authenticated",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    const hasPermission = await authMgr.hasPermission(
      request.rawToken,
      requiredPermission
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({
          error: "Insufficient permissions",
          required: requiredPermission,
          current: request.user.permission,
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return null; // 权限检查通过，继续处理
  } catch (error) {
    console.error("Permission check error:", error);
    return new Response(
      JSON.stringify({
        error: "Permission check failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * 路由处理示例
 */
async function handleRequest(
  request: AuthenticatedRequest,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. 获取用户信息（需要认证）
  if (pathname === "/api/me" && request.method === "GET") {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          teacherId: request.user?.teacherId,
          permission: request.user?.permission,
          expiresAt: new Date(request.user?.expiresAt || 0).toISOString(),
        },
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // 2. 获取学生列表（需要认证）
  if (pathname === "/api/students" && request.method === "GET") {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    try {
      const studentMgr = createStudentKVManager(env.STUDENT_KV);
      const students = await studentMgr.getAllStudents();

      return new Response(
        JSON.stringify({
          success: true,
          count: students.length,
          students,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Failed to fetch students:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch students",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // 3. 按班级获取学生（需要 viewer 权限）
  if (pathname.startsWith("/api/students/class/") && request.method === "GET") {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, "viewer", env);
    if (permError) return permError;

    const className = pathname.split("/").pop();
    if (!className) {
      return new Response(
        JSON.stringify({ error: "Missing class name" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    try {
      const studentMgr = createStudentKVManager(env.STUDENT_KV);
      const students = await studentMgr.getStudentsByClass(className);

      return new Response(
        JSON.stringify({
          success: true,
          class: className,
          count: students.length,
          students,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error(`Failed to fetch students for class ${className}:`, error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch students",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // 4. 管理员操作：获取所有教师（需要 admin 权限）
  if (pathname === "/api/admin/teachers" && request.method === "GET") {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, "admin", env);
    if (permError) return permError;

    try {
      const teacherMgr = createTeacherKVManager(env.TEACHER_KV);
      const teachers = await teacherMgr.getAllTeachers();

      return new Response(
        JSON.stringify({
          success: true,
          count: teachers.length,
          teachers,
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch teachers",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // 5. 超级管理员操作：获取系统统计（需要 super_admin 权限）
  if (pathname === "/api/super-admin/stats" && request.method === "GET") {
    const authError = await authMiddleware(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, "super_admin", env);
    if (permError) return permError;

    try {
      const studentMgr = createStudentKVManager(env.STUDENT_KV);
      const teacherMgr = createTeacherKVManager(env.TEACHER_KV);

      const students = await studentMgr.getAllStudents();
      const teachers = await teacherMgr.getAllTeachers();

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalStudents: students.length,
            totalTeachers: teachers.length,
            timestamp: new Date().toISOString(),
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch statistics",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // 404 Not Found
  return new Response(
    JSON.stringify({
      error: "Not found",
      path: pathname,
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}

/**
 * Worker 主处理函数
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const authRequest = request as AuthenticatedRequest;

    try {
      return await handleRequest(authRequest, env);
    } catch (error) {
      console.error("Unhandled error:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  },
};

/**
 * 测试和使用示例
 * 
 * 1. 创建会话（登录）
 * curl -X POST http://localhost:8787/api/login \
 *   -H "Content-Type: application/json" \
 *   -d '{"teacherId":"T001","teacherName":"John","permission":"admin"}'
 * 
 * 2. 使用 token 获取用户信息
 * curl http://localhost:8787/api/me \
 *   -H "Authorization: Bearer {token}"
 * 
 * 3. 获取学生列表
 * curl http://localhost:8787/api/students \
 *   -H "Authorization: Bearer {token}"
 * 
 * 4. 按班级获取学生（需要 viewer 权限）
 * curl http://localhost:8787/api/students/class/J1A \
 *   -H "Authorization: Bearer {token}"
 * 
 * 5. 获取教师列表（需要 admin 权限）
 * curl http://localhost:8787/api/admin/teachers \
 *   -H "Authorization: Bearer {token}"
 * 
 * 6. 获取系统统计（需要 super_admin 权限）
 * curl http://localhost:8787/api/super-admin/stats \
 *   -H "Authorization: Bearer {token}"
 */

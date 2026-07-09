/**
 * CHHSBAN AcaDoc Worker - 認證集成示例
 * 
 * 此文件展示如何在 acadoc Worker 中集成 @chhsban/kv-utils 的認證 middleware
 * 
 * 使用方式：
 * 1. 安装依赖：npm install @chhsban/kv-utils
 * 2. 复制本文件内容到 acadoc Worker 中
 * 3. 配置 wrangler.toml 中的 KV 绑定
 * 4. 修改 main 指向此文件
 */

import {
  createAuthKVManager,
  createStudentKVManager,
  createTeacherKVManager,
  type AuthSessionData,
  type Permission,
} from "@chhsban/kv-utils";

/**
 * 环境配置
 */
interface WorkerEnv {
  AUTH_KV: KVNamespace;
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  SMS_BASE_URL?: string;
  GOOGLE_SHEETS_ID?: string;
  GOOGLE_API_KEY?: string;
}

/**
 * 带认证信息的请求
 */
interface AuthRequest extends Request {
  user?: {
    teacherId: string;
    permission: Permission;
    sessionData: AuthSessionData;
  };
  token?: string;
}

/**
 * CORS 配置
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

/**
 * 提取 token 函数
 */
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 认证 middleware
 */
async function authenticate(
  request: AuthRequest,
  env: WorkerEnv
): Promise<Response | null> {
  const token = extractToken(request);

  if (!token) {
    return new Response(
      JSON.stringify({
        error: 'Missing authentication token',
        hint: 'Provide token via Authorization header (Bearer {token}) or session_token cookie',
      }),
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }

  try {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    const sessionData = await authMgr.verifySession(token);

    if (!sessionData) {
      return new Response(
        JSON.stringify({
          error: 'Invalid or expired token',
        }),
        {
          status: 401,
          headers: CORS_HEADERS,
        }
      );
    }

    request.user = {
      teacherId: sessionData.teacher_id,
      permission: sessionData.permission,
      sessionData,
    };
    request.token = token;

    return null; // 继续处理请求
  } catch (error) {
    console.error('Authentication error:', error);
    return new Response(
      JSON.stringify({
        error: 'Authentication failed',
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

/**
 * 权限检查 middleware
 */
async function requirePermission(
  request: AuthRequest,
  requiredPermission: Permission,
  env: WorkerEnv
): Promise<Response | null> {
  if (!request.user || !request.token) {
    return new Response(
      JSON.stringify({
        error: 'User not authenticated',
      }),
      {
        status: 401,
        headers: CORS_HEADERS,
      }
    );
  }

  try {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    const hasPermission = await authMgr.hasPermission(request.token, requiredPermission);

    if (!hasPermission) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          required: requiredPermission,
          current: request.user.permission,
        }),
        {
          status: 403,
          headers: CORS_HEADERS,
        }
      );
    }

    return null; // 权限检查通过
  } catch (error) {
    console.error('Permission check error:', error);
    return new Response(
      JSON.stringify({
        error: 'Permission check failed',
      }),
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}

/**
 * 路由处理
 */
async function handleRequest(
  request: AuthRequest,
  env: WorkerEnv
): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // 处理 preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // 健康检查（不需要认证）
  if (pathname === '/health') {
    return new Response(
      JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: CORS_HEADERS,
      }
    );
  }

  // 登录接口：创建会话（不需要现有认证）
  if (pathname === '/api/auth/login' && request.method === 'POST') {
    try {
      const { teacherId, teacherName, permission, redirectUrl } = await request.json();

      if (!teacherId || !teacherName || !permission) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields: teacherId, teacherName, permission',
          }),
          {
            status: 400,
            headers: CORS_HEADERS,
          }
        );
      }

      const authMgr = createAuthKVManager(env.AUTH_KV);
      const session = await authMgr.createSession(
        teacherId,
        teacherName,
        permission,
        redirectUrl
      );

      return new Response(
        JSON.stringify({
          success: true,
          token: session.token,
          user: {
            teacherId: session.teacherId,
            teacherName: session.teacherName,
            permission: session.permission,
          },
          expiresAt: new Date(session.expiresAt).toISOString(),
        }),
        {
          headers: CORS_HEADERS,
        }
      );
    } catch (error) {
      console.error('Login error:', error);
      return new Response(
        JSON.stringify({
          error: 'Login failed',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  }

  // 登出接口：删除会话
  if (pathname === '/api/auth/logout' && request.method === 'POST') {
    const authError = await authenticate(request, env);
    if (authError) return authError;

    try {
      const authMgr = createAuthKVManager(env.AUTH_KV);
      if (request.token) {
        await authMgr.deleteSession(request.token);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Logged out successfully',
        }),
        {
          headers: CORS_HEADERS,
        }
      );
    } catch (error) {
      console.error('Logout error:', error);
      return new Response(
        JSON.stringify({
          error: 'Logout failed',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  }

  // 获取当前用户信息
  if (pathname === '/api/auth/me' && request.method === 'GET') {
    const authError = await authenticate(request, env);
    if (authError) return authError;

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          teacherId: request.user?.teacherId,
          permission: request.user?.permission,
          name: request.user?.sessionData?.teacher_name_cn,
          expiresAt: new Date(request.user?.sessionData?.expires_at || 0).toISOString(),
        },
      }),
      {
        headers: CORS_HEADERS,
      }
    );
  }

  // 获取学生列表（需要 viewer 权限）
  if (pathname === '/api/students' && request.method === 'GET') {
    const authError = await authenticate(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, 'viewer', env);
    if (permError) return permError;

    try {
      const studentMgr = createStudentKVManager(env.STUDENT_KV);
      const students = await studentMgr.getAllStudents();

      return new Response(
        JSON.stringify({
          success: true,
          count: students.length,
          students,
          requestedBy: request.user?.teacherId,
        }),
        {
          headers: CORS_HEADERS,
        }
      );
    } catch (error) {
      console.error('Failed to fetch students:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch students',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  }

  // 按班级查询学生
  if (pathname.startsWith('/api/students/class/') && request.method === 'GET') {
    const authError = await authenticate(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, 'viewer', env);
    if (permError) return permError;

    const className = pathname.split('/').pop();
    if (!className) {
      return new Response(
        JSON.stringify({ error: 'Missing class name' }),
        {
          status: 400,
          headers: CORS_HEADERS,
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
          requestedBy: request.user?.teacherId,
        }),
        {
          headers: CORS_HEADERS,
        }
      );
    } catch (error) {
      console.error(`Failed to fetch students for class ${className}:`, error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch students',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  }

  // 获取教师列表（需要 admin 权限）
  if (pathname === '/api/admin/teachers' && request.method === 'GET') {
    const authError = await authenticate(request, env);
    if (authError) return authError;

    const permError = await requirePermission(request, 'admin', env);
    if (permError) return permError;

    try {
      const teacherMgr = createTeacherKVManager(env.TEACHER_KV);
      const teachers = await teacherMgr.getAllTeachers();

      return new Response(
        JSON.stringify({
          success: true,
          count: teachers.length,
          teachers,
          requestedBy: request.user?.teacherId,
        }),
        {
          headers: CORS_HEADERS,
        }
      );
    } catch (error) {
      console.error('Failed to fetch teachers:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch teachers',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  }

  // 404 Not Found
  return new Response(
    JSON.stringify({
      error: 'Not found',
      path: pathname,
      availableEndpoints: [
        'POST /api/auth/login',
        'POST /api/auth/logout',
        'GET /api/auth/me',
        'GET /api/students',
        'GET /api/students/class/{className}',
        'GET /api/admin/teachers',
      ],
    }),
    {
      status: 404,
      headers: CORS_HEADERS,
    }
  );
}

/**
 * Worker 主处理函数
 */
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const authRequest = request as AuthRequest;

    try {
      return await handleRequest(authRequest, env);
    } catch (error) {
      console.error('Unhandled error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
        }),
        {
          status: 500,
          headers: CORS_HEADERS,
        }
      );
    }
  },
};

/**
 * 使用示例 - cURL 命令
 * 
 * 1. 健康检查
 * curl http://localhost:8787/health
 * 
 * 2. 登录（创建会话）
 * TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "teacherId":"T001",
 *     "teacherName":"John Doe",
 *     "permission":"admin",
 *     "redirectUrl":"/dashboard"
 *   }' | jq -r '.token')
 * 
 * 3. 获取当前用户信息
 * curl http://localhost:8787/api/auth/me \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * 4. 获取所有学生（需要 viewer 权限）
 * curl http://localhost:8787/api/students \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * 5. 按班级查询学生
 * curl http://localhost:8787/api/students/class/J1A \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * 6. 获取教师列表（需要 admin 权限）
 * curl http://localhost:8787/api/admin/teachers \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * 7. 登出
 * curl -X POST http://localhost:8787/api/auth/logout \
 *   -H "Authorization: Bearer $TOKEN"
 * 
 * 8. 权限测试：尝试用 teacher 权限访问 admin 端点
 * TOKEN2=$(curl -s -X POST http://localhost:8787/api/auth/login \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "teacherId":"T002",
 *     "teacherName":"Jane Doe",
 *     "permission":"teacher"
 *   }' | jq -r '.token')
 * 
 * curl http://localhost:8787/api/admin/teachers \
 *   -H "Authorization: Bearer $TOKEN2"
 * # 预期返回 403 Forbidden
 */

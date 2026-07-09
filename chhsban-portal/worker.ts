interface Env {
  AUTH_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
}

// CORS 響應頭
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// 主 fetch handler
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 處理 CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 健康檢查
    if (pathname === '/health' && request.method === 'GET') {
      return new Response(
        JSON.stringify({ status: 'ok' }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // POST /api/auth/auto-login
    if (pathname === '/api/auth/auto-login' && request.method === 'POST') {
      return handleAutoLogin(request, env);
    }

    // GET /api/auth/verify
    if (pathname === '/api/auth/verify' && request.method === 'GET') {
      return handleVerify(request, env);
    }

    // POST /api/auth/logout
    if (pathname === '/api/auth/logout' && request.method === 'POST') {
      return handleLogout(request, env);
    }

    // 404
    return new Response(
      JSON.stringify({ error: 'Not Found' }),
      { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  },
};

// ==================== API 處理函數 ====================

async function handleAutoLogin(request: Request, env: Env): Promise<Response> {
  try {
    const { email } = await request.json() as { email: string };

    if (!email) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少 email 參數' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const teacherKey = `teacher:${email}`;
    const teacherData = await env.TEACHER_KV.get(teacherKey, 'json');

    if (!teacherData) {
      return new Response(
        JSON.stringify({ success: false, error: '教師信息未找到' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const tokenString = `${email}:${Date.now()}`;
    const token = btoa(tokenString);

    const sessionData = {
      email,
      teacherId: teacherData.teacherId || email,
      teacherName: teacherData.teacherName || email.split('@')[0],
      permission: teacherData.permission || 'teacher',
      department: teacherData.department || '',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    await env.AUTH_KV.put(
      `session:${token}`,
      JSON.stringify(sessionData),
      { expirationTtl: 24 * 60 * 60 }
    );

    return new Response(
      JSON.stringify({
        success: true,
        token,
        permission: sessionData.permission,
        redirectUrl: '/dashboard',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Auto-login error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '登入失敗：' + (error instanceof Error ? error.message : '未知錯誤'),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少有效的 Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    const sessionData = await env.AUTH_KV.get(`session:${token}`, 'json');

    if (!sessionData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token 無效或已過期' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          teacherId: sessionData.teacherId,
          teacherName: sessionData.teacherName,
          email: sessionData.email,
          permission: sessionData.permission,
          department: sessionData.department,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Verify error:', error);
    return new Response(
      JSON.stringify({ success: false, error: '驗證失敗' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少有效的 Authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.substring(7);
    await env.AUTH_KV.delete(`session:${token}`);

    return new Response(
      JSON.stringify({ success: true, message: '已成功登出' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({ success: false, error: '登出失敗' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}


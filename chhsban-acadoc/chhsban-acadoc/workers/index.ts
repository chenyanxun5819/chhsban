/**
 * Cloudflare Worker
 * Google Sheets 数据 API + Tution Portal 认证
 */

interface Env {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_API_KEY: string;
  CACHE: KVNamespace;
  TEACHER_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // 设置 CORS 头
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 preflight 请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 認證路由 - POST /auth/verify (Tution Portal 用)
      if (path === '/auth/verify' && request.method === 'POST') {
        return await handleVerifyTeacher(request, env, corsHeaders);
      }

      // 路由处理
      if (path.startsWith('/api/sheets/')) {
        const parts = path.split('/');
        const sheetName = parts[3];
        const rowId = parts[4];

        switch (request.method) {
          case 'GET':
            return await handleGetSheet(sheetName, env, corsHeaders);
          case 'POST':
            return await handlePostSheet(sheetName, request, env, corsHeaders);
          case 'PUT':
            return await handlePutSheet(sheetName, rowId, request, env, corsHeaders);
          default:
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};

/**
 * 驗證教師 Email 並返回認證 token
 * 
 * POST /auth/verify
 * 請求體: { email: "teacher@chhsban.edu.my" }
 * 成功回應 (200): { token, teacher_id, teacher_name, permission, email }
 * 錯誤回應 (401): { error: "Email not found in TEACHER_KV" }
 */
async function handleVerifyTeacher(
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  try {
    const { email } = await request.json() as { email?: string };

    // 驗證 email 參數
    if (!email || typeof email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email 為必填項且必須是字符串' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // 標準化 email (小寫)
    const normalizedEmail = email.toLowerCase().trim();

    // 在 TEACHER_KV 中查詢
    // 支持多種 key 格式
    let teacherData: any = await env.TEACHER_KV.get(`teacher:${normalizedEmail}`, 'json');
    
    if (!teacherData) {
      teacherData = await env.TEACHER_KV.get(`teacher_by_email:${normalizedEmail}`, 'json');
    }

    // 如果仍未找到，則返回 401
    if (!teacherData) {
      return new Response(
        JSON.stringify({ 
          error: 'Email 未在系統中註冊',
          details: `Email: ${normalizedEmail}`
        }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // 生成簡單的 JWT token
    // 注意: 生產環境應使用密鑰簽名
    const token = generateSimpleJWT({
      teacher_id: teacherData.teacher_id,
      email: normalizedEmail,
      permission: teacherData.permission || 'teacher',
    });

    // 返回認證信息
    return new Response(
      JSON.stringify({
        token,
        teacher_id: teacherData.teacher_id,
        teacher_name: teacherData.teacher_name || teacherData.name || '未命名',
        permission: teacherData.permission || 'teacher',
        email: normalizedEmail,
      }),
      { status: 200, headers: { ...headers, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Auth verify error:', error);
    return new Response(
      JSON.stringify({ 
        error: '驗證失敗',
        details: error.message 
      }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 生成簡單的 JWT token
 * 生產環境應使用密鑰簽名和安全的實現
 */
function generateSimpleJWT(payload: any): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 小時後過期
  };

  // Base64 編碼 (注意: 這不是真正的簽名)
  const headerB64 = btoa(JSON.stringify(header));
  const bodyB64 = btoa(JSON.stringify(body));
  const signature = btoa('placeholder-signature');

  return `${headerB64}.${bodyB64}.${signature}`;
}

async function handleGetSheet(
  sheetName: string,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  // TODO: 实现获取 Google Sheets 数据
  return new Response(
    JSON.stringify({ message: 'GET sheet endpoint' }),
    { headers }
  );
}

async function handlePostSheet(
  sheetName: string,
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  // TODO: 实现添加行到 Google Sheets
  const data = await request.json();
  return new Response(
    JSON.stringify({ message: 'POST sheet endpoint', data }),
    { headers }
  );
}

async function handlePutSheet(
  sheetName: string,
  rowId: string,
  request: Request,
  env: Env,
  headers: Record<string, string>
): Promise<Response> {
  // TODO: 实现更新 Google Sheets 的行
  const data = await request.json();
  return new Response(
    JSON.stringify({ message: 'PUT sheet endpoint', rowId, data }),
    { headers }
  );
}

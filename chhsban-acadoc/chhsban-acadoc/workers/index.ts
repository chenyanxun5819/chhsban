/**
 * Cloudflare Worker
 * Google Sheets 数据 API + Tution Portal 认证
 */

interface Env {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_API_KEY: string;
  CACHE: KVNamespace;
  teachers_KV: KVNamespace;
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

    // 在 teachers_KV 中查詢
    // 方式 1: 嘗試按 email 直接查詢 (如果有的話)
    let teacherData: any = await env.teachers_KV.get(`teacher:${normalizedEmail}`, 'json');
    
    // 方式 2: 嘗試按 teacher_by_email 反向索引查詢
    if (!teacherData) {
      const teacherId = await env.teachers_KV.get(`teacher_by_email:${normalizedEmail}`, 'text');
      if (teacherId) {
        teacherData = await env.teachers_KV.get(`teacher:${teacherId}`, 'json');
      }
    }

    // 方式 3: 如果都失敗，嘗試通過 google_email 查詢
    if (!teacherData) {
      // 掃描所有 teacher:* 鍵以查找匹配的 google_email
      const listResult = await env.teachers_KV.list({ prefix: 'teacher:' });
      for (const key of listResult.keys) {
        const data: any = await env.teachers_KV.get(key.name, 'json');
        if (data?.google_email && data.google_email.toLowerCase() === normalizedEmail) {
          teacherData = data;
          break;
        }
      }
    }

    // 方式 4: 如果都失敗，返回 401 並提示需要建立反向索引
    if (!teacherData) {
      return new Response(
        JSON.stringify({ 
          error: 'Email 未在系統中註冊',
          details: `需要在 KV 中建立教師記錄或添加 google_email 字段`,
          suggestion: `請在 teachers_KV 中添加: teacher_by_email:${normalizedEmail} = "teacher_id" 或在 TeacherRecord 中設置 google_email 字段`
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
        teacher_name: teacherData.name_cn || teacherData.teacher_name || teacherData.name || '未命名',
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

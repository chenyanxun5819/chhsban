/**
 * Cloudflare Worker
 * Google Sheets 数据 API
 */

interface Env {
  GOOGLE_SHEETS_ID: string;
  GOOGLE_API_KEY: string;
  CACHE: KVNamespace;
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

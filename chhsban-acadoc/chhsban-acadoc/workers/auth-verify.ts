/**
 * Tution Portal OAuth 認證端點
 * 
 * 用途: 驗證教師 Email 並返回認證 token
 * 端點: POST /auth/verify
 * 
 * 請求體:
 * {
 *   "email": "teacher@chhsban.edu.my"
 * }
 * 
 * 回應成功 (200):
 * {
 *   "token": "jwt_token_here",
 *   "teacher_id": "T001",
 *   "teacher_name": "王老師",
 *   "permission": "teacher|viewer|admin|super_admin",
 *   "email": "teacher@chhsban.edu.my"
 * }
 * 
 * 回應錯誤 (401):
 * {
 *   "error": "Email not found in TEACHER_KV"
 * }
 */

import { Router } from 'itty-router';
import { json } from 'itty-router';

const router = Router();

interface WorkerEnv {
  TEACHER_KV: KVNamespace;
  JWT_SECRET?: string;
}

// 簡單 JWT 生成函數 (需要 crypto)
async function generateToken(teacherId: string, email: string, env: WorkerEnv): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: teacherId,
    email: email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 小時過期
  }));
  
  // 簽名部分 (簡化版本，實際應使用 crypto.subtle)
  const signature = btoa('placeholder');
  
  return `${header}.${payload}.${signature}`;
}

// GET /auth/verify - 驗證教師 Email
router.post('/auth/verify', async (request: Request, env: WorkerEnv) => {
  try {
    const body = await request.json() as { email: string };
    const { email } = body;

    if (!email) {
      return json({ error: 'Email 為必填項' }, { status: 400 });
    }

    // 在 TEACHER_KV 中查詢 Email
    const teacherKey = `teacher:${email.toLowerCase()}`;
    const teacherData = await env.TEACHER_KV.get(teacherKey, 'json') as any;

    if (!teacherData) {
      // 如果直接查找失敗，嘗試掃描 TEACHER_KV (不推薦用於生產)
      return json(
        { error: 'Email 未在系統中註冊' },
        { status: 401 }
      );
    }

    // 生成 JWT Token
    const token = await generateToken(teacherData.teacher_id, email, env);

    return json({
      token,
      teacher_id: teacherData.teacher_id,
      teacher_name: teacherData.teacher_name,
      permission: teacherData.permission || 'teacher',
      email: email,
    }, { status: 200 });

  } catch (error: any) {
    return json(
      { error: '驗證失敗: ' + error.message },
      { status: 500 }
    );
  }
});

// 導出路由
export default {
  fetch: router.handle,
};

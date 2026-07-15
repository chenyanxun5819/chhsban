/**
 * 教師 Email 驗證模塊
 * 用於驗證教師 Email 並生成認證 token
 * 
 * 此模塊是所有 CHHSBAN 項目的共用認證服務
 */

/**
 * 教師信息接口
 */
export interface TeacherInfo {
  teacher_id: string;
  teacher_name: string;
  email: string;
  permission: 'teacher' | 'viewer' | 'admin' | 'super_admin';
  department?: string;
  phone?: string;
}

/**
 * 驗證響應接口
 */
export interface AuthVerifyResponse {
  token: string;
  teacher_id: string;
  teacher_name: string;
  permission: 'teacher' | 'viewer' | 'admin' | 'super_admin';
  email: string;
}

/**
 * 驗證教師 Email 並生成 token
 * @param email 教師 Email
 * @param teacherKV TEACHER_KV 命名空間
 * @returns 認證信息或 null
 */
export async function verifyTeacherEmail(
  email: string,
  teacherKV: KVNamespace
): Promise<AuthVerifyResponse | null> {
  if (!email || typeof email !== 'string') {
    throw new Error('Email 為必填項且必須是字符串');
  }

  // 標準化 email (小寫)
  const normalizedEmail = email.toLowerCase().trim();

  // 在 TEACHER_KV 中查詢
  // 支持多種 key 格式:
  let teacherData: TeacherInfo | null = null;

  // 嘗試格式 1: teacher:{email}
  teacherData = await teacherKV.get(`teacher:${normalizedEmail}`, 'json');

  // 嘗試格式 2: teacher_by_email:{email}
  if (!teacherData) {
    teacherData = await teacherKV.get(`teacher_by_email:${normalizedEmail}`, 'json');
  }

  // 嘗試格式 3: email 的雜湊 (如果有的話)
  if (!teacherData) {
    // 你可以在這裡添加更多的查詢格式
  }

  if (!teacherData) {
    return null;
  }

  // 生成 JWT token
  const token = generateJWT({
    teacher_id: teacherData.teacher_id,
    email: normalizedEmail,
    permission: teacherData.permission || 'teacher',
  });

  return {
    token,
    teacher_id: teacherData.teacher_id,
    teacher_name: teacherData.teacher_name || '未命名',
    permission: teacherData.permission || 'teacher',
    email: normalizedEmail,
  };
}

/**
 * 生成 JWT token
 * 注意: 這是一個演示實現。生產環境應使用密鑰簽名
 * 
 * @param payload token 負載
 * @param secret 簽名密鑰 (可選)
 * @returns JWT token
 */
export function generateJWT(payload: Record<string, any>, secret?: string): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const body = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 小時後過期
  };

  // Base64 編碼 (注意: 這不是真正的簽名,僅用於演示)
  const headerB64 = btoa(JSON.stringify(header));
  const bodyB64 = btoa(JSON.stringify(body));
  
  // 簽名部分 - 生產環境應使用密鑰
  const signatureData = `${headerB64}.${bodyB64}`;
  const signature = btoa(secret ? `${signatureData}.${secret}` : 'placeholder-signature');

  return `${headerB64}.${bodyB64}.${signature}`;
}

/**
 * 驗證 JWT token 的有效性
 * 注意: 這只驗證格式,不驗證簽名 (需要實現真正的簽名驗證)
 * 
 * @param token JWT token
 * @returns 是否有效
 */
export function isValidJWT(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // 嘗試解碼負載
    const payload = JSON.parse(atob(parts[1]));
    
    // 檢查是否過期
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 從 JWT token 中提取負載 (不驗證簽名)
 * 
 * @param token JWT token
 * @returns 負載信息或 null
 */
export function decodeJWT(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    return JSON.parse(atob(parts[1]));
  } catch (error) {
    return null;
  }
}

/**
 * CORS 響應頭配置
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

/**
 * 建立 JSON 响应
 */
export function jsonResponse(
  data: Record<string, any>,
  status: number = 200,
  headers?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, ...headers },
  });
}

/**
 * 建立錯誤响應
 */
export function errorResponse(
  error: string,
  status: number = 500,
  details?: string,
  headers?: Record<string, string>
): Response {
  return jsonResponse(
    {
      error,
      ...(details && { details }),
    },
    status,
    headers
  );
}

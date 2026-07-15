# Tution Portal 後端 API 實現指南

**日期**: 2026-07-10  
**目標**: 實現 `POST /auth/verify` 端點以支持 Tution Portal 登入系統

---

## 🎯 快速概覽

Tution Portal 需要一個後端 API 來驗證教師 Email 並返回認證 token。

| 項目 | 詳情 |
|------|------|
| 方法 | POST |
| 端點 | `/auth/verify` |
| 請求 | `{email: "teacher@chhsban.edu.my"}` |
| 回應成功 | `{token, teacher_id, teacher_name, permission, email}` |
| 回應失敗 | 401 Unauthorized |
| 部署位置 | Cloudflare Workers (`tution-system.workers.dev`) |

---

## 📍 有三種實現方式

### 方式 1: 在 chhsban-acadoc Worker 中添加 (推薦) ⭐

**優點**: 
- 重用現有 TEACHER_KV
- 簡化部署
- 便於維護

**步驟**:

#### 1.1 更新 chhsban-acadoc 的 wrangler.toml

確保 TEACHER_KV 已綁定：

```toml
# d:\chhsban\chhsban-acadoc\wrangler.toml

[[kv_namespaces]]
binding = "TEACHER_KV"
id = "your_teacher_kv_id"
```

#### 1.2 在 workers/index.ts 中添加認證路由

```typescript
import { Router } from 'itty-router';

const router = Router();

// ✅ 認證端點 - 驗證教師 Email
router.post('/auth/verify', async (request: Request, env: WorkerEnv) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email 為必填項' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 在 TEACHER_KV 中查詢 Email
    const teacherKey = `teacher:${email.toLowerCase()}`;
    const teacherData = await env.TEACHER_KV.get(teacherKey, 'json');

    if (!teacherData) {
      return new Response(
        JSON.stringify({ error: 'Email 未在系統中註冊' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 生成 JWT Token (簡化版本，實際應使用 crypto.subtle)
    const token = generateJWT(teacherData.teacher_id, email);

    return new Response(
      JSON.stringify({
        token,
        teacher_id: teacherData.teacher_id,
        teacher_name: teacherData.teacher_name,
        permission: teacherData.permission || 'teacher',
        email: email,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '驗證失敗' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

// 導出
export default {
  fetch: router.handle,
};
```

#### 1.3 部署到 Cloudflare Workers

```bash
# 在 d:\chhsban\chhsban-acadoc 目錄
npm run deploy
```

---

### 方式 2: 建立獨立 Tution Worker 專案

**優點**: 
- 模塊化設計
- 獨立部署
- 便於擴展

**步驟**:

#### 2.1 建立新 Worker 專案

```bash
cd d:\chhsban
npm create cloudflare@latest tution-system-worker -- --typescript
cd tution-system-worker
```

#### 2.2 配置 wrangler.toml

```toml
name = "tution-system"
type = "javascript"
account_id = "your_account_id"
workers_dev = true
main = "src/index.ts"

[[kv_namespaces]]
binding = "TEACHER_KV"
id = "your_teacher_kv_id"
preview_id = "your_preview_kv_id"

routes = [
  { pattern = "tution-system.workers.dev/*", zone_name = "workers.dev" }
]
```

#### 2.3 實現 src/index.ts

```typescript
interface WorkerEnv {
  TEACHER_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    // CORS 頭
    const headers = {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // 處理 OPTIONS 請求 (CORS prefligh)
    if (request.method === 'OPTIONS') {
      return new Response('OK', { status: 200, headers });
    }

    // POST /auth/verify
    if (request.method === 'POST' && url.pathname === '/auth/verify') {
      try {
        const { email } = await request.json();

        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email 為必填項' }),
            { status: 400, headers }
          );
        }

        // 查詢 TEACHER_KV
        const teacherData = await env.TEACHER_KV.get(
          `teacher:${email.toLowerCase()}`,
          'json'
        );

        if (!teacherData) {
          return new Response(
            JSON.stringify({ error: 'Email 未在系統中註冊' }),
            { status: 401, headers }
          );
        }

        // 生成 Token
        const token = generateToken(teacherData);

        return new Response(
          JSON.stringify({
            token,
            teacher_id: teacherData.teacher_id,
            teacher_name: teacherData.teacher_name,
            permission: teacherData.permission || 'teacher',
            email,
          }),
          { status: 200, headers }
        );

      } catch (error) {
        return new Response(
          JSON.stringify({ error: '處理請求失敗' }),
          { status: 500, headers }
        );
      }
    }

    return new Response('Not Found', { status: 404, headers });
  },
};

function generateToken(teacher: any): string {
  // 簡單 token 生成 (實際應使用密鑰簽名)
  const payload = {
    teacherId: teacher.teacher_id,
    iat: Date.now(),
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  return btoa(JSON.stringify(payload));
}
```

#### 2.4 部署

```bash
npm run deploy
# 訪問: https://tution-system.workers.dev/auth/verify
```

---

### 方式 3: 在 tution-portal 的 Pages Function 中實現

**優點**: 
- 與前端在同一專案
- 無需額外部署

**步驟**:

#### 3.1 建立 function 文件

```bash
mkdir -p d:\chhsban\tution-portal\functions\auth
```

#### 3.2 建立 functions/auth/verify.ts

```typescript
export async function onRequest(context) {
  const { request, env } = context;
  
  if (request.method === 'POST') {
    const { email } = await request.json();
    
    // 查詢 TEACHER_KV
    const teacher = await env.TEACHER_KV.get(
      `teacher:${email.toLowerCase()}`,
      'json'
    );
    
    if (!teacher) {
      return new Response(
        JSON.stringify({ error: 'Email 未在系統中註冊' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({
        token: 'jwt_token',
        teacher_id: teacher.teacher_id,
        teacher_name: teacher.teacher_name,
        permission: teacher.permission,
        email,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  return new Response('Method Not Allowed', { status: 405 });
}
```

---

## 🔑 TEACHER_KV 數據結構

確保 TEACHER_KV 中的數據格式：

```json
{
  "teacher:teacher@chhsban.edu.my": {
    "teacher_id": "T001",
    "teacher_name": "王小明",
    "email": "teacher@chhsban.edu.my",
    "permission": "teacher",
    "department": "中文部",
    "phone": "0123456789"
  },
  "teacher:admin@chhsban.edu.my": {
    "teacher_id": "T002",
    "teacher_name": "李管理",
    "email": "admin@chhsban.edu.my",
    "permission": "admin",
    "department": "管理部",
    "phone": "0198765432"
  }
}
```

**Key 命名規則**: `teacher:{email_lowercase}`

---

## 🚀 測試 API

### 使用 curl 測試

```bash
# 本地開發
curl -X POST http://localhost:8787/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@chhsban.edu.my"}'

# 生產環境
curl -X POST https://tution-system.workers.dev/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@chhsban.edu.my"}'
```

### 預期回應

**成功 (200)**:
```json
{
  "token": "eyJhbGc...",
  "teacher_id": "T001",
  "teacher_name": "王老師",
  "permission": "teacher",
  "email": "teacher@chhsban.edu.my"
}
```

**失敗 (401)**:
```json
{
  "error": "Email 未在系統中註冊"
}
```

---

## 📋 實現檢查清單

- [ ] 選擇實現方式 (推薦方式 1)
- [ ] 配置 TEACHER_KV 綁定
- [ ] 實現 POST /auth/verify 端點
- [ ] 測試 API 回應
- [ ] 部署到生產環境
- [ ] 更新 .env 文件中的 VITE_API_BASE_URL
- [ ] 在 tution-portal 中測試登入流程

---

## 🎓 下一步

1. **選擇方式 1** (在 chhsban-acadoc 中添加)
2. **實現端點代碼**
3. **部署**
4. **測試完整登入流程**

---

**預計時間**: 1-2 小時  
**依賴項**: TEACHER_KV 已正確設置 + Google OAuth 已配置

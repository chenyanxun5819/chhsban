# P2 階段 - @chhsban/kv-utils 集成指南

## 概述

此指南展示如何在 CHHSBAN 各項目中集成 `@chhsban/kv-utils` 共用模組，實現統一的認證和數據訪問層。

## 📦 何時使用 kv-utils

### 適用場景

- ✅ **需要會話管理**：創建、驗證和刪除用戶會話
- ✅ **需要權限檢查**：根據用戶權限等級控制對資源的訪問
- ✅ **需要訪問學生/教師數據**：通過統一的 KV 操作層讀寫數據
- ✅ **需要跨項目共用認證邏輯**：在 acadoc、tution、portal 之間保持一致

### 三個權限等級

```
teacher (1) → viewer (2) → admin (3) → super_admin (4)
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
npm install @chhsban/kv-utils
```

### 2. 配置 wrangler.toml

確保你的 `wrangler.toml` 包含以下 KV 綁定：

```toml
[[kv_namespaces]]
binding = "AUTH_KV"
id = "8ddeccbeeae9440fafba384d35205a81"

[[kv_namespaces]]
binding = "STUDENT_KV"
id = "9d870e2344c84c74a1ed2f2851c93408"

[[kv_namespaces]]
binding = "TEACHER_KV"
id = "8892dc8c30984f4591850521a1b57ed8"
```

### 3. 在 Worker 中使用

```typescript
import { createAuthKVManager } from '@chhsban/kv-utils';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    
    // 創建會話
    const session = await authMgr.createSession(
      'T001',
      'John Doe',
      'teacher'
    );
    
    return new Response(JSON.stringify(session));
  }
};
```

## 📋 API 參考

### 認證 (AuthKVManager)

#### 創建會話
```typescript
const session = await authMgr.createSession(
  teacherId: string,
  teacherName: string,
  permission: "teacher" | "viewer" | "admin" | "super_admin",
  redirectUrl?: string
): Promise<SessionToken>
```

#### 驗證會話
```typescript
const sessionData = await authMgr.verifySession(token: string): Promise<AuthSessionData | null>
```

#### 檢查權限
```typescript
// 檢查是否擁有特定權限（支持權限階級）
const hasAccess = await authMgr.hasPermission(token, 'admin'): Promise<boolean>

// 檢查是否為管理員
const isAdmin = await authMgr.isAdmin(token): Promise<boolean>

// 獲取權限等級
const permission = await authMgr.getPermission(token): Promise<Permission | null>
```

#### 刪除會話（登出）
```typescript
await authMgr.deleteSession(token: string): Promise<void>
```

### 學生數據 (StudentKVManager)

```typescript
const studentMgr = createStudentKVManager(env.STUDENT_KV);

// 獲取單個學生
const student = await studentMgr.getStudent(studentId): Promise<StudentRecord | null>

// 按班級查詢
const classStudents = await studentMgr.getStudentsByClass('J1A'): Promise<StudentRecord[]>

// 獲取所有學生
const allStudents = await studentMgr.getAllStudents(): Promise<StudentRecord[]>

// 保存學生數據
await studentMgr.saveStudent(student: StudentRecord): Promise<void>
await studentMgr.saveStudents(students: StudentRecord[]): Promise<void>

// 刪除學生
await studentMgr.deleteStudent(studentId: string): Promise<void>
```

### 教師數據 (TeacherKVManager)

```typescript
const teacherMgr = createTeacherKVManager(env.TEACHER_KV);

// 類似於 StudentKVManager
// getTeacher(), getTeachersByDepartment(), getAdmins(), getAllTeachers()
// saveTeacher(), saveTeachers(), deleteTeacher()
```

## 🔐 Middleware 模式

### 基本認證 Middleware

```typescript
async function authenticate(request, env): Promise<Response | null> {
  const token = extractToken(request);
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const authMgr = createAuthKVManager(env.AUTH_KV);
  const session = await authMgr.verifySession(token);

  if (!session) {
    return new Response('Invalid token', { status: 401 });
  }

  // 將用戶信息附加到請求
  request.user = {
    teacherId: session.teacher_id,
    permission: session.permission,
  };

  return null; // 繼續處理
}
```

### 權限檢查 Middleware

```typescript
async function requirePermission(request, requiredPermission, env) {
  if (!request.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const authMgr = createAuthKVManager(env.AUTH_KV);
  const hasPermission = await authMgr.hasPermission(
    request.token,
    requiredPermission
  );

  if (!hasPermission) {
    return new Response('Forbidden', { status: 403 });
  }

  return null; // 繼續處理
}
```

### 在路由中使用

```typescript
if (pathname === '/api/admin/users') {
  // 應用認證 middleware
  let response = await authenticate(request, env);
  if (response) return response;

  // 應用權限檢查
  response = await requirePermission(request, 'admin', env);
  if (response) return response;

  // 執行受保護的操作
  // ...
}
```

## 📝 使用示例

### 完整的 Worker 範例

見 [`packages/kv-utils/examples/worker-middleware.ts`](../../packages/kv-utils/examples/worker-middleware.ts)

### AcaDoc 集成示例

見 [`chhsban-acadoc/workers/auth-example.ts`](./workers/auth-example.ts)

此文件展示了如何在 AcaDoc 項目中集成完整的認證系統，包括：
- 登錄/登出端點
- 學生和教師數據查詢
- 基於權限的端點保護

## 🧪 測試

### 1. 本地開發測試

```bash
# 啟動 Wrangler 本地開發服務器
wrangler dev

# 在另一個終端運行測試
bash examples/test-middleware.sh
```

### 2. cURL 測試

```bash
# 創建會話
TOKEN=$(curl -s -X POST http://localhost:8787/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "teacherId":"T001",
    "teacherName":"John",
    "permission":"admin"
  }' | jq -r '.token')

# 驗證會話
curl http://localhost:8787/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# 測試權限檢查
curl http://localhost:8787/api/students \
  -H "Authorization: Bearer $TOKEN"
```

## ⚠️ 最佳實踐

### 1. 錯誤處理

```typescript
// ✅ 好的做法
const session = await authMgr.verifySession(token);
if (!session) {
  return new Response('Invalid token', { status: 401 });
}

// ❌ 不好的做法
const session = await authMgr.verifySession(token);
console.log(session.teacher_id); // 可能崩潰！
```

### 2. Token 提取

支持兩種方式：
- Authorization header: `Authorization: Bearer {token}`
- Cookie: `session_token={token}`

```typescript
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/session_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
```

### 3. 性能優化

```typescript
// ❌ 避免：每次都重新創建 manager
async function handleRequest(request, env) {
  const authMgr1 = createAuthKVManager(env.AUTH_KV);
  const authMgr2 = createAuthKVManager(env.AUTH_KV);
  // ...
}

// ✅ 推薦：重複使用同一 instance
async function handleRequest(request, env) {
  const authMgr = createAuthKVManager(env.AUTH_KV);
  
  const session1 = await authMgr.verifySession(token1);
  const session2 = await authMgr.verifySession(token2);
  // ...
}
```

### 4. 會話超時

```typescript
// 默認 24 小時過期
// 要修改，編輯 packages/kv-utils/src/types/index.ts
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000, // ← 修改這裡
  // ...
};
```

## 📚 相關文件

| 文件 | 說明 |
|------|------|
| `packages/kv-utils/README.md` | 完整的 API 文檔 |
| `packages/kv-utils/src/types/index.ts` | 類型定義和常量 |
| `packages/kv-utils/src/auth/index.ts` | 認證實現 |
| `packages/kv-utils/examples/worker-middleware.ts` | 完整的 middleware 示例 |
| `chhsban-acadoc/workers/auth-example.ts` | AcaDoc 的集成示例 |

## 🔄 下一步

### P3 計劃（可選）

- [ ] 添加 JWT 支持
- [ ] 實現會話刷新（refresh tokens）
- [ ] 添加審計日誌
- [ ] 實現單點登錄（SSO）
- [ ] 完整的集成測試套件

## 💡 常見問題

**Q: 如何在不同項目間共用會話？**

A: 所有項目都指向同一個 `AUTH_KV` 命名空間，所以會話自動共用。

**Q: Token 過期後怎樣刷新？**

A: 當前版本不支持刷新令牌。用戶需要重新登錄。（可在 P3 添加）

**Q: 如何自定義過期時間？**

A: 編輯 `packages/kv-utils/src/types/index.ts` 中的 `KV_CONFIG.SESSION_TOKEN_EXPIRE`。

**Q: 權限檢查是否支持自定義邏輯？**

A: 可以！根據 `hasPermission()` 的實現自定義邏輯。

---

**最後更新**: 2026-07-08
**P2 進度**: 認證 middleware 完全集成 ✅

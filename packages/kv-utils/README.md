# @chhsban/kv-utils

共享的 Cloudflare Workers KV 操作库，为 CHHSBAN 项目（acadoc、tution、portal）提供统一的数据访问层。

## 项目结构

```
src/
├── types/
│   └── index.ts          # 类型定义和常量
├── auth/
│   └── index.ts          # 认证会话管理
├── student/
│   └── index.ts          # 学生数据操作
├── teacher/
│   └── index.ts          # 教师数据操作
└── index.ts              # 统一导出
```

## 功能概览

### 1. Auth KV - 认证会话管理（`AuthKVManager`）

处理用户会话的创建、验证和删除。

**关键方法：**
- `createSession(teacherId, teacherName, role)` - 创建新会话
- `verifySession(token)` - 验证会话令牌
- `getTeacherId(token)` - 获取会话中的教师 ID
- `isAdmin(token)` - 检查是否为管理员
- `deleteSession(token)` - 删除会话

**API 方法：**

| 方法 | 説明 | 返回值 |
|------|------|--------|
| `createSession(teacherId, teacherName, permission, redirectUrl?)` | 创建新会话 | `SessionToken` |
| `verifySession(token)` | 验证并获取会话数据 | `AuthSessionData \| null` |
| `deleteSession(token)` | 删除会话 | `void` |
| `getTeacherId(token)` | 获取会话中的教师 ID | `string \| null` |
| `getPermission(token)` | 获取权限等级 | `Permission \| null` |
| `hasPermission(token, requiredPermission)` | 检查是否拥有指定权限 | `boolean` |
| `isAdmin(token)` | 检查是否为 admin 或 super_admin | `boolean` |

**权限层级（从低到高）：**
- `teacher` (1) - 普通教师，可访问自己的数据
- `viewer` (2) - 查看者，可以读取但不能修改
- `admin` (3) - 管理员，可管理部分资源
- `super_admin` (4) - 超级管理员，拥有所有权限

**使用示例：**
```typescript
import { createAuthKVManager } from '@chhsban/kv-utils';

const authMgr = createAuthKVManager(env.AUTH_KV);

// 1. 创建会话
const session = await authMgr.createSession(
  'T001',           // teacherId
  '张三',           // teacherName
  'admin',          // permission
  '/dashboard'      // redirectUrl (可选)
);
console.log(session.token); // 返回会话令牌字符串

// 2. 验证会话
const sessionData = await authMgr.verifySession(token);
if (sessionData) {
  console.log(sessionData.teacher_id);      // "T001"
  console.log(sessionData.permission);      // "admin"
}

// 3. 检查权限
const hasAdminAccess = await authMgr.hasPermission(token, 'admin');
const isAdmin = await authMgr.isAdmin(token);

// 4. 获取权限信息
const permission = await authMgr.getPermission(token); // "admin" | "teacher" | "viewer" | "super_admin" | null

// 5. 删除会话（登出）
await authMgr.deleteSession(token);
```

### 2. Student KV - 学生数据管理（`StudentKVManager`）

管理学生信息的查询和存储。

**关键方法：**
- `getStudent(studentId)` - 获取单个学生
- `getStudentsByClass(className)` - 按班级查询学生
- `getAllStudents()` - 获取所有学生
- `saveStudent(student)` - 保存单个学生
- `saveStudents(students)` - 批量保存学生
- `deleteStudent(studentId)` - 删除学生

**使用示例：**
```typescript
import { createStudentKVManager } from '@chhsban/kv-utils';

const studentMgr = createStudentKVManager(env.STUDENT_KV);

// 获取班级学生
const classStudents = await studentMgr.getStudentsByClass('J1A');

// 保存新学生
await studentMgr.saveStudent({
  student_id: 'S001',
  name_cn: '李明',
  name_en: 'Li Ming',
  class: 'J1A',
  email: 'li.ming@school.edu'
});
```

### 3. Teacher KV - 教师数据管理（`TeacherKVManager`）

管理教师信息的查询和存储。

**关键方法：**
- `getTeacher(teacherId)` - 获取单个教师
- `getTeachersByDepartment(department)` - 按部门查询教师
- `getAdmins()` - 获取所有管理员
- `getAllTeachers()` - 获取所有教师
- `saveTeacher(teacher)` - 保存单个教师
- `saveTeachers(teachers)` - 批量保存教师
- `deleteTeacher(teacherId)` - 删除教师

**使用示例：**
```typescript
import { createTeacherKVManager } from '@chhsban/kv-utils';

const teacherMgr = createTeacherKVManager(env.TEACHER_KV);

// 获取部门教师
const deptTeachers = await teacherMgr.getTeachersByDepartment('中文系');

// 获取所有管理员
const admins = await teacherMgr.getAdmins();
```

## 数据模型

### SessionToken
```typescript
interface SessionToken {
  token: string;                    // 会话令牌（64 字符十六进制）
  teacherId: string;               // 教师 ID
  teacherName: string;             // 教师名称
  permission: Permission;          // 权限等级
  redirectUrl?: string;            // 登入后的重定向 URL
  expiresAt: number;               // 过期时间戳（毫秒）
  createdAt: number;               // 创建时间戳（毫秒）
}
```

### AuthSessionData
```typescript
interface AuthSessionData {
  teacher_id: string;              // 教师 ID
  teacher_name_cn?: string;        // 中文名
  teacher_name_en?: string;        // 英文名
  permission: Permission;          // 权限等级
  redirect_url?: string;           // 重定向 URL
  expires_at: number;              // 过期时间戳（毫秒）
}
```

### Permission
```typescript
type Permission = "teacher" | "viewer" | "admin" | "super_admin";
```

### StudentRecord
```typescript
interface StudentRecord {
  student_id: string;              // 学生 ID
  name_cn: string;                 // 中文名
  name_en: string;                 // 英文名
  class: string;                   // 班级（如 "J1A"）
  email?: string;                  // 邮箱
  phone?: string;                  // 电话
}
```

### TeacherRecord
```typescript
interface TeacherRecord {
  teacher_id: string;              // 教师 ID
  name_cn: string;                 // 中文名
  name_en: string;                 // 英文名
  department: string;              // 部门
  email: string;                   // 邮箱
  phone?: string;                  // 电话
  role: "teacher" | "admin";       // 角色
}
```

## KV 命名空间配置

三个项目需要在 `wrangler.toml` 中配置对应的 KV 绑定：

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

## Worker 中的 Middleware 集成

> 完整的 middleware 示例見：[`examples/worker-middleware.ts`](./examples/worker-middleware.ts)

### 基础认证 Middleware（推荐模式）

```typescript
import { createAuthKVManager } from '@chhsban/kv-utils';

// 定义 Worker 请求上下文
interface WorkerEnv {
  AUTH_KV: KVNamespace;
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
}

interface RequestContext extends Request {
  user?: {
    teacherId: string;
    permission: string;
    expiresAt: number;
  };
}

// Middleware：验证会话
async function authMiddleware(
  request: Request,
  env: WorkerEnv
): Promise<RequestContext | Response> {
  // 从 Cookie 或 Authorization 头获取 token
  const token = extractToken(request);
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 });
  }

  const authMgr = createAuthKVManager(env.AUTH_KV);
  const session = await authMgr.verifySession(token);

  if (!session) {
    return new Response('Invalid or expired token', { status: 401 });
  }

  // 将用户信息注入到 request context
  (request as RequestContext).user = {
    teacherId: session.teacher_id,
    permission: session.permission,
    expiresAt: session.expires_at,
  };

  return request as RequestContext;
}

// 辅助函数：提取 token
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // 或从 Cookie 中提取
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/session_token=([^;]+)/);
  return match?.[1] || null;
}

// 辅助函数：权限检查
async function requirePermission(
  context: RequestContext,
  requiredPermission: string,
  env: WorkerEnv
): Promise<boolean> {
  if (!context.user) return false;

  const authMgr = createAuthKVManager(env.AUTH_KV);
  return await authMgr.hasPermission(
    extractToken(context as any), // 需要保留原始 token
    requiredPermission as any
  );
}
```

### 完整的 Worker 处理示例

```typescript
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    // 应用认证 middleware
    const authResult = await authMiddleware(request, env);
    if (authResult instanceof Response) {
      return authResult; // 返回错误响应
    }

    const context = authResult as RequestContext;
    const url = new URL(request.url);

    // 路由处理
    if (url.pathname === '/api/dashboard' && request.method === 'GET') {
      if (!context.user) {
        return new Response('Unauthorized', { status: 401 });
      }

      const studentMgr = createStudentKVManager(env.STUDENT_KV);
      const students = await studentMgr.getAllStudents();

      return new Response(JSON.stringify({
        user: context.user,
        students,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 管理员操作
    if (url.pathname === '/api/admin/users' && request.method === 'POST') {
      const hasAccess = await requirePermission(context, 'admin', env);
      if (!hasAccess) {
        return new Response('Forbidden', { status: 403 });
      }

      // 执行管理员操作...
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
```

## 在项目中集成

### 方案 A：npm 依赖（推荐 monorepo）

```bash
npm install @chhsban/kv-utils
```

### 方案 B：本地路径引用

在 `package.json` 中：
```json
{
  "dependencies": {
    "@chhsban/kv-utils": "file:../../packages/kv-utils"
  }
}
```

## 常量 - KV_CONFIG

```typescript
export const KV_CONFIG = {
  SESSION_TOKEN_EXPIRE: 24 * 60 * 60 * 1000,  // 24 小时
  SESSION_PREFIX: "session:",                  // session 前缀
  STUDENT_PREFIX: "student:",                  // student 前缀
  TEACHER_PREFIX: "teacher:",                  // teacher 前缀
};
```

## 构建和开发

```bash
# 安装依赖
npm install

# 开发模式（监视编译）
npm run dev

# 构建
npm run build
```

## 注意事项

### 1. 会话管理
- **默认过期时间**：24 小时（可通过 `KV_CONFIG.SESSION_TOKEN_EXPIRE` 修改）
- **自动过期**：Cloudflare KV 会自动删除已过期的 session（TTL 设置）
- **手动登出**：调用 `deleteSession(token)` 立即删除会话

### 2. 键名前缀和冲突避免
```typescript
// 各类型数据的键名格式
// session: "session:{token}"
// student: "student:{studentId}"
// teacher: "teacher:{teacherId}"
```
确保不同类型数据使用不同前缀，避免键值冲突。

### 3. 性能优化建议
- `getStudentsByClass()` 和 `getTeachersByDepartment()` 使用 KV list API，大数据集可能较慢
- 考虑后期添加索引或缓存层优化查询性能
- 避免在高并发场景频繁调用 `getAllStudents()` 或 `getAllTeachers()`

### 4. 错误处理最佳实践
```typescript
// ✅ 推荐做法
const session = await authMgr.verifySession(token);
if (!session) {
  // 处理无效或过期的 token
  return new Response('Invalid token', { status: 401 });
}

// ❌ 避免
const session = await authMgr.verifySession(token);
console.log(session.teacher_id); // 如果 session 为 null，会崩溃

// ✅ 权限检查的安全做法
const hasPermission = await authMgr.hasPermission(token, 'admin');
if (!hasPermission) {
  return new Response('Insufficient permissions', { status: 403 });
}
```

### 5. 与 Cloudflare 的 `env` 对象集成
```typescript
// Worker handler 中的类型定义
interface Env {
  AUTH_KV: KVNamespace;
  STUDENT_KV: KVNamespace;
  TEACHER_KV: KVNamespace;
  // ... 其他 bindings
}

// 在 handler 中使用
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authMgr = createAuthKVManager(env.AUTH_KV);
    // ...
  },
};
```

## 版本历史

- **0.1.0** - 初始版本，包含 Auth、Student、Teacher 基础操作

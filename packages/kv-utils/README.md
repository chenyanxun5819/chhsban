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

**使用示例：**
```typescript
import { createAuthKVManager } from '@chhsban/kv-utils';

const authMgr = createAuthKVManager(env.AUTH_KV);

// 创建会话
const session = await authMgr.createSession('T001', '张三', 'teacher');
console.log(session.token); // 返回会话令牌

// 验证会话
const sessionData = await authMgr.verifySession(token);
if (sessionData) {
  console.log(sessionData.teacher_id); // T001
}
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
  token: string;                    // 会话令牌
  teacherId: string;               // 教师 ID
  teacherName: string;             // 教师名称
  role: "teacher" | "admin";       // 角色
  expiresAt: number;               // 过期时间戳
  createdAt: number;               // 创建时间戳
}
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

1. **会话过期时间**：默认为 24 小时，可通过 `KV_CONFIG.SESSION_TOKEN_EXPIRE` 修改
2. **KV 键名前缀**：确保不同类型的数据使用不同前缀以避免冲突
3. **性能优化**：`getStudentsByClass` 和 `getTeachersByDepartment` 使用 KV list API，大量数据时可能较慢，后期可考虑索引优化
4. **错误处理**：所有方法返回 null 表示数据不存在或查询失败，建议在调用方添加适当的错误处理

## 版本历史

- **0.1.0** - 初始版本，包含 Auth、Student、Teacher 基础操作

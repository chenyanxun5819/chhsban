# Tution Portal 学生查询 API 修复

## 问题诊断

### 错误现象
1. GET 请求到 `https://tution-system.astwcs.workers.dev/api/v1/students/{id}` 返回 404
2. CORS 策略错误：No 'Access-Control-Allow-Origin' header
3. 学生验证失败：Failed to validate student 23007

### 根本原因
- `/api/v1/students/{studentId}` 端点**未在 chhsban-tution 的 index.ts 中实现**
- 前端 classService.ts 调用了不存在的 API 端点
- 虽然 STUDENT_KV (ID: 9d870e2344c84c74a1ed2f2851c93408) 中有学生数据，但没有 API 接口来访问

## 解决方案已实施

### 1️⃣ 添加学生查询 API 端点

**文件**: [d:\chhsban\chhsban-tution\src\index.ts](d:\chhsban\chhsban-tution\src\index.ts)

#### 导入更新
```typescript
import { 
  createAuthKVManager, 
  createTeacherKVManager, 
  createStudentKVManager  // ✅ 新增
} from "@chhsban/kv-utils";
```

#### 路由添加
```typescript
if (pathname.startsWith("/api/v1/students")) {
  return handleStudents(request, env, session);
}
```

#### 端点实现
```typescript
async function handleStudents(
  request: Request,
  env: Env,
  session: any,
): Promise<Response>
```

**功能**:
- GET /api/v1/students/{studentId} - 查询单个学生
- 从 STUDENT_KV 中获取学生信息
- 返回 StudentRecord (包含: student_id, name_cn, name_en, class, email, phone)
- 包含完整的 CORS 头支持
- 错误处理：404 (学生不存在)、400 (缺少 ID)、500 (服务器错误)

### 2️⃣ 数据流说明

```
用户上传 CSV/XLSX 
    ↓
parseCSV() / parseXLSX() 提取学号
    ↓
validateStudents(studentIds) 调用 API
    ↓
GET /api/v1/students/{studentId}
    ↓
handleStudents() 查询 STUDENT_KV
    ↓
返回 StudentRecord
    ↓
成功/失败列表
```

## 修改清单

- [x] 导入 createStudentKVManager
- [x] 添加路由处理
- [x] 实现 handleStudents 函数
- [x] CORS 头支持
- [x] 错误处理

## 部署步骤

在 d:\chhsban\chhsban-tution 目录执行:

```bash
# 构建
npm run build

# 发布到生产环境
wrangler deploy --env production
```

## 测试验证

### 测试 API 端点
```bash
curl -H "Authorization: Bearer <TOKEN>" \
  https://tution-system.astcws.workers.dev/api/v1/students/23007
```

### 预期响应
```json
{
  "success": true,
  "data": {
    "student_id": "23007",
    "name_cn": "学生名字",
    "name_en": "Student Name",
    "class": "J1A",
    "email": "student@example.com",
    "phone": "1234567890"
  }
}
```

### 错误响应
```json
{
  "error": "Student not found"
}
```

## 相关文件
- [classService.ts](d:\chhsban\tution-portal\src\services\classService.ts) - 前端 API 调用
- [validators.ts](d:\chhsban\tution-portal\src\utils\validators.ts) - CSV/XLSX 解析
- [ApplicationForm.tsx](d:\chhsban\tution-portal\src\pages\ApplicationManagement\ApplicationForm.tsx) - UI 表单

## 备注
- STUDENT_KV 中学号作为 key (带前缀 "student:")
- StudentKVManager 提供便捷的查询接口
- API 支持完整的 CORS 跨域访问

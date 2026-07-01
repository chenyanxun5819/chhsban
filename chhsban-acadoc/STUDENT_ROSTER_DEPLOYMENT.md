# 学生信息查询系统 - 部署指南

## 项目概述

这是一个简单的学生信息查询系统，包含：
- **前端**：React + TypeScript，提供学号查询界面
- **后端**：Cloudflare Worker，从 KV 存储查询学生数据
- **数据源**：每周一、三自动从 SMS 系统同步学生数据到 Cloudflare KV

## 本地开发

### 1. 启动 Worker 开发服务器

在一个终端窗口中运行：

```bash
npm run worker:dev
```

这将在 `http://localhost:8787` 启动 Worker。

### 2. 启动前端开发服务器

在另一个终端窗口中运行：

```bash
npm run dev
```

这将在 `http://localhost:5173` 启动前端，并自动代理 `/api` 请求到 Worker。

### 3. 测试查询功能

打开浏览器访问 `http://localhost:5173`，在输入框中输入学号（例如：J1A001）并点击查询按钮。

## 生产部署

### 前置条件

- 已配置 `wrangler` CLI 并登录到 Cloudflare 账户
- 已配置 Cloudflare KV 存储，并且数据已通过 SMS 同步流程上传

### 部署步骤

#### 第 1 步：部署 Worker

```bash
npm run worker:deploy
```

这将部署更新后的 Worker 代码，包含新的 `/api/student/:student_no` 查询端点。

#### 第 2 步：构建前端

```bash
npm run build
```

这将在 `dist/` 目录生成优化后的前端代码。

#### 第 3 步：上传到 Cloudflare Pages

方式选择（二选一）：

**选项 A：使用 Git（推荐）**

1. 将代码推送到 GitHub/GitLab/Gitbucket
2. 在 Cloudflare Dashboard 中连接 Pages 项目
3. 配置构建设置：
   - **框架预设**：Vite
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`

**选项 B：手动上传**

1. 使用 `wrangler pages` CLI 手动部署 `dist/` 目录：
   ```bash
   npx wrangler pages deploy dist/
   ```

#### 第 4 步：配置 Pages 与 Worker 的路由

在 `wrangler.toml` 中添加 Pages 配置（如果还未配置）：

```toml
# Pages 绑定
[env.production.routes]
# API 路由由 Worker 处理
pattern = "*/api/*"
zone_name = "your-domain.com"

# 其他路由由 Pages 处理
pattern = "*"
zone_name = "your-domain.com"
```

或在 Cloudflare Dashboard 中配置路由规则。

## API 接口

### 查询单个学生

**请求**
```
GET /api/student/{student_no}
```

**参数**
- `student_no` (URL 路径参数)：学号，例如 `J1A001`

**成功响应**（200）
```json
{
  "success": true,
  "data": {
    "student_no": "J1A001",
    "student_id": "12345",
    "name_en": "John Doe",
    "name_cn": "张三",
    "real_class_name": "J1A",
    "gender_boarding": "M/Day",
    "...": "其他字段"
  }
}
```

**失败响应**（404）
```json
{
  "success": false,
  "error": "未找到学号为 \"J1A001\" 的学生"
}
```

**错误响应**（500）
```json
{
  "success": false,
  "error": "查询出错: 错误信息"
}
```

## 故障排查

### 前端无法连接到 Worker

**开发环境**
- 确保 Worker 开发服务器在 `http://localhost:8787` 正常运行
- 检查 Vite 代理配置是否正确

**生产环境**
- 确保 Worker 已成功部署
- 检查 Cloudflare Pages 的路由配置是否正确
- 确认 `/api/*` 路由已正确指向 Worker

### 查询返回"暂无学生数据"

- 检查 KV 中是否已存在 `students_by_no` 数据
- 运行 `POST /api` 手动触发同步（需要配置 SMS 凭证）
- 等待下一个定时任务运行（每周一、三）

### 查询返回"未找到学生"

- 确认输入的学号是否正确
- 检查学号是否在 SMS 系统中存在

## 技术栈

- **前端框架**：React 18 + TypeScript
- **打包工具**：Vite
- **部署平台**：Cloudflare Pages + Workers
- **数据存储**：Cloudflare KV
- **后端同步**：Cloudflare Worker Cron 触发器

## 文件结构

```
src/pages/StudentRoster/
├── StudentRoster.tsx      # 主要查询组件
├── StudentRoster.css      # 样式
└── index.ts              # 导出

workers/
└── sms-sync.js           # Worker 脚本（包含 handleGetStudent 函数）
```

## 下一步

可以考虑的改进：
- [ ] 添加高级搜索功能（按班级、姓名等）
- [ ] 导出查询结果为 CSV/Excel
- [ ] 分页显示大量结果
- [ ] 添加缓存以优化性能
- [ ] 实现用户认证和权限管理

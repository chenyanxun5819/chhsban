# 学生信息查询系统 - 快速开始指南

## ✅ 完成的工作

已创建了一个完整的学生信息查询系统：

### 1. **前端页面** (`src/pages/StudentRoster/`)
- `StudentRoster.tsx` - 主查询组件
- `StudentRoster.css` - 样式文件
- `index.ts` - 模块导出

**功能**：
- 输入学号并查询学生信息
- 支持回车键快速查询
- 显示查询结果（学号、学生ID、英文名、中文名、班级、性别宿舍等）
- 错误提示

### 2. **Worker API** (`workers/sms-sync.js`)
- 添加了 `handleGetStudent()` 函数
- 新增 `/api/student/{student_no}` 端点
- 支持从 Cloudflare KV 查询学生数据
- 完整的 CORS 支持

### 3. **构建配置**
- 更新了 `vite.config.ts` 支持开发时代理 API
- 前端构建成功，输出到 `dist/` 目录

---

## 🚀 本地测试（无需部署）

### 启动开发环境

**终端 1 - 启动 Worker：**
```bash
npm run worker:dev
```
输出应该显示：`Ready on http://localhost:8787`

**终端 2 - 启动前端：**
```bash
npm run dev
```
浏览器会自动打开 `http://localhost:5173`

### 测试查询

在前端界面输入学号（如 `J1A001`）并点击查询按钮。

---

## 📤 生产部署（需要您的协助）

### 第 1 步：部署更新的 Worker

```bash
npm run worker:deploy
```

✅ **您可以直接运行** - Worker 代码已更新好

### 第 2 步：上传前端到 Cloudflare Pages

需要您进行以下**其中一种**操作：

#### **方案 A：通过 Git 部署（推荐，自动化）**

1. 将项目代码推送到 GitHub/GitLab/Gitbucket
   ```bash
   git add .
   git commit -m "Add StudentRoster page"
   git push
   ```

2. 在 [Cloudflare Dashboard](https://dash.cloudflare.com/) 创建 Pages 项目：
   - 选择 "Connect to Git"
   - 授权并选择您的仓库
   - 配置如下：
     - **框架预设**：Vite
     - **构建命令**：`npm run build`
     - **构建输出目录**：`dist`
   - 点击部署，后续推送会自动更新

#### **方案 B：手动上传（快速，一次性）**

```bash
npm run build
npx wrangler pages deploy dist/
```

---

## 🔗 Pages 与 Worker 路由配置

为了让前端能访问 Worker API，需要在 Cloudflare 中配置路由。

### 自动方式（使用 `wrangler.toml`）

在 `wrangler.toml` 中添加：

```toml
[env.production]
routes = [
  { pattern = "*/api/*", zone_name = "your-domain.com" }
]
```

然后重新部署 Worker：
```bash
npm run worker:deploy
```

### 手动方式（Dashboard 配置）

1. 打开 Cloudflare Dashboard → 您的域名 → Workers 路由
2. 添加新路由：
   - **路由**：`*/api/*`
   - **Worker**：`student-sync`
   - **区域**：选择您的域名

---

## 📋 需要您提供的信息

为了完成部署，请提供：

1. **Cloudflare 账户信息**
   - 账户 ID：✅ 已有 `82d225cda80f37208228877b32268b26`
   - 您的域名（用于 Pages 和路由配置）

2. **Git 仓库信息**（如果使用方案 A）
   - 仓库 URL
   - 分支名称

3. **确认**
   - KV 存储是否已包含学生数据（通过 SMS 同步）
   - 是否已在 SMS 系统中配置好每周一、三的同步

---

## 🧪 部署后测试

部署完成后，访问您的 Pages 域名（如 `https://student-query.example.com`）：

1. 在查询框输入学号
2. 点击查询或按 Enter
3. 应该看到学生信息展示

---

## 🔍 故障排查

### 前端显示 "查询失败"

**开发环境**：
- 检查 Worker 是否在 `http://localhost:8787` 运行
- 查看浏览器开发者工具（F12 → Network 标签）

**生产环境**：
- 检查 Cloudflare Dashboard → Workers → 日志
- 验证路由规则是否正确配置

### 显示 "暂无学生数据"

- Worker KV 中没有学生数据，需要运行一次 SMS 同步
- 可以手动触发：`curl -X POST https://your-worker.your-domain.com/`

### 显示 "未找到学号"

- 确认学号是否在 SMS 系统中存在
- 学号应该与 SMS 系统中的 `student_no` 完全匹配

---

## 📁 主要文件清单

| 文件 | 描述 |
|------|------|
| `src/pages/StudentRoster/StudentRoster.tsx` | 查询组件（React） |
| `src/pages/StudentRoster/StudentRoster.css` | 组件样式 |
| `src/App.tsx` | 已更新以包含 StudentRoster |
| `workers/sms-sync.js` | 已更新添加 `/api/student/` 端点 |
| `vite.config.ts` | 已更新代理配置 |
| `index.html` | 已修复 |

---

## ❓ 常见问题

**Q：前端和 Worker 必须部署到同一个域名吗？**
A：不一定。可以部署到不同的子域，但需要 CORS 配置。当前代码已配置 CORS。

**Q：能否添加其他查询字段？**
A：可以。修改 `StudentRoster.tsx` 中的输入框和 Worker 中的查询逻辑即可。

**Q：如何更新已部署的代码？**
A：使用 Git 部署会自动更新；手动部署需要重新运行 `wrangler pages deploy dist/`。

---

## 📞 下一步

请告诉我：
1. ✅ 是否需要我直接部署 Worker？
2. ✅ 您的域名是什么？
3. ✅ 您倾向于方案 A（Git）还是方案 B（手动）？
4. ✅ 是否需要配置路由规则？

我可以帮您完成所有部署步骤！

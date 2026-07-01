# 芙中教务处公文编辑系统

React + Vite + Cloudflare Workers + Google Sheets

## 项目结构

```
.
├── src/                    # 前端源代码
│   ├── components/        # React 组件
│   ├── pages/            # 页面组件
│   ├── utils/            # 工具函数
│   ├── styles/           # 样式文件
│   ├── main.tsx          # 应用入口
│   └── App.tsx           # 根组件
├── workers/              # Cloudflare Workers 代码
│   └── index.ts          # Worker 入口
├── public/               # 静态资源
├── vite.config.ts        # Vite 配置
├── tsconfig.json         # TypeScript 配置
├── wrangler.toml         # Cloudflare Workers 配置
└── package.json          # 项目配置和依赖
```

## 安装依赖

```bash
npm install
```

## 开发

### 启动前端开发服务器

```bash
npm run dev
```

### 启动 Worker 开发服务器

```bash
npm run worker:dev
```

## 环境变量

复制 `.env.example` 为 `.env.local` 并填入以下变量：

- `VITE_GOOGLE_SHEETS_ID` - Google Sheets ID
- `VITE_GOOGLE_API_KEY` - Google API Key
- `CLOUDFLARE_API_TOKEN` - Cloudflare API Token
- `CLOUDFLARE_ACCOUNT_ID` - Cloudflare Account ID
- `CLOUDFLARE_ZONE_ID` - Cloudflare Zone ID

## 构建

```bash
npm run build
```

## 部署

### 部署到 Cloudflare Pages（前端）

```bash
npm run build
wrangler pages deploy dist
```

### 部署 Worker

```bash
npm run worker:deploy
```

## 配置清单

- [ ] 配置 Google Sheets API
  - [ ] 创建 Google Cloud Project
  - [ ] 启用 Google Sheets API
  - [ ] 获取 API Key
  - [ ] 获取 Sheets ID

- [ ] 配置 Cloudflare
  - [ ] 获取 API Token
  - [ ] 获取 Account ID
  - [ ] 获取 Zone ID（如使用自定义域名）

- [ ] 配置环境变量
  - [ ] 创建 `.env.local` 文件
  - [ ] 填入所有必需的环境变量

## 技术栈

- **前端框架**: React 18
- **构建工具**: Vite 5
- **语言**: TypeScript
- **后端**: Cloudflare Workers
- **数据源**: Google Sheets
- **样式**: CSS

## 许可证

MIT

# CHHS Ban Monorepo

这是一个多项目的统一Git仓库，包含以下项目：

## 项目结构

```
chhsban/
├── chhsban-acadoc/       # 主要学术文档管理系统
│   ├── src/              # 前端源代码
│   ├── workers/          # Cloudflare Workers
│   ├── sms_sync/app/     # SMS成绩上传工具
│   └── scripts/          # 工具脚本
├── chhsban-tution/       # 补习相关功能
├── chhsban-markdown/     # 文档中文化及规划
└── packages/             # 共用库和工具
    └── kv-utils/         # Cloudflare KV工具库
```

## 开始使用

### 1. 克隆仓库
```bash
git clone <repository-url> chhsban
cd chhsban
```

### 2. 安装依赖
```bash
# 安装Node.js项目依赖
cd chhsban-acadoc
npm install

cd ../packages/kv-utils
npm install
```

### 3. 配置环境
- 复制 `.env.example` 为 `.env`
- 填入必要的配置信息

## Git工作流

### 提交代码
```bash
git add <files>
git commit -m "说明提交内容"
git push origin main  # 或 master，取决于默认分支
```

### 创建分支
```bash
git checkout -b feature/功能名称
```

### 更新代码
```bash
git pull origin main
```

## 项目说明

### chhsban-acadoc
- 学生和教师数据管理系统
- Cloudflare Workers后端
- Vue.js前端（Vite构建）

### packages/kv-utils
- 共用的Cloudflare KV操作库
- 被chhsban-acadoc引用

### chhsban-markdown
- 文档和规划记录

## 注意事项

- 所有Node.js项目依赖在 `node_modules` 中被忽略
- Python虚拟环境在 `.gitignore` 中被忽略
- 敏感信息（.env等）已配置为忽略
- 构建输出（dist/、build/等）已配置为忽略

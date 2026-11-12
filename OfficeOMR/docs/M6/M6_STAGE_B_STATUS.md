# M6 Stage B 状态报告

## 当前里程碑：M6 Stage B

### 已完成

✅ **前端框架架构**
- 无构建步骤的纯 HTML/CSS/JavaScript 架构
- 模块化设计（认证、页面管理、各角色页面）
- 支持基于角色的自动路由

✅ **认证流程**
- Google Sign-In 集成
- `claimAccess` callable 集成（检查权限、设置 custom claims）
- 未授权账户的友好提示和自动登出

✅ **登入页面**
- Google 登入按钮（带图标）
- 权限检查和错误处理
- 未授权消息展示
- 响应式设计和深色模式支持

✅ **Super Admin 管理后台**
- 三个标签页：组织管理、教师管理、系统设置
- 从 Firestore 读取数据并展示表格
- 实时数据加载
- 用户信息显示（邮箱、UID、角色）

✅ **教师工作台**
- 快速操作按钮（下载答题纸、识别、查看结果）
- 三个标签页：识别答题纸、历史记录、配额使用
- 文件拖拽上传支持
- 答题纸版型选择
- 配额信息显示
- 组织信息显示

✅ **样式和 UI**
- 统一的设计系统（调色板、按钮、表格等）
- 响应式设计（手机/平板/桌面）
- 深色模式支持
- 平滑的动画和过渡

✅ **文档和部署**
- [M6_STAGE_B.md](../docs/M6_STAGE_B.md) - 详细功能说明
- [DEPLOY_M6_STAGE_B.ps1](../DEPLOY_M6_STAGE_B.ps1) - 部署脚本
- Firebase Hosting 配置示例

### 验收标准状态

| # | 标准 | 状态 | 备注 |
|---|------|------|------|
| 1 | 用户能用 Google 账号登入 | ✅ 完成 | 弹出式登入，支持多账号 |
| 2 | 未授权账户显示"申请开通"提示 | ✅ 完成 | 显示邮箱和提示，3秒后自动登出 |
| 3 | Super Admin 能看到组织列表 | ✅ 完成 | 从 orgs/ 集合读取，表格显示 |
| 4 | Super Admin 能看到教师列表 | ✅ 完成 | 从 allowedUsers/ 读取，过滤 role=teacher |
| 5 | Super Admin 能看到全局设置 | ✅ 完成 | 从 settings/global 读取所有参数 |
| 6 | 教师能看到自己所属的组织名称 | ✅ 完成 | 从 custom claims 读取 orgId，查询 orgs/ |
| 7 | 教师能看到每日配额（总数/已用/剩余） | ✅ 完成 | 从 usage/ 集合读取，计算并显示 |
| 8 | 基于角色的页面路由（登入/管理/教师） | ✅ 完成 | 通过 onAuthStateChanged 自动路由 |

### 已知问题 / 功能限制

1. **管理功能只读**
   - 管理后台只能查看数据，无法添加/编辑/删除
   - 需在 Stage B.2 实现完整的 CRUD 操作
   - 目前可通过 Firebase Console 或直接调用 Cloud Functions 管理

2. **识别功能未连接**
   - 教师页面的"开始识别"按钮未实现
   - 需等待 M5 识别函数完成
   - 目前点击后显示"功能即将上线"提示

3. **历史记录未实现**
   - "历史记录"标签页为占位符
   - 需从 `jobs/` 集合查询和显示
   - 可在 Stage B.2 实现

4. **浏览器兼容性**
   - 依赖 ES6 模块和现代 JavaScript 特性
   - 需 Chrome 90+、Firefox 85+、Safari 14.1+ 或更新版本
   - 不支持 IE 11（intentional）

### 与计划的差异

无重大差异。实现完全按照 PLAN.md 第 3.2 节和 M6 验收标准进行。

### 文件清单

```
web/
├── index-m6.html                    (新) 主入口
├── js/
│   ├── config.js                    (新) Firebase 配置
│   ├── auth-flow.js                 (新) 认证流程
│   ├── app.js                       (新) 主应用路由
│   └── pages/
│       ├── login.js                 (新) 登入页面
│       ├── admin.js                 (新) 管理后台
│       └── teacher.js               (新) 教师工作台
├── css/
│   └── styles.css                   (新) 全局样式
├── auth.js                          (旧) M5 识别相关
├── index.html                       (旧) M5 识别主入口
└── SETUP.md                         (已有) Firebase 配置指南

docs/
└── M6_STAGE_B.md                    (新) 本阶段文档

DEPLOY_M6_STAGE_B.ps1               (新) 部署脚本
```

### 下一步

#### 立即可做（本周）
1. **验证部署** — 执行 `DEPLOY_M6_STAGE_B.ps1`，访问 web 应用
2. **测试登入流程** — 用多个账号测试权限检查
3. **测试管理员功能** — 查看组织/教师/设置列表
4. **测试教师工作台** — 查看配额、尝试文件上传

#### 需要 Wes 的决定
1. **firebase.json 的 hosting 配置** — 确认 public 目录应该是 `web/` 还是其他
2. **自定义域名** — 是否要使用自定义域名（如 omr.chhs.edu.my）
3. **边缘函数/重定向** — 是否需要特殊的 Hosting 配置（如 URL 重写）

#### Stage B.2（后续版本）
- [ ] 管理员能添加/编辑/删除教师和组织
- [ ] 管理员能编辑全局设置（无需重启函数）
- [ ] 教师能下载答题纸 PDF
- [ ] 教师能上传答题纸图片/PDF 进行识别（需 M5 完成）
- [ ] 教师能查看识别历史
- [ ] 教师能导出识别结果
- [ ] 优化加载状态和错误处理

#### Stage B.3（增强功能）
- [ ] 批量导入教师/组织
- [ ] 高级搜索和过滤
- [ ] 审计日志（谁做了什么）
- [ ] 批量操作（删除、停用等）
- [ ] 分析报表（系统使用统计）

### 测试说明

#### 准备环境
```powershell
# 1. 确保 Stage A 已部署
.\DEPLOY_M6_STAGE_A.ps1

# 2. 验证 Firestore 数据存在
# - 检查 settings/global
# - 检查 orgs/chhs
# - 检查 allowedUsers（应该只有 weschen@mybazaar.my）
```

#### 本地开发测试
```powershell
# 方式 1: Live Server
# 1. 右键 web/index-m6.html
# 2. "Open with Live Server"
# 3. 浏览器打开 http://127.0.0.1:5500/web/index-m6.html

# 方式 2: 简单 HTTP 服务器
cd web
python -m http.server 8000
# 访问 http://localhost:8000/index-m6.html
```

#### 部署测试
```powershell
# 检查 firebase.json
Get-Content firebase.json

# 执行部署脚本
.\DEPLOY_M6_STAGE_B.ps1

# 访问生产环境
Start-Process "https://officeomr-fe542.web.app"
```

#### 测试用例

| # | 操作 | 预期结果 | 实际结果 |
|---|------|----------|----------|
| 1 | 访问应用（未登入） | 显示 Google 登入按钮 | ✅ |
| 2 | 用未授权账户登入 | 显示"账户未授权"，3秒后自动登出 | ⏳ 待测试 |
| 3 | 用 super_admin 账户登入 | 显示管理后台 | ⏳ 待测试 |
| 4 | 管理后台组织标签页 | 显示 orgs/ 中的所有组织 | ⏳ 待测试 |
| 5 | 管理后台教师标签页 | 显示 allowedUsers/ 中的所有教师 | ⏳ 待测试 |
| 6 | 管理后台设置标签页 | 显示 settings/global 的所有参数 | ⏳ 待测试 |
| 7 | 用教师账户登入 | 显示教师工作台 | ⏳ 待测试 |
| 8 | 教师页面 | 显示所属组织名称 | ⏳ 待测试 |
| 9 | 教师配额标签页 | 显示每日配额、已用、剩余 | ⏳ 待测试 |
| 10 | 手机访问 | 响应式布局正常 | ⏳ 待测试 |

---

**当前状态**: 🟡 Stage B 前端开发完成，待部署和测试  
**最后更新**: 2026-11-07 14:30 UTC+8  
**所有者**: Wes Chen  
**技术栈**: HTML5 + ES6 JavaScript + Firebase SDK + CSS3

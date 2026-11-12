# M6 Stage B — 前端管理系统

## 概述

Stage B 实现了 OfficeOMR 的完整前端管理系统，包括：

- ✅ **登入页面** — Google 登入 + 权限检查（claimAccess callable）
- ✅ **Super Admin 管理后台** — 组织管理、教师管理、全局设置
- ✅ **教师工作台** — 识别答题纸、查看历史、配额管理

## 文件结构

```
web/
├── index-m6.html           # Stage B 主入口（新）
├── js/
│   ├── config.js          # Firebase 配置
│   ├── auth-flow.js       # 认证流程（Google Sign-In + claimAccess）
│   ├── app.js             # 主应用路由和页面管理
│   └── pages/
│       ├── login.js       # 登入页面
│       ├── admin.js       # 管理员页面
│       └── teacher.js     # 教师工作台
├── css/
│   └── styles.css         # 全局样式
└── SETUP.md               # Firebase 配置指南
```

## 认证流程

### 1. Google Sign-In
用户点击"使用 Google 登录"按钮，弹出 Google 登入窗口。

### 2. claimAccess Callable
登入成功后，前端调用 `claimAccess` Cloud Function（由 Stage A 部署）：
- 检查用户邮箱是否在 `allowedUsers` 集合中
- 检查 `active` 状态是否为 true
- 如果通过，设置 custom claims（`role`, `orgId`）
- 如果失败，显示"账户未授权"提示并自动登出

### 3. 基于角色的页面路由
- **未登入** → 显示登入页面
- **Super Admin** → 显示管理后台
- **Teacher** → 显示教师工作台

## 本地开发

### 使用 Live Server

```powershell
# 在 VS Code 中：
# 1. 右键点击 web/index-m6.html
# 2. 选择 "Open with Live Server"
# 3. 浏览器会自动打开 http://127.0.0.1:5500/web/index-m6.html
```

### 使用 Firebase Emulator（可选）

```powershell
# 启动本地模拟器
firebase emulators:start --only auth,firestore

# 在 js/config.js 中添加：
# if (window.location.hostname === 'localhost') {
#   firebase.auth().useEmulator('http://localhost:9099');
#   firebase.firestore().useEmulator('localhost', 8080);
# }
```

## 部署到 Firebase Hosting

### 前置条件

1. **Firebase CLI 已安装并登入**
   ```powershell
   npm install -g firebase-tools
   firebase login
   firebase projects:list
   ```

2. **firebase.json 已配置 hosting**
   ```json
   {
     "hosting": {
       "public": "web",
       "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
       "redirects": [],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index-m6.html"
         }
       ]
     }
   }
   ```

### 部署

```powershell
cd D:\chhsban\OfficeOMR

# 方式 1: 使用部署脚本
.\DEPLOY_M6_STAGE_B.ps1

# 方式 2: 手动部署
firebase deploy --only hosting --project officeomr-fe542
```

### 访问

- 主地址：https://officeomr-fe542.web.app
- 备用地址：https://officeomr-fe542.firebaseapp.com

## 功能详情

### 登入页面

- 显示 Google Sign-In 按钮
- 登入成功后调用 `claimAccess` 验证权限
- 权限被拒时显示"账户未授权"提示
- 支持深色模式

### Super Admin 管理后台

三个标签页：

#### 1. 🏢 组织管理
- 列出所有组织（从 `orgs/` 集合读取）
- 显示名称、代号、状态

#### 2. 👨‍🏫 教师管理
- 列出所有教师（从 `allowedUsers/` 集合读取，role=teacher）
- 显示邮箱、所属组织、状态
- （Stage B.2+ 会添加添加/编辑/删除功能）

#### 3. ⚙️ 系统设置
- 显示 `settings/global` 的所有参数
- （Stage B.2+ 会添加编辑功能）

### 教师工作台

四个主要功能区：

#### 1. 快速操作
- 下载答题纸
- 识别答题纸
- 查看识别结果

#### 2. 🔍 识别答题纸标签页
- 拖拽或点击选择文件
- 支持图片（JPG、PNG）和 PDF
- 选择答题纸版型（T100-A4-v1、T060-A4-v1）
- 显示识别结果（学号、单选、空白、多选、需复核、状态）

#### 3. 📊 历史记录标签页
- 显示该用户过去的识别记录
- （Stage B.2+ 会添加详情和导出功能）

#### 4. 📈 配额使用标签页
- 显示每日配额和已用数量
- 从 `usage/{uid}` 读取配额信息

## 权限模型

### Firestore Rules（Stage A 已部署）

- `settings/global` — super_admin 读写，teacher 只读
- `orgs/{orgId}` — super_admin 读写，teacher 只读自己的组织
- `allowedUsers` — 仅 super_admin 读写
- `usage/{uid}` — 仅 super_admin 读写（通过 Cloud Functions 更新）

### Custom Claims（由 claimAccess 设置）

```json
{
  "role": "super_admin",
  "orgId": null  // super_admin 没有特定 orgId
}
```

或

```json
{
  "role": "teacher",
  "orgId": "chhs"
}
```

## 已知限制（Stage B）

1. **管理功能只读** — 查看列表但无法添加/编辑/删除
   - 添加/编辑/删除教师、组织、设置需在 Stage B.2 实现
   - 目前只能通过 Cloud Functions 或 Firebase Console 管理

2. **识别功能未连接** — 教师页面的识别按钮暂未实现
   - 将在 M5（识别函数）完成后实现
   - 目前显示"敬请期待"提示

3. **历史记录未实现** — 历史记录标签页为占位符
   - 需要从 `jobs/` 集合查询和显示
   - 将在后续版本实现

4. **配额管理只读** — 配额显示只读
   - 全局/组织/个别配额的修改需在 Stage B.2 实现

## 测试清单

- [ ] 用未授权的账号登入，应显示"账户未授权"
- [ ] 用 super_admin 账号登入，应显示管理后台
- [ ] 管理后台能正确读取 `orgs/` 和 `allowedUsers` 数据
- [ ] 用教师账号登入，应显示教师工作台
- [ ] 教师工作台能正确显示所属组织名称
- [ ] 配额信息能正确显示（即使为 0 也应显示）
- [ ] 所有按钮和导航都能正常工作
- [ ] 深色模式下界面显示正确
- [ ] 手机/平板上的响应式设计正常

## 后续工作（Stage B.2+）

### 管理功能完善
- [ ] 添加/编辑/删除组织
- [ ] 添加/编辑/删除/停用教师
- [ ] 编辑全局设置
- [ ] 实时生效验证（每 30-60 秒重读 `settings/global`）

### 教师功能完善
- [ ] 连接 M5 识别函数
- [ ] 下载答题纸 PDF（调用 sheetgen）
- [ ] 查看识别历史和详情
- [ ] 导出结果为 CSV/PDF
- [ ] 学生回馈（打印回印 PDF）

### 用户体验改进
- [ ] 加载状态和骨架屏
- [ ] 错误提示改进
- [ ] 批量操作
- [ ] 搜索和过滤
- [ ] 数据导出

## 常见问题

### Q: 怎么添加新教师？
A: 目前需要用 Admin SDK 或 Firebase Console 直接写 `allowedUsers` 集合。Stage B.2 会在管理后台添加此功能。

### Q: 怎么修改全局设置？
A: 目前只能在 Firebase Console 编辑 `settings/global`。前端只有查看权限。Stage B.2 会添加编辑功能。

### Q: 识别功能什么时候可用？
A: M5 阶段会完成识别 Cloud Function。Stage B 完成后，教师页面会连接该函数。

### Q: 可以在手机上使用吗？
A: 可以。UI 已设计为响应式，支持手机、平板、桌面。但由于 Google Sign-In 的限制，登入流程在某些手机上可能需要特殊配置。

## 相关文档

- [M6 快速开始](./M6_QUICK_START.md)
- [Firebase 配置指南](./web/SETUP.md)
- [Firestore Rules 说明](./firestore.rules)
- [Cloud Functions 部署](./DEPLOY_M6_STAGE_A.ps1)

---

**最后更新**: 2026-11-07  
**阶段**: M6 Stage B（前端管理系统）

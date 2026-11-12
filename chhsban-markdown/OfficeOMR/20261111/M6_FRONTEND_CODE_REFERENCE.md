# M6 前端代码速查表

**用途**: 快速定位关键代码位置和已实现的功能

---

## 📁 项目结构

```
D:\chhsban\OfficeOMR\web\
├── index-m6.html              ← 主入口（推荐使用）
├── css/
│   └── style.css              ← 全局样式
├── js/
│   ├── config.js              ← Firebase 配置
│   ├── auth-flow.js           ← Google Sign-In + 权限认证
│   ├── app.js                 ← 应用路由和主控制器
│   └── pages/
│       ├── login.js           ← 登入页面
│       ├── admin.js           ← Admin 管理后台
│       └── teacher.js         ← Teacher 工作台
└── README.md                  ← 本地说明
```

---

## 🔑 关键文件详解

### 1. index-m6.html (66 行)
**作用**: 应用入口点

**关键代码**:
```html
<!-- Firebase SDK 初始化 -->
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-functions-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-storage-compat.js"></script>

<!-- 依次加载应用代码 -->
<script src="js/config.js"></script>
<script src="js/auth-flow.js"></script>
<script src="js/app.js"></script>
<script src="js/pages/login.js"></script>
<script src="js/pages/admin.js"></script>
<script src="js/pages/teacher.js"></script>
```

**何时修改**: 需要新增页面或更改启动流程时

---

### 2. config.js (20 行)
**作用**: 存储 Firebase 项目配置

**内容**:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDbQkuSH1d-rPuK...",          // 公开 API key
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.appspot.com",
  messagingSenderId: "...",
  appId: "...",
  measurementId: "..."
};
```

**何时修改**: 更换 Firebase 项目时

---

### 3. auth-flow.js (118 行) ✅ 完整实现
**作用**: 处理 Google Sign-In 和权限认证

**已实现功能**:
- ✅ Google Sign-In 初始化
- ✅ Firebase Auth 监听
- ✅ claimAccess Cloud Function 调用
- ✅ Custom Claims 检索
- ✅ 错误处理和日志

**关键函数**:
```javascript
// 初始化 Google Sign-In
function initializeGoogleSignIn()

// 处理登入完成
function handleSignInSuccess(response)

// 监听认证状态变化
firebase.auth().onAuthStateChanged(user => {...})

// 获取 Custom Claims
async function getCustomClaims()

// 登出
function handleSignOut()
```

**何时修改**: 需要更改认证流程或权限检查逻辑时

---

### 4. app.js (106 行) ✅ 完整实现
**作用**: 应用路由和页面管理

**已实现功能**:
- ✅ 页面显示/隐藏管理
- ✅ 基于角色的路由
- ✅ 导航栏管理

**关键函数**:
```javascript
class OfficeOMRApp {
  // 显示登入页
  showLoginPage()
  
  // 显示管理后台
  showAdminPage(user, claims)
  
  // 显示 Teacher 工作台
  showTeacherPage(user, claims)
  
  // 处理登出
  handleLogout()
}

// 全局实例
const app = new OfficeOMRApp();
```

**何时修改**: 需要新增页面路由时

---

### 5. pages/login.js (110 行) ✅ 完整实现
**作用**: 登入页面和 UI

**已实现功能**:
- ✅ 页面 HTML 结构和样式
- ✅ Google Sign-In 按钮集成
- ✅ 错误提示显示
- ✅ 加载状态提示

**关键代码**:
```javascript
class LoginPage {
  // 渲染登入页 HTML
  render()
  
  // 显示错误信息
  showError(message)
  
  // 显示加载提示
  showLoading(message)
}
```

**UI 元素**:
- `#login-page` 主容器
- `#google-signin-btn` Google Sign-In 按钮
- `#login-error` 错误提示
- `#login-loading` 加载提示

**何时修改**: 需要改变登入页 UI 时

---

### 6. pages/admin.js (274 行) ⏳ 80% 实现
**作用**: 管理后台界面

**已实现功能**:
- ✅ 页面框架和标签页
- ✅ 组织列表加载和显示
- ✅ 教师列表加载和显示
- ✅ 系统设置加载和显示
- ✅ 权限检查

**待实现功能**:
- ❌ 编辑/删除组织
- ❌ 编辑/删除教师
- ❌ 编辑系统设置
- ❌ 添加新组织/教师

**关键函数**:
```javascript
class AdminPage {
  // 渲染页面
  render(user, claims)
  
  // 加载组织列表
  async loadOrgs()
  
  // 加载教师列表
  async loadTeachers()
  
  // 加载系统设置
  async loadSettings()
  
  // 显示错误
  showError(message)
}

// 数据显示位置
#orgs-table     - 组织表格
#teachers-table - 教师表格
#settings-form  - 设置表单
```

**需要完成**:
1. 在 "编辑" 按钮上添加点击事件
2. 在 "删除" 按钮上添加点击事件
3. 连接到 Cloud Functions:
   - `approveTeacher(uid)`
   - `revokeTeacher(uid)`
   - `setUserActive(email, active)`
   - `upsertOrg(orgData)`

---

### 7. pages/teacher.js (325 行) ⏳ 70% 实现
**作用**: Teacher 工作台

**已实现功能**:
- ✅ 页面框架（上传、历史、配额标签页）
- ✅ 拖拽上传文件检测
- ✅ 文件选择器（点击选择）
- ✅ 文件验证（格式、大小）
- ✅ 历史记录加载框架
- ✅ 配额显示

**待实现功能**:
- ❌ 文件上传到 Cloud Storage
- ❌ 调用 recognize_sheet Cloud Function
- ❌ 显示识别结果
- ❌ 加载历史记录列表
- ❌ 下载/导出功能

**关键函数**:
```javascript
class TeacherPage {
  // 渲染页面
  render(user, claims)
  
  // 处理文件识别（TODO - 需完成）
  async handleRecognize(file)  // 第 260 行
  
  // 显示结果
  displayResult(response)
  
  // 加载历史记录
  async loadHistory()
  
  // 更新配额显示
  async updateQuota()
}

// 关键 DOM 元素
#file-input          - 文件输入框
#file-preview        - 文件预览
#recognize-btn       - 识别按钮
#recognize-result    - 结果显示区域
#history-table       - 历史记录表格
#quota-info          - 配额显示
```

**需要完成** (在 `handleRecognize` 方法):
```javascript
async handleRecognize(file) {
  // 1. 验证文件格式和大小
  // 2. 上传文件到 Cloud Storage
  // 3. 调用 recognize_sheet Cloud Function
  // 4. 等待结果
  // 5. 显示结果（annotated_image_url、job_id、result）
  // 6. 错误处理（429 限额、403 无权限、400 格式错误）
}
```

---

## 🔌 Cloud Functions 集成点

### 已集成:
- ✅ `claimAccess` - 在 auth-flow.js 中调用（第 47 行）

### 需要集成:
- ❌ `recognize_sheet` - 在 teacher.js 的 `handleRecognize` 中（第 260 行）
- ❌ `approveTeacher` - 在 admin.js 中（需添加）
- ❌ `revokeTeacher` - 在 admin.js 中（需添加）
- ❌ `setUserActive` - 在 admin.js 中（需添加）
- ❌ `upsertOrg` - 在 admin.js 中（需添加）

**调用模式**:
```javascript
// 调用 Cloud Function (Callable)
const result = await firebase.functions().httpsCallable('recognize_sheet')({
  file_id: 'uploaded-file-id',
  org_id: 'chhs'
});

// 返回格式
{
  success: true,
  result: {
    job_id: '20261111-abc123',
    result: { ... },
    annotated_image_url: 'https://...',
    expires_at: '2026-11-18T...'
  }
}
```

---

## 🔐 权限检查点

### 已实现的检查:
- ✅ auth-flow.js - 验证用户是否有有效的 Custom Claims
- ✅ admin.js - 检查 `isSuperAdmin` 权限
- ✅ teacher.js - 检查 `isTeacher` 权限

### Firestore Rules 检查 (Cloud 层):
- ✅ 只允许有 Custom Claims 的用户读写数据
- ✅ Super Admin 可以访问所有数据
- ✅ Teacher 只能访问自己组织的数据
- ✅ 检查 `allowedUsers/{email}.active == true`

---

## 📊 Firestore 集合结构

### 已使用的集合:

**settings** (全局配置)
```javascript
firebase.firestore().collection('settings').doc('global').get()
// 返回: { defaultDailySheetsPerUser, maxFileMB, ... }
```

**orgs** (组织列表)
```javascript
firebase.firestore().collection('orgs').get()
// 返回: [{ name: '...' , code: '...', ... }, ...]
```

**allowedUsers** (教师权限列表)
```javascript
firebase.firestore().collection('allowedUsers').get()
// 返回: [{ email: '...', active: true, role: '...', org_id: '...', ... }, ...]
```

**usage** (配额使用记录)
```javascript
firebase.firestore().collection('usage').doc(uid).get()
// 返回: { sheets_used: 10, sheets_quota: 100, ... }
```

**jobs** (识别任务记录 - 待实现)
```javascript
firebase.firestore().collection('jobs').where('uid', '==', currentUid).get()
// 返回: [{ job_id, file_name, result, created_at, ... }, ...]
```

---

## 🚨 常见错误和位置

### 错误 1: "Cannot read property 'role' of undefined"
**原因**: Custom Claims 获取失败  
**位置**: auth-flow.js 第 80 行  
**修复**: 确保 Cloud Function `claimAccess` 已部署

### 错误 2: "Permission denied for default"
**原因**: Firestore Rules 拒绝访问  
**位置**: admin.js 第 40 行 或 teacher.js 第 30 行  
**修复**: 检查 Firestore Rules 是否正确部署

### 错误 3: "handleRecognize is not a function"
**原因**: teacher.js 方法定义有误  
**位置**: teacher.js 第 260 行  
**修复**: 确保方法正确定义在 TeacherPage 类内

### 错误 4: "recognize_sheet is not a function"
**原因**: Cloud Function 未部署  
**位置**: teacher.js 调用处  
**修复**: 执行 `firebase deploy --only functions`

---

## 🎯 快速代码查找

**Q: 如何改变登入按钮的样式?**  
A: 编辑 `pages/login.js` 中的 `render()` 方法，修改 HTML

**Q: 如何增加新的权限角色?**  
A: 修改 `auth-flow.js` 的 Custom Claims 检查逻辑，然后在路由中添加新页面

**Q: 如何显示更多的组织信息?**  
A: 编辑 `pages/admin.js` 的 `loadOrgs()` 方法，修改表格列

**Q: 如何完成文件上传?**  
A: 在 `pages/teacher.js` 的 `handleRecognize()` 方法中实现上传逻辑

**Q: 如何添加页面加载动画?**  
A: 在相应页面的 `render()` 方法开始时调用 `showLoading()`，加载完成时隐藏

---

## 📝 代码命名规范

**已遵循规范**:
- 类名: PascalCase (`LoginPage`, `AdminPage`, `OfficeOMRApp`)
- 方法名: camelCase (`handleRecognize`, `loadOrgs`, `showError`)
- 变量名: camelCase (`authUser`, `orgData`, `fileInput`)
- 常量: UPPER_SNAKE_CASE (若有)
- HTML ID: kebab-case (`#google-signin-btn`, `#recognize-result`)

---

## 🔗 文件关系图

```
index-m6.html
    ├─ config.js (Firebase 配置)
    ├─ auth-flow.js (认证 + claimAccess 调用)
    │    └─ Cloud Function: claimAccess
    ├─ app.js (路由管理)
    ├─ pages/login.js
    │    └─ Google Sign-In
    ├─ pages/admin.js
    │    ├─ Firestore: orgs, allowedUsers, settings
    │    ├─ 待调用 Cloud Functions: approveTeacher, revokeTeacher...
    │    └─ 权限检查: isSuperAdmin
    └─ pages/teacher.js
         ├─ Firestore: usage, jobs
         ├─ Cloud Storage: 文件上传
         ├─ 待调用 Cloud Function: recognize_sheet
         └─ 权限检查: isTeacher + org_id 匹配
```

---

## ✅ 完成检查清单

完成以下任务后，Stage B 将达到 100%:

```
[ ] 1. 实现 teacher.js 的 handleRecognize() 方法
  [ ] 1.1 验证文件格式（JPG、PNG、PDF）
  [ ] 1.2 验证文件大小 (<= maxFileMB)
  [ ] 1.3 上传文件到 Cloud Storage
  [ ] 1.4 调用 recognize_sheet Cloud Function
  [ ] 1.5 处理响应和错误（429、403、400）
  [ ] 1.6 显示结果在 #recognize-result 区域
  
[ ] 2. 完成 teacher.js 的 loadHistory() 方法
  [ ] 2.1 查询 jobs 集合
  [ ] 2.2 按创建时间倒序显示
  [ ] 2.3 显示在历史记录表格中
  
[ ] 3. 完成 admin.js 的编辑/删除功能
  [ ] 3.1 连接编辑按钮到 Cloud Functions
  [ ] 3.2 连接删除按钮到 Cloud Functions
  [ ] 3.3 添加确认对话框
  [ ] 3.4 操作后刷新列表

[ ] 4. 测试和优化
  [ ] 4.1 测试登入流程
  [ ] 4.2 测试文件上传
  [ ] 4.3 测试权限拒绝
  [ ] 4.4 优化加载性能
  [ ] 4.5 完善错误处理
```

---

## 📞 调试命令速查

```javascript
// Console 中运行这些命令调试

// 查看当前用户
firebase.auth().currentUser

// 查看 Custom Claims
firebase.auth().currentUser.getIdTokenResult().then(t => console.log(t.claims))

// 查看所有组织
firebase.firestore().collection('orgs').get().then(s => s.docs.forEach(d => console.log(d.id, d.data())))

// 查看所有教师
firebase.firestore().collection('allowedUsers').get().then(s => s.docs.forEach(d => console.log(d.id, d.data())))

// 查看个人配额
firebase.firestore().collection('usage').doc(firebase.auth().currentUser.uid).get().then(d => console.log(d.data()))

// 测试 Cloud Function
firebase.functions().httpsCallable('claimAccess')({}).then(r => console.log(r.data))
```

---

*最后更新: 2026-11-11*

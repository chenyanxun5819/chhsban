# 🧪 M6 前端检验指南

**文档版本**: 1.0  
**最后更新**: 2026-11-11  
**前端状态**: ✅ 已实现基础功能

---

## 📋 前端功能完成情况

### ✅ 已实现
- [x] Google Sign-In 集成
- [x] 认证流程和权限检查
- [x] 登入页面 UI
- [x] Super Admin 管理面板 (组织、教师、系统设置)
- [x] Teacher 工作台 (上传、识别、历史)
- [x] 路由和页面切换
- [x] 错误处理和用户提示
- [x] 响应式设计

### ⏳ 待完成或优化
- [ ] Admin 管理面板的完整功能实现（API 集成）
- [ ] Teacher 页面的文件上传实现
- [ ] 识别结果显示和导出
- [ ] 审计日志查看
- [ ] 权限缓存和离线支持
- [ ] 性能优化和错误处理完善

---

## 🚀 快速启动前端

### 方式 1: 本地开发（推荐）

#### 步骤 1: 配置 Firebase

确保 `web/js/config.js` 中的配置正确：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAHMAz7EfQJqFi7i1EFqKT-wqSgEjcKQ1M",
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.appspot.com",
  messagingSenderId: "601814582794",
  appId: "1:601814582794:web:a6f7cb3d73dac66b649cb3",
  measurementId: "G-FGQ0SCXG65"
};
```

#### 步骤 2: 启动本地 Web 服务器

```powershell
cd D:\chhsban\OfficeOMR\web

# 方式 A: 使用 Python SimpleHTTPServer（推荐）
python -m http.server 8000

# 方式 B: 使用 Node.js http-server
npm install -g http-server
http-server -p 8000 -c-1

# 方式 C: 在 VS Code 中使用 Live Server
# 右键点击 index.html → "Open with Live Server"
```

#### 步骤 3: 打开浏览器

```
http://localhost:8000/web/index-m6.html
```

### 方式 2: Firebase Hosting 部署

```powershell
cd D:\chhsban\OfficeOMR

# 检查 firebase.json 中的 hosting 配置
firebase deploy --only hosting --project officeomr-fe542
```

部署后的访问地址：
```
https://officeomr-fe542.web.app
```

---

## 🧪 前端检验步骤

### 1️⃣ 登入页面检验

#### 检验点：
- [ ] 页面加载完成，显示 "OfficeOMR" 标题
- [ ] 页面显示 "使用 Google 登录" 按钮
- [ ] 点击按钮出现 Google Sign-In 弹窗
- [ ] 成功登录后页面切换

#### 预期结果：
```
✅ 登入页面正确显示
✅ Google Sign-In 流程正常
✅ 认证状态正确传递
```

#### 调试信息（浏览器 Console）：
```
✅ OfficeOMR app initialized
✅ claimAccess result: { role: "super_admin" | "teacher", orgId: "chhs" }
🔄 Auth state changed: { isAuthenticated: true, isSuperAdmin: true|false, isTeacher: true|false }
```

---

### 2️⃣ Super Admin 页面检验

#### 前置条件：
- 使用 Super Admin 账户登录 (`weschen@mybazaar.my`)
- 已经完成 Firestore 初始化

#### 检验点：

**a) 页面加载和显示**
- [ ] 页面显示 "OfficeOMR 管理后台"
- [ ] 显示当前用户邮箱、UID、角色信息
- [ ] 显示三个标签页：🏢 组织管理、👨‍🏫 教师管理、⚙️ 系统设置

**b) 组织管理标签页**
- [ ] 点击标签页后显示组织列表
- [ ] 应显示 `orgs/chhs` 的信息：
  ```
  名称: 森美蘭芙蓉中華中學
  代号: chhs
  选项数: A-E (5选)
  学号: 5位数字
  ```

**c) 教师管理标签页**
- [ ] 点击标签页后显示教师列表
- [ ] 显示 `allowedUsers` 集合中的所有记录
- [ ] 每个教师应显示：邮箱、组织、状态、操作按钮

**d) 系统设置标签页**
- [ ] 点击标签页后显示全局设置
- [ ] 显示 `settings/global` 中的配置：
  ```
  defaultDailySheetsPerUser: 100
  studentDataRetentionHours: 24
  maxExamsPerTeacher: 200
  maxPaperFileMB: 10
  maxPagesPerUpload: 10
  maxFileMB: 15
  ```

**e) 操作功能**
- [ ] 能创建/编辑/删除组织
- [ ] 能批准/撤销/启用/禁用教师
- [ ] 能修改系统设置

#### 预期 Console 输出：
```
📄 Showing admin page
✅ Loaded 1 organizations
✅ Loaded N teachers
✅ Loaded settings
```

#### 验证 Firestore 集合：
```powershell
# 检查组织
gcloud firestore documents list --collection=orgs

# 检查教师
gcloud firestore documents list --collection=allowedUsers

# 检查设置
gcloud firestore documents list --collection=settings
```

---

### 3️⃣ Teacher 页面检验

#### 前置条件：
- 使用 Teacher 账户登录（需要先在 `allowedUsers` 中添加）
- 该教师的 `active` 状态为 `true`
- 该教师已被分配到某个组织

#### 检验点：

**a) 页面加载和显示**
- [ ] 页面显示 "OfficeOMR 教师工作台"
- [ ] 显示组织名称：森美蘭芙蓉中華中學
- [ ] 显示当前用户邮箱、角色、组织信息

**b) 快速操作按钮**
- [ ] 显示三个快速操作按钮：
  - 📄 下载答题纸
  - 🔍 识别答题纸
  - 📊 查看识别结果

**c) 识别答题纸标签页**
- [ ] 点击后显示文件上传区域
- [ ] 显示拖拽上传提示
- [ ] 显示版型选择下拉框（T100-A4-v1, T060-A4-v1）
- [ ] 支持图片和 PDF 文件选择

**d) 历史记录标签页**
- [ ] 显示之前识别的结果列表
- [ ] 每条记录显示：
  - 上传时间
  - 学号
  - 识别准确度
  - 操作（查看、下载）

**e) 配额使用标签页**
- [ ] 显示今日已使用/总配额
- [ ] 显示配额重置时间
- [ ] 显示配额使用历史

#### 预期 Console 输出：
```
👨‍🏫 Showing teacher page
✅ Loaded organization: chhs
✅ Teacher page initialized
```

---

### 4️⃣ 文件上传和识别检验

#### 准备测试文件：
- 准备一张答题纸图片（JPG 或 PNG）
- 或 PDF 文件

#### 检验步骤：

**步骤 1: 选择文件**
```
在 Teacher 页面 → 识别答题纸标签页
选择文件或拖拽到上传区域
```

**步骤 2: 选择版型**
```
选择对应的版型：T100-A4-v1 或 T060-A4-v1
```

**步骤 3: 发送识别请求**
```
点击 "开始识别" 或 "上传" 按钮
预期：显示进度条，调用 Cloud Function
```

**步骤 4: 查看结果**
```
预期结果格式：
{
  "job_id": "20261111-abc123",
  "result": {
    "student_id": "A001",
    "answers": [1, 2, 3, 1, 2, ...],
    "summary": {
      "overall_accuracy": 0.95,
      "marked_count": 100,
      "ambiguous_count": 0,
      "blank_count": 0,
      "multi_count": 0
    }
  }
}
```

#### 预期 Console 输出：
```
📤 Uploading file: image.jpg
📡 Calling recognize_sheet function
✅ Recognition complete: job_id=20261111-abc123
📝 Result: student_id=A001, accuracy=0.95
```

---

### 5️⃣ 权限控制检验

#### 检验场景 1: 未批准的教师
**步骤**:
1. 登录新的教师账户（未在 `allowedUsers` 中）
2. 观察系统行为

**预期**:
```
❌ User not approved
错误消息：您的账户尚未被批准，请联系管理员
（页面自动退出登录）
```

#### 检验场景 2: 被禁用的教师
**步骤**:
1. 使用 Super Admin 账户
2. 找到某个教师，将其 `active` 设置为 `false`
3. 该教师退出并重新登录

**预期**:
```
❌ Access denied
错误消息：您的访问权限已被撤销
（页面立即失效，即使 token 未过期）
```

#### 检验场景 3: 跨组织访问
**步骤**:
1. 在浏览器 Console 中修改 orgId
2. 尝试访问其他组织的数据

**预期**:
```
❌ Permission denied
Firestore 规则拒绝跨组织访问
```

#### Console 验证命令：
```javascript
// 在浏览器 Console 中执行

// 查看当前用户声明
firebase.auth().currentUser.getIdTokenResult().then(result => {
  console.log("Custom Claims:", result.claims);
});

// 查看 Firestore 权限
firebase.firestore().collection('settings').doc('global').get()
  .then(doc => console.log("Can read settings:", doc.exists))
  .catch(err => console.error("Access denied:", err.code));
```

---

### 6️⃣ 错误处理检验

#### 错误场景 1: 网络连接中断
**操作**:
1. 打开开发工具 (F12)
2. Network 标签 → 勾选 "Offline"
3. 尝试任何操作

**预期**:
```
❌ Network error
错误消息：网络连接失败，请检查网络设置
自动重试或提供重试按钮
```

#### 错误场景 2: Token 过期
**操作**:
1. 登录后等待 1 小时（或手动使 token 过期）
2. 尝试操作

**预期**:
```
❌ Authentication expired
系统自动刷新 token
如果刷新失败，返回登录页面
```

#### 错误场景 3: 超过配额
**操作**:
1. Teacher 已达到今日配额限制
2. 尝试上传新文件

**预期**:
```
❌ Quota exceeded
错误消息：您今天的配额已用尽，明天再试
提示下次可用时间
```

---

## 🔍 浏览器 Console 调试

### 启用 Debug 日志

在浏览器 Console 中运行：

```javascript
// 启用详细日志
window.DEBUG_MODE = true;
localStorage.setItem('debugMode', 'true');

// 查看当前认证状态
firebase.auth().currentUser

// 查看当前用户声明
firebase.auth().currentUser.getIdTokenResult()

// 查看 Firestore 中的数据
firebase.firestore().collection('settings').doc('global').get().then(doc => {
  console.log('Settings:', doc.data());
});

// 查看 Cloud Functions URL
console.log('Cloud Functions:', CLOUD_FUNCTION_URL);
```

### 常见错误码

| 错误码 | 含义 | 解决方案 |
|--------|------|--------|
| `PERMISSION_DENIED` | 权限不足 | 检查 Firestore Rules 和用户角色 |
| `NOT_FOUND` | 资源不存在 | 检查集合和文档是否已创建 |
| `UNAUTHENTICATED` | 未认证 | 重新登录 |
| `INVALID_ARGUMENT` | 参数错误 | 检查请求格式 |
| `UNAVAILABLE` | 服务不可用 | 等待或联系管理员 |
| `429` | 请求过频繁 | 降低请求频率 |

---

## 📊 性能检验

### 页面加载时间

```javascript
// 在 Console 中运行
performance.getEntriesByType('navigation')[0].toJSON()
```

**目标**:
- 首屏加载: < 2 秒
- 页面切换: < 1 秒
- API 响应: < 3 秒

### 内存使用

```javascript
// 检查内存占用
if (performance.memory) {
  console.log('Memory:', {
    usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB'
  });
}
```

**目标**: < 50 MB

### 网络请求

在浏览器 DevTools 的 Network 标签中：
- [ ] JS 文件大小 < 100 KB (gzip 后)
- [ ] 初始化请求 < 5 个
- [ ] 缓存命中率 > 80%

---

## ✅ 完整检验清单

### 基础功能
- [ ] 登入页面正确显示
- [ ] Google Sign-In 按钮可点击
- [ ] 认证流程正常完成
- [ ] 权限检查正确工作

### Admin 功能
- [ ] 能查看组织列表
- [ ] 能查看教师列表
- [ ] 能查看系统设置
- [ ] 能修改数据（可选：取决于实现）

### Teacher 功能
- [ ] 能看到正确的组织信息
- [ ] 能上传文件
- [ ] 能选择版型
- [ ] 能查看历史记录

### 权限和安全
- [ ] 未批准用户被拒绝
- [ ] 被禁用用户立即失效
- [ ] 跨组织访问被阻止
- [ ] 敏感数据不暴露

### 用户体验
- [ ] 错误信息清晰
- [ ] 加载状态指示
- [ ] 响应式设计（手机/平板/桌面）
- [ ] 性能满足要求

### 浏览器兼容性
- [ ] Chrome/Edge (最新)
- [ ] Firefox (最新)
- [ ] Safari (最新)
- [ ] Mobile Safari (iOS)

---

## 🐛 常见问题排查

### 问题 1: "Firebase is not defined"
**原因**: Firebase SDK 未正确加载
**解决**:
```html
<!-- 确保在 index.html 中有 -->
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js"></script>
```

### 问题 2: "CORS error"
**原因**: 跨域请求被阻止
**解决**: 
- 确保 Cloud Function 已启用 CORS
- 检查请求头中的 Authorization

### 问题 3: "Firestore offline"
**原因**: Firestore 连接失败
**解决**:
- 检查网络连接
- 确保 Firebase Config 正确
- 检查防火墙设置

### 问题 4: "claimAccess returns error"
**原因**: Cloud Function 返回错误
**解决**:
- 检查用户是否在 `allowedUsers` 中
- 检查 Cloud Function 日志
- 查看错误消息详情

---

## 📱 移动设备测试

### Android 测试
```
1. 在同一 WiFi 网络上
2. 获取本机 IP: ipconfig
3. 在手机浏览器打开: http://<your-ip>:8000/web/index-m6.html
4. 测试 Google Sign-In 和文件上传
```

### iOS 测试
```
1. 使用 iPhone Safari
2. 同上
3. 注意：iOS 可能需要特殊处理的 Google Sign-In
```

---

## 🚀 部署前最后检查

```powershell
# 1. 检查所有文件是否存在
Test-Path D:\chhsban\OfficeOMR\web\index.html
Test-Path D:\chhsban\OfficeOMR\web\js\*.js
Test-Path D:\chhsban\OfficeOMR\web\css\styles.css

# 2. 验证 Firebase 配置
# 打开 web/js/config.js 检查是否有有效的 apiKey 和 projectId

# 3. 检查部署配置
Test-Path D:\chhsban\OfficeOMR\firebase.json

# 4. 本地测试通过
python -m http.server 8000
# 访问 http://localhost:8000/web/index-m6.html 测试所有功能

# 5. 部署到 Firebase
firebase deploy --only hosting --project officeomr-fe542
```

---

## 📞 常用命令

```powershell
# 启动本地服务器
python -m http.server 8000 --directory "D:\chhsban\OfficeOMR\web"

# 查看 Firebase Hosting 日志
firebase hosting:logs --project officeomr-fe542

# 查看 Cloud Functions 日志
firebase functions:log --project officeomr-fe542

# 清理本地缓存
rm -r ~/.firebase/

# 查看部署历史
firebase hosting:versions --project officeomr-fe542
```

---

**文档完成！** 🎉

按照这份指南逐步检验前端功能，确保所有组件正常工作。

---

*最后更新: 2026-11-11*  
*工程师: Copilot*

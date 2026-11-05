# OfficeOMR Web Frontend 部署指南

## 快速开始

### 1. 获取 Firebase 配置

从 Firebase Console 获取 Web SDK 配置：

1. 打开 [Firebase Console](https://console.firebase.google.com/)
2. 选择项目 `officeomr-fe542`
3. 点击 **设置** (⚙️) → **项目设置**
4. 在 **Your apps** 部分找到 Web 应用
5. 复制 Web SDK 配置（`firebaseConfig` 对象）

### 2. 更新 index.html 中的配置

在 `index.html` 中找到这行代码：

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDEXAMPLE",                    // 替换
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.appspot.com",
  messagingSenderId: "601814582794",
  appId: "1:601814582794:web:example"         // 替换
};
```

替换以下字段（从 Firebase Console 复制）：
- `apiKey` 
- `appId`

### 3. 配置 Firebase Authentication

#### 启用 Google Sign-In

1. Firebase Console → **Authentication** → **Sign-in method**
2. 启用 **Google**
3. 选择项目支持邮箱
4. 点击 **Save**

#### 配置 OAuth Consent Screen

1. [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目
3. 左侧菜单 → **APIs & Services** → **OAuth consent screen**
4. 选择 **External**
5. 填写必要信息：
   - App name: `OfficeOMR`
   - User support email: 你的邮箱
   - Developer contact: 你的邮箱
6. 点击 **Save and Continue**

#### 添加测试用户

1. OAuth consent screen 页面 → **Test users** 部分
2. 点击 **Add users**
3. 添加需要测试的 Google 邮箱

### 4. 部署前端

```bash
cd D:\chhsban\OfficeOMR
firebase deploy --only hosting
```

## 文件结构

```
web/
├── index.html          # 主界面（包含 inline 脚本）
├── auth.js            # 可选：独立的认证模块（用于模块化开发）
├── SETUP.md           # 此文件
└── _redirects         # Netlify/Cloudflare 重定向规则（可选）
```

## 本地开发

### 方式 1：使用 Firebase Emulator

```bash
# 启动 Firebase 模拟器
firebase emulators:start --only auth,functions

# 在 index.html 中连接到本地模拟器
const firebaseConfig = {
  apiKey: "test-key",
  authDomain: "localhost:9099",
  projectId: "officeomr-fe542",
  // ... 其他配置
};

// 使用模拟器
firebase.initializeApp(firebaseConfig);
firebase.auth().useEmulator('http://localhost:9099');
```

### 方式 2：使用 Live Server

```bash
# 在 VS Code 中：
# 1. 右键点击 web/index.html
# 2. 选择 "Open with Live Server"
```

## 功能清单

- [x] Google Sign-In 按钮
- [x] 文件上传表单（图片/PDF）
- [x] 答题纸版型选择
- [x] 拖拽上传支持
- [x] 进度条显示
- [x] 结果显示（学号、准确度、答题数）
- [x] 结果下载（JSON 格式）
- [x] 错误处理（401/403/429/500）
- [x] 响应式设计（手机/平板/桌面）
- [x] 中文界面

## Cloud Function 集成

前端向此 Cloud Function 发送请求：

```
POST https://asia-southeast1-officeomr-fe542.cloudfunctions.net/recognize_sheet
Authorization: Bearer {Firebase ID Token}
Content-Type: multipart/form-data

image: (binary file)
template: "T100-A4-v1" | "T060-A4-v1"
```

### 响应格式

```json
{
  "job_id": "20260704-xxx",
  "result": {
    "student_id": "A001",
    "answers": [1, 2, 3, ...],
    "summary": {
      "overall_accuracy": 0.95,
      "marked_count": 100,
      "ambiguous_count": 0,
      "blank_count": 0,
      "multi_count": 0
    },
    "timestamp": "2026-07-04T10:30:00Z"
  },
  "annotated_image_url": "https://storage.googleapis.com/...",
  "expires_at": "2026-07-11T10:30:00Z"
}
```

## 调试

### 查看 Console 日志

1. 打开浏览器开发工具（F12）
2. 点击 **Console** 标签页
3. 观看日志消息和错误

### 常见问题

#### "CORS error" 或 "Authorization header not found"

- 确保 Firebase ID Token 正确传递
- 检查 Cloud Function 的 CORS 配置
- 检查浏览器控制台中的请求头

#### "User not approved" (403)

- 确保你的邮箱已添加到 Firestore `users/{user_id}` 集合
- 检查 Cloud Function 中的 whitelist 逻辑

#### "Quota exceeded" (429)

- 该用户已达到今日限额
- 明天再试

#### "File format not supported" (400)

- 仅支持 PNG、JPG 或 PDF
- 检查文件扩展名和 MIME 类型

## 性能优化

当前实现已针对以下进行优化：

- ✅ Firebase SDK 通过 CDN 加载（快速初始化）
- ✅ 渐进式进度条（改善用户体验）
- ✅ 客户端表单验证（减少服务器请求）
- ✅ 压缩后的 CSS/JS（减小传输大小）
- ✅ 移动端响应式设计

## 下一步

1. **Firestore 配置**（Phase 3）
   - 设置 users/ 集合 whitelist
   - 配置 security rules

2. **Cloud Storage 配置**（Phase 3）
   - 设置结果图像存储路径
   - 配置访问权限

3. **生产部署**（Phase 4）
   - 配置自定义域名
   - 启用 CDN 缓存
   - 设置监控告警

---

**最后更新**: 2026-07-04  
**维护者**: OfficeOMR Team

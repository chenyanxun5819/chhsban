# M6 部署方式和前端修复说明

## 🎯 核心问题纠正

### ❌ 之前的做法（错误）
我之前建议的是**手动部署**方式：
- 手动运行 `python tools/init_m6_data.py`
- 手动运行 `python tools/bootstrap_admin.py`
- 手动执行 `firebase deploy --only functions`

### ✅ 正确的做法
这个项目使用 **GitHub Actions CI/CD 自动部署**：

1. **当你 `git push` 时**:
   - GitHub Actions 自动触发 `.github/workflows/deploy.yml`
   - 自动安装依赖（Python + Node.js）
   - 自动同步 `omr_core` 到 `functions/`
   - 自动运行测试
   - 自动部署到 Firebase（所有组件）
   - 前端自动部署到 Firebase Hosting

2. **部署内容**:
   - ✅ Firestore Rules
   - ✅ Cloud Functions (Python)
   - ✅ Cloud Storage Rules
   - ✅ Web 前端（Firebase Hosting）

---

## 🔧 前端初始化问题修复

### 问题诊断
Console 中的错误信息：
```
❌ Uncaught SyntaxError: Unexpected token 'export'
❌ Cannot use import statement outside a module
❌ firebase is not defined
```

### 原因
1. HTML 中直接调用 `new OfficeOMRApp()` 时，Firebase SDK 还未完全加载
2. 需要等待 DOM 和所有脚本加载完成后再初始化

### 已修复
修改了 `web/index-m6.html` 中的初始化脚本：

**改前**:
```javascript
// 同步执行，Firebase 可能还没加载
const app = new OfficeOMRApp(firebaseConfig);
app.init().catch(...);
```

**改后**:
```javascript
// 等待 DOM 和脚本加载完成
document.addEventListener('DOMContentLoaded', async () => {
  // 验证 Firebase 已加载
  if (typeof firebase === 'undefined') {
    throw new Error('Firebase SDK not loaded');
  }
  
  // 初始化应用
  const app = new OfficeOMRApp(firebaseConfig);
  await app.init();
});
```

---

## 📋 接下来要做的事

### Step 1: 检查本地代码
```bash
cd D:\chhsban
git status
```

应该看到：
```
modified:   OfficeOMR/web/index-m6.html
```

### Step 2: Commit 这个修复
```bash
git add OfficeOMR/web/index-m6.html
git commit -m "🔧 Fix Firebase initialization in index-m6.html"
```

### Step 3: Push 触发自动部署
```bash
git push origin main
# 或
git push origin master
```

### Step 4: 监控部署进度
1. 打开 GitHub: https://github.com/chenyanxun5819/chhsban
2. 进入 Actions 标签页
3. 观看最新的 "Deploy to Firebase" 工作流

---

## ✅ 部署成功的迹象

当 GitHub Actions 完成时，你应该看到：

```
✅ Deploy to Firebase (Passed)
   ✅ Checkout code
   ✅ Set up Python
   ✅ Install Python dependencies
   ✅ Sync omr_core to functions
   ✅ Install Functions dependencies
   ✅ Verify Python imports
   ✅ Run Python tests
   ✅ Set up Node.js
   ✅ Install Firebase CLI
   ✅ Verify Firebase configuration
   ✅ Deploy to Firebase
   ✅ Post-deploy verification

🌐 Web app: https://officeomr-fe542.web.app
⚙️  Cloud Functions: asia-southeast1-officeomr-fe542
```

---

## 🌐 部署后访问

部署完成后，可以通过以下网址访问：

```
https://officeomr-fe542.web.app/index-m6.html
```

或者本地测试：
```bash
cd D:\chhsban\OfficeOMR\web
python -m http.server 8000
# 访问 http://localhost:8000/index-m6.html
```

---

## 🔑 为什么需要 FIREBASE_TOKEN?

GitHub Actions 需要 `FIREBASE_TOKEN` 来部署到你的 Firebase 项目。

### 检查 Token 是否已设置

1. 打开 GitHub 项目: https://github.com/chenyanxun5819/chhsban
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 查看是否有 `FIREBASE_TOKEN`

### 如果没有，需要重新生成

```bash
# 在本地运行
firebase login:ci --project officeomr-fe542

# 这会生成一个 token，复制它
# 然后粘贴到 GitHub Secrets 中
```

---

## 📊 重新部署 Stage A 的正确方式

如果需要重新初始化 Firestore 数据（比如重置所有数据），**正确的做法是**：

### 选项 1: 通过 CI/CD（推荐）
1. 在 `deploy.yml` 中添加一个新的部署步骤
2. Commit 和 Push
3. GitHub Actions 自动执行

### 选项 2: 手动方式（开发时用）
如果想手动测试：
```bash
cd D:\chhsban\OfficeOMR

# 确保已认证
gcloud auth application-default login

# 运行初始化脚本
python tools/init_m6_data.py
python tools/bootstrap_admin.py

# 部署 Cloud Functions
firebase deploy --only functions --project officeomr-fe542
```

---

## 🎓 核心要点

| 方面 | 说法 | 说明 |
|------|------|------|
| **部署方式** | git push → 自动部署 | ✅ 正确 |
| **前端构建** | 不需要构建 | 直接用 HTML/JS/CSS |
| **部署位置** | Firebase Hosting | 自动部署到 https://... |
| **手动脚本** | 只在本地测试时用 | 不是正式部署流程 |
| **Firestore 初始化** | 应该在 CI/CD 中 | 或手动运行一次后 push |

---

## 📝 总结

1. ✅ **修复了**: `web/index-m6.html` 的 Firebase 初始化问题
2. 📋 **要做**: `git add` → `git commit` → `git push`
3. ⏳ **会自动**: GitHub Actions 触发部署流程
4. 🌐 **部署到**: Firebase Hosting (https://officeomr-fe542.web.app)

---

*部署修复: 2026-11-11*
*下一步: Commit & Push 代码*

# GitHub Actions 自动部署指南

## 配置步骤

### 1️⃣ 生成 Firebase 令牌（在本地执行一次）

在你的 OfficeOMR 目录执行：

```powershell
firebase login:ci
```

这会打开浏览器让你授权，然后在终端输出一个长的 **Firebase Token**。复制这个令牌。

### 2️⃣ 在 GitHub 中设置 Secret

1. 打开 GitHub 仓库
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 名称：`FIREBASE_TOKEN`
5. 值：粘贴刚才复制的令牌
6. 点击 **Add secret**

### 3️⃣ 开始使用

设置完成后，每次你执行以下操作时，都会自动部署：

```powershell
git add .
git commit -m "Update OfficeOMR"
git push origin main
```

GitHub Actions 会自动：
- ✅ 检出代码
- ✅ 安装 Python 依赖
- ✅ 同步 `core/omr_core` 到 `functions/`
- ✅ 运行测试（可选）
- ✅ 部署到 Firebase（Hosting + Functions + Firestore Rules + Storage Rules）

### 4️⃣ 监控部署

- 在 GitHub 仓库的 **Actions** 标签页可以查看部署进度
- 若部署失败，会显示详细日志
- 部署成功后，网站会自动更新

---

## 常见问题

### Q: FIREBASE_TOKEN 过期了怎么办？
A: 重新运行 `firebase login:ci`，复制新令牌，然后在 GitHub 中更新 secret。

### Q: 我想只在 main 分支部署，其他分支不部署？
A: 已配置。workflow 只在 `main` 或 `master` 分支的 push 时触发。

### Q: 我想手动触发部署？
A: 可以在 GitHub Actions 页面点击 "Run workflow" 手动执行。

### Q: 如果 main 分支没有 push 权限怎么办？
A: 在 main 分支合并 PR 时会自动部署（PR merge 相当于 push）。

---

## 部署包含的内容

此 workflow 会部署：
- 📱 **Web / Hosting**：`web/` 目录
- ⚙️ **Cloud Functions**：`functions/` 目录（Python runtime）
- 📋 **Firestore Rules**：`firestore.rules`
- 💾 **Storage Rules**：`storage.rules`
- 📊 **Firestore Indexes**：`firestore.indexes.json`

---

## 本地快速部署（仍然可用）

如果需要立即测试而不想 push：

```powershell
firebase deploy --only functions --project officeomr-fe542
```

或完整部署：

```powershell
firebase deploy --project officeomr-fe542
```

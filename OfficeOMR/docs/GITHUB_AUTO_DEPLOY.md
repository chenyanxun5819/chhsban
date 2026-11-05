# GitHub 自动部署设置（OfficeOMR）

本项目在 monorepo（chhsban.git）下使用根目录工作流：`../.github/workflows/deploy-officeomr.yml`（仓库内路径为 `.github/workflows/deploy-officeomr.yml`）。
推送到 `main` 或 `master` 时会自动部署：

- Firebase Hosting
- Cloud Functions (Python)
- Firestore Rules / Indexes
- Storage Rules

## 1. 必要前置

1. 你需要有 Firebase 项目 `officeomr-fe542` 的部署权限。
2. 在 Google Cloud 创建服务账号，至少赋予以下角色：
   - Firebase Admin
   - Cloud Functions Admin
   - Cloud Run Admin
   - Service Account User
   - Storage Admin
   - Datastore User
3. 生成 JSON Key（只用于 GitHub Secret，不要提交到仓库）。

## 2. GitHub Secrets 设置

到仓库 Settings -> Secrets and variables -> Actions -> New repository secret：

- Name: `FIREBASE_SERVICE_ACCOUNT`
- Value: 整段服务账号 JSON 内容（从 `{` 到 `}` 原样贴上）

## 3. 分支触发

工作流触发条件：

- push 到 `main`
- push 到 `master`
- 且本次提交包含 `OfficeOMR/**` 路径变更
- 手动触发（workflow_dispatch）

## 4. 本地与仓库安全

- 已将 `key.json` 加入 `.gitignore`，避免误提交。
- 若你之前曾提交过服务账号文件，必须立刻轮换密钥并清理 Git 历史。

## 5. 常见失败点

1. `Missing secret: FIREBASE_SERVICE_ACCOUNT`
   - 代表 GitHub Secret 尚未设置。
2. `Permission denied` 或 `403`
   - 代表服务账号角色不足。
3. `Project not found`
   - 检查 `FIREBASE_PROJECT_ID` 是否正确（当前默认 `officeomr-fe542`）。

## 6. 可选增强（建议后续）

- 把部署拆成 `hosting` 与 `functions` 两条工作流，缩短失败排查时间。
- 只在路径变更时触发（例如仅修改 `web/**` 时部署 hosting）。

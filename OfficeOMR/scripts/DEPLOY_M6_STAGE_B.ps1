#!/usr/bin/env pwsh
# ============================================================
# M6 Stage B 部署脚本
# ============================================================
# 部署前端管理系统
# 用法: .\DEPLOY_M6_STAGE_B.ps1
# ============================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        M6 Stage B 前端部署脚本                  ║" -ForegroundColor Cyan
Write-Host "║        Admin & Teacher Dashboard                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查当前目录
if (-not (Test-Path firebase.json)) {
    Write-Host "❌ 错误: 请从 OfficeOMR 项目根目录运行此脚本" -ForegroundColor Red
    Write-Host "当前目录: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

$projectId = "officeomr-fe542"

# ============================================================
# 步骤 1: 检查前端文件
# ============================================================

Write-Host ""
Write-Host "步骤 1️⃣: 检查前端文件" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

$requiredFiles = @(
    "web/index-m6.html",
    "web/js/config.js",
    "web/js/auth-flow.js",
    "web/js/app.js",
    "web/js/pages/login.js",
    "web/js/pages/admin.js",
    "web/js/pages/teacher.js",
    "web/css/styles.css"
)

$missingFiles = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missingFiles += $file
        Write-Host "❌ $file" -ForegroundColor Red
    } else {
        Write-Host "✅ $file" -ForegroundColor Green
    }
}

if ($missingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ 缺少文件，无法继续部署" -ForegroundColor Red
    exit 1
}

# ============================================================
# 步骤 2: 验证 Firebase 配置
# ============================================================

Write-Host ""
Write-Host "步骤 2️⃣: 验证 Firebase 配置" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

$firebaseJson = Get-Content firebase.json | ConvertFrom-Json
if ($firebaseJson.hosting) {
    Write-Host "✅ firebase.json 配置有效" -ForegroundColor Green
    Write-Host "   项目 ID: $projectId" -ForegroundColor Gray
    Write-Host "   Hosting: $($firebaseJson.hosting | ConvertTo-Json -Compress)" -ForegroundColor Gray
} else {
    Write-Host "❌ firebase.json 配置无效" -ForegroundColor Red
    exit 1
}

# ============================================================
# 步骤 3: 部署前端
# ============================================================

Write-Host ""
Write-Host "步骤 3️⃣: 部署前端到 Firebase Hosting" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

Write-Host "执行: firebase deploy --only hosting --project $projectId" -ForegroundColor Yellow
firebase deploy --only hosting --project $projectId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 前端部署成功" -ForegroundColor Green
} else {
    Write-Host "⚠️ 前端部署返回状态码: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "请检查上面的错误信息，然后重试" -ForegroundColor Yellow
    exit $LASTEXITCODE
}

# ============================================================
# 步骤 4: 验证部署
# ============================================================

Write-Host ""
Write-Host "步骤 4️⃣: 验证部署完成" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

Write-Host "查询 Firebase Hosting..." -ForegroundColor Yellow
firebase hosting:channel:list --project $projectId 2>&1 | Select-Object -First 5

Write-Host ""
Write-Host "访问应用: " -ForegroundColor Cyan
Write-Host "  https://$projectId.web.app" -ForegroundColor White
Write-Host "  或" -ForegroundColor Cyan
Write-Host "  https://$projectId.firebaseapp.com" -ForegroundColor White

# ============================================================
# 完成
# ============================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        ✅ M6 Stage B 前端部署完成！        ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

Write-Host ""
Write-Host "📋 接下来的步骤:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 测试登入流程" -ForegroundColor Cyan
Write-Host "   - 用你的 Google 账号访问应用" -ForegroundColor Gray
Write-Host "   - 应该会看到「账户未授权」的提示" -ForegroundColor Gray
Write-Host "   - 这是正常的，因为你还没有在 allowedUsers 中" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 使用 Admin SDK 添加测试用户" -ForegroundColor Cyan
Write-Host "   - 运行: python tools/bootstrap_admin.py <project_id> <email>" -ForegroundColor Gray
Write-Host "   - 这将设置你为 super_admin" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 重新登入系统" -ForegroundColor Cyan
Write-Host "   - 刷新页面或重新登入" -ForegroundColor Gray
Write-Host "   - 应该会看到 Super Admin 管理后台" -ForegroundColor Gray
Write-Host ""
Write-Host "4. 添加教师账户（作为 super_admin）" -ForegroundColor Cyan
Write-Host "   - 在管理后台中通过相应的管理函数添加教师" -ForegroundColor Gray
Write-Host ""
Write-Host "5. 测试教师工作流" -ForegroundColor Cyan
Write-Host "   - 用另一个教师账号登入" -ForegroundColor Gray
Write-Host "   - 应该会看到教师工作台" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 参考文档:" -ForegroundColor Yellow
Write-Host "  • docs/M6_QUICK_START.md" -ForegroundColor Gray
Write-Host "  • web/SETUP.md" -ForegroundColor Gray
Write-Host ""

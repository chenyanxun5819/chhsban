# ============================================================
# M6 Stage A 部署脚本
# ============================================================
# 在 VS Code PowerShell 终端中执行此脚本
# 用法: .\DEPLOY_M6_STAGE_A.ps1
# ============================================================

Write-Host "`n" -ForegroundColor Cyan
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        M6 Stage A 完整部署脚本                    ║" -ForegroundColor Cyan
Write-Host "║        Multi-Role Auth Infrastructure               ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查当前目录
if (-not (Test-Path firestore.rules)) {
    Write-Host "❌ 错误: 请从 OfficeOMR 项目根目录运行此脚本" -ForegroundColor Red
    Write-Host "当前目录: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

# 设置环境
$env:PYTHONIOENCODING = 'utf-8'
$projectId = "officeomr-fe542"

# ============================================================
# 验证虚拟环境
# ============================================================
Write-Host "验证虚拟环境..." -ForegroundColor Yellow
$venvPython = "$(Get-Location)\.venv\Scripts\python.exe"
$venvPip = "$(Get-Location)\.venv\Scripts\pip.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "❌ 虚拟环境不存在: $venvPython" -ForegroundColor Red
    Write-Host "请先运行虚拟环境创建命令:" -ForegroundColor Yellow
    Write-Host "  python -m venv .venv" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ 虚拟环境已找到" -ForegroundColor Green

# 检查 firebase-admin
Write-Host "检查 firebase-admin..." -ForegroundColor Yellow
$fbCheck = & $venvPip show firebase-admin 2>&1
if ($fbCheck -match "^Version:") {
    $version = ($fbCheck | Select-String "^Version:" | ForEach-Object { $_ -replace "Version:\s+", "" }).Trim()
    Write-Host "✅ firebase-admin 已安装: $version" -ForegroundColor Green
} else {
    Write-Host "❌ firebase-admin 未安装，正在安装..." -ForegroundColor Yellow
    & $venvPip install firebase-admin
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ firebase-admin 安装失败" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ firebase-admin 安装成功" -ForegroundColor Green
}

Write-Host "✅ 使用默认凭证（Application Default Credentials）" -ForegroundColor Green
Write-Host "   - 本地 gcloud auth，或" -ForegroundColor Gray
Write-Host "   - GOOGLE_APPLICATION_CREDENTIALS 环境变量" -ForegroundColor Gray

Write-Host ""

# ============================================================
# 步骤 1: 初始化 Firestore 数据
# ============================================================

Write-Host ""
Write-Host "步骤 1️⃣: 初始化 Firestore 数据" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

if (-not (Test-Path "tools/init_m6_data.py")) {
    Write-Host "❌ tools/init_m6_data.py 不存在" -ForegroundColor Red
    exit 1
}

Write-Host "执行: $venvPython tools/init_m6_data.py --project-id $projectId" -ForegroundColor Yellow
& $venvPython -u tools/init_m6_data.py --project-id $projectId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firestore 数据初始化成功" -ForegroundColor Green
} else {
    Write-Host "⚠️ Firestore 初始化返回状态码: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "请检查上面的错误信息，然后重试" -ForegroundColor Yellow
    pause
}

# ============================================================
# 步骤 2: Bootstrap Wes 为 Super Admin
# ============================================================

Write-Host ""
Write-Host "步骤 2️⃣: Bootstrap Wes 为 Super Admin" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

if (-not (Test-Path "tools/bootstrap_admin.py")) {
    Write-Host "❌ tools/bootstrap_admin.py 不存在" -ForegroundColor Red
    exit 1
}

$email = "weschen@mybazaar.my"
Write-Host "执行: $venvPython tools/bootstrap_admin.py $projectId $email" -ForegroundColor Yellow
& $venvPython -u tools/bootstrap_admin.py $projectId $email

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Super Admin 账户创建成功" -ForegroundColor Green
} else {
    Write-Host "⚠️ Bootstrap 返回状态码: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "请检查上面的错误信息，然后重试" -ForegroundColor Yellow
    Read-Host "按 Enter 继续"
}

# ============================================================
# 步骤 3: 部署 Cloud Functions
# ============================================================

Write-Host ""
Write-Host "步骤 3️⃣: 部署 Cloud Functions" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

if (-not (Test-Path "functions/callables_m6.py")) {
    Write-Host "❌ functions/callables_m6.py 不存在" -ForegroundColor Red
    exit 1
}

Write-Host "执行: firebase deploy --only functions --project $projectId" -ForegroundColor Yellow
firebase deploy --only functions --project $projectId

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Cloud Functions 部署成功" -ForegroundColor Green
} else {
    Write-Host "⚠️ Cloud Functions 部署返回状态码: $LASTEXITCODE" -ForegroundColor Yellow
    Write-Host "请检查上面的错误信息，然后重试" -ForegroundColor Yellow
    Read-Host "按 Enter 继续"
}

# ============================================================
# 步骤 4: 验证部署
# ============================================================

Write-Host ""
Write-Host "步骤 4️⃣: 验证部署完成" -ForegroundColor Cyan
Write-Host "─────────────────────────────────" -ForegroundColor Cyan

Write-Host "查询 Cloud Functions..." -ForegroundColor Yellow
gcloud functions list --regions=us-central1 --project $projectId 2>&1 | Select-Object -First 10

Write-Host ""
Write-Host "查询 Firestore 集合..." -ForegroundColor Yellow
Write-Host "请访问: https://console.firebase.google.com/project/$projectId/firestore" -ForegroundColor Cyan
Write-Host "验证以下集合是否存在:" -ForegroundColor White
Write-Host "  • settings/global" -ForegroundColor White
Write-Host "  • orgs/chhs" -ForegroundColor White
Write-Host "  • allowedUsers" -ForegroundColor White
Write-Host "  • usage" -ForegroundColor White

# ============================================================
# 完成
# ============================================================

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║        ✅ M6 Stage A 部署完成！              ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📋 接下来的步骤:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 验证所有部署成功（查看上面的输出）" -ForegroundColor White
Write-Host "2. 进入 Stage B - 前端实现（Web UI、权限管理界面）" -ForegroundColor White
Write-Host "3. 运行端到端测试验证所有 8 个 M6 接受标准" -ForegroundColor White
Write-Host ""

Write-Host "📚 参考文档:" -ForegroundColor Yellow
Write-Host "  • docs/M6_QUICK_START.md" -ForegroundColor Cyan
Write-Host "  • docs/M6_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host "  • docs/M6_STAGE_A_SUMMARY.md" -ForegroundColor Cyan
Write-Host ""

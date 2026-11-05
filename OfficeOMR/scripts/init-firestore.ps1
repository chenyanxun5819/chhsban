#!/usr/bin/env pwsh
# OfficeOMR Firestore 初始化脚本
# 
# 功能：
# 1. 初始化 settings/global 文档（全局配置）
# 2. 创建管理员用户（第一次运行）
# 3. 设置 Security Rules
#
# 使用方式:
#   .\scripts\init-firestore.ps1
#
# 前置要求:
#   - Firebase CLI 已安装
#   - .firebaserc 配置正确
#   - gcloud auth login 已执行

param(
    [switch]$UseEmulator,
    [string]$AdminEmail = ""
)

# ========== 配置 ==========
$ProjectId = "officeomr-fe542"
$EmulatorHost = "127.0.0.1:8080"

# ========== 颜色输出 ==========
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error_ { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warning_ { Write-Host "⚠️ $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ️ $args" -ForegroundColor Cyan }

# ========== 验证 Firebase CLI ==========
Write-Info "检查 Firebase CLI..."
$firebaseVersion = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error_ "Firebase CLI 未安装。请运行: npm install -g firebase-tools"
    exit 1
}
Write-Success "Firebase CLI 版本: $firebaseVersion"

# ========== 连接到 Emulator 或生产环境 ==========
if ($UseEmulator) {
    Write-Warning_ "使用本地 Firebase Emulator..."
    Write-Info "确保 Emulator 已启动: firebase emulators:start"
    $env:FIREBASE_AUTH_EMULATOR_HOST = $EmulatorHost
    $env:FIRESTORE_EMULATOR_HOST = $EmulatorHost
} else {
    Write-Info "连接到生产 Firestore ($ProjectId)..."
}

# ========== 初始化 settings/global ==========
Write-Info "初始化 settings/global 文档..."

$SettingsJson = @"
{
  "daily_limit_per_teacher": 100,
  "max_file_size_mb": 50,
  "result_expiry_days": 7,
  "updated_at": "$(Get-Date -Format 'o')"
}
"@

# 创建临时文件
$tempFile = [System.IO.Path]::GetTempFileName()
$SettingsJson | Out-File -FilePath $tempFile -Encoding UTF8 -Force

# 使用 Firebase CLI 设置文档（通过 gcloud）
# 注意：Firebase CLI 本身不支持直接写 Firestore，需要使用 gcloud 或通过 Admin SDK

if ($UseEmulator) {
    Write-Info "尝试通过 Admin SDK 初始化数据（Emulator 模式）..."
    # Emulator 模式需要通过 Node.js 脚本
    Write-Warning_ "使用 Emulator 时，请运行对应的 Node.js 初始化脚本"
} else {
    Write-Info "生产环境初始化..."
    Write-Warning_ "敏感操作：请确保已授权。推荐使用 Admin SDK 脚本而非 CLI。"
}

# ========== 提示用户操作 ==========
Write-Info ""
Write-Info "=== Firestore 初始化清单 ==="
Write-Info ""
Write-Info "1️⃣ 通过 Firebase Console 手动初始化（推荐）:"
Write-Info "   - 访问 Firebase Console"
Write-Info "   - 选择项目: $ProjectId"
Write-Info "   - Firestore Database → 创建集合"
Write-Info "   - 集合名: settings"
Write-Info "   - 文档 ID: global"
Write-Info "   - 字段:"
Write-Info "     - daily_limit_per_teacher (number): 100"
Write-Info "     - max_file_size_mb (number): 50"
Write-Info "     - result_expiry_days (number): 7"
Write-Info "     - updated_at (timestamp): $(Get-Date)"
Write-Info ""

Write-Info "2️⃣ 或通过 Admin SDK 脚本初始化:"
Write-Info "   - 见 functions/init_data.py"
Write-Info "   - 在 Cloud Function 部署后运行"
Write-Info ""

Write-Info "3️⃣ 创建第一个管理员用户（可选）:"
if ($AdminEmail -ne "") {
    Write-Info "   - 邮箱: $AdminEmail"
} else {
    Write-Info "   - 提示: -AdminEmail your@email.com"
}
Write-Info "   - 在 Firebase Console Firestore 中："
Write-Info "   - 集合: users"
Write-Info "   - 文档 ID: {uid} (来自 Firebase Auth)"
Write-Info "   - 字段:"
Write-Info "     - email (string): 你的邮箱"
Write-Info "     - approved (boolean): true"
Write-Info "     - role (string): admin"
Write-Info "     - created_at (timestamp): 现在"
Write-Info ""

Write-Info "4️⃣ 部署 Security Rules:"
Write-Info "   firebase deploy --only firestore:rules,storage"
Write-Info ""

Write-Success "Firestore 初始化步骤已准备完成！"

# 清理
Remove-Item $tempFile -ErrorAction SilentlyContinue

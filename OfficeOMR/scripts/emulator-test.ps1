#!/usr/bin/env pwsh
# Firebase Emulator 启动和测试脚本
#
# 功能：
# 1. 启动本地 Firebase Emulator（Auth + Firestore + Storage）
# 2. 初始化测试数据
# 3. 运行集成测试
#
# 使用方式：
#   .\scripts\emulator-test.ps1         # 启动 Emulator
#   .\scripts\emulator-test.ps1 -Stop   # 停止 Emulator
#   .\scripts\emulator-test.ps1 -Test   # 运行测试

param(
    [switch]$Stop,
    [switch]$Test,
    [switch]$Clean
)

# ========== 配置 ==========
$EmulatorPort = 4000
$FirestorePort = 8080
$AuthPort = 9099
$StoragePort = 4001
$FunctionsPort = 5001

# ========== 颜色输出 ==========
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error_ { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Warning_ { Write-Host "⚠️ $args" -ForegroundColor Yellow }
function Write-Info { Write-Host "ℹ️ $args" -ForegroundColor Cyan }

# ========== 验证 Firebase CLI ==========
Write-Info "检查 Firebase CLI..."
$firebaseVersion = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error_ "Firebase CLI 未安装"
    Write-Info "请运行: npm install -g firebase-tools"
    exit 1
}
Write-Success "Firebase CLI 版本: $firebaseVersion"

# ========== 停止 Emulator ==========
if ($Stop) {
    Write-Info "停止 Firebase Emulator..."
    firebase emulators:stop 2>$null | Out-Null
    Write-Success "Emulator 已停止"
    exit 0
}

# ========== 清理数据 ==========
if ($Clean) {
    Write-Warning_ "清理 Emulator 数据..."
    $env:FIREBASE_FIRESTORE_EMULATOR_HOST = "127.0.0.1:$FirestorePort"
    $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:$AuthPort"
    # Emulator 数据通常存储在 ~/.cache/firebase/emulators/
    Write-Info "Emulator 数据位置: ~/.cache/firebase/emulators/"
    Write-Info "手动删除数据后，重启 Emulator"
}

# ========== 启动 Emulator ==========
Write-Info ""
Write-Info "================================"
Write-Info "启动 Firebase Emulator Suite"
Write-Info "================================"
Write-Info ""
Write-Info "服务端口："
Write-Info "  - Firestore: 127.0.0.1:$FirestorePort"
Write-Info "  - Auth: 127.0.0.1:$AuthPort"
Write-Info "  - Storage: 127.0.0.1:$StoragePort"
Write-Info "  - Functions: 127.0.0.1:$FunctionsPort"
Write-Info "  - UI: http://127.0.0.1:$EmulatorPort"
Write-Info ""
Write-Info "设置环境变量:"
Write-Info "  `$env:FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:$AuthPort'"
Write-Info "  `$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:$FirestorePort'"
Write-Info ""

# 启动 Emulator（包含 Auth, Firestore, Storage）
firebase emulators:start --only auth,firestore,storage --export-on-exit

# ========== 如果启动失败 ==========
if ($LASTEXITCODE -ne 0) {
    Write-Error_ "Emulator 启动失败"
    Write-Info "常见问题:"
    Write-Info "1. 端口被占用：killall node 或修改 firebase.json 中的端口"
    Write-Info "2. Java 未安装：Firebase Emulator 需要 Java"
    Write-Info "3. firebase-tools 版本过旧：npm install -g firebase-tools@latest"
    exit 1
}

# ========== 运行测试 ==========
if ($Test) {
    Write-Info ""
    Write-Info "开始运行集成测试..."
    Write-Info ""
    
    # 设置环境变量
    $env:FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:$AuthPort"
    $env:FIRESTORE_EMULATOR_HOST = "127.0.0.1:$FirestorePort"
    
    # 初始化测试数据
    Write-Info "初始化测试数据..."
    python functions/init_data.py --use-emulator
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error_ "初始化测试数据失败"
        exit 1
    }
    
    # 运行测试
    Write-Info "运行单元测试..."
    # pytest 测试在这里运行（待实现）
    
    Write-Success "所有测试完成"
}

Write-Success "Firebase Emulator 运行中..."
Write-Info "在浏览器打开: http://127.0.0.1:$EmulatorPort"

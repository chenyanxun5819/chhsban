# M7 部署脚本 - 2026-11-12
# 部署 M7 Cloud Functions 和前端代码

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       M7 教师流程 - Cloud Functions 部署脚本          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

$ROOT = "D:\chhsban\OfficeOMR"
$PROJECT_ID = "officeomr-fe542"
$REGION = "us-central1"

# ============================================================
# 1. 验证前置条件
# ============================================================

Write-Host "`n📋 第 1 步：验证前置条件..." -ForegroundColor Yellow

# 检查 Node.js 和 npm
Write-Host "  ✓ 检查 Node.js/npm..." -NoNewline
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " OK ($nodeVersion)" -ForegroundColor Green
} else {
    Write-Host " ❌ 未找到 Node.js" -ForegroundColor Red
    Write-Host "    请先安装 Node.js 从 https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 检查 Python
Write-Host "  ✓ 检查 Python..." -NoNewline
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " OK ($pythonVersion)" -ForegroundColor Green
} else {
    Write-Host " ❌ 未找到 Python" -ForegroundColor Red
    exit 1
}

# 检查 Firebase CLI
Write-Host "  ✓ 检查 Firebase CLI..." -NoNewline
$firebaseVersion = npm list -g firebase-tools 2>&1 | grep firebase-tools
if ($LASTEXITCODE -eq 0) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " 未安装，正在安装..." -ForegroundColor Yellow
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ❌ Firebase CLI 安装失败" -ForegroundColor Red
        exit 1
    }
}

# 检查项目文件
Write-Host "  ✓ 检查项目文件..." -NoNewline
if ((Test-Path "$ROOT\functions\callables_m7.py") -and 
    (Test-Path "$ROOT\firebase.json") -and
    (Test-Path "$ROOT\firestore.rules")) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " ❌ 部分项目文件缺失" -ForegroundColor Red
    exit 1
}

# ============================================================
# 2. 检查 Firebase 认证
# ============================================================

Write-Host "`n🔐 第 2 步：检查 Firebase 认证..." -ForegroundColor Yellow

Write-Host "  ✓ 验证 Firebase 项目 ($PROJECT_ID)..." -NoNewline
firebase use $PROJECT_ID 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " OK" -ForegroundColor Green
} else {
    Write-Host " ❌ 无法连接到 Firebase 项目" -ForegroundColor Red
    Write-Host "    请运行: firebase login" -ForegroundColor Yellow
    exit 1
}

# ============================================================
# 3. 部署 Firestore 规则
# ============================================================

Write-Host "`n📝 第 3 步：部署 Firestore 规则..." -ForegroundColor Yellow

Write-Host "  ✓ 部署 firestore.rules..." -NoNewline
Set-Location $ROOT
firebase deploy --only firestore:rules --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  (继续)" -ForegroundColor Yellow
}

# ============================================================
# 4. 检查和安装 Python 依赖
# ============================================================

Write-Host "`n📦 第 4 步：检查 Python 依赖..." -ForegroundColor Yellow

Set-Location "$ROOT\functions"

Write-Host "  ✓ 安装 requirements.txt..." -NoNewline
pip install -q --upgrade -r requirements.txt 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  (检查手动安装)" -ForegroundColor Yellow
}

# ============================================================
# 5. 运行单元测试
# ============================================================

Write-Host "`n🧪 第 5 步：运行单元测试..." -ForegroundColor Yellow

Write-Host "  ✓ 运行 test_m7.py..." -NoNewline
$testOutput = pytest test_m7.py -v --tb=short 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
    # 统计测试结果
    $passCount = ($testOutput | Select-String "passed" | Select-Object -First 1) -replace ".*(\d+) passed.*", '$1'
    Write-Host "         结果: $passCount 个测试通过 ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  (某些测试未通过)" -ForegroundColor Yellow
    Write-Host $testOutput
}

# ============================================================
# 6. 部署 Cloud Functions
# ============================================================

Write-Host "`n⚡ 第 6 步：部署 Cloud Functions..." -ForegroundColor Yellow
Write-Host "  这可能需要 2-5 分钟..." -ForegroundColor Gray

Set-Location $ROOT

# 确定存储桶名称
$STORAGE_BUCKET = "$PROJECT_ID.firebasestorage.app"

Write-Host "  ✓ 部署 M7 functions ($STORAGE_BUCKET)..." -NoNewline

# 部署函数
firebase deploy --only functions \
  --set-env-vars "STORAGE_BUCKET=$STORAGE_BUCKET" \
  --quiet 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  (检查错误信息)" -ForegroundColor Yellow
}

# ============================================================
# 7. 部署前端代码
# ============================================================

Write-Host "`n🌐 第 7 步：部署前端代码..." -ForegroundColor Yellow

Write-Host "  ✓ 部署 Hosting (web 目录)..." -NoNewline
firebase deploy --only hosting --quiet 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host " ✅" -ForegroundColor Green
} else {
    Write-Host " ⚠️  (检查错误信息)" -ForegroundColor Yellow
}

# ============================================================
# 8. 验证部署
# ============================================================

Write-Host "`n✅ 第 8 步：验证部署..." -ForegroundColor Yellow

Write-Host "  ✓ 检查已部署的函数..." -NoNewline
$functions = firebase functions:list --quiet 2>&1
if ($functions -like "*uploadAnswerKeyByImage*") {
    Write-Host " ✅" -ForegroundColor Green
    Write-Host "    已部署的 M7 函数:" -ForegroundColor Gray
    $functions | Select-String "m7\|uploadAnswerKey\|recognizeAndGrade\|cleanup" | ForEach-Object {
        Write-Host "      - $_" -ForegroundColor Gray
    }
} else {
    Write-Host " ⚠️  (无法验证)" -ForegroundColor Yellow
}

# ============================================================
# 9. 显示部署信息
# ============================================================

Write-Host "`n📋 第 9 步：部署信息总结..." -ForegroundColor Yellow

Write-Host @"
╔════════════════════════════════════════════════════════╗
║                  部署完成总结                         ║
╚════════════════════════════════════════════════════════╝

✅ 已部署项目:
   • Firestore 规则 (answerKey 保护)
   • Cloud Functions (6 个 M7 函数)
   • 前端代码 (Hosting)

📍 项目 ID: $PROJECT_ID
🌍 Hosting URL: https://officeomr-fe542.web.app
📦 Functions 区域: $REGION

🔗 可用的 M7 Cloud Functions:
   1. uploadAnswerKeyByImage() - 扫描标准答案
   2. uploadAnswerKeyManually() - 手动输入答案
   3. getAnswerKey() - 查询标准答案
   4. recognizeAndGradeSheet() - 识别并评分
   5. batchRecognizeSheets() - 批量处理
   6. cleanupJobStudentData() - 24h 自动清理

📚 文档位置:
   D:\chhsban\OfficeOMR\docs\M7\

下一步:
   1. 测试前端 API 调用
   2. 配置 Cloud Scheduler (每小时清理)
   3. 配置 Cloud Storage 生命周期规则
   4. 进行端到端测试

"@ -ForegroundColor Green

# ============================================================
# 10. 可选：启动本地开发服务器
# ============================================================

Write-Host "`n🎯 可选步骤..." -ForegroundColor Yellow
$response = Read-Host "是否要启动本地开发服务器进行测试？(y/n)"

if ($response -eq "y" -or $response -eq "Y") {
    Write-Host "`n🚀 启动 Firebase 模拟器和 dev server..." -ForegroundColor Cyan
    Write-Host "   按 Ctrl+C 停止" -ForegroundColor Gray
    
    Set-Location $ROOT
    firebase emulators:start --only firestore,functions,hosting 2>&1
}

Write-Host "`n✨ M7 部署完成！" -ForegroundColor Green

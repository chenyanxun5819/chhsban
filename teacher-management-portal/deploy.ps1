# 快速部署腳本
# 使用方式: .\deploy.ps1

Write-Host "🚀 開始部署 teacher-management-portal..." -ForegroundColor Green

# 清除舊的 dist 目錄
Write-Host "🧹 清除舊的構建文件..." -ForegroundColor Yellow
Remove-Item -Path .\dist -Recurse -Force -ErrorAction SilentlyContinue

# 構建
Write-Host "📦 構建中..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 構建失敗" -ForegroundColor Red
    exit 1
}

# 部署
Write-Host "🌐 部署中..." -ForegroundColor Yellow
wrangler pages deploy dist --commit-dirty=true

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 部署成功！" -ForegroundColor Green
    Write-Host "🔗 訪問地址: https://master.teacher-management-portal.pages.dev" -ForegroundColor Cyan
} else {
    Write-Host "❌ 部署失敗" -ForegroundColor Red
    exit 1
}

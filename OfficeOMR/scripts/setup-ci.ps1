# Firebase CI/CD 快速设置脚本

echo "=========================================="
echo "Firebase 自动部署设置"
echo "=========================================="
echo ""

# Step 1: 检查是否已登录
echo "📝 检查 Firebase 登录状态..."
firebase projects:list > $null 2>&1
if ($LASTEXITCODE -eq 0) {
    echo "✅ 已登录 Firebase"
} else {
    echo "⚠️  未登录。请执行: firebase login"
    exit 1
}

# Step 2: 生成 CI 令牌
echo ""
echo "🔑 生成 Firebase CI 令牌..."
echo "这将打开浏览器让你授权。请完成授权流程。"
echo ""

firebase login:ci --no-localhost

if ($LASTEXITCODE -eq 0) {
    echo ""
    echo "✅ 令牌已生成！"
    echo ""
    echo "📋 接下来："
    echo "1. 在 GitHub 仓库打开 Settings → Secrets and variables → Actions"
    echo "2. 点击 'New repository secret'"
    echo "3. 名称输入: FIREBASE_TOKEN"
    echo "4. 值输入上面输出的令牌"
    echo "5. 点击 'Add secret'"
    echo ""
    echo "设置完成后，每次 git push 都会自动部署！"
} else {
    echo "❌ 令牌生成失败。请检查网络连接或 Firebase 项目配置。"
    exit 1
}

echo ""
echo "=========================================="
echo "详见: DEPLOY_GUIDE.md"
echo "=========================================="

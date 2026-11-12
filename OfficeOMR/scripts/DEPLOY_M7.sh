#!/bin/bash
# M7 部署脚本 - 快速版本
# 直接部署到 Firebase

cd D:\chhsban\OfficeOMR

echo "╔════════════════════════════════════════════╗"
echo "║   M7 部署 - Firebase 生产环境             ║"
echo "╚════════════════════════════════════════════╝"

# 检查 firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI 未找到"
    echo "请先安装: npm install -g firebase-tools"
    exit 1
fi

echo ""
echo "📦 第 1 步：验证 Firebase 项目..."
firebase use --add 2>/dev/null || firebase use default

echo ""
echo "📝 第 2 步：部署 Firestore 规则..."
firebase deploy --only firestore:rules --quiet

echo ""
echo "📝 第 3 步：部署 Storage 规则..."
firebase deploy --only storage --quiet

echo ""
echo "⚡ 第 4 步：部署 Cloud Functions..."
firebase deploy --only functions --quiet

echo ""
echo "🌐 第 5 步：部署前端代码..."
firebase deploy --only hosting --quiet

echo ""
echo "✅ 部署完成！"
echo ""
echo "📍 访问地址: https://officeomr-fe542.web.app"
echo "📊 Console: https://console.firebase.google.com/project/officeomr-fe542"
echo ""

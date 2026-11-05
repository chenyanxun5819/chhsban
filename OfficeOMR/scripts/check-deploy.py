#!/usr/bin/env python3
"""
Deployment diagnostics script for OfficeOMR
验证本地和 GitHub Actions 部署前的配置
"""

import os
import sys
import json
import subprocess
from pathlib import Path

def check(condition, message, severity="error"):
    """Print check result"""
    symbol = "✅" if condition else ("⚠️ " if severity == "warning" else "❌")
    print(f"{symbol} {message}")
    return condition

def run_command(cmd, description):
    """Run a shell command and return success status"""
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
        success = result.returncode == 0
        check(success, f"{description} — {cmd}")
        if not success and result.stderr:
            print(f"   Error: {result.stderr[:200]}")
        return success
    except Exception as e:
        check(False, f"{description} — {str(e)}")
        return False

print("=" * 60)
print("OfficeOMR 部署诊断检查")
print("=" * 60)
print()

# Step 1: 检查文件结构
print("📁 检查项目结构...")
required_files = [
    "firebase.json",
    ".firebaserc",
    "firestore.rules",
    "storage.rules",
    "functions/main.py",
    "functions/requirements.txt",
    "web/index.html",
    "core/pyproject.toml",
    ".github/workflows/deploy.yml",
]

all_exist = True
for file in required_files:
    exists = Path(file).exists()
    check(exists, f"  {file}")
    all_exist = all_exist and exists

print()

# Step 2: 检查 Firebase 配置
print("🔥 检查 Firebase 配置...")
try:
    with open("firebase.json") as f:
        config = json.load(f)
    check("hosting" in config, "  firebase.json 包含 hosting 配置")
    check("functions" in config, "  firebase.json 包含 functions 配置")
    check("firestore" in config, "  firebase.json 包含 firestore 配置")
except Exception as e:
    check(False, f"  firebase.json 解析失败: {e}")

try:
    with open(".firebaserc") as f:
        rc = json.load(f)
    project = rc.get("projects", {}).get("default")
    check(project, f"  .firebaserc 配置的默认项目: {project}")
except Exception as e:
    check(False, f"  .firebaserc 解析失败: {e}")

print()

# Step 3: 检查 Python 依赖
print("🐍 检查 Python 依赖...")
run_command("python --version", "Python 版本检查")
run_command("pip --version", "pip 版本检查")

print()

# Step 4: 检查 Node.js/npm
print("📦 检查 Node.js 依赖...")
run_command("node --version", "Node.js 版本检查")
run_command("npm --version", "npm 版本检查")
run_command("npm list -g firebase-tools", "Firebase CLI 检查")

print()

# Step 5: 检查 Firebase 认证
print("🔐 检查 Firebase 认证...")
auth_result = subprocess.run(
    "firebase projects:list",
    capture_output=True,
    text=True,
    shell=True
)
logged_in = auth_result.returncode == 0
check(logged_in, "  Firebase 登录状态")

if not logged_in:
    print("   💡 提示: 执行 'firebase login' 进行登录")

print()

# Step 6: 检查 GitHub Actions Secrets
print("🔑 检查 GitHub Actions...")
print("  ⚠️  GitHub Secrets 无法从本地检查")
print("     请前往 GitHub 仓库 Settings → Secrets and variables → Actions")
print("     确保 FIREBASE_TOKEN secret 已设置")

print()

# Step 7: 检查 omr_core 同步
print("📋 检查 omr_core 同步...")
core_exists = Path("core/omr_core").exists()
functions_core_exists = Path("functions/omr_core").exists()
check(core_exists, "  core/omr_core 存在")
check(functions_core_exists, "  functions/omr_core 已同步", "warning")

print()

# 总结
print("=" * 60)
print("诊断完成！")
print()
if all_exist:
    print("✅ 部署配置看起来没问题。")
    print()
    print("后续步骤:")
    print("1. 确保已在 GitHub Settings 中设置 FIREBASE_TOKEN")
    print("2. 执行: git add . && git commit -m 'Deploy' && git push")
    print("3. 在 GitHub Actions 标签页监控部署进度")
else:
    print("❌ 有些文件缺失。请检查上面的错误信息。")
    sys.exit(1)

print("=" * 60)

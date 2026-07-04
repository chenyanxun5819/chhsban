#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生成绩自动上传系统 - 快速启动指南

使用前准备：
1. 在 sms_app 目录中运行本脚本
2. 这将验证所有依赖并显示启动说明
"""

import sys
from pathlib import Path


def print_header(title):
    """打印标题"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def check_requirements():
    """检查依赖"""
    print_header("✓ 依赖包检查")
    
    required = [
        ("PyQt6", "GUI 框架"),
        ("selenium", "自动化测试框架"),
        ("openpyxl", "Excel 处理"),
        ("cryptography", "加密存储"),
    ]
    
    all_ok = True
    for package, description in required:
        try:
            __import__(package)
            print(f"  ✓ {package:<20} - {description}")
        except ImportError:
            print(f"  ✗ {package:<20} - {description}")
            all_ok = False
    
    return all_ok


def check_files():
    """检查文件结构"""
    print_header("✓ 文件结构检查")
    
    required_files = [
        "main_app.py",
        "ui/main_window.py",
        "ui/styles.qss",
        "ui/pages/settings_page.py",
        "ui/pages/project_input_page.py",
        "ui/pages/score_upload_page.py",
        "ui/widgets/console_output.py",
        "core/config_manager.py",
        "core/sms_handler.py",
    ]
    
    current_dir = Path(__file__).parent
    all_ok = True
    
    for file in required_files:
        file_path = current_dir / file
        status = "✓" if file_path.exists() else "✗"
        print(f"  {status} {file}")
        if not file_path.exists():
            all_ok = False
    
    return all_ok


def print_startup_guide():
    """打印启动指南"""
    print_header("🚀 快速启动")
    
    print("""
  1. 命令行启动：
     python main_app.py
  
  2. 首次使用流程：
     a) 点击 ⚙️ 【设定】按钮
     b) 输入 SMS 系统的帐号和密码
     c) 点击 🔌 【测试连接】验证凭证
     d) 点击 💾 【保存设置】保存凭证（加密存储）
  
  3. 添加项目：
     a) 点击 📋 【项目输入】按钮
     b) 填写项目信息（代码、名称、分数类型）
     c) 点击 ➕ 【添加到SMS】
  
  4. 上传成绩：
     a) 点击 📤 【成绩上传】按钮
     b) 点击 📂 【选择Excel文件】
     c) 点击 📤 【开始上传】
  
  5. 查看日志：
     - 所有操作记录在下方 📋 【执行日志】区域
     - 绿色 ✓ = 成功, 红色 ✗ = 错误, 黄色 ⚠ = 警告
    """)


def print_features():
    """打印功能列表"""
    print_header("✨ 主要功能")
    
    features = [
        ("设定页面", [
            "✓ 保存 SMS 帐号密码（Fernet 加密）",
            "✓ 测试 SMS 连接（Selenium 自动化）",
            "✓ 清除保存的凭证",
        ]),
        ("项目输入页面", [
            "✓ 添加新的比赛项目到 SMS",
            "✓ 自动验证凭证和 SMS 连接",
            "✓ 项目预览表格",
        ]),
        ("成绩上传页面", [
            "✓ 选择和预览 Excel 文件",
            "✓ 下载项目模板",
            "✓ 批量上传学生成绩",
            "✓ 实时进度条显示",
        ]),
        ("系统特性", [
            "✓ VS Code 深色主题 UI",
            "✓ 实时彩色日志输出",
            "✓ 本地加密凭证存储",
            "✓ 后台线程执行（不阻塞 UI）",
        ]),
    ]
    
    for category, items in features:
        print(f"\n  📌 {category}:")
        for item in items:
            print(f"     {item}")


def print_config_info():
    """打印配置信息"""
    print_header("🔧 配置存储位置")
    
    from pathlib import Path
    config_dir = Path.home() / ".sms_app"
    
    print(f"""
  配置目录：{config_dir}
  
  包含文件：
    - config.json      : 加密的凭证和会话信息
    - .key             : 加密密钥（勿删除！）
  
  首次运行时自动创建。
    """)


def main():
    """主函数"""
    print("""
    
╔═══════════════════════════════════════════════════════════════════╗
║     SMS 学生成绩自动上传系统 - 启动指南                           ║
║     Version 1.0.0 (PyQt6 Framework)                              ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # 检查依赖
    deps_ok = check_requirements()
    
    # 检查文件
    files_ok = check_files()
    
    if not deps_ok or not files_ok:
        print_header("⚠️ 检查失败")
        print("""
  请确保：
  1. 已安装所有依赖包
  2. 所有项目文件完整
  
  解决方法：
  pip install -r requirements.txt
        """)
        return False
    
    # 打印使用指南
    print_startup_guide()
    print_features()
    print_config_info()
    
    print_header("✅ 所有检查通过！")
    print("""
  现在可以运行：python main_app.py
    """)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

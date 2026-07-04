#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生成绩自动上传系统 - 部署完成总结
"""

import sys
from pathlib import Path


def main():
    app_dir = Path(__file__).parent
    exe_path = app_dir / "dist" / "SMS成绩上传工具.exe"
    
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║     SMS 学生成绩自动上传系统 - 部署完成                           ║
║     Version 1.0.0 | PyQt6 GUI + Selenium 自动化                  ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    print("📦 可执行档信息")
    print("=" * 70)
    
    if exe_path.exists():
        size_mb = exe_path.stat().st_size / (1024 * 1024)
        print(f"✓ 文件: {exe_path.name}")
        print(f"✓ 路径: {exe_path}")
        print(f"✓ 大小: {size_mb:.2f} MB")
        print(f"✓ 状态: 就绪 ✅")
    else:
        print(f"✗ 文件不存在")
        return False
    
    print("\n" + "=" * 70)
    print("🚀 快速启动")
    print("=" * 70)
    print("""
  方式 1: 直接双击运行
    SMS成绩上传工具.exe

  方式 2: 命令行启动
    .\\SMS成绩上传工具.exe
    """)
    
    print("=" * 70)
    print("📋 首次使用流程")
    print("=" * 70)
    print("""
  1️⃣ 启动应用
     双击 SMS成绩上传工具.exe

  2️⃣ 设置凭证 (⚙️ 设定)
     ├─ 输入 SMS 帐号和密码
     ├─ 点击 [🔌 测试连接] 验证
     └─ 点击 [💾 保存设置] 保存（加密存储）

  3️⃣ 添加项目 (📋 项目输入)
     ├─ 输入项目代码、名称、分数类型
     └─ 点击 [➕ 添加到SMS]

  4️⃣ 上传成绩 (📤 成绩上传)
     ├─ 点击 [📂 选择Excel文件]
     ├─ 查看预览和数据
     └─ 点击 [📤 开始上传]

  5️⃣ 查看日志
     └─ 所有操作记录在下方日志区
    """)
    
    print("=" * 70)
    print("🔐 数据安全")
    print("=" * 70)
    print(f"""
  ✓ 凭证存储位置: C:\\Users\\<用户名>\\.sms_app
  ✓ 加密算法: Fernet (对称加密)
  ✓ 配置文件: config.json (加密存储)
  ✓ 加密密钥: .key (内部管理)

  特点：
  • 用户级隔离：每个用户独立保存凭证
  • 本地存储：不上传到云端
  • 安全清除：可随时清除保存的凭证
    """)
    
    print("=" * 70)
    print("📦 分发说明")
    print("=" * 70)
    print(f"""
  文件分发：
    ✓ 可将 SMS成绩上传工具.exe 分发给其他用户
    ✓ 无需安装 Python 环境
    ✓ 无需管理员权限
    ✓ 文件大小：{size_mb:.2f} MB

  环境要求：
    ✓ Windows 7 及以上
    ✓ 联网环境（需连接 SMS 系统）
    ✓ Chrome 浏览器（Selenium 内置驱动）

  卸载方式：
    ✓ 删除 SMS成绩上传工具.exe 文件即可
    ✓ 可选：删除 C:\\Users\\<用户名>\\.sms_app 清除配置
    """)
    
    print("=" * 70)
    print("🔧 故障排查")
    print("=" * 70)
    print("""
  问题 1: 应用无法启动
    • 检查 Windows 版本是否 ≥ Win7
    • 检查是否有足够的硬盘空间
    • 尝试以管理员身份运行

  问题 2: 连接失败
    • 确认 SMS 系统地址是否正确
    • 检查帐号密码是否正确
    • 确认网络连接正常
    • 检查防火墙设置

  问题 3: Excel 文件无法识别
    • 确保文件格式为 .xlsx
    • 检查文件是否被其他程序占用
    • 尝试重新保存 Excel 文件

  更多帮助：
    • 查看应用中的日志输出
    • 日志显示具体错误信息
    """)
    
    print("=" * 70)
    print("✅ 部署完成！")
    print("=" * 70)
    print(f"""
  🎉 SMS 学生成绩自动上传系统已准备就绪！

  下一步：
    1. 将 SMS成绩上传工具.exe 复制到需要的位置
    2. 双击 .exe 文件启动应用
    3. 按照首次使用流程配置凭证
    4. 开始批量上传成绩！

  祝使用愉快！ 😊
    """)
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

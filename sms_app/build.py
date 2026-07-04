#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PyInstaller 打包脚本 - 将应用打包成单个 .exe 文件
"""

import os
import sys
import subprocess
from pathlib import Path


def run_command(cmd, description):
    """运行命令"""
    print(f"\n{'='*70}")
    print(f"▶ {description}")
    print(f"{'='*70}")
    print(f"命令: {' '.join(cmd)}\n")
    
    result = subprocess.run(cmd)
    return result.returncode == 0


def build_executable():
    """构建可执行档"""
    
    print("""
╔═══════════════════════════════════════════════════════════════════╗
║   SMS 学生成绩自动上传系统 - PyInstaller 打包                     ║
╚═══════════════════════════════════════════════════════════════════╝
    """)
    
    # 获取项目目录
    app_dir = Path(__file__).parent
    main_app = app_dir / "main_app.py"
    styles_qss = app_dir / "ui" / "styles.qss"
    template_xlsx = app_dir / "template.xlsx"
    
    if not main_app.exists():
        print("❌ 错误: 找不到 main_app.py")
        return False
    
    # 1. 检查 PyInstaller
    print("\n[1/4] 检查 PyInstaller...")
    try:
        import PyInstaller
        print("✓ PyInstaller 已安装")
    except ImportError:
        print("❌ PyInstaller 未安装，正在安装...")
        if not run_command(
            [sys.executable, "-m", "pip", "install", "pyinstaller"],
            "安装 PyInstaller"
        ):
            print("❌ PyInstaller 安装失败")
            return False
    
    # 2. 清理旧的打包文件
    print("\n[2/4] 清理旧文件...")
    build_dir = app_dir / "build"
    dist_dir = app_dir / "dist"
    
    import shutil
    import time
    
    for dir_path in [build_dir, dist_dir]:
        if dir_path.exists():
            try:
                shutil.rmtree(dir_path)
                print(f"✓ 已删除 {dir_path.name}/")
            except PermissionError:
                print(f"⚠ {dir_path.name}/ 被占用，尝试重新删除...")
                time.sleep(1)
                try:
                    shutil.rmtree(dir_path)
                    print(f"✓ 已删除 {dir_path.name}/")
                except Exception as e:
                    print(f"⚠ 跳过 {dir_path.name}/: {e}")
    
    # 3. 运行 PyInstaller
    print("\n[3/4] 运行 PyInstaller...")
    
    # 构建命令
    pyinstaller_cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onefile",                    # 单个文件
        "--windowed",                   # 无控制台窗口
        f"--name=SMS成绩上传工具",      # 应用名称
        f"--specpath={app_dir}",        # spec 文件位置
        "--add-data", str(styles_qss) + ";ui",  # 添加样式文件
        "--add-data", str(template_xlsx) + ";.",  # 添加模板文件
        "--hidden-import=selenium",
        "--hidden-import=openpyxl",
        "--hidden-import=cryptography",
        "--hidden-import=PyQt6.QtWebEngineWidgets",
        str(main_app)
    ]
    
    if not run_command(pyinstaller_cmd, "PyInstaller 打包"):
        print("❌ 打包失败")
        return False
    
    # 4. 验证输出
    print("\n[4/4] 验证打包结果...")
    
    exe_path = dist_dir / "SMS成绩上传工具.exe"
    
    if exe_path.exists():
        file_size = exe_path.stat().st_size / (1024 * 1024)
        print(f"✓ 可执行档已生成")
        print(f"  路径: {exe_path}")
        print(f"  大小: {file_size:.2f} MB")
        return True
    else:
        print("❌ 可执行档生成失败")
        return False


def main():
    """主函数"""
    os.chdir(Path(__file__).parent)
    
    try:
        if build_executable():
            print(f"""
╔═══════════════════════════════════════════════════════════════════╗
║                     ✅ 打包完成！                                 ║
╚═══════════════════════════════════════════════════════════════════╝

可执行档位置:
  {Path(__file__).parent / "dist" / "SMS成绩上传工具.exe"}

使用方式:
  1. 双击 SMS成绩上传工具.exe 即可运行
  2. 无需安装 Python 环境
  3. 首次启动会创建配置目录：C:\\Users\\<用户名>\\.sms_app

分发说明:
  - 可将 SMS成绩上传工具.exe 分发给其他用户使用
  - 每个用户的凭证独立保存，互不影响
  - 如需卸载，直接删除 .exe 文件即可
            """)
            return 0
        else:
            print("""
╔═══════════════════════════════════════════════════════════════════╗
║                     ❌ 打包失败                                   ║
╚═══════════════════════════════════════════════════════════════════╝

故障排查:
  1. 确保 PyInstaller 已安装
  2. 检查所有依赖包是否完整
  3. 查看上面的错误信息
  4. 运行: pip install -r requirements.txt
            """)
            return 1
    except Exception as e:
        print(f"\n❌ 打包异常: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

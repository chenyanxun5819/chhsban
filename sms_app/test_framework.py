#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速验证框架 - 检查所有导入是否正常
"""

import sys
import traceback

def test_imports():
    """测试所有模块导入"""
    tests = [
        ("PyQt6", lambda: __import__('PyQt6')),
        ("Selenium", lambda: __import__('selenium')),
        ("openpyxl", lambda: __import__('openpyxl')),
        ("cryptography", lambda: __import__('cryptography')),
    ]
    
    print("=" * 50)
    print("📦 检查依赖包...")
    print("=" * 50)
    
    all_ok = True
    for name, import_func in tests:
        try:
            import_func()
            print(f"✓ {name}")
        except Exception as e:
            print(f"✗ {name}: {e}")
            all_ok = False
    
    print()
    print("=" * 50)
    print("🔍 检查应用模块...")
    print("=" * 50)
    
    try:
        from ui.main_window import MainWindow
        print("✓ ui.main_window")
    except Exception as e:
        print(f"✗ ui.main_window: {e}")
        traceback.print_exc()
        all_ok = False
    
    try:
        from ui.pages.settings_page import SettingsPage
        print("✓ ui.pages.settings_page")
    except Exception as e:
        print(f"✗ ui.pages.settings_page: {e}")
        all_ok = False
    
    try:
        from ui.pages.project_input_page import ProjectInputPage
        print("✓ ui.pages.project_input_page")
    except Exception as e:
        print(f"✗ ui.pages.project_input_page: {e}")
        all_ok = False
    
    try:
        from ui.pages.score_upload_page import ScoreUploadPage
        print("✓ ui.pages.score_upload_page")
    except Exception as e:
        print(f"✗ ui.pages.score_upload_page: {e}")
        all_ok = False
    
    try:
        from ui.widgets.console_output import ConsoleOutput
        print("✓ ui.widgets.console_output")
    except Exception as e:
        print(f"✗ ui.widgets.console_output: {e}")
        all_ok = False
    
    try:
        from core.config_manager import ConfigManager
        print("✓ core.config_manager")
    except Exception as e:
        print(f"✗ core.config_manager: {e}")
        all_ok = False
    
    try:
        from core.sms_handler import SMSHandler
        print("✓ core.sms_handler")
    except Exception as e:
        print(f"✗ core.sms_handler: {e}")
        all_ok = False
    
    print()
    print("=" * 50)
    if all_ok:
        print("✅ 所有检查通过！框架已就绪")
    else:
        print("❌ 部分检查失败")
    print("=" * 50)
    
    return all_ok


if __name__ == "__main__":
    result = test_imports()
    sys.exit(0 if result else 1)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用新密码测试登入
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def test_login_with_new_password(username, password):
    """使用新密码测试登入"""
    
    print(f"测试登入...")
    print(f"  用户名: {username}")
    print(f"  密码: {password}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            # 访问登入页面
            print("\n📍 访问登入页面...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login", wait_until="domcontentloaded")
            time.sleep(1)
            
            # 输入凭证
            print("📍 输入凭证...")
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            print("  ✓ 凭证已输入")
            
            # 点击登入
            print("📍 点击登入按钮...")
            page.click('button[type="submit"]')
            
            # 等待响应
            time.sleep(3)
            current_url = page.url
            print(f"  当前 URL: {current_url}")
            
            # 检查是否登入成功
            if "login" in current_url.lower():
                # 还在登入页面，检查错误
                error_elem = page.query_selector('.alert-error')
                if error_elem:
                    error_text = error_elem.text_content()
                    print(f"\n❌ 登入失败: {error_text}")
                else:
                    print("\n❌ 登入页面未改变")
            else:
                # 成功登入
                print("\n✅ 登入成功！")
                logout_link = page.query_selector('a[href*="logout"]')
                if logout_link:
                    print("   ✓ 找到登出链接")
            
            # 暂停让用户观察
            print("\n⏸ 暂停 15 秒以便观察...")
            time.sleep(15)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


if __name__ == "__main__":
    # 测试新密码
    test_login_with_new_password("schhs334", "@Sidan49122")

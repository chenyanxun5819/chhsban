#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
改进的登入脚本：
1. 等待表单验证
2. 检查是否有错误信息
3. 正确处理登入流程
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def improved_login():
    """改进的登入流程"""
    
    config_manager = ConfigManager()
    username, password = config_manager.get_credentials()
    
    print(f"用户名: {username}")
    print(f"密码长度: {len(password)}")
    print(f"密码: {password}")  # 显示密码以便调试
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # Step 1: 访问登入页面
        print("\n📍 访问登入页面...")
        page.goto("http://192.168.0.6/sms/index.php?r=site/login", wait_until="domcontentloaded")
        time.sleep(1)
        
        # Step 2: 清除并输入用户名
        print("📍 输入用户名...")
        username_field = page.locator('input[name="LoginForm[username]"]')
        username_field.triple_click()  # 选中所有
        username_field.press("Delete")
        username_field.type(username, delay=50)  # 缓慢输入
        time.sleep(0.5)
        print(f"   ✓ 用户名已输入")
        
        # Step 3: 清除并输入密码
        print("📍 输入密码...")
        password_field = page.locator('input[name="LoginForm[password]"]')
        password_field.triple_click()
        password_field.press("Delete")
        password_field.type(password, delay=50)
        time.sleep(0.5)
        print(f"   ✓ 密码已输入")
        
        # 显示表单内容以便调试
        username_value = page.locator('input[name="LoginForm[username]"]').input_value()
        password_value = page.locator('input[name="LoginForm[password]"]').input_value()
        print(f"\n   表单内容:")
        print(f"      用户名字段: {username_value}")
        print(f"      密码字段: {'*' * len(password_value)}")
        
        # Step 4: 点击登入按钮
        print("\n📍 点击登入按钮...")
        submit_btn = page.locator('button[type="submit"]')
        submit_btn.click()
        
        # 等待响应
        time.sleep(3)
        print(f"   当前 URL: {page.url}")
        
        # 检查是否有错误提示
        error_msg = page.locator('.alert-error').text_content() if page.query_selector('.alert-error') else ""
        if error_msg:
            print(f"\n❌ 登入错误: {error_msg}")
        else:
            print("✅ 没有错误提示")
        
        # 检查是否已登出
        logout_link = page.query_selector('a[href*="logout"]')
        if logout_link:
            print("✅ 登入成功（找到登出链接）")
        else:
            print("❌ 登入可能失败（未找到登出链接）")
        
        # 保存当前页面
        with open("improved_login_result.html", "w", encoding="utf-8") as f:
            f.write(page.content())
        print("\n✓ 页面已保存到 improved_login_result.html")
        
        # 输入暂停（让用户看看浏览器）
        print("\n⏸ 暂停 10 秒以便观察浏览器窗口...")
        time.sleep(10)
        
        browser.close()


if __name__ == "__main__":
    improved_login()

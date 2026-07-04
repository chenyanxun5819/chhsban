#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
改进的登入测试：等待网络完成，检查 AJAX 错误
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def test_login_improved(username, password):
    """改进的登入测试"""
    
    print(f"改进的登入测试...")
    print(f"  用户名: {username}")
    print(f"  密码: {password}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # 监听网络请求和响应
        responses = []
        
        def handle_response(response):
            responses.append({
                'url': response.url,
                'status': response.status,
                'ok': response.ok
            })
            print(f"   [响应] {response.status} {response.url}")
        
        page.on("response", handle_response)
        
        try:
            # 访问登入页面
            print("\n📍 访问登入页面...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login", wait_until="networkidle")
            time.sleep(1)
            
            # 输入凭证
            print("\n📍 输入凭证...")
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            print("  ✓ 凭证已输入")
            
            # 显示表单值（用于调试）
            username_val = page.input_value('input[name="LoginForm[username]"]')
            password_val = page.input_value('input[name="LoginForm[password]"]')
            print(f"\n  表单值:")
            print(f"    用户名: {username_val}")
            print(f"    密码: {'*' * len(password_val)}")
            
            # 点击登入（并等待导航）
            print("\n📍 点击登入按钮...")
            print("  监听网络响应...")
            responses.clear()
            
            # 方法1：点击提交按钮并等待网络空闲
            async_click = page.context.new_page
            page.click('button[type="submit"]')
            
            # 等待网络完成或重定向
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                print("  ℹ️ 网络未空闲（可能是长连接），继续...")
            
            time.sleep(2)
            current_url = page.url
            print(f"\n  当前 URL: {current_url}")
            
            # 显示所有网络响应
            print(f"\n  网络响应统计: {len(responses)} 个请求")
            for i, resp in enumerate(responses[-5:]):  # 显示最后5个
                print(f"    [{i}] {resp['status']} {resp['url']}")
            
            # 检查错误
            error_elem = page.query_selector('.alert-error')
            if error_elem:
                error_text = error_elem.text_content()
                print(f"\n❌ 登入错误: {error_text}")
                
                # 保存错误页面
                with open("error_page.html", "w", encoding="utf-8") as f:
                    f.write(page.content())
                print("  ✓ 错误页面已保存到 error_page.html")
            else:
                print("\n  ℹ️ 没有错误提示")
            
            # 检查是否登入成功
            if "login" in current_url.lower():
                print("❌ 仍在登入页面")
            else:
                print("✅ 已离开登入页面")
                
                # 检查登出链接
                logout_link = page.query_selector('a[href*="logout"]')
                if logout_link:
                    print("✅ 找到登出链接，登入成功！")
            
            # 暂停让用户观察浏览器
            print("\n⏸ 暂停 20 秒以便观察浏览器窗口...")
            time.sleep(20)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


if __name__ == "__main__":
    test_login_improved("schhs334", "@Sidan49122")

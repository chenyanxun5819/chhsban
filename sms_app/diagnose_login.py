#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
详细诊断登入流程
"""

import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def diagnose_login():
    """详细诊断登入"""
    
    config_manager = ConfigManager()
    username, password = config_manager.get_credentials()
    
    print(f"详细诊断登入流程")
    print(f"  用户名: {username}")
    print(f"  密码: {password}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        # 监听所有网络请求
        requests_made = []
        
        def handle_request(request):
            requests_made.append({
                'method': request.method,
                'url': request.url,
                'post_data': request.post_data
            })
            print(f"   [请求] {request.method} {request.url}")
            if request.post_data:
                print(f"           数据: {request.post_data[:200]}")
        
        page.on("request", handle_request)
        
        try:
            # 访问登入页面
            print("\n📍 访问登入页面...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login")
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            
            # 检查表单
            print("\n📍 检查登入表单...")
            
            # 找到表单
            form = page.query_selector("form")
            if form:
                print("  ✓ 找到表单")
                form_id = form.get_attribute("id")
                form_action = form.get_attribute("action")
                form_method = form.get_attribute("method")
                print(f"    ID: {form_id}")
                print(f"    Action: {form_action}")
                print(f"    Method: {form_method}")
            else:
                print("  ✗ 未找到表单")
            
            # 列出所有表单字段
            print("\n  表单字段:")
            all_inputs = page.query_selector_all("form input")
            for i, inp in enumerate(all_inputs):
                name = inp.get_attribute("name")
                type_attr = inp.get_attribute("type")
                value = inp.get_attribute("value")
                print(f"    [{i}] name={name}, type={type_attr}, value={value}")
            
            # 列出所有隐藏字段
            print("\n  隐藏字段:")
            hidden_inputs = page.query_selector_all("form input[type='hidden']")
            for i, inp in enumerate(hidden_inputs):
                name = inp.get_attribute("name")
                value = inp.get_attribute("value")
                print(f"    [{i}] {name}={value}")
            
            # 输入凭证
            print("\n📍 输入凭证...")
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            print("  ✓ 凭证已输入")
            
            # 显示表单当前状态
            print("\n  表单当前状态:")
            username_val = page.input_value('input[name="LoginForm[username]"]')
            password_val = page.input_value('input[name="LoginForm[password]"]')
            print(f"    用户名: {username_val}")
            print(f"    密码: {'*' * len(password_val)}")
            
            # 保存登入前的HTML
            with open("before_login.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            print("\n  ✓ 登入前的HTML已保存到 before_login.html")
            
            # 点击提交按钮
            print("\n📍 点击提交按钮...")
            requests_made.clear()
            
            submit_button = page.query_selector('button[type="submit"]')
            if submit_button:
                print("  ✓ 找到提交按钮")
                submit_button.click()
            else:
                print("  ✗ 未找到提交按钮")
            
            # 等待响应
            time.sleep(5)
            
            print(f"\n  网络请求: {len(requests_made)} 个")
            for i, req in enumerate(requests_made):
                print(f"    [{i}] {req['method']} {req['url']}")
            
            print(f"\n  当前 URL: {page.url}")
            
            # 检查是否有错误
            error_alert = page.query_selector(".alert-error")
            if error_alert:
                error_text = error_alert.text_content()
                print(f"\n  ❌ 表单错误: {error_text}")
            
            # 保存登入后的HTML
            with open("after_login.html", "w", encoding="utf-8") as f:
                f.write(page.content())
            print("  ✓ 登入后的HTML已保存到 after_login.html")
            
            # 暂停
            print("\n⏸ 暂停 15 秒...")
            time.sleep(15)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()


if __name__ == "__main__":
    diagnose_login()

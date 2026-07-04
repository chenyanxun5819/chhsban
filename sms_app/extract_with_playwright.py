#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整的项目提取流程：登入 → 提取项目
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def extract_projects_complete():
    """完整的项目提取流程"""
    
    config_manager = ConfigManager()
    username, password = config_manager.get_credentials()
    
    print(f"完整项目提取流程")
    print(f"  用户名: {username}")
    
    projects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            # Step 1: 登入
            print("\n📍 Step 1: 登入...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login", wait_until="domcontentloaded")
            time.sleep(1)
            
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            page.click('button[type="submit"]')
            
            print("  ✓ 已提交登入表单")
            
            # 等待登入完成（等待网络响应）
            time.sleep(4)
            print(f"  当前 URL: {page.url}")
            
            # Step 2: 访问项目设置页面
            print("\n📍 Step 2: 访问项目设置页面...")
            page.goto("http://192.168.0.6/sms/index.php?r=transaction/itemSetting/index", wait_until="domcontentloaded")
            time.sleep(3)
            
            print(f"  当前 URL: {page.url}")
            
            # 检查是否被重定向回登入页面（说明会话丢失）
            if "login" in page.url.lower():
                print("❌ 被重定向回登入页面，会话丢失")
                return projects
            
            # Step 3: 尝试从表格提取
            print("\n📍 Step 3: 提取项目数据...")
            
            tables = page.query_selector_all("table")
            print(f"  找到 {len(tables)} 个表格")
            
            # 查找表格中的数据行
            rows = page.query_selector_all("table tbody tr")
            print(f"  找到 {len(rows)} 行数据")
            
            if len(rows) > 0:
                for i, row in enumerate(rows, 1):
                    try:
                        cells = row.query_selector_all("td")
                        if len(cells) >= 3:
                            序号 = cells[0].text_content().strip()
                            项目代码 = cells[1].text_content().strip()
                            项目名称 = cells[2].text_content().strip()
                            
                            if 项目代码:
                                projects.append({
                                    "序号": 序号,
                                    "项目代码": 项目代码,
                                    "项目名称": 项目名称,
                                    "分数": "0.00"
                                })
                                print(f"    [{i}] {项目代码}: {项目名称}")
                    except:
                        pass
            
            # Step 4: 如果表格为空，尝试学生成绩页面
            if len(projects) == 0:
                print("\n  📍 表格为空，尝试学生成绩页面...")
                page.goto("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index", wait_until="domcontentloaded")
                time.sleep(3)
                
                print(f"  当前 URL: {page.url}")
                
                # 查找下拉菜单
                selects = page.query_selector_all("select")
                print(f"  找到 {len(selects)} 个下拉菜单")
                
                if len(selects) > 0:
                    select = selects[0]  # 第一个下拉菜单
                    options = select.query_selector_all("option")
                    print(f"  找到 {len(options)} 个选项")
                    
                    for i, option in enumerate(options):
                        value = option.get_attribute("value")
                        text = option.text_content().strip()
                        
                        if value and value != "" and text:
                            # 解析项目代码和名称
                            if " - " in text:
                                parts = text.split(" - ", 1)
                                项目代码 = parts[0].strip()
                                项目名称 = parts[1].strip()
                            else:
                                项目代码 = text
                                项目名称 = text
                            
                            if 项目代码:
                                projects.append({
                                    "序号": str(len(projects) + 1),
                                    "项目代码": 项目代码,
                                    "项目名称": 项目名称,
                                    "分数": "0.00"
                                })
                                print(f"    [{i}] {项目代码}: {项目名称}")
            
            # Step 5: 显示结果
            print("\n" + "=" * 70)
            print(f"✅ 总共提取: {len(projects)} 个项目")
            print("=" * 70)
            
            if any(p["项目代码"] == "CCDCMO1188" for p in projects):
                print("✅ 包含 CCDCMO1188")
            else:
                print("❌ 不包含 CCDCMO1188")
            
            # 暂停让用户观察
            print("\n⏸ 暂停 10 秒...")
            time.sleep(10)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            browser.close()
    
    return projects


def main():
    projects = extract_projects_complete()
    
    if projects:
        output_file = "extracted_projects.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 数据已保存到: {output_file}")
        
        # 显示前5个项目
        print("\n前5个项目:")
        for p in projects[:5]:
            print(f"  {p['项目代码']}: {p['项目名称']}")


if __name__ == "__main__":
    main()

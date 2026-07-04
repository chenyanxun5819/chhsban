#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
改进策略：保持页面会话，在同一上下文中导航
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def extract_with_context_persistence():
    """在同一上下文中保持会话"""
    
    config_manager = ConfigManager()
    username, password = config_manager.get_credentials()
    
    print(f"项目提取（保持会话）")
    print(f"  用户名: {username}")
    
    projects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # 使用持久化上下文
        context = browser.new_context(
            storage_state=None  # 初始化为空，会话将保存在内存中
        )
        page = context.new_page()
        
        try:
            # Step 1: 登入
            print("\n📍 Step 1: 登入...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login")
            
            # 等待页面完全加载
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            
            # 输入凭证
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            
            # 点击登入并等待导航
            page.click('button[type="submit"]')
            
            # 等待导航完成（会被重定向到首页或其他页面）
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                pass
            
            time.sleep(2)
            print(f"  当前 URL: {page.url}")
            
            # 检查是否登入成功（通过查找登出链接）
            logout_link = page.query_selector('a[href*="logout"]') or page.query_selector('[href*="logout"]')
            if logout_link:
                print("  ✅ 登入成功（找到登出链接）")
            else:
                print("  ⚠️ 未找到登出链接，可能未登入")
            
            # Step 2: 在同一页面上访问项目页面（使用 page.goto 保持 cookies）
            print("\n📍 Step 2: 访问项目设置页面...")
            page.goto("http://192.168.0.6/sms/index.php?r=transaction/itemSetting/index")
            
            try:
                page.wait_for_load_state("networkidle", timeout=5000)
            except:
                pass
            
            time.sleep(3)
            print(f"  当前 URL: {page.url}")
            
            # 检查是否被重定向回登入页面
            if "login" in page.url.lower():
                print("❌ 被重定向回登入页面")
            else:
                print("✅ 成功访问项目页面")
            
            # Step 3: 尝试从表格提取
            print("\n📍 Step 3: 提取项目数据...")
            
            tables = page.query_selector_all("table")
            print(f"  找到 {len(tables)} 个表格")
            
            if len(tables) > 0:
                # 尝试找到数据行
                rows = page.query_selector_all("table tbody tr")
                print(f"  找到 {len(rows)} 行数据")
                
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
                                if i <= 5:
                                    print(f"    [{i}] {项目代码}: {项目名称}")
                                elif i == 6:
                                    print(f"    ... (共 {len(rows)} 行)")
                    except:
                        pass
            
            # Step 4: 如果表格为空，尝试从学生成绩页面获取
            if len(projects) == 0:
                print("\n  📍 表格为空，尝试学生成绩页面...")
                page.goto("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index")
                
                try:
                    page.wait_for_load_state("networkidle", timeout=5000)
                except:
                    pass
                
                time.sleep(3)
                print(f"  当前 URL: {page.url}")
                
                # 查找下拉菜单
                selects = page.query_selector_all("select")
                print(f"  找到 {len(selects)} 个下拉菜单")
                
                if len(selects) > 0:
                    for s_idx, select in enumerate(selects):
                        options = select.query_selector_all("option")
                        print(f"    select [{s_idx}]: {len(options)} 个选项")
                        
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
                                    if i < 5:
                                        print(f"      [{i}] {项目代码}")
                                    elif i == 5:
                                        print(f"      ... (共 {len(options)} 个选项)")
            
            # Step 5: 显示结果
            print("\n" + "=" * 70)
            print(f"✅ 总共提取: {len(projects)} 个项目")
            print("=" * 70)
            
            if len(projects) > 0:
                if any(p["项目代码"] == "CCDCMO1188" for p in projects):
                    print("✅ 包含 CCDCMO1188")
                else:
                    print("❌ 不包含 CCDCMO1188")
                    print("\n前10个项目:")
                    for p in projects[:10]:
                        print(f"  {p['项目代码']}: {p['项目名称']}")
            
            # 暂停让用户观察
            print("\n⏸ 暂停 15 秒...")
            time.sleep(15)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            context.close()
            browser.close()
    
    return projects


def main():
    projects = extract_with_context_persistence()
    
    if projects:
        output_file = "playwright_extracted_projects.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 数据已保存到: {output_file}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整项目提取：处理分页 + 下拉菜单
"""

import sys
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
import time

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def extract_all_projects():
    """提取所有项目（包括分页和下拉菜单）"""
    
    config_manager = ConfigManager()
    username, password = config_manager.get_credentials()
    
    print(f"完整项目提取（分页 + 下拉菜单）")
    print(f"  用户名: {username}")
    
    projects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()
        
        try:
            # Step 1: 登入
            print("\n📍 Step 1: 登入...")
            page.goto("http://192.168.0.6/sms/index.php?r=site/login")
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            page.click('button[type="submit"]')
            
            time.sleep(3)
            print("  ✅ 登入成功")
            
            # Step 2: 先尝试从学生成绩页面的下拉菜单提取（因为这里有 CCDCMO1188）
            print("\n📍 Step 2: 访问学生成绩页面并从下拉菜单提取...")
            page.goto("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index")
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            
            print(f"  当前 URL: {page.url}")
            
            # 查找下拉菜单
            selects = page.query_selector_all("select")
            print(f"  找到 {len(selects)} 个下拉菜单")
            
            if len(selects) > 0:
                # 通常第一个下拉菜单是项目选择
                select = selects[0]
                options = select.query_selector_all("option")
                print(f"  第一个下拉菜单有 {len(options)} 个选项")
                
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
                            if i < 10:
                                print(f"    [{i}] {项目代码}")
                            elif i == 10:
                                print(f"    ... (共 {len(options)} 个)")
            
            print(f"\n  从下拉菜单提取: {len(projects)} 个项目")
            
            # Step 3: 访问项目设置页面并处理分页
            print("\n📍 Step 3: 访问项目设置页面并处理分页...")
            page.goto("http://192.168.0.6/sms/index.php?r=transaction/itemSetting/index")
            page.wait_for_load_state("networkidle")
            time.sleep(3)
            
            print(f"  当前 URL: {page.url}")
            
            # 提取所有页面的数据
            page_num = 1
            table_projects = []
            
            while True:
                # 获取当前页的数据
                rows = page.query_selector_all("table tbody tr")
                print(f"  第 {page_num} 页: {len(rows)} 行数据")
                
                if len(rows) == 0:
                    print(f"  没有更多数据，停止分页")
                    break
                
                for row in rows:
                    try:
                        cells = row.query_selector_all("td")
                        if len(cells) >= 3:
                            序号 = cells[0].text_content().strip()
                            项目代码 = cells[1].text_content().strip()
                            项目名称 = cells[2].text_content().strip()
                            
                            if 项目代码:
                                table_projects.append({
                                    "序号": 序号,
                                    "项目代码": 项目代码,
                                    "项目名称": 项目名称,
                                    "分数": "0.00"
                                })
                    except:
                        pass
                
                # 尝试点击下一页
                next_button = page.query_selector('a:has-text("»")') or page.query_selector('a.next')
                if next_button:
                    next_button.click()
                    page.wait_for_load_state("networkidle")
                    time.sleep(2)
                    page_num += 1
                else:
                    break
            
            print(f"  从表格提取: {len(table_projects)} 个项目")
            
            # 合并数据（如果下拉菜单没有数据，才使用表格数据）
            if len(projects) == 0 and len(table_projects) > 0:
                projects = table_projects
            
            # Step 4: 显示结果
            print("\n" + "=" * 70)
            print(f"✅ 总共提取: {len(projects)} 个项目")
            print("=" * 70)
            
            if len(projects) > 0:
                if any(p["项目代码"] == "CCDCMO1188" for p in projects):
                    print("✅ 包含 CCDCMO1188")
                else:
                    print("⚠️ 不包含 CCDCMO1188")
                
                print("\n前15个项目:")
                for p in projects[:15]:
                    print(f"  {p['项目代码']}: {p['项目名称']}")
            
            # 暂停
            print("\n⏸ 暂停 10 秒...")
            time.sleep(10)
            
        except Exception as e:
            print(f"❌ 错误: {e}")
            import traceback
            traceback.print_exc()
        finally:
            context.close()
            browser.close()
    
    return projects


def main():
    projects = extract_all_projects()
    
    if projects:
        output_file = "all_extracted_projects.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(projects, f, ensure_ascii=False, indent=2)
        print(f"\n✓ 数据已保存到: {output_file}")


if __name__ == "__main__":
    main()

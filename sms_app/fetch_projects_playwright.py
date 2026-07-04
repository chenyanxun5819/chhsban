#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Playwright 自动化浏览器来提取 SMS 项目数据
Playwright 自带浏览器，不需要下载驱动程序
"""

import sys
import json
import time
from pathlib import Path

# 添加项目路径，以便导入 core 模块
sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("❌ Playwright 未安装或需要初始化")
    print("请运行: playwright install")
    sys.exit(1)


def fetch_projects_playwright(username, password):
    """使用 Playwright 自动化浏览器来提取项目"""
    
    print("=" * 70)
    print("🌐 使用 Playwright 浏览器自动化来提取项目数据")
    print("=" * 70)
    
    projects = []
    
    try:
        with sync_playwright() as p:
            # 启动浏览器（Chromium 比较稳定）
            print("\n📍 Step 1: 启动浏览器...")
            browser = p.chromium.launch(headless=False)  # headless=False 可以看到浏览器窗口
            context = browser.new_context()
            page = context.new_page()
            print("   ✓ 浏览器已启动")
            
            # Step 2: 访问登入页面
            print("\n📍 Step 2: 访问登入页面...")
            login_url = "http://192.168.0.6/sms/index.php?r=site/login"
            page.goto(login_url, wait_until="networkidle")
            print(f"   ✓ 访问: {login_url}")
            
            # Step 3: 输入登入信息
            print("\n📍 Step 3: 输入登入信息...")
            page.fill('input[name="LoginForm[username]"]', username)
            page.fill('input[name="LoginForm[password]"]', password)
            print(f"   ✓ 输入用户名: {username}")
            print(f"   ✓ 输入密码")
            
            # Step 4: 点击登入按钮
            print("\n📍 Step 4: 点击登入按钮...")
            page.click('button[type="submit"]')
            print("   ✓ 已点击登入按钮")
            
            # 等待登入完成
            page.wait_for_timeout(3000)
            print(f"   ✓ 当前 URL: {page.url}")
            
            # Step 5: 导航到项目设置页面
            print("\n📍 Step 5: 导航到项目设置页面...")
            item_setting_url = "http://192.168.0.6/sms/index.php?r=transaction/itemSetting/index"
            page.goto(item_setting_url, wait_until="networkidle")
            print(f"   ✓ 访问: {item_setting_url}")
            
            # Step 6: 等待页面渲染
            print("\n📍 Step 6: 等待项目表格加载...")
            page.wait_for_timeout(3000)
            
            # 检查是否有表格
            table_count = page.locator("table").count()
            print(f"   找到 {table_count} 个表格")
            
            # Step 7: 提取表格中的项目数据
            print("\n📍 Step 7: 提取项目数据...")
            
            # 方法1：从表格行中提取
            rows = page.locator("table tbody tr").all()
            print(f"   找到 {len(rows)} 行数据")
            
            if len(rows) > 0:
                for i, row in enumerate(rows, 1):
                    try:
                        cells = row.locator("td").all()
                        if len(cells) >= 3:
                            序号 = cells[0].text_content().strip()
                            项目代码 = cells[1].text_content().strip()
                            项目名称 = cells[2].text_content().strip()
                            
                            if 项目代码:  # 只记录有项目代码的
                                projects.append({
                                    "序号": 序号,
                                    "项目代码": 项目代码,
                                    "项目名称": 项目名称,
                                    "分数": "0.00"
                                })
                                print(f"      [{i}] {项目代码}: {项目名称}")
                    except Exception as e:
                        pass
            
            # 方法2：如果表格为空，尝试从下拉菜单提取
            if len(projects) == 0:
                print("\n   📍 表格为空，尝试从项目下拉菜单提取...")
                student_perf_url = "http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index"
                page.goto(student_perf_url, wait_until="networkidle")
                page.wait_for_timeout(3000)
                
                # 查找项目下拉菜单
                try:
                    select_count = page.locator("select").count()
                    print(f"   找到 {select_count} 个下拉菜单")
                    
                    if select_count > 0:
                        # 获取第一个 select（通常是项目选择）
                        select = page.locator("select").first
                        options = select.locator("option").all()
                        print(f"   找到 {len(options)} 个项目选项")
                        
                        for i, option in enumerate(options):
                            value = option.get_attribute("value")
                            text = option.text_content().strip()
                            
                            if value and value != "" and text:  # 跳过空选项
                                # 解析项目代码和名称
                                parts = text.split("- ", 1)
                                项目代码 = parts[0].strip() if len(parts) > 0 else ""
                                项目名称 = parts[1].strip() if len(parts) > 1 else text
                                
                                if 项目代码:
                                    projects.append({
                                        "序号": str(len(projects) + 1),
                                        "项目代码": 项目代码,
                                        "项目名称": 项目名称,
                                        "分数": "0.00"
                                    })
                                    print(f"      [{i}] {项目代码}: {项目名称}")
                except Exception as e:
                    print(f"   ✗ 下拉菜单提取失败: {e}")
            
            # 关闭浏览器
            print("\n🔧 关闭浏览器...")
            browser.close()
        
        # Step 8: 显示结果
        print("\n" + "=" * 70)
        print(f"✅ 总共提取: {len(projects)} 个项目")
        print("=" * 70)
        
        # 检查 CCDCMO1188
        if any(p["项目代码"] == "CCDCMO1188" for p in projects):
            print("✅ 包含 CCDCMO1188")
        else:
            print("❌ 不包含 CCDCMO1188")
        
        return projects
        
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return []


def main():
    # 使用 ConfigManager 获取解密的凭证
    try:
        config_manager = ConfigManager()
        username, password = config_manager.get_credentials()
        
        if not username or not password:
            print("❌ 无法从配置中获取用户名或密码")
            sys.exit(1)
        
        print(f"✓ 从配置加载凭证")
        print(f"  用户名: {username}")
        
        # 执行提取
        projects = fetch_projects_playwright(username, password)
        
        # 保存到临时文件供检查
        if projects:
            output_file = "playwright_projects.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(projects, f, ensure_ascii=False, indent=2)
            print(f"\n✓ 数据已保存到: {output_file}")
        
    except Exception as e:
        print(f"❌ 主程序错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Selenium + Edge 自动化浏览器来提取 SMS 项目数据
Edge 比 Chrome 在 Windows 上更容易找到
"""

import sys
import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.edge.options import Options
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from selenium.webdriver.edge.service import Service

# 添加项目路径，以便导入 core 模块
sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def fetch_projects_selenium(username, password):
    """使用 Selenium 自动化浏览器来提取项目"""
    
    print("=" * 70)
    print("🌐 使用 Selenium + Edge 浏览器来提取项目数据")
    print("=" * 70)
    
    # Edge 配置
    edge_options = Options()
    # edge_options.add_argument("--headless")  # 无界面模式 - 调试时不用
    edge_options.add_argument("--no-sandbox")
    edge_options.add_argument("--disable-dev-shm-usage")
    edge_options.add_argument("--disable-blink-features=AutomationControlled")
    
    # 初始化 WebDriver
    driver = None
    try:
        service = Service(EdgeChromiumDriverManager().install())
        driver = webdriver.Edge(service=service, options=edge_options)
        print("✓ Edge 浏览器已启动")
        
        # Step 1: 访问登入页面
        print("\n📍 Step 1: 访问登入页面...")
        login_url = "http://192.168.0.6/sms/index.php?r=site/login"
        driver.get(login_url)
        print(f"   ✓ 访问: {login_url}")
        
        # Step 2: 输入登入信息
        print("\n📍 Step 2: 输入登入信息...")
        wait = WebDriverWait(driver, 10)
        
        # 等待登入表单出现
        username_field = wait.until(
            EC.presence_of_element_located((By.NAME, "LoginForm[username]"))
        )
        password_field = driver.find_element(By.NAME, "LoginForm[password]")
        
        username_field.clear()
        username_field.send_keys(username)
        password_field.clear()
        password_field.send_keys(password)
        
        print(f"   ✓ 输入用户名: {username}")
        print(f"   ✓ 输入密码")
        
        # Step 3: 点击登入按钮
        print("\n📍 Step 3: 点击登入按钮...")
        login_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
        login_button.click()
        print("   ✓ 已点击登入按钮")
        
        # 等待登入完成
        time.sleep(3)
        print(f"   ✓ 当前 URL: {driver.current_url}")
        
        # Step 4: 导航到项目页面
        print("\n📍 Step 4: 导航到项目设置页面...")
        item_setting_url = "http://192.168.0.6/sms/index.php?r=transaction/itemSetting/index"
        driver.get(item_setting_url)
        print(f"   ✓ 访问: {item_setting_url}")
        
        # Step 5: 等待页面加载
        print("\n📍 Step 5: 等待项目表格加载...")
        time.sleep(3)  # 给 JavaScript 充足的时间渲染
        
        # 检查是否有表格
        try:
            table = wait.until(
                EC.presence_of_element_located((By.TAG_NAME, "table")),
                timeout=5
            )
            print("   ✓ 找到表格元素")
        except:
            print("   ⚠ 未找到表格元素，继续尝试提取数据...")
        
        # Step 6: 提取表格中的项目数据
        print("\n📍 Step 6: 提取项目数据...")
        
        projects = []
        
        # 方法1：从表格行中提取
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        print(f"   找到 {len(rows)} 行数据")
        
        if len(rows) > 0:
            for i, row in enumerate(rows, 1):
                try:
                    cells = row.find_elements(By.TAG_NAME, "td")
                    if len(cells) >= 3:
                        序号 = cells[0].text.strip()
                        项目代码 = cells[1].text.strip()
                        项目名称 = cells[2].text.strip()
                        
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
        
        # 方法2：如果表格为空，尝试从下拉菜单提取（学生成绩页面）
        if len(projects) == 0:
            print("\n   📍 表格为空，尝试从项目下拉菜单提取...")
            driver.get("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index")
            time.sleep(3)
            
            # 查找项目下拉菜单
            try:
                project_select = wait.until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "select")),
                    timeout=5
                )
                print("   ✓ 找到项目下拉菜单")
                
                # 提取所有 option 元素
                options = project_select.find_elements(By.TAG_NAME, "option")
                print(f"   找到 {len(options)} 个项目选项")
                
                for i, option in enumerate(options):
                    value = option.get_attribute("value")
                    text = option.text.strip()
                    
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
        
        # Step 7: 显示结果
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
        
    finally:
        if driver:
            print("\n🔧 关闭浏览器...")
            time.sleep(1)
            driver.quit()


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
        projects = fetch_projects_selenium(username, password)
        
        # 保存到临时文件供检查
        if projects:
            output_file = "selenium_projects.json"
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

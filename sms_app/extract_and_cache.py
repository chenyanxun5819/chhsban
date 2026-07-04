#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
集成脚本：从 SMS 服务器提取项目数据并保存到本地缓存
"""
import json
from playwright.sync_api import sync_playwright
from core.config_manager import ConfigManager
from core.cache_manager import ProjectCacheManager

def extract_and_cache_projects():
    """提取项目并保存到缓存"""
    config_mgr = ConfigManager()
    cache_mgr = ProjectCacheManager()
    
    # 获取凭据
    username, password = config_mgr.get_credentials()
    
    projects = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # 登入
            print("📍 登入 SMS 系统...")
            page.goto("http://192.168.0.6/sms/index.php")
            
            page.fill("input[name='LoginForm[username]']", username)
            page.fill("input[name='LoginForm[password]']", password)
            page.click("button[type='submit']")
            
            # 等待登入完成
            page.wait_for_load_state("networkidle")
            print("  ✅ 登入成功")
            
            # 访问学生成绩页面并从下拉菜单提取
            print("📍 从下拉菜单提取项目...")
            page.goto("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index")
            page.wait_for_load_state("networkidle")
            
            selects = page.query_selector_all("select")
            if len(selects) > 0:
                select = selects[0]
                options = select.query_selector_all("option")
                
                for option in options:
                    value = option.get_attribute("value")
                    text = option.text_content().strip()
                    
                    if value and text:
                        # 解析 "代码 - 名称" 格式
                        parts = text.split(" - ", 1)
                        项目代码 = parts[0].strip()
                        项目名称 = parts[1].strip() if len(parts) > 1 else text
                        
                        projects.append({
                            "项目代码": 项目代码,
                            "项目名称": 项目名称,
                            "分数": 0.00
                        })
                
                print(f"  ✅ 从下拉菜单提取: {len(projects)} 个项目")
        
        finally:
            browser.close()
    
    # 保存到缓存
    if len(projects) > 0:
        from datetime import datetime
        metadata = {
            "last_update": datetime.now().isoformat(),
            "total_count": len(projects),
            "source": "studentPerformance dropdown"
        }
        cache_mgr.save_cache(projects, metadata)
        print(f"✅ 已保存 {len(projects)} 个项目到缓存")
        
        # 验证是否包含关键项目
        found_codes = {p['项目代码'] for p in projects}
        if 'CCDCMO1188' in found_codes:
            print("✅ 包含 CCDCMO1188")
        
        return projects
    else:
        print("❌ 未提取到任何项目")
        return []

if __name__ == "__main__":
    extract_and_cache_projects()

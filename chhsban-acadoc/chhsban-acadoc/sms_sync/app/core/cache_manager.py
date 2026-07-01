#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
缓存管理器 - 处理项目数据的本地缓存
"""

import os
import json
import requests
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
import time

# 导入全局常量配置
from .constants import LOGIN_URL, ITEM_SETTING_PAGE, BASE_URL

requests.packages.urllib3.disable_warnings()

class ProjectCacheManager:
    """项目数据缓存管理"""
    
    def __init__(self):
        # 缓存目录：C:\Users\<username>\.sms_app
        self.cache_dir = Path.home() / ".sms_app"
        self.cache_dir.mkdir(exist_ok=True)
        
        # 缓存文件
        self.projects_cache = self.cache_dir / "projects.json"
        self.metadata_cache = self.cache_dir / "metadata.json"
        
        # SMS 系统配置（2026-06-20 改为内网地址）
        self.LOGIN_URL = LOGIN_URL
        self.ITEM_SETTING_PAGE = ITEM_SETTING_PAGE
    
    def get_total_count_from_page(self, session) -> int:
        """从页面获取总项目数"""
        try:
            response = session.get(self.ITEM_SETTING_PAGE, params={'page': 1}, timeout=10)
            
            # 查找 "第 1-10 条, 共 XXXX 条"
            import re
            match = re.search(r'第\s*\d+[-~]\d+\s*条，?共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                print(f"  📊 获取总数：{total} 条")
                return total
            
            # 备用查找
            match = re.search(r'共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                print(f"  📊 获取总数：{total} 条")
                return total
            
            print("  ⚠️  无法获取总数，假设为 1000")
            return 1000
        except Exception as e:
            print(f"  ❌ 获取总数失败: {e}")
            return 1000
    
    def get_total_pages(self, total_count: int) -> int:
        """根据总数计算页数"""
        return (total_count + 9) // 10  # 每页 10 条，向上取整
    
    def fetch_page(self, session, page: int) -> list:
        """获取单一页面的项目数据 - 使用 AJAX URL"""
        try:
            # 使用 AJAX 分页 URL - ItemM_page 参数控制分页（内网地址）
            url = f"{BASE_URL}"
            params = {
                'ItemM_page': page,
                'ajax': 'item-m-grid',
                'r': 'transaction/itemSetting/index'
            }
            response = session.get(url, params=params, timeout=10)
            
            class ProjectTableParser(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.rows = []
                    self.in_tbody = False
                    self.current_row = []
                    self.in_td = False
                    self.current_cell = ""
                
                def handle_starttag(self, tag, attrs):
                    if tag == "tbody":
                        self.in_tbody = True
                    elif tag == "tr" and self.in_tbody:
                        self.current_row = []
                    elif tag in ["td", "th"] and self.in_tbody:
                        self.in_td = True
                        self.current_cell = ""
                
                def handle_endtag(self, tag):
                    if tag == "tbody":
                        self.in_tbody = False
                    elif tag == "tr" and self.in_tbody:
                        if self.current_row:
                            self.rows.append(self.current_row)
                    elif tag in ["td", "th"] and self.in_tbody:
                        self.in_td = False
                        self.current_row.append(self.current_cell.strip())
                
                def handle_data(self, data):
                    if self.in_td:
                        self.current_cell += data
            
            parser = ProjectTableParser()
            parser.feed(response.text)
            
            projects = []
            for row in parser.rows:
                if len(row) >= 3:
                    project = {
                        '序号': row[0].strip() if len(row) > 0 else '',
                        '项目代码': row[1].strip() if len(row) > 1 else '',
                        '项目名称': row[2].strip() if len(row) > 2 else '',
                        '分数': row[3].strip() if len(row) > 3 else '0.00'
                    }
                    projects.append(project)
            
            return projects
        except Exception as e:
            print(f"  ⚠️  获取第 {page} 页失败: {e}")
            return []
    
    def download_all_projects(self, username: str, password: str, callback=None) -> dict:
        """下载所有项目数据"""
        print("="*70)
        print("📥 开始下载所有项目数据")
        print("="*70)
        
        session = requests.Session()
        session.verify = False
        
        try:
            # 登入
            print("  📍 第1步：登入系统...", end="", flush=True)
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }
            session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
            print(" ✅")
            
            time.sleep(0.5)
            
            # 获取总数
            print("  📍 第2步：获取总项目数...", end="", flush=True)
            total_count = self.get_total_count_from_page(session)
            total_pages = self.get_total_pages(total_count)
            print(f"  📍 需要下载 {total_pages} 页")
            
            time.sleep(0.5)
            
            # 下载所有页面
            print(f"  📍 第3步：下载所有 {total_pages} 页数据...")
            all_projects = []
            
            for page in range(1, total_pages + 1):
                projects = self.fetch_page(session, page)
                all_projects.extend(projects)
                
                if page % 20 == 1 or page == total_pages:
                    progress = int(100 * page / total_pages)
                    print(f"    ⏳ 进度 {progress}% - 第 {page}/{total_pages} 页，已下载 {len(all_projects)} 条", flush=True)
                
                if callback:
                    callback(page, total_pages, len(all_projects))
                
                time.sleep(0.1)  # 避免过快
            
            print(f"  ✅ 下载完成，共 {len(all_projects)} 条项目")
            
            session.close()
            
            # 保存到缓存
            metadata = {
                'total_count': len(all_projects),
                'total_pages': total_pages,
                'last_updated': datetime.now().isoformat(),
                'first_project_id': all_projects[0].get('序号', '') if all_projects else '',
                'last_project_id': all_projects[-1].get('序号', '') if all_projects else ''
            }
            
            return {
                'success': True,
                'projects': all_projects,
                'metadata': metadata
            }
        
        except Exception as e:
            print(f"  ❌ 下载失败: {e}")
            session.close()
            return {
                'success': False,
                'projects': [],
                'metadata': {},
                'error': str(e)
            }
    
    def save_cache(self, projects: list, metadata: dict):
        """保存项目数据到缓存"""
        try:
            print("\n  📍 第4步：保存到缓存...", end="", flush=True)
            
            # 保存项目数据
            with open(self.projects_cache, 'w', encoding='utf-8') as f:
                json.dump(projects, f, ensure_ascii=False, indent=2)
            
            # 保存元数据
            with open(self.metadata_cache, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            
            print(f" ✅")
            print(f"  💾 缓存已保存到：{self.cache_dir}")
            print("="*70)
            print()
        except Exception as e:
            print(f" ❌ 保存缓存失败: {e}")
    
    def load_cache(self) -> tuple:
        """从缓存加载项目数据"""
        try:
            if not self.projects_cache.exists() or not self.metadata_cache.exists():
                return None, None
            
            with open(self.projects_cache, 'r', encoding='utf-8') as f:
                projects = json.load(f)
            
            with open(self.metadata_cache, 'r', encoding='utf-8') as f:
                metadata = json.load(f)
            
            return projects, metadata
        except Exception as e:
            print(f"  ⚠️  加载缓存失败: {e}")
            return None, None
    
    def has_cache(self) -> bool:
        """检查是否存在缓存"""
        return self.projects_cache.exists() and self.metadata_cache.exists()
    
    def clear_cache(self):
        """清除缓存"""
        try:
            if self.projects_cache.exists():
                self.projects_cache.unlink()
            if self.metadata_cache.exists():
                self.metadata_cache.unlink()
            print(f"  ✅ 缓存已清除")
        except Exception as e:
            print(f"  ❌ 清除缓存失败: {e}")
    
    def get_cache_info(self) -> dict:
        """获取缓存信息"""
        if not self.has_cache():
            return {
                'cached': False,
                'cache_dir': str(self.cache_dir)
            }
        
        try:
            projects, metadata = self.load_cache()
            return {
                'cached': True,
                'cache_dir': str(self.cache_dir),
                'project_count': len(projects) if projects else 0,
                'last_updated': metadata.get('last_updated', 'Unknown') if metadata else '',
                'projects_file': str(self.projects_cache),
                'metadata_file': str(self.metadata_cache)
            }
        except Exception as e:
            return {
                'cached': True,
                'cache_dir': str(self.cache_dir),
                'error': str(e)
            }


if __name__ == "__main__":
    # 测试缓存管理器
    manager = ProjectCacheManager()
    
    print("\n📊 缓存信息：")
    info = manager.get_cache_info()
    for key, value in info.items():
        print(f"  {key}: {value}")
    
    if not manager.has_cache():
        print("\n⚠️  没有缓存，需要下载")
    else:
        projects, metadata = manager.load_cache()
        print(f"\n✅ 已加载缓存：{len(projects)} 个项目")

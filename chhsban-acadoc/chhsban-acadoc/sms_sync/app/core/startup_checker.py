#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动检查器 - 检查并更新项目数据
在应用启动时验证项目总数是否符合
"""

import requests
import re
import time
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
from .cache_manager import ProjectCacheManager
from .config_manager import ConfigManager
from .constants import LOGIN_URL, ITEM_SETTING_PAGE, BASE_URL

requests.packages.urllib3.disable_warnings()


class StartupChecker:
    """应用启动时的检查器"""
    
    def __init__(self):
        self.cache_manager = ProjectCacheManager()
        self.config_manager = ConfigManager()
        # 使用全局常量配置（2026-06-20 改为内网地址）
        self.LOGIN_URL = LOGIN_URL
        self.ITEM_SETTING_PAGE = ITEM_SETTING_PAGE
    
    def get_page_total_count(self, session) -> int:
        """
        从 AJAX 端点提取总数
        URL: http://192.168.0.6/sms/index.php?ItemM_page=1&ajax=item-m-grid&r=transaction/itemSetting/index
        """
        try:
            # 使用 AJAX 端点获取第一页数据（内网地址）
            url = BASE_URL
            params = {
                'ItemM_page': 1,
                'ajax': 'item-m-grid',
                'r': 'transaction/itemSetting/index'
            }
            
            response = session.get(url, params=params, timeout=10)
            
            # 查找 "第 1-10 条, 共 XXXX 条"
            match = re.search(r'第\s*\d+[-~]\d+\s*条，?共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                return total
            
            # 备用查找
            match = re.search(r'共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                return total
            
            return None
        except Exception as e:
            print(f"    ❌ 获取页面总数失败: {e}")
            return None
    
    def get_cached_total_count(self) -> int:
        """获取缓存中的项目总数"""
        try:
            _, metadata = self.cache_manager.load_cache()
            if metadata:
                return metadata.get('total_count', 0)
            return 0
        except:
            return 0
    
    def fetch_new_projects(self, session, last_count: int, log_callback=None) -> list:
        """
        获取新增项目
        可直接从最新的数据开始，只补新增部分
        """
        def log(msg):
            if log_callback:
                log_callback(msg)
            else:
                print(msg)
        
        try:
            log(f"    📥 获取新增项目（从第 {last_count + 1} 条开始）...")
            
            # 从 AJAX 第一页获取总页数（内网地址）
            url = BASE_URL
            params = {
                'ItemM_page': 1,
                'ajax': 'item-m-grid',
                'r': 'transaction/itemSetting/index'
            }
            response = session.get(url, params=params, timeout=10)
            
            match = re.search(r'第\s*\d+[-~]\d+\s*条，?共\s*(\d+)\s*条', response.text)
            if not match:
                match = re.search(r'共\s*(\d+)\s*条', response.text)
            
            if not match:
                log(f"      ❌ 无法获取总数")
                return []
            
            total_count = int(match.group(1))
            total_pages = (total_count + 9) // 10
            
            new_projects = []
            
            # 从第 1 页开始获取项目
            for page in range(1, total_pages + 1):
                params = {
                    'ItemM_page': page,
                    'ajax': 'item-m-grid',
                    'r': 'transaction/itemSetting/index'
                }
                
                try:
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
                    
                    for row in parser.rows:
                        if len(row) >= 3:
                            project = {
                                '序号': row[0].strip() if len(row) > 0 else '',
                                '项目代码': row[1].strip() if len(row) > 1 else '',
                                '项目名称': row[2].strip() if len(row) > 2 else '',
                                '分数': row[3].strip() if len(row) > 3 else '0.00'
                            }
                            new_projects.append(project)
                    
                    # 进度显示
                    if page % 5 == 0 or page == total_pages:
                        progress = int(100 * page / total_pages)
                        log(f"      ⏳ 进度 {progress}% - 第 {page}/{total_pages} 页，已获取 {len(new_projects)} 条")
                    
                    time.sleep(0.1)
                
                except Exception as e:
                    log(f"      ⚠️  第 {page} 页获取失败: {e}")
                    continue
            
            return new_projects
        except Exception as e:
            log(f"    ❌ 获取新增项目失败: {e}")
            return []
    
    def update_projects_cache(self, all_projects: list, total_count: int, log_callback=None):
        """更新项目缓存"""
        def log(msg):
            if log_callback:
                log_callback(msg)
            else:
                print(msg)
        
        try:
            log(f"    💾 保存 {len(all_projects)} 条项目到缓存...")
            
            total_pages = (total_count + 9) // 10
            metadata = {
                'total_count': total_count,
                'total_pages': total_pages,
                'last_updated': datetime.now().isoformat(),
                'first_project_id': all_projects[0].get('序号', '') if all_projects else '',
                'last_project_id': all_projects[-1].get('序号', '') if all_projects else ''
            }
            
            self.cache_manager.save_cache(all_projects, metadata)
            log(f"    ✅ 缓存更新成功")
            return True
        except Exception as e:
            log(f"    ❌ 缓存更新失败: {e}")
            return False
    
    def check_and_update(self, log_callback=None) -> dict:
        """
        检查项目总数是否符合
        如果不符合则更新
        
        Returns:
            dict: {
                'checked': bool,      # 是否检查成功
                'page_total': int,    # 页面上的总数
                'cached_total': int,  # 缓存中的总数
                'matched': bool,      # 是否匹配
                'updated': bool,      # 是否已更新
                'message': str        # 详细消息
            }
        """
        result = {
            'checked': False,
            'page_total': 0,
            'cached_total': 0,
            'matched': False,
            'updated': False,
            'message': ''
        }
        
        def log(message):
            print(message)
            if log_callback:
                log_callback(message)
        
        log("\n" + "="*70)
        log("🚀 启动检查：验证项目数据")
        log("="*70)
        
        try:
            # 获取凭证
            username, password = self.config_manager.get_credentials()
            if not username or not password:
                log("  ⚠️  未保存凭证，跳过检查")
                log("  💡 提示：请先在「设置」页面输入 SMS 帐号和密码")
                log("  🔧 操作：点击「保存设置」按钮后，系统会自动下载全部项目数据")
                result['message'] = "未保存凭证 - 请在设置页输入帐号密码"
                return result
            
            # 登入系统
            log("  📍 正在连接系统...")
            session = requests.Session()
            session.verify = False
            
            try:
                login_data = {
                    'LoginForm[username]': username,
                    'LoginForm[password]': password,
                    'login-button': 'login'
                }
                session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
                log("  ✅ 已连接")
            except Exception as e:
                log(f"  ❌ 连接失败: {e}")
                result['message'] = f"连接失败: {e}"
                session.close()
                return result
            
            time.sleep(0.5)
            
            # 获取页面上的总数
            log("  📍 获取页面总数...")
            page_total = self.get_page_total_count(session)
            
            if page_total is None:
                log("  ❌ 无法从页面获取总数")
                result['message'] = "无法从页面获取总数"
                session.close()
                return result
            
            log(f"  ✅ 页面总数: {page_total}")
            
            # 获取缓存中的总数
            cached_total = self.get_cached_total_count()
            log(f"  📦 缓存总数: {cached_total}")
            
            result['checked'] = True
            result['page_total'] = page_total
            result['cached_total'] = cached_total
            
            # 检查是否匹配
            if page_total == cached_total:
                log(f"  ✅ 数据一致，无需更新")
                result['matched'] = True
                result['message'] = f"✅ 数据一致 (总数: {page_total})"
                session.close()
                return result
            
            log(f"  ⚠️  数据不一致！")
            log(f"     - 页面总数: {page_total}")
            log(f"     - 缓存总数: {cached_total}")
            log(f"     - 差异: {page_total - cached_total} 条")
            
            # 需要更新
            log(f"  📥 正在更新缓存...")
            
            if cached_total == 0:
                # 首次导入，下载所有数据
                log(f"    📍 首次导入，下载所有 {page_total} 条项目...")
                new_projects = self.fetch_new_projects(session, 0, log_callback)
            else:
                # 增量更新
                log(f"    📍 增量更新，下载新增 {page_total - cached_total} 条项目...")
                
                # 获取旧缓存
                old_projects, _ = self.cache_manager.load_cache()
                old_projects = old_projects if old_projects else []
                
                # 获取全量新数据
                all_new_projects = self.fetch_new_projects(session, cached_total, log_callback)
                
                # 合并数据（去重）
                existing_codes = {p.get('项目代码'): p for p in old_projects}
                for project in all_new_projects:
                    code = project.get('项目代码')
                    if code and code not in existing_codes:
                        existing_codes[code] = project
                
                new_projects = list(existing_codes.values())
                log(f"    ℹ️  合并后共 {len(new_projects)} 条项目")
            
            time.sleep(0.5)
            
            # 更新缓存
            if self.update_projects_cache(new_projects, page_total, log_callback):
                result['updated'] = True
                result['message'] = f"✅ 已更新 ({cached_total} → {page_total}，新增 {page_total - cached_total} 条)"
            else:
                result['message'] = f"❌ 更新失败"
            
            session.close()
            return result
        
        except Exception as e:
            log(f"  ❌ 异常: {type(e).__name__}: {e}")
            result['message'] = f"异常: {str(e)}"
            return result
        
        finally:
            log("="*70 + "\n")
    
    def check_and_update_incremental(self, log_callback=None) -> dict:
        """
        增量检查并更新
        只检查最后几页差异数据，速度更快
        
        例如：
        - 缓存有 2420 条（242 页）
        - 服务器有 2423 条（243 页）
        - 只检查第 242 页及以后
        """
        result = {
            'checked': False,
            'page_total': 0,
            'cached_total': 0,
            'matched': False,
            'updated': False,
            'message': '',
            'incremental': True  # 标记为增量检查
        }
        
        def log(message):
            print(message)
            if log_callback:
                log_callback(message)
        
        log("\n" + "="*70)
        log("🚀 启动检查：增量更新项目数据")
        log("="*70)
        
        try:
            # 获取凭证
            username, password = self.config_manager.get_credentials()
            if not username or not password:
                log("  ⚠️  未保存凭证，跳过检查")
                log("  💡 提示：请先在「设置」页面输入 SMS 帐号和密码")
                log("  🔧 操作：点击「保存设置」按钮后，系统会自动下载全部项目数据")
                result['message'] = "未保存凭证 - 请在设置页输入帐号密码"
                return result
            
            # 登入系统
            log("  📍 正在连接系统...")
            session = requests.Session()
            session.verify = False
            
            try:
                login_data = {
                    'LoginForm[username]': username,
                    'LoginForm[password]': password,
                    'login-button': 'login'
                }
                session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
                log("  ✅ 已连接")
            except Exception as e:
                log(f"  ❌ 连接失败: {e}")
                result['message'] = f"连接失败: {e}"
                session.close()
                return result
            
            time.sleep(0.5)
            
            # 获取缓存中的总数
            cached_total = self.get_cached_total_count()
            log(f"  📦 缓存总数: {cached_total} 条")
            
            if cached_total == 0:
                log(f"  ℹ️  缓存为空，使用全量检查")
                session.close()
                return self.check_and_update(log_callback)
            
            # 计算缓存的最后一页
            cached_last_page = (cached_total + 9) // 10
            log(f"  📄 缓存最后一页: 第 {cached_last_page} 页")
            
            # 获取页面上的总数
            log("  📍 获取页面总数...")
            page_total = self.get_page_total_count(session)
            
            if page_total is None:
                log("  ❌ 无法从页面获取总数")
                result['message'] = "无法从页面获取总数"
                session.close()
                return result
            
            log(f"  ✅ 页面总数: {page_total}")
            
            result['checked'] = True
            result['page_total'] = page_total
            result['cached_total'] = cached_total
            
            # 检查是否一致
            if page_total == cached_total:
                log(f"  ✅ 数据一致，无需更新")
                result['matched'] = True
                result['message'] = f"✅ 数据一致 (总数: {page_total})"
                session.close()
                return result
            
            # 数据不一致，只检查差异部分
            page_total_last_page = (page_total + 9) // 10
            log(f"  ℹ️  新数据最后一页: 第 {page_total_last_page} 页")
            log(f"  ⚠️  数据不一致 (差异: {page_total - cached_total} 条)")
            
            # 计算需要检查的起始页
            check_start_page = cached_last_page  # 从旧的最后一页开始
            log(f"  📥 增量更新：只检查第 {check_start_page}-{page_total_last_page} 页")
            
            # 获取旧缓存
            old_projects, _ = self.cache_manager.load_cache()
            old_projects = old_projects if old_projects else []
            
            # 只下载检查范围内的数据（使用内网地址）
            new_projects_data = []
            url = BASE_URL
            
            for page in range(check_start_page, page_total_last_page + 1):
                params = {
                    'ItemM_page': page,
                    'ajax': 'item-m-grid',
                    'r': 'transaction/itemSetting/index'
                }
                
                try:
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
                    
                    for row in parser.rows:
                        if len(row) >= 3:
                            project = {
                                '序号': row[0].strip() if len(row) > 0 else '',
                                '项目代码': row[1].strip() if len(row) > 1 else '',
                                '项目名称': row[2].strip() if len(row) > 2 else '',
                                '分数': row[3].strip() if len(row) > 3 else '0.00'
                            }
                            new_projects_data.append(project)
                    
                    log(f"    ✅ 第 {page} 页：获取 {len(parser.rows)} 条")
                    time.sleep(0.1)
                
                except Exception as e:
                    log(f"    ⚠️  第 {page} 页获取失败: {e}")
                    continue
            
            # 合并数据（去重）
            existing_codes = {p.get('项目代码'): p for p in old_projects}
            for project in new_projects_data:
                code = project.get('项目代码')
                if code:
                    existing_codes[code] = project  # 新数据覆盖旧数据
            
            merged_projects = list(existing_codes.values())
            log(f"  ℹ️  合并后共 {len(merged_projects)} 条项目")
            
            time.sleep(0.5)
            
            # 更新缓存
            if self.update_projects_cache(merged_projects, page_total, log_callback):
                result['updated'] = True
                result['message'] = f"✅ 已增量更新 ({cached_total} → {page_total}，新增 {page_total - cached_total} 条)"
            else:
                result['message'] = f"❌ 更新失败"
            
            session.close()
            return result
        
        except Exception as e:
            log(f"  ❌ 异常: {type(e).__name__}: {e}")
            result['message'] = f"异常: {str(e)}"
            return result
        
        finally:
            log("="*70 + "\n")


if __name__ == "__main__":
    checker = StartupChecker()
    result = checker.check_and_update()
    print(f"\n结果：{result}")

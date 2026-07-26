#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
启动检查器 - 检查并更新项目数据
在应用启动时验证项目总数是否符合
"""

import requests
import re
import time
import json
from pathlib import Path
from datetime import datetime
from html.parser import HTMLParser
from .cache_manager import ProjectCacheManager
from .config_manager import ConfigManager
from .constants import LOGIN_URL, ITEM_SETTING_PAGE, BASE_URL, SCORE_UPLOAD_PAGE

requests.packages.urllib3.disable_warnings()


class StartupChecker:
    """应用启动时的检查器"""
    
    def __init__(self):
        self.cache_manager = ProjectCacheManager()
        self.config_manager = ConfigManager()
        # 使用全局常量配置（2026-06-20 改为内网地址）
        self.LOGIN_URL = LOGIN_URL
        self.ITEM_SETTING_PAGE = ITEM_SETTING_PAGE
        self.SCORE_UPLOAD_PAGE = SCORE_UPLOAD_PAGE
    
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
            
            # 改进的正则表达式：支持多种分隔符（-、~、–、—、–）
            # 查找 "第 1-10 条, 共 XXXX 条"
            match = re.search(r'第\s*\d+[\-~–—]\d+\s*条[，,]?共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                return total
            
            # 备用查找1：只查找 "共 XXXX 条"
            match = re.search(r'共\s*(\d+)\s*条', response.text)
            if match:
                total = int(match.group(1))
                return total
            
            # 调试：打印响应中包含"条"的部分，帮助诊断问题
            lines_with_tiao = [line for line in response.text.split('\n') if '条' in line]
            if lines_with_tiao:
                print(f"    💡 调试信息 - 响应中包含「条」的行:")
                for line in lines_with_tiao[:3]:  # 只打印前3行
                    print(f"       {line.strip()[:100]}")  # 只打印前100字符
            
            return None
        except Exception as e:
            print(f"    ❌ 获取页面总数失败: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def fetch_projects_from_select(self, session, log_callback=None) -> list:
        """
        从学生成绩上传页面的项目选择下拉菜单中提取项目（推荐方法）
        
        优点：
        1. 数据来自系统实际使用的选择器
        2. 数据必然是最新的和有效的
        3. 无需处理分页
        4. 格式规范化
        
        URL: http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index
        """
        def log(msg):
            if log_callback:
                log_callback(msg)
            else:
                print(msg)
        
        try:
            log(f"    📥 从学生成绩上传页面的 select 下拉菜单提取项目...")
            
            # 请求学生成绩上传页面
            response = session.get(self.SCORE_UPLOAD_PAGE, timeout=10)
            
            if response.status_code != 200:
                log(f"    ❌ 页面访问失败: {response.status_code}")
                return []
            
            projects = []
            
            # 方法1：查找 select 标签中的 option 元素
            # 解析 HTML 找到所有 <option> 标签
            class SelectOptionParser(HTMLParser):
                def __init__(self):
                    super().__init__()
                    self.options = []
                    self.in_option = False
                    self.current_value = ""
                    self.current_text = ""
                
                def handle_starttag(self, tag, attrs):
                    if tag == "option":
                        self.in_option = True
                        # 获取 value 属性
                        attrs_dict = dict(attrs)
                        self.current_value = attrs_dict.get('value', '')
                        self.current_text = ""
                
                def handle_endtag(self, tag):
                    if tag == "option" and self.in_option:
                        self.in_option = False
                        if self.current_value and self.current_text:
                            self.options.append({
                                'value': self.current_value,
                                'text': self.current_text.strip()
                            })
                
                def handle_data(self, data):
                    if self.in_option:
                        self.current_text += data
            
            parser = SelectOptionParser()
            try:
                parser.feed(response.text)
            except Exception as parse_error:
                log(f"    ⚠️  HTML 解析错误: {parse_error}")
                return []
            
            # 处理提取的 options
            for option in parser.options:
                value = option['value'].strip()
                text = option['text'].strip()
                
                # 格式通常是 "代码 - 名称" 或 "代码:名称"
                if ' - ' in text:
                    parts = text.split(' - ', 1)
                    code = parts[0].strip()
                    name = parts[1].strip()
                elif ':' in text:
                    parts = text.split(':', 1)
                    code = parts[0].strip()
                    name = parts[1].strip()
                else:
                    code = value
                    name = text
                
                # 使用 value 作为项目代码，如果为空则使用 code
                if not code and value:
                    code = value
                
                if code and code != '0':  # 过滤掉空值和"请选择"选项
                    project = {
                        '序号': str(len(projects) + 1),
                        '项目代码': code,
                        '项目名称': name if name else code,
                        '分数': '0.00'
                    }
                    projects.append(project)
                    log(f"      ✓ {code} - {name}")
            
            if projects:
                log(f"    ✅ 从 select 提取成功，共 {len(projects)} 个项目")
                return projects
            else:
                log(f"    ⚠️  未找到任何项目选项")
                return []
        
        except Exception as e:
            log(f"    ❌ 从 select 提取失败: {e}")
            import traceback
            log(f"    💡 调试: {traceback.format_exc()}")
            return []
    
    def get_cached_total_count(self) -> int:
        """获取本地缓存的项目总数——以 projects.json 里实际的笔数为准（而不是 metadata.json
        记录的 total_count 字段），避免两者因为过去的异常写入而不一致。"""
        try:
            projects, _ = self.cache_manager.load_cache()
            return len(projects) if projects else 0
        except:
            return 0
    
    def fetch_new_projects(self, session, last_count: int, log_callback=None, expected_total: int = None) -> list:
        """
        获取全部项目（分页抓取，从第 1 页开始）

        expected_total: 页面上显示的权威总数（"共 X 条"）。翻到超过实际最后一页时，
        SMS 的分页 AJAX 端点不一定会返回空表格（可能重复回传最后一页/第一页的内容），
        导致单纯用"连续空页"判断结束会一直抓到人为设定的页数上限，抓出远多于实际数量
        的（重复）资料。传入 expected_total 后，一旦抓满这个数量就立即停止，并在抓取
        结束后裁切到刚好 expected_total 条，确保笔数一定与网页上显示的一致。
        """
        def log(msg):
            if log_callback:
                log_callback(msg)
            else:
                print(msg)

        try:
            log(f"    📥 获取全部项目...")
            if expected_total:
                log(f"    🎯 页面权威总数: {expected_total} 条")

            # 从 AJAX 第一页获取总数信息
            url = BASE_URL
            page = 1
            all_projects = []
            max_consecutive_empty = 0  # 连续空页计数
            # 页面权威总数所需的最大页数（多留 2 页缓冲，避免边界漏抓）
            max_pages_to_fetch = (((expected_total + 9) // 10) + 2) if expected_total else 500

            while True:
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
                    try:
                        parser.feed(response.text)
                    except Exception as parse_error:
                        log(f"      ⚠️  HTML 解析错误（页 {page}）: {parse_error}")
                        parser.rows = []
                    
                    # 提取项目数据
                    page_projects = 0
                    for row in parser.rows:
                        if len(row) >= 2:  # 至少有序号和项目代码
                            try:
                                project = {
                                    '序号': row[0].strip() if len(row) > 0 else '',
                                    '项目代码': row[1].strip() if len(row) > 1 else '',
                                    '项目名称': row[2].strip() if len(row) > 2 else '',
                                    '分数': row[3].strip() if len(row) > 3 else '0.00'
                                }
                                # 只保存有项目代码的行
                                if project['项目代码']:
                                    all_projects.append(project)
                                    page_projects += 1
                            except Exception as e:
                                log(f"      ⚠️  行解析失败: {e}")
                                continue
                    
                    # 已抓满页面权威总数，立即停止（避免翻过最后一页后重复抓到旧资料）
                    if expected_total and len(all_projects) >= expected_total:
                        log(f"      ✓ 已抓满页面显示的总数 ({expected_total} 条)，停止获取")
                        break

                    # 检查是否还有数据
                    if page_projects == 0:
                        max_consecutive_empty += 1
                        if max_consecutive_empty >= 2:  # 连续2个空页则停止
                            log(f"      ✓ 已到达最后一页，停止获取")
                            break
                    else:
                        max_consecutive_empty = 0
                        # 进度显示
                        log(f"      ⏳ 第 {page} 页 - 本页 {page_projects} 条，已获取 {len(all_projects)} 条")

                    page += 1
                    time.sleep(0.1)

                    # 安全限制：最多获取到页面权威总数所需的页数（无权威总数时退回 500 页兜底）
                    if page > max_pages_to_fetch:
                        log(f"      ⚠️  已达到最大页数限制 ({max_pages_to_fetch})")
                        break

                except Exception as e:
                    log(f"      ⚠️  第 {page} 页获取失败: {e}")
                    max_consecutive_empty += 1
                    if max_consecutive_empty >= 2:
                        break
                    page += 1
                    continue

            # 保险裁切：即便页面重复回传旧资料导致笔数抓多了，也强制对齐到权威总数
            if expected_total and len(all_projects) > expected_total:
                log(f"    ⚠️  抓取到 {len(all_projects)} 条，超过页面权威总数 {expected_total} 条，裁切多余部分")
                all_projects = all_projects[:expected_total]

            log(f"    ✓ 共获取 {len(all_projects)} 条项目")
            return all_projects
            
        except Exception as e:
            log(f"    ❌ 获取项目失败: {e}")
            import traceback
            log(f"    💡 调试: {traceback.format_exc()}")
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
    
    def check_and_update_full(self, log_callback=None) -> dict:
        """
        完整的全量更新（舍弃旧缓存，重新下载所有项目）
        用于：
        - 手动更新按钮（用户主动点击）
        - 首次初始化（无缓存）
        
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
            
            # 【修改】手动更新时，即使项目数相同也要强制更新
            # 因为项目名称可能在 SMS 上被修改，仅比对数量无法检测
            # 比对逻辑只保留在增量检查中
            log(f"  📥 手动更新：强制重新下载所有项目")
            if page_total != cached_total:
                log(f"  ⚠️  数据不一致！")
                log(f"     - 页面总数: {page_total}")
                log(f"     - 缓存总数: {cached_total}")
                log(f"     - 差异: {page_total - cached_total} 条")
            else:
                log(f"  💡 项目数相同 ({page_total})，但仍需检查是否有项目名称改动")
            
            # 需要更新
            log(f"  📥 正在更新缓存...")
            
            # 【新】首先尝试使用 Playwright 提取（更可靠的方法）
            log(f"    💡 使用浏览器自动化提取...")
            new_projects = self.extract_projects_with_playwright(username, password, log_callback)
            
            if new_projects:
                # 使用 Playwright 提取的项目
                page_total = len(new_projects)
                log(f"    ✅ Playwright 提取成功，共 {page_total} 条项目")
            else:
                # 回退到原始方法
                log(f"    ⚠️  Playwright 提取失败，回退到分页方法...")
                log(f"    📍 从项目设置页面提取所有项目...")
                new_projects = self.fetch_new_projects(session, cached_total, log_callback, expected_total=page_total)
                
                if not new_projects:
                    log(f"    ⚠️  分页方法未获取到项目")
                    result['message'] = f"无法获取项目数据"
                    session.close()
                    return result
                
                # 如果成功获取，使用实际获取的数量作为总数
                page_total = len(new_projects)
                log(f"    ✅ 分页提取成功，共 {page_total} 条项目")
            
            time.sleep(0.5)
            
            # 更新缓存
            if self.update_projects_cache(new_projects, page_total, log_callback):
                result['updated'] = True
                if page_total > cached_total:
                    result['message'] = f"✅ 已更新 ({cached_total} → {page_total}，新增 {page_total - cached_total} 条)"
                else:
                    result['message'] = f"✅ 已更新 (共 {page_total} 条)"
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
    
    def extract_projects_with_playwright(self, username: str, password: str, log_callback=None) -> list:
        """
        使用 Playwright 浏览器自动化从下拉菜单提取项目
        这是最可靠的方法，因为数据来自实际的 JavaScript 渲染结果
        
        Returns:
            list: 项目列表 [{'项目代码': '...', '项目名称': '...', '分数': 0.0}, ...]
        """
        def log(msg):
            if log_callback:
                log_callback(msg)
            else:
                print(msg)
        
        try:
            from playwright.sync_api import sync_playwright
            
            projects = []
            
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                
                try:
                    # 登入
                    log("    📍 Playwright: 正在登入...")
                    page.goto("http://192.168.0.6/sms/index.php")
                    
                    page.fill("input[name='LoginForm[username]']", username)
                    page.fill("input[name='LoginForm[password]']", password)
                    page.click("button[type='submit']")
                    
                    # 等待登入完成
                    page.wait_for_load_state("networkidle")
                    log("    ✅ 登入成功")
                    
                    # 访问学生成绩页面
                    log("    📍 Playwright: 访问学生成绩页面...")
                    page.goto("http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/index")
                    page.wait_for_load_state("networkidle")
                    
                    # 从下拉菜单提取项目
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
                                    "分数": 0.0
                                })
                        
                        log(f"    ✅ Playwright: 提取 {len(projects)} 个项目")
                    else:
                        log("    ⚠️  Playwright: 未找到下拉菜单")
                
                finally:
                    browser.close()
            
            return projects
        
        except ImportError:
            log("    ❌ Playwright 未安装")
            return []
        except Exception as e:
            log(f"    ❌ Playwright 提取失败: {e}")
            import traceback
            log(f"    💡 调试: {traceback.format_exc()}")
            return []
    
    def check_and_update_incremental(self, log_callback=None) -> dict:
        """
        快速检查项目总数是否变化：
        - 只比对总数（一次请求，很快），总数相同则直接跳过，不重新下载
        - 总数不同，代表资料有变动，直接舍弃旧缓存、重新下载全部项目覆盖
          （不做部分合并，避免缓存与实际资料因为顺序变动等原因逐渐产生差异）
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
            
            # 如果缓存为空，首次下载后直接返回，不使用强制更新逻辑
            if cached_total == 0:
                log(f"  ℹ️  缓存为空，首次下载所有项目...")
                page_total = self.get_page_total_count(session)
                
                if page_total is None:
                    log("  ❌ 无法从页面获取总数")
                    result['message'] = "无法从页面获取总数"
                    session.close()
                    return result
                
                log(f"  ✅ 页面总数: {page_total}")
                
                # 下载所有项目
                log(f"    💡 使用浏览器自动化提取...")
                new_projects = self.extract_projects_with_playwright(username, password, log_callback)
                
                if new_projects:
                    page_total = len(new_projects)
                    log(f"    ✅ Playwright 提取成功，共 {page_total} 条项目")
                else:
                    log(f"    ⚠️  Playwright 提取失败，回退到分页方法...")
                    new_projects = self.fetch_new_projects(session, 0, log_callback, expected_total=page_total)
                    
                    if not new_projects:
                        log(f"    ⚠️  分页方法未获取到项目")
                        result['message'] = f"无法获取项目数据"
                        session.close()
                        return result
                    
                    page_total = len(new_projects)
                    log(f"    ✅ 分页提取成功，共 {page_total} 条项目")
                
                # 保存缓存
                if self.update_projects_cache(new_projects, page_total, log_callback):
                    result['checked'] = True
                    result['page_total'] = page_total
                    result['cached_total'] = 0
                    result['updated'] = True
                    result['message'] = f"✅ 首次下载完成 (共 {page_total} 条)"
                    log(f"  ✅ {result['message']}")
                else:
                    result['message'] = "保存缓存失败"
                    log(f"  ❌ {result['message']}")
                
                session.close()
                return result
            
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
            
            # 数据不一致：智能增量检查
            diff_count = page_total - cached_total
            log(f"  ⚠️  数据不一致 (差异: {diff_count} 条)")
            
            # 如果差异在 10 条以内，只检查最后一页
            if 0 < diff_count <= 10:
                log(f"  💡 差异较小 ({diff_count} 条)，只检查最后一页...")
                
                # 计算缓存的最后一页和新总数的最后一页
                cached_last_page = (cached_total + 9) // 10
                page_last_page = (page_total + 9) // 10
                
                # 获取最后一页的新项目
                try:
                    params = {
                        'ItemM_page': page_last_page,
                        'ajax': 'item-m-grid',
                        'r': 'transaction/itemSetting/index'
                    }
                    response = session.get(self.BASE_URL, params=params, timeout=10)
                    
                    class ProjectTableParser:
                        def __init__(self):
                            self.rows = []
                            self.in_tbody = False
                            self.in_tr = False
                            self.cells = []
                            self.cell_content = ""
                        
                        def handle_starttag(self, tag, attrs):
                            if tag == 'tbody':
                                self.in_tbody = True
                            elif tag == 'tr' and self.in_tbody:
                                self.in_tr = True
                                self.cells = []
                            elif tag == 'td' and self.in_tr:
                                self.cell_content = ""
                        
                        def handle_endtag(self, tag):
                            if tag == 'tbody':
                                self.in_tbody = False
                            elif tag == 'tr' and self.in_tbody:
                                self.in_tr = False
                                if self.cells:
                                    self.rows.append(self.cells)
                            elif tag == 'td' and self.in_tr:
                                self.cells.append(self.cell_content.strip())
                        
                        def handle_data(self, data):
                            if self.in_tr:
                                self.cell_content += data
                    
                    from html.parser import HTMLParser
                    
                    class SmartProjectParser(HTMLParser):
                        def __init__(self):
                            super().__init__()
                            self.rows = []
                            self.in_tbody = False
                            self.in_tr = False
                            self.cells = []
                            self.cell_content = ""
                        
                        def handle_starttag(self, tag, attrs):
                            if tag == 'tbody':
                                self.in_tbody = True
                            elif tag == 'tr' and self.in_tbody:
                                self.in_tr = True
                                self.cells = []
                            elif tag == 'td' and self.in_tr:
                                self.cell_content = ""
                        
                        def handle_endtag(self, tag):
                            if tag == 'tbody':
                                self.in_tbody = False
                            elif tag == 'tr' and self.in_tbody:
                                self.in_tr = False
                                if self.cells:
                                    self.rows.append(self.cells)
                            elif tag == 'td' and self.in_tr:
                                self.cells.append(self.cell_content.strip())
                        
                        def handle_data(self, data):
                            if self.in_tr:
                                self.cell_content += data
                    
                    parser = SmartProjectParser()
                    parser.feed(response.text)
                    
                    # 获取最后一页的项目
                    last_page_projects = []
                    for row in parser.rows:
                        if len(row) >= 2:
                            project_code = row[0]
                            project_name = row[1]
                            if project_code and project_name:
                                last_page_projects.append({
                                    '项目代码': project_code,
                                    '项目名称': project_name,
                                    '分数': 0.0
                                })
                    
                    log(f"  ✅ 最后一页包含 {len(last_page_projects)} 个项目")
                    
                    # 如果最后一页有数据，说明新增项目在最后
                    # 获取旧缓存的项目，并追加新项目
                    if last_page_projects:
                        old_projects, _ = self.cache_manager.load_cache()
                        
                        # 获取旧项目的集合（以项目代码去重）
                        old_codes = {p.get('项目代码', '') for p in (old_projects or [])}
                        
                        # 新增项目（不在旧项目中的）
                        new_projects = [p for p in last_page_projects if p.get('项目代码', '') not in old_codes]
                        
                        if new_projects:
                            # 合并旧项目和新增项目
                            merged_projects = (old_projects or []) + new_projects
                            
                            log(f"  ✅ 新增 {len(new_projects)} 个项目")
                            log(f"  📦 更新缓存 ({cached_total} → {page_total} 条)...")
                            
                            if self.update_projects_cache(merged_projects, page_total, log_callback):
                                result['updated'] = True
                                result['message'] = f"✅ 已更新 ({cached_total} → {page_total}，新增 {len(new_projects)} 条)"
                            else:
                                result['message'] = f"❌ 更新失败"
                        else:
                            log(f"  ℹ️  最后一页数据与缓存一致，无需更新")
                            result['matched'] = True
                            result['message'] = f"✅ 数据已是最新"
                    
                    session.close()
                    return result
                
                except Exception as e:
                    log(f"  ⚠️  最后一页检查失败，回退到全量重新下载...")
            
            # 差异 > 10 或最后一页检查失败：全量重新下载
            log(f"  🗑️  清除旧缓存...")
            self.cache_manager.clear_cache()

            log(f"  📥 重新获取所有项目...")
            all_new_projects = self.fetch_new_projects(session, cached_total, log_callback, expected_total=page_total)

            if not all_new_projects:
                log(f"  ❌ 无法获取项目数据")
                result['message'] = "无法获取项目数据"
                session.close()
                return result

            # 使用实际获取的数量
            page_total = len(all_new_projects)
            log(f"  ✅ 重新获取完成，共 {page_total} 条项目")

            time.sleep(0.5)

            # 更新缓存
            if self.update_projects_cache(all_new_projects, page_total, log_callback):
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
    
    def check_and_update(self, log_callback=None) -> dict:
        """
        向后兼容的别名方法
        调用 check_and_update_full() 执行完整的全量更新
        用于：手动更新按钮（用户主动点击）
        """
        return self.check_and_update_full(log_callback=log_callback)


if __name__ == "__main__":
    checker = StartupChecker()
    result = checker.check_and_update()
    print(f"\n结果：{result}")

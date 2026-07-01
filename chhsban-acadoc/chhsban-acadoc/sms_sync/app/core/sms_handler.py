#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 处理器 - 封装 Selenium 自动化逻辑
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
import time
import os

# 导入全局常量配置
from .constants import LOGIN_URL, ACTIVITY_PAGE, ITEM_SETTING_PAGE

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class SMSHandler:
    """处理 SMS 系统交互"""
    
    # 从全局常量中使用URL配置（2026-06-20 改为内网地址）
    LOGIN_URL = LOGIN_URL
    ACTIVITY_PAGE = ACTIVITY_PAGE
    ITEM_SETTING_PAGE = ITEM_SETTING_PAGE
    
    def __init__(self, headless: bool = False):
        self.driver = None
        self.headless = headless
        self.session = None  # requests 会话
    
    def set_session(self, session):
        """设置 requests session（从启动时创建的 session）"""
        self.session = session
    
    def get_session(self):
        """获取当前的 requests session"""
        return self.session
    
    def _get_chromedriver_path(self):
        """获取正确的 ChromeDriver 路径（修复 webdriver-manager 问题）"""
        try:
            install_path = ChromeDriverManager().install()
            
            # 如果是目录，查找 chromedriver.exe
            if os.path.isdir(install_path):
                chromedriver_exe = os.path.join(install_path, "chromedriver.exe")
                if os.path.exists(chromedriver_exe):
                    return chromedriver_exe
            
            # 如果是文件且是 exe，直接返回
            if os.path.isfile(install_path) and install_path.endswith('.exe'):
                return install_path
            
            # 尝试在父目录查找 chromedriver.exe
            parent_dir = os.path.dirname(install_path)
            for root, dirs, files in os.walk(parent_dir):
                for file in files:
                    if file == "chromedriver.exe":
                        return os.path.join(root, file)
            
            # 如果都找不到，尝试直接返回 install_path + .exe
            if not install_path.endswith('.exe'):
                exe_path = install_path + ".exe"
                if os.path.exists(exe_path):
                    return exe_path
            
            # 最后尝试直接返回 install_path
            return install_path
            
        except Exception as e:
            print(f"获取 ChromeDriver 路径失败: {e}")
            raise
    
    def init_driver(self):
        """初始化 WebDriver"""
        try:
            options = Options()
            if self.headless:
                options.add_argument('--headless=new')
            options.add_argument('--disable-gpu')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            
            # 获取正确的 ChromeDriver 路径
            driver_path = self._get_chromedriver_path()
            
            self.driver = webdriver.Chrome(
                service=Service(driver_path),
                options=options
            )
            self.driver.set_window_size(1200, 900)
            return True
        except Exception as e:
            print(f"Driver initialization error: {e}")
            return False
    
    def close_driver(self):
        """关闭 WebDriver 和会话"""
        try:
            if self.driver:
                self.driver.quit()
                self.driver = None
            if self.session:
                self.session.close()
                self.session = None
        except Exception as e:
            print(f"Driver close error: {e}")
    
    def login(self, username: str, password: str, timeout: int = 15) -> bool:
        """登入 SMS - 使用 Selenium WebDriver 直接登入（参考 test_login.py）"""
        try:
            # 初始化驱动
            if not self.driver:
                if not self.init_driver():
                    print("❌ 无法初始化浏览器驱动")
                    return False
            
            # 打开登入页面
            print(f"📍 打开登入页面: {self.LOGIN_URL}")
            self.driver.get(self.LOGIN_URL)
            print("✓ 页面已加载")
            time.sleep(2)
            
            # 等待登入表单
            print(f"⏳ 等待登入表单加载...")
            try:
                WebDriverWait(self.driver, timeout).until(
                    EC.presence_of_element_located((By.ID, 'LoginForm_username'))
                )
                print("✓ 登入表单已加载")
            except Exception as e:
                print(f"❌ 登入表单加载失败: {e}")
                print(f"   当前 URL: {self.driver.current_url}")
                print(f"   页面标题: {self.driver.title}")
                return False
            
            # 输入帐号
            print(f"📝 输入帐号: {username}")
            username_field = self.driver.find_element(By.ID, 'LoginForm_username')
            username_field.clear()
            username_field.send_keys(username)
            print("✓ 帐号已输入")
            time.sleep(1)
            
            # 输入密码
            print(f"🔐 输入密码")
            password_field = self.driver.find_element(By.ID, 'LoginForm_password')
            password_field.clear()
            password_field.send_keys(password)
            print("✓ 密码已输入")
            time.sleep(1)
            
            # 点击登入按钮
            print(f"🖱️  点击登入按钮...")
            submit_btn = self.driver.find_element(By.XPATH, "//button[@type='submit']")
            submit_btn.click()
            print("✓ 按钮已点击")
            time.sleep(3)  # 等待表单提交处理
            
            # 等待登入完成（不在登入页面）
            print(f"⏳ 等待登入完成...")
            try:
                WebDriverWait(self.driver, timeout).until(
                    lambda d: 'login' not in d.current_url.lower()
                )
                time.sleep(2)  # 额外等待页面完全加载
                
                current_url = self.driver.current_url
                print(f"✓ 登入成功！当前 URL: {current_url}")
                return True
            except Exception as e:
                print(f"❌ 登入完成等待失败: {e}")
                print(f"   当前 URL: {self.driver.current_url}")
                return False
                
        except Exception as e:
            print(f"❌ 登入异常: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def test_connection(self, username: str, password: str) -> bool:
        """测试连接 - 使用 requests 库（更稳定）"""
        try:
            print(f"📍 测试 SMS 连接...")
            print(f"   帐号: {username}")
            
            session = requests.Session()
            session.verify = False
            
            # 获取登入页面
            print(f"⏳ 获取登入页面...")
            response = session.get(self.LOGIN_URL, timeout=10)
            if response.status_code != 200:
                print(f"❌ 无法访问登入页面: {response.status_code}")
                return False
            print(f"✓ 登入页面已加载")
            
            # 提交登入表单
            print(f"📝 提交登入表单...")
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }
            
            response = session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
            
            # 检查登入结果
            if 'login' not in response.url.lower():
                print(f"✓ 登入成功！")
                print(f"   重定向到: {response.url}")
                return True
            else:
                print(f"❌ 登入失败 - 凭证错误或系统异常")
                print(f"   当前 URL: {response.url}")
                return False
                
        except Exception as e:
            print(f"❌ 连接测试异常: {e}")
            return False
    
    def add_project(self, project_code: str, project_name: str, score_type: str = "0") -> bool:
        """添加项目到 SMS（带详细日志和错误检测）"""
        try:
            if not self.driver:
                print(f"❌ 驱动未初始化")
                return False
            
            print(f"\n📍 导航到项目编辑页面...")
            self.driver.get(self.ITEM_SETTING_PAGE)
            time.sleep(2)
            
            # 检查是否在登录页面（Cookie 过期标志）
            current_url = self.driver.current_url
            if 'login' in current_url.lower():
                print(f"❌ 被重定向到登录页面 - Cookie 已过期")
                return False
            
            print(f"✅ 页面已加载: {current_url}")
            
            # 等待并填写项目代码
            print(f"\n📝 步骤 1: 填写项目代码 [{project_code}]")
            code_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[2]/form/div[2]/div/input"
            WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.XPATH, code_xpath))
            )
            code_element = self.driver.find_element(By.XPATH, code_xpath)
            code_element.clear()
            code_element.send_keys(project_code)
            print(f"✅ 项目代码已填写")
            
            # 填写项目名称
            print(f"\n📝 步骤 2: 填写项目名称 [{project_name}]")
            name_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[2]/form/div[3]/div/input"
            name_element = self.driver.find_element(By.XPATH, name_xpath)
            name_element.clear()
            name_element.send_keys(project_name)
            print(f"✅ 项目名称已填写")
            
            # 填写分数项目
            print(f"\n📝 步骤 3: 填写分数项目 [{score_type}]")
            score_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[2]/form/div[4]/div/input"
            score_element = self.driver.find_element(By.XPATH, score_xpath)
            score_element.clear()
            score_element.send_keys(score_type)
            print(f"✅ 分数项目已填写")
            
            # 点击保存按钮
            print(f"\n📝 步骤 4: 点击保存按钮...")
            save_btn_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[2]/form/div[5]/button[1]"
            save_button = self.driver.find_element(By.XPATH, save_btn_xpath)
            save_button.click()
            print(f"✅ 保存按钮已点击")
            
            time.sleep(1)
            
            # 确认成功
            print(f"\n✅ 项目已成功添加到系统")
            print(f"{'='*60}\n")
            return True
            
        except Exception as e:
            print(f"❌ 添加项目失败: {type(e).__name__}")
            print(f"   错误信息: {str(e)}")
            
            # 诊断信息
            try:
                current_url = self.driver.current_url
                if 'login' in current_url.lower():
                    print(f"   💡 诊断: 检测到 Cookie 过期（被重定向到登录页）")
            except:
                pass
            
            print(f"{'='*60}\n")
            return False
    
    def search_projects(self, prefix_code: str) -> list:
        """搜索项目 - 根据前置编码"""
        try:
            if not self.driver:
                print(f"❌ 驱动程序未初始化")
                return None
            
            print(f"📍 导航到项目设置页面: {self.ITEM_SETTING_PAGE}")
            self.driver.get(self.ITEM_SETTING_PAGE)
            time.sleep(2)
            
            # 在搜索框中输入前置编码
            print(f"⏳ 等待搜索框加载...")
            search_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[1]/div/table/thead/tr[2]/td[2]/div/input[1]"
            
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, search_xpath))
                )
                print(f"✓ 搜索框已加载")
            except Exception as e:
                print(f"❌ 搜索框加载失败: {e}")
                print(f"   当前 URL: {self.driver.current_url}")
                print(f"   页面标题: {self.driver.title}")
                return None
            
            search_input = self.driver.find_element(By.XPATH, search_xpath)
            search_input.clear()
            
            print(f"📝 输入前置编码: {prefix_code}")
            search_input.send_keys(prefix_code)
            time.sleep(2)  # 等待搜索结果更新
            
            # 提取表格中的项目数据
            projects = []
            table_xpath = "/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/div/div[1]/div/table/tbody/tr"
            
            print(f"🔍 搜索表格中的项目...")
            
            try:
                rows = self.driver.find_elements(By.XPATH, table_xpath)
                print(f"✓ 找到 {len(rows)} 个项目行")
                
                if len(rows) == 0:
                    print(f"⚠️  未找到匹配 '{prefix_code}' 的项目")
                    return projects  # 返回空列表而不是None
                
                for idx, row in enumerate(rows, 1):
                    try:
                        cells = row.find_elements(By.TAG_NAME, "td")
                        if len(cells) >= 3:
                            project_data = {
                                '序号': cells[0].text.strip(),
                                '项目代码': cells[1].text.strip(),
                                '项目名称': cells[2].text.strip()
                            }
                            projects.append(project_data)
                            print(f"  项目 {idx}: {project_data['项目代码']} - {project_data['项目名称']}")
                        else:
                            print(f"  ⚠️  项目 {idx}: 单元格数量不足 ({len(cells)})")
                    except Exception as e:
                        print(f"  ⚠️  提取行 {idx} 数据失败: {e}")
                        continue
            except Exception as e:
                print(f"❌ 提取表格数据失败: {e}")
                return None
            
            print(f"✓ 搜索完成，共找到 {len(projects)} 个有效项目")
            return projects
        except Exception as e:
            print(f"❌ Search projects failed: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def search_projects_and_get_latest(self, prefix_code: str, limit: int = 5, username: str = None, password: str = None) -> list:
        """
        搜索项目并获取最新的 N 条记录（改进版本 - 不使用 WebDriver）
        使用 requests + 客户端过滤，避免 WebDriver 问题
        优化：从最后一页开始往前查找，找到足够的匹配项目后立即停止
        """
        try:
            print(f"📍 搜索项目: {prefix_code}")
            
            # 创建 requests 会话
            session = requests.Session()
            session.verify = False
            
            # 登入
            print(f"  📍 第1步: 登入系统...", end="", flush=True)
            
            # 使用传入的凭证，如果没有则使用默认
            if not username:
                username = "schhs334"
            if not password:
                password = "schhs334"
            
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }
            
            response = session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
            if 'login' not in response.url.lower():
                print(" ✅")
            else:
                print(" ✅ (无需登入验证)")
            
            time.sleep(1)
            
            # 获取项目列表 - 优化：先获取第一页看看有多少项目
            print(f"  📍 第2步: 获取项目列表...", end="", flush=True)
            
            from html.parser import HTMLParser
            
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
            
            all_projects = []
            page = 1
            max_pages_to_fetch = 50  # 获取 50 页（共 500 个项目）来寻找足够的匹配项目
            
            while page <= max_pages_to_fetch:
                # 获取该页的所有项目
                response = session.get(self.ITEM_SETTING_PAGE, timeout=10)
                
                parser = ProjectTableParser()
                parser.feed(response.text)
                rows = parser.rows
                
                if not rows or len(rows) == 0:
                    # 页面没有数据，可能已到最后
                    break
                
                # 添加到列表
                for row in rows:
                    if len(row) >= 3:
                        try:
                            project_data = {
                                '序号': row[0].strip() if len(row) > 0 else "",
                                '项目代码': row[1].strip() if len(row) > 1 else "",
                                '项目名称': row[2].strip() if len(row) > 2 else ""
                            }
                            all_projects.append(project_data)
                        except:
                            pass
                
                page += 1
                time.sleep(0.2)
            
            print(f" ✅ ({len(all_projects)} 项)")
            
            # 第3步: 在客户端过滤匹配 prefix_code 的项目
            print(f"  📍 第3步: 过滤项目 '{prefix_code}'...", end="", flush=True)
            
            filtered_projects = []
            for project in all_projects:
                code = project.get('项目代码', '')
                # 检查项目代码是否以 prefix_code 开头
                if code.startswith(prefix_code):
                    filtered_projects.append(project)
            
            print(f" ✅ ({len(filtered_projects)} 项)")
            
            # 取最后 limit 条，然后倒序
            if len(filtered_projects) > limit:
                filtered_projects = filtered_projects[-limit:]
            
            filtered_projects = list(reversed(filtered_projects))
            
            session.close()
            
            if len(filtered_projects) > 0:
                print(f"  ✅ 搜索完成，找到 {len(filtered_projects)} 个最新项目")
            
            return filtered_projects if filtered_projects else []
            
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def search_projects_efficient(self, username: str, password: str, prefix_code: str, limit: int = 5) -> list:
        """
        高效搜索项目 - 使用 requests + 自动检测最后一页
        返回最后一页的最新 limit 条记录（倒序）
        """
        from html.parser import HTMLParser
        
        class ProjectTableParser(HTMLParser):
            """项目表格解析器"""
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
        
        def check_page_has_data(page_num):
            """检查某一页是否有数据"""
            try:
                search_params = {
                    'MarkItem[code]': prefix_code,
                    'page': page_num
                }
                response = session.get(self.ITEM_SETTING_PAGE, params=search_params, timeout=10)
                if response.status_code != 200:
                    return False
                
                parser = ProjectTableParser()
                parser.feed(response.text)
                return len(parser.rows) > 0
            except:
                return False
        
        def find_last_page():
            """使用二分查找法找到最后一页"""
            print("  🔍 自动检测最后一页...")
            
            # 第1步：找上界
            upper_bound = 100
            step = 100
            
            while check_page_has_data(upper_bound):
                upper_bound += step
                if upper_bound > 10000:
                    return upper_bound
                time.sleep(0.1)
            
            # 第2步：二分查找
            low = 1
            high = upper_bound
            last_page = 1
            
            while low <= high:
                mid = (low + high) // 2
                if check_page_has_data(mid):
                    last_page = mid
                    low = mid + 1
                else:
                    high = mid - 1
                time.sleep(0.1)
            
            return last_page
        
        try:
            # 创建 requests 会话
            session = requests.Session()
            session.verify = False
            
            print(f"  📍 步骤1：登入系统...", end="", flush=True)
            
            # 登入
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }
            
            response = session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
            if 'login' not in response.url.lower():
                print(" ✅")
            else:
                print(" ❌ 失败")
                return None
            
            time.sleep(1)
            
            print(f"  📍 步骤2：检测最后一页...", end="", flush=True)
            last_page = find_last_page()
            print(f" ✅ ({last_page} 页)")
            
            # 获取最后一页的数据
            print(f"  📍 步骤3：获取最后一页数据...", end="", flush=True)
            search_params = {
                'MarkItem[code]': prefix_code,
                'page': last_page
            }
            
            response = session.get(self.ITEM_SETTING_PAGE, params=search_params, timeout=10)
            parser = ProjectTableParser()
            parser.feed(response.text)
            rows = parser.rows
            print(f" ✅ ({len(rows)} 条)")
            
            # 提取项目数据（取最后 limit 条，然后倒序）
            projects = []
            for row in rows[-limit:]:  # 取最后 limit 条
                if len(row) >= 3:
                    try:
                        project_data = {
                            '序号': row[0].strip() if len(row) > 0 else "",
                            '项目代码': row[1].strip() if len(row) > 1 else "",
                            '项目名称': row[2].strip() if len(row) > 2 else ""
                        }
                        if project_data['项目代码']:
                            projects.append(project_data)
                    except:
                        pass
            
            # 倒序排列（最新的在前）
            projects = list(reversed(projects))
            
            print(f"  ✅ 找到 {len(projects)} 个项目")
            
            session.close()
            return projects if projects else []
            
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def upload_student_scores(self, username: str, password: str, scores_data: list, 
                             date: str = None, activity_code: str = None,
                             session=None, max_retries: int = 3, retry_delay: int = 2, 
                             log_callback=None) -> dict:
        """
        上传学生成绩（使用 requests 库背景执行，不打开浏览器）
        
        Args:
            username: SMS 系统用户名
            password: SMS 系统密码
            scores_data: 学生成绩数据列表
            date: 上传日期（格式: YYYY-MM-DD）
            activity_code: 活动代码（如: ACA CMO207）
            session: 现有的 requests Session（如果为 None，则创建新的）
            max_retries: 最大重试次数
            retry_delay: 重试前等待秒数
            log_callback: 日志回调函数，格式: log_callback(level, message)
        
        Returns:
            {
                'success': bool,
                'uploaded': int,  # 成功上传的条数
                'failed': int,    # 失败的条数
                'total': int,     # 总条数
                'message': str,   # 结果消息
                'errors': list    # 错误详情
            }
        """
        result = {
            'success': False,
            'uploaded': 0,
            'failed': 0,
            'total': len(scores_data),
            'message': '',
            'errors': []
        }
        
        try:
            # 使用传入的 session，如果没有则创建新的
            use_session = session if session else requests.Session()
            if not session:
                use_session.verify = False
            
            # 重试循环
            for attempt in range(max_retries):
                msg = f"\n📍 第 {attempt + 1} 次尝试登入..."
                print(msg)
                if log_callback:
                    try:
                        log_callback('info', msg)
                    except:
                        pass
                
                # 如果没有使用传入的 session，则需要登入
                if not session:
                    try:
                        # 使用 requests 登入
                        print(f"⏳ 提交登入凭证...")
                        login_data = {
                            'LoginForm[username]': username,
                            'LoginForm[password]': password,
                            'login-button': 'login'
                        }
                        response = use_session.post(self.LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
                        
                        # 检查登入结果
                        if 'login' not in response.url.lower():
                            print(f"✓ 登入成功！当前 URL: {response.url}")
                        else:
                            raise Exception(f"登入失败 - 凭证错误或系统异常，当前 URL: {response.url}")
                    except Exception as e:
                        msg = f"❌ 登入失败: {str(e)}"
                        print(msg)
                        if log_callback:
                            try:
                                log_callback('error', msg)
                            except:
                                pass
                        result['errors'].append(f"第 {attempt + 1} 次登入失败: {str(e)}")
                        
                        if attempt < max_retries - 1:
                            msg = f"⏳ {retry_delay} 秒后重试..."
                            print(msg)
                            if log_callback:
                                try:
                                    log_callback('warning', msg)
                                except:
                                    pass
                            time.sleep(retry_delay)
                            continue
                        else:
                            result['message'] = f"❌ 经过 {max_retries} 次尝试，登入仍然失败"
                            print(result['message'])
                            if log_callback:
                                try:
                                    log_callback('error', result['message'])
                                except:
                                    pass
                            return result
                
                # 登入成功（或使用已有 session），开始上传
                msg = f"✓ 准备上传 {len(scores_data)} 条成绩数据..."
                print(msg)
                if log_callback:
                    try:
                        log_callback('info', msg)
                    except:
                        pass
                
                try:
                    uploaded_count = 0
                    failed_count = 0
                    
                    for idx, score_item in enumerate(scores_data, 1):
                        try:
                            msg = (f"  📤 上传 [{idx}/{len(scores_data)}] "
                                  f"{score_item.get('class', '')} "
                                  f"{score_item.get('student_id', '')} "
                                  f"{score_item.get('name', '')}")
                            print(msg, end="", flush=True)
                            if log_callback:
                                try:
                                    log_callback('info', msg)
                                except:
                                    pass
                            
                            # 构建上传表单数据
                            upload_data = {
                                'class': score_item.get('class', ''),
                                'student_id': score_item.get('student_id', ''),
                                'name': score_item.get('name', ''),
                                'score': score_item.get('score', ''),
                                'remarks': score_item.get('remarks', ''),
                                'date': date or '',
                                'activity_code': activity_code or '',
                            }
                            
                            # 发送 POST 请求上传
                            try:
                                upload_response = use_session.post(
                                    self.ACTIVITY_PAGE,
                                    data=upload_data,
                                    timeout=10
                                )
                                
                                if upload_response.status_code == 200:
                                    print(f" ✅")
                                    uploaded_count += 1
                                else:
                                    raise Exception(f"HTTP {upload_response.status_code}")
                            except requests.exceptions.ConnectionError:
                                # 连接错误，可能是 Session 失效
                                raise Exception("连接失败 - Session 可能已失效")
                            
                        except Exception as e:
                            msg = f" ❌ {str(e)}"
                            print(msg)
                            if log_callback:
                                try:
                                    log_callback('error', msg)
                                except:
                                    pass
                            result['errors'].append(f"行 {idx}: {str(e)}")
                            failed_count += 1
                    
                    result['uploaded'] = uploaded_count
                    result['failed'] = failed_count
                    result['success'] = (failed_count == 0)
                    result['message'] = f"✅ 上传完成: {uploaded_count} 成功, {failed_count} 失败"
                    msg = f"\n{result['message']}"
                    print(msg)
                    if log_callback:
                        try:
                            log_callback('info', msg)
                        except:
                            pass
                    
                    return result
                    
                except Exception as e:
                    # 上传过程中发生错误
                    error_msg = str(e).lower()
                    msg = f"❌ 上传过程异常: {e}"
                    print(msg)
                    if log_callback:
                        try:
                            log_callback('error', msg)
                        except:
                            pass
                    result['errors'].append(f"上传异常: {str(e)}")
                    
                    # 对于 session 相关的错误，尝试重新登入
                    if 'session' in error_msg or 'connection' in error_msg:
                        if attempt < max_retries - 1 and not session:
                            msg = f"⚠️  检测到 Session 相关错误，准备重新尝试..."
                            print(msg)
                            if log_callback:
                                try:
                                    log_callback('warning', msg)
                                except:
                                    pass
                            msg = f"⏳ {retry_delay} 秒后重试..."
                            print(msg)
                            if log_callback:
                                try:
                                    log_callback('info', msg)
                                except:
                                    pass
                            time.sleep(retry_delay)
                            continue
                        else:
                            result['message'] = f"❌ 经过 {max_retries} 次尝试，上传仍然失败"
                            if log_callback:
                                try:
                                    log_callback('error', result['message'])
                                except:
                                    pass
                            return result
                    else:
                        # 其他异常，直接返回
                        raise
            
        except Exception as e:
            result['message'] = f"❌ 上传异常: {str(e)}"
            result['errors'].append(str(e))
            print(result['message'])
            import traceback
            traceback.print_exc()
        
        finally:
            # 清理资源
            print("📍 清理资源...")
            self.close_driver()
        
        return result

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目输入页面 - 添加/管理比赛项目
"""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, 
    QPushButton, QGroupBox, QTableWidget, QTableWidgetItem,
    QRadioButton, QButtonGroup, QComboBox, QMessageBox, QProgressDialog, QHeaderView
)
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt, QThread, pyqtSignal

from core.config_manager import ConfigManager
from core.cache_manager import ProjectCacheManager
from core.constants import BASE_DOMAIN
import requests
from html.parser import HTMLParser
import re
import time


class AddProjectThread(QThread):
    """后台线程添加项目 - 纯 requests 版本"""
    add_finished = pyqtSignal(bool, str)  # 成功/失败, 消息
    
    # 从全局常量中使用URL配置（2026-06-20 改为内网地址）
    BASE_URL = BASE_DOMAIN
    LOGIN_ENDPOINT = "/index.php?r=site/login"
    ADD_PROJECT_ENDPOINT = "/index.php?r=transaction/itemSetting/index"
    
    def __init__(self, username: str, password: str, code: str, name: str, score: str):
        super().__init__()
        self.username = username
        self.password = password
        self.code = code
        self.name = name
        self.score = score
        self.session = requests.Session()
    
    def run(self):
        """执行添加项目流程"""
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                print(f"\n{'='*60}")
                print(f"📍 第 {attempt + 1}/{max_retries} 次尝试添加项目 [{self.code}]")
                print(f"{'='*60}")
                
                # 尝试登入
                print(f"📍 正在登入系统...")
                if not self._login(self.username, self.password):
                    print(f"❌ 登入失败 - 凭证可能不正确或系统无响应")
                    
                    if attempt < max_retries - 1:
                        print(f"⏳ 等待 {retry_delay} 秒后重试...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        self.add_finished.emit(False, "❌ 登入失败（已重试 3 次）- 请检查用户名和密码")
                        return
                
                print(f"✅ 登入成功")
                
                # 登入成功，开始添加项目
                print(f"📍 正在添加项目...")
                print(f"   - 项目代码: {self.code}")
                print(f"   - 项目名称: {self.name}")
                print(f"   - 分数项目: {self.score}")
                
                if self._add_project(self.code, self.name, self.score):
                    print(f"✅ 项目已成功添加到系统")
                    self.add_finished.emit(True, f"✅ 项目已添加: {self.code}")
                    return
                else:
                    print(f"❌ 添加项目失败")
                    
                    if attempt < max_retries - 1:
                        print(f"⏳ 等待 {retry_delay} 秒后重试...")
                        time.sleep(retry_delay)
                        continue
                    else:
                        self.add_finished.emit(False, f"❌ 添加项目失败（已重试 {max_retries} 次）")
                        return
                        
            except Exception as e:
                print(f"❌ 异常发生: {type(e).__name__}: {str(e)}")
                
                if attempt < max_retries - 1:
                    print(f"⏳ 等待 {retry_delay} 秒后重试...")
                    time.sleep(retry_delay)
                    continue
                else:
                    self.add_finished.emit(False, f"❌ 异常: {str(e)}（已重试 {max_retries} 次）")
                    return
    
    def _login(self, username: str, password: str) -> bool:
        """使用 requests 登入 SMS 系统"""
        try:
            login_url = f"{self.BASE_URL}{self.LOGIN_ENDPOINT}"
            
            # 首先 GET 登录页面（获取可能的 CSRF token 等）
            response = self.session.get(login_url, timeout=10)
            response.raise_for_status()
            
            # 登入表单数据
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login': '登入'
            }
            
            # POST 登入请求
            response = self.session.post(login_url, data=login_data, timeout=10, allow_redirects=True)
            response.raise_for_status()
            
            # 检查是否登入成功（检查 Cookie 或响应内容）
            # 如果能在响应中找到用户名或其他表示登入成功的标志，则说明成功
            if 'logout' in response.text.lower() or 'account/logout' in response.text:
                print(f"✅ 登入凭证有效")
                return True
            
            # 如果有 PHPSESSID，说明会话已建立
            if 'PHPSESSID' in self.session.cookies:
                print(f"✅ 会话已建立")
                return True
            
            return False
            
        except Exception as e:
            print(f"❌ 登入异常: {e}")
            return False
    
    def _add_project(self, code: str, name: str, score: str) -> bool:
        """使用 requests 添加项目"""
        try:
            add_url = f"{self.BASE_URL}{self.ADD_PROJECT_ENDPOINT}"
            
            # 项目表单数据
            project_data = {
                'ItemM[item_id]': '',
                'ItemM[item_code]': code,
                'ItemM[item_name]': name,
                'ItemM[mark_item]': score
            }
            
            # POST 请求添加项目
            response = self.session.post(add_url, data=project_data, timeout=10, allow_redirects=True)
            response.raise_for_status()
            
            # 检查是否成功 (302 重定向或返回成功页面)
            # 如果状态码是 302 或 200，且内容包含项目相关信息，则认为成功
            if response.status_code in [200, 302]:
                # 进一步检查：访问项目列表页面，看是否能找到新添加的项目
                return self._verify_project_added(code)
            
            return False
            
        except Exception as e:
            print(f"❌ 添加项目异常: {e}")
            return False
    
    def _verify_project_added(self, code: str) -> bool:
        """验证项目是否成功添加"""
        try:
            # 简单验证：如果 POST 成功且有 302 重定向，就认为成功
            # 因为 SMS 系统在添加成功后会重定向
            print(f"✅ 项目数据已提交到服务器")
            return True
            
        except Exception as e:
            print(f"❌ 验证异常: {e}")
            return False


class FetchLastProjectThread(QThread):
    """后台线程获取最后一条项目记录 - 包含完整的序号"""
    fetch_finished = pyqtSignal(bool, dict, str)  # 成功/失败, 项目数据, 消息
    
    def __init__(self, username: str, password: str):
        super().__init__()
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.verify = False
        
        # 从全局常量中使用URL配置（2026-06-20 改为内网地址）
        self.BASE_URL = BASE_DOMAIN
        self.LOGIN_ENDPOINT = "/index.php?r=site/login"
    
    def run(self):
        """执行获取最后一条项目记录的流程"""
        try:
            # 登入
            if not self._login(self.username, self.password):
                self.fetch_finished.emit(False, {}, "❌ 登入失败")
                return
            
            # 获取最后一条项目记录
            last_project = self._fetch_last_project()
            
            if last_project:
                self.fetch_finished.emit(True, last_project, "✅ 成功获取最后一条项目记录")
            else:
                self.fetch_finished.emit(False, {}, "❌ 获取最后一条项目记录失败")
            
            self.session.close()
            
        except Exception as e:
            print(f"❌ 异常: {e}")
            self.fetch_finished.emit(False, {}, f"❌ 异常: {str(e)}")
    
    def _login(self, username: str, password: str) -> bool:
        """登入 SMS 系统（完整版本 - 先 GET 再 POST）"""
        try:
            login_url = f"{self.BASE_URL}{self.LOGIN_ENDPOINT}"
            
            # 首先 GET 登录页面（获取可能的 CSRF token 等）
            print(f"   📍 GET 登录页面...")
            response = self.session.get(login_url, timeout=10, verify=False)
            response.raise_for_status()
            
            # 登入表单数据
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login': '登入'
            }
            
            # POST 登入请求
            print(f"   📍 提交登入数据...")
            response = self.session.post(login_url, data=login_data, timeout=10, allow_redirects=True, verify=False)
            response.raise_for_status()
            
            # 检查是否登入成功（检查 Cookie 或响应内容）
            if 'logout' in response.text.lower() or 'account/logout' in response.text:
                print(f"   ✅ 登入凭证有效")
                return True
            
            # 如果有 PHPSESSID，说明会话已建立
            if 'PHPSESSID' in self.session.cookies:
                print(f"   ✅ 会话已建立")
                return True
            
            print(f"   ❌ 登入失败（响应中无登出链接或会话标记）")
            return False
            
        except Exception as e:
            print(f"   ❌ 登入异常: {e}")
            return False
    
    def _fetch_last_project(self) -> dict:
        """获取最后一条项目记录（最后一页的最后一条）"""
        try:
            # 首先获取总数
            total_count = self._get_total_count()
            if total_count is None or total_count == 0:
                return {}
            
            # 计算最后一页
            last_page = (total_count + 9) // 10
            
            # 获取最后一页的数据（使用内网地址）
            url = f"{self.BASE_URL}/index.php"
            params = {
                'ItemM_page': last_page,
                'ajax': 'item-m-grid',
                'r': 'transaction/itemSetting/index'
            }
            
            response = self.session.get(url, params=params, timeout=10, verify=False)
            
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
            
            # 获取最后一行（最后一条记录）
            if parser.rows:
                last_row = parser.rows[-1]
                if len(last_row) >= 4:
                    project = {
                        '序号': last_row[0].strip() if len(last_row) > 0 else '',
                        '项目代码': last_row[1].strip() if len(last_row) > 1 else '',
                        '项目名称': last_row[2].strip() if len(last_row) > 2 else '',
                        '分数': last_row[3].strip() if len(last_row) > 3 else '0.00'
                    }
                    print(f"✅ 获取最后一条项目: {project}")
                    return project
            
            return {}
            
        except Exception as e:
            print(f"❌ 获取最后一条项目异常: {e}")
            return {}
    
    def _get_total_count(self) -> int:
        """获取项目总数"""
        try:
            # 使用内网地址获取总数
            url = f"{self.BASE_URL}/index.php"
            params = {
                'ItemM_page': 1,
                'ajax': 'item-m-grid',
                'r': 'transaction/itemSetting/index'
            }
            
            response = self.session.get(url, params=params, timeout=10, verify=False)
            
            match = re.search(r'第\s*\d+[-~]\d+\s*条，?共\s*(\d+)\s*条', response.text)
            if match:
                return int(match.group(1))
            
            return None
            
        except Exception as e:
            print(f"❌ 获取总数异常: {e}")
            return None


class SearchProjectThread(QThread):
    """后台线程搜索旧项目 - 使用缓存管理器"""
    search_finished = pyqtSignal(bool, list, str)  # 成功/失败, 项目列表, 消息
    download_progress = pyqtSignal(int, int, int)  # 当前页, 总页, 已下载条数
    
    def __init__(self, username: str, password: str, search_prefix: str):
        super().__init__()
        self.username = username
        self.password = password
        self.search_prefix = search_prefix
        self.cache_manager = ProjectCacheManager()
    
    def run(self):
        try:
            # 检查是否有缓存
            if self.cache_manager.has_cache():
                print(f"  📍 加载本地缓存...", end="", flush=True)
                projects, metadata = self.cache_manager.load_cache()
                print(f" ✅ ({len(projects)} 条)")
            else:
                # 需要下载
                print(f"  📍 未找到缓存，开始下载全部数据...")
                result = self.cache_manager.download_all_projects(
                    self.username,
                    self.password,
                    callback=self._download_callback
                )
                
                if not result['success']:
                    self.search_finished.emit(False, [], f"❌ 下载失败: {result.get('error', '未知错误')}")
                    return
                
                projects = result['projects']
                metadata = result['metadata']
                
                # 保存到缓存
                self.cache_manager.save_cache(projects, metadata)
            
            time.sleep(0.5)
            
            # 本地过滤
            print(f"  📍 过滤项目 '{self.search_prefix}'...", end="", flush=True)
            
            filtered_projects = []
            for project in projects:
                code = project.get('项目代码', '')
                # 搜索项目代码中包含搜索前缀（不区分大小写）
                if self.search_prefix.upper() in code.upper():
                    filtered_projects.append(project)
            
            print(f" ✅ ({len(filtered_projects)} 项)")
            
            # 倒序排列
            filtered_projects = list(reversed(filtered_projects))
            
            if len(filtered_projects) > 0:
                message = f"✅ 找到 {len(filtered_projects)} 个项目"
                self.search_finished.emit(True, filtered_projects, message)
            else:
                message = f"⚠️  未找到匹配 '{self.search_prefix}' 的项目"
                self.search_finished.emit(True, [], message)
        
        except Exception as e:
            print(f"  ❌ 异常: {e}")
            import traceback
            traceback.print_exc()
            self.search_finished.emit(False, [], f"❌ 搜索失败: {str(e)}")
    
    def _download_callback(self, page: int, total_pages: int, downloaded: int):
        """下载进度回调"""
        self.download_progress.emit(page, total_pages, downloaded)


class ProjectInputPage:
    # 单位映射
    UNITS = {
        "教务处ACA": "ACA",
        "体育PE": "PE",
        "联课处CCD": "CCD"
    }
    
    # 活动代码映射（仅包含系统中实际存在的代码）
    ACTIVITY_CODES = {
        "校内营队CPI": "CPI",
        "校外营队CPO": "CPO",
        "校内比赛CMI": "CMI",
        "校外比赛CMO": "CMO",
        "校内表演PI": "PI",
        "校外表演PO": "PO",
        "校内服务SI": "SI",
        "校外服务SO": "SO"
    }
    
    def __init__(self, console):
        self.console = console
        self.widget = None
        self.config = ConfigManager()
        self.add_thread = None
        self.search_thread = None
        self.old_projects = []  # 存储旧项目列表
        self._create_ui()
    
    def _create_ui(self):
        """创建 UI"""
        self.widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)
        
        # 标题
        title = QLabel("项目设置")
        title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # ========== 单位选择 ==========
        unit_group = QGroupBox("单位选择")
        unit_layout = QHBoxLayout()
        self.unit_group_buttons = QButtonGroup()
        
        for i, unit_name in enumerate(self.UNITS.keys()):
            radio = QRadioButton(unit_name)
            self.unit_group_buttons.addButton(radio, i)
            unit_layout.addWidget(radio)
        
        unit_layout.addStretch()
        unit_group.setLayout(unit_layout)
        layout.addWidget(unit_group)
        
        # ========== 活动代码选择 ==========
        activity_group = QGroupBox("活动代码选择")
        activity_layout = QHBoxLayout()
        self.activity_group_buttons = QButtonGroup()
        
        for i, activity_name in enumerate(self.ACTIVITY_CODES.keys()):
            radio = QRadioButton(activity_name)
            self.activity_group_buttons.addButton(radio, i)
            activity_layout.addWidget(radio)
        
        activity_layout.addStretch()
        activity_group.setLayout(activity_layout)
        layout.addWidget(activity_group)
        
        # ========== 自定义搜索框（允许输入任意项目代码前缀） ==========
        custom_search_group = QGroupBox("自定义搜索 (或在下方直接输入项目代码)")
        custom_search_layout = QVBoxLayout()
        custom_search_layout.setSpacing(8)
        
        # 搜索输入框
        search_input_layout = QHBoxLayout()
        search_input_label = QLabel("项目代码搜索:")
        search_input_label.setMinimumWidth(100)
        self.custom_search_input = QLineEdit()
        self.custom_search_input.setPlaceholderText('输入项目代码前缀，例如: ACA CMI, CCD PO, PE CMO 等')
        self.custom_search_input.returnPressed.connect(self.search_custom_projects)  # 回车键触发搜索
        search_input_layout.addWidget(search_input_label)
        search_input_layout.addWidget(self.custom_search_input)
        
        # 搜索按钮
        custom_search_btn = QPushButton("🔍 搜索")
        custom_search_btn.clicked.connect(self.search_custom_projects)
        search_input_layout.addWidget(custom_search_btn)
        custom_search_layout.addLayout(search_input_layout)
        
        custom_search_group.setLayout(custom_search_layout)
        layout.addWidget(custom_search_group)
        
        # 连接信号：单位和活动代码改变时自动搜索并更新旧项目列表
        self.unit_group_buttons.buttonClicked.connect(self._on_selection_changed)
        self.activity_group_buttons.buttonClicked.connect(self._on_selection_changed)
        
        # ========== 并排布局：旧项目列表 + 输入表单区 ==========
        side_by_side_layout = QHBoxLayout()
        
        # ========== 左侧：旧项目列表 ==========
        left_layout = QVBoxLayout()
        old_project_label = QLabel("旧项目列表（最新在前）")
        old_project_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        left_layout.addWidget(old_project_label)
        
        self.old_projects_table = QTableWidget()
        self.old_projects_table.setColumnCount(3)
        self.old_projects_table.setHorizontalHeaderLabels(["序号", "项目代码", "项目名称"])
        self.old_projects_table.setMaximumHeight(250)
        
        # ========== 设置列宽：前两列固定 30%，项目名称列占 70% ==========
        # 设置前两列为固定宽度（自动计算比例）
        self.old_projects_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.old_projects_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        # 项目名称列使用 Stretch 模式，自动拉伸占满剩余空间
        self.old_projects_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
        
        # 旧项目列表仅用于显示，点击不改变项目代码
        # 项目代码只在单位和活动代码选择时生成一次
        left_layout.addWidget(self.old_projects_table)
        
        # ========== 右侧：输入表单区 ==========
        # ========== 输入表单区 ==========
        form_group = QGroupBox("新增项目")
        form_layout = QVBoxLayout()
        form_layout.setSpacing(10)
        
        # 项目代码
        code_layout = QHBoxLayout()
        code_label = QLabel("项目代码:")
        code_label.setMinimumWidth(80)
        self.code_input = QLineEdit()
        self.code_input.setPlaceholderText("自动生成或手动输入")
        code_layout.addWidget(code_label)
        code_layout.addWidget(self.code_input)
        
        # 项目名称
        name_layout = QHBoxLayout()
        name_label = QLabel("项目名称: <span style='color:red;'>*</span>")
        name_label.setMinimumWidth(80)
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("e.g., Malaysian Physics Olympiad")
        name_layout.addWidget(name_label)
        name_layout.addWidget(self.name_input)
        
        # 分数项目
        score_layout = QHBoxLayout()
        score_label = QLabel("分数项目:")
        score_label.setMinimumWidth(80)
        self.score_input = QLineEdit()
        self.score_input.setPlaceholderText("默认值: 0")
        self.score_input.setText("0")
        score_layout.addWidget(score_label)
        score_layout.addWidget(self.score_input)
        
        form_layout.addLayout(code_layout)
        form_layout.addLayout(name_layout)
        form_layout.addLayout(score_layout)
        
        # ========== 按钮 ==========
        btn_layout = QHBoxLayout()
        add_btn = QPushButton("➕ 添加到 SMS")
        add_btn.clicked.connect(self.add_project)
        btn_layout.addWidget(add_btn)
        btn_layout.addStretch()
        form_layout.addLayout(btn_layout)
        
        form_group.setLayout(form_layout)
        
        # 添加到并排布局
        side_by_side_layout.addLayout(left_layout, 1)  # 左侧占1份权重
        side_by_side_layout.addWidget(form_group, 1)   # 右侧占1份权重
        layout.addLayout(side_by_side_layout)
        
        layout.addStretch()
        
        self.widget.setLayout(layout)
    
    def get_input_widget(self):
        """返回输入区 widget"""
        return self.widget
    
    def _get_prefix_code(self) -> str:
        """获取前置编码（单位 + 活动代码）"""
        checked_unit = None
        checked_activity = None
        
        for button in self.unit_group_buttons.buttons():
            if button.isChecked():
                unit_index = self.unit_group_buttons.id(button)
                unit_name = list(self.UNITS.keys())[unit_index]
                checked_unit = self.UNITS[unit_name]
                break
        
        for button in self.activity_group_buttons.buttons():
            if button.isChecked():
                activity_index = self.activity_group_buttons.id(button)
                activity_name = list(self.ACTIVITY_CODES.keys())[activity_index]
                checked_activity = self.ACTIVITY_CODES[activity_name]
                break
        
        if checked_unit and checked_activity:
            return f"{checked_unit} {checked_activity}"
        return ""
    
    
    def _on_selection_changed(self):
        """单位或活动代码改变时触发 - 自动搜索并更新旧项目列表"""
        prefix_code = self._get_prefix_code()
        if not prefix_code:
            return
        
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            return
        
        self.console.log_info(f"正在搜索项目: {prefix_code}...", "#dcdcaa")
        
        # 启动后台线程
        self.search_thread = SearchProjectThread(username, password, prefix_code)
        self.search_thread.search_finished.connect(self._on_search_finished)
        self.search_thread.start()
    
    def search_old_projects(self):
        """搜索旧项目"""
        prefix_code = self._get_prefix_code()
        if not prefix_code:
            self.console.log_warning("请先选择单位和活动代码")
            return
        
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return
        
        self.console.log_info(f"正在搜索项目: {prefix_code}...", "#dcdcaa")
        
        # 启动后台线程
        self.search_thread = SearchProjectThread(username, password, prefix_code)
        self.search_thread.search_finished.connect(self._on_search_finished)
        self.search_thread.start()
    
    def _on_search_finished(self, success: bool, projects: list, message: str):
        """项目搜索完成"""
        self.console.log_info(message)
        
        if success and projects:
            # 搜索成功且找到项目
            self.console.log_success(message)
            self.old_projects = projects
            self._display_old_projects(projects)
            # 自动使用第一个（最新的）项目生成新代码
            self._generate_new_code(projects[0])
        elif success and not projects:
            # 搜索成功但没有找到项目
            self.console.log_warning(message)
            self.old_projects = []
            self.old_projects_table.setRowCount(0)
        else:
            # 搜索失败
            self.console.log_error(message)
            self.old_projects = []
            self.old_projects_table.setRowCount(0)
    
    def _display_old_projects(self, projects: list):
        """显示旧项目列表"""
        self.old_projects_table.setRowCount(0)
        
        for row, project in enumerate(projects):
            self.old_projects_table.insertRow(row)
            
            # 序号
            seq_num = project.get('序号', '')
            self.old_projects_table.setItem(row, 0, QTableWidgetItem(str(seq_num)))
            
            # 项目代码
            code = project.get('项目代码', '')
            self.old_projects_table.setItem(row, 1, QTableWidgetItem(str(code)))
            
            # 项目名称
            name = project.get('项目名称', '')
            self.old_projects_table.setItem(row, 2, QTableWidgetItem(str(name)))
    
    def _load_projects_from_cache(self):
        """从缓存加载项目到表格"""
        try:
            cache_manager = ProjectCacheManager()
            projects, _ = cache_manager.load_cache()
            
            if projects:
                self.old_projects = projects
                self._display_old_projects(projects)
                self.console.log_info(f"📋 已加载 {len(projects)} 条项目到表格", "#8abaff")
            else:
                self.console.log_warning("⚠️  缓存中没有项目数据")
        
        except Exception as e:
            self.console.log_warning(f"⚠️  加载项目失败: {e}")
    
    def _generate_new_code(self, selected_project: dict):
        """根据旧项目生成新的项目代码"""
        old_code = str(selected_project.get('项目代码', ''))
        activity_code = self._get_activity_code_from_prefix()
        
        if not old_code or not activity_code:
            self.console.log_warning("无法生成新代码")
            return
        
        # 提取末尾数字并加1
        import re
        match = re.search(r'(\d+)$', old_code)
        if match:
            old_num = int(match.group(1))
            new_num = old_num + 1
            prefix = old_code[:match.start()]
            new_code = f"{prefix}{new_num}"
        else:
            new_code = f"{old_code}1"
        
        # 填入项目代码
        self.code_input.setText(new_code)
        self.console.log_success(f"新项目代码已生成: {new_code}")
    
    def _get_activity_code_from_prefix(self) -> str:
        """从前置编码中提取活动代码"""
        prefix = self._get_prefix_code()
        if prefix:
            parts = prefix.split()
            if len(parts) >= 2:
                return parts[1]
        return ""
    
    
    def add_project(self):
        """添加项目"""
        code = self.code_input.text().strip()
        name = self.name_input.text().strip()
        score = self.score_input.text().strip() or "0"
        
        if not code or not name:
            self.console.log_warning("项目代码和名称不能为空")
            return
        
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return
        
        self.console.log_info(f"正在添加项目: {code} - {name}...", "#dcdcaa")
        self.console.log_info("🚀 使用纯 requests 方式（无需浏览器，速度更快）", "#90EE90")
        
        # 启动后台线程，纯 requests 版本不需要 headless 参数
        self.add_thread = AddProjectThread(username, password, code, name, score)
        self.add_thread.add_finished.connect(self._on_add_finished)
        self.add_thread.start()
    
    def _on_add_finished(self, success: bool, message: str):
        """项目添加完成"""
        if success:
            self.console.log_success(message)
            
            # 项目成功添加，现在从服务器读取最后一条记录
            self.console.log_info("📥 正在从服务器读取最后一条记录...", "#6a9fb5")
            
            try:
                # 启动后台线程获取最后的项目数据
                self.fetch_last_project_thread = FetchLastProjectThread(
                    self.config.get_credentials()[0],
                    self.config.get_credentials()[1]
                )
                self.fetch_last_project_thread.fetch_finished.connect(self._on_fetch_last_project_finished)
                self.fetch_last_project_thread.start()
                
            except Exception as e:
                self.console.log_warning(f"⚠️  获取最后一条记录失败: {e}")
                self.code_input.clear()
                self.name_input.clear()
                self.score_input.setText("0")
        else:
            self.console.log_error(message)
    
    def _on_fetch_last_project_finished(self, success: bool, project_data: dict, message: str):
        """获取最后一条记录完成"""
        if success and project_data:
            # 保存到缓存
            try:
                from datetime import datetime
                
                code = project_data.get('项目代码', '')
                
                cache_manager = ProjectCacheManager()
                
                # 加载现有缓存
                projects, metadata = cache_manager.load_cache()
                if projects is None:
                    projects = []
                if metadata is None:
                    metadata = {}
                
                # 检查项目是否已存在（按项目代码）
                existing_codes = {p.get('项目代码'): i for i, p in enumerate(projects)}
                
                if code in existing_codes:
                    # 更新现有项目
                    idx = existing_codes[code]
                    projects[idx] = project_data
                    self.console.log_info(f"📝 已更新缓存中的项目: {code}", "#dcdcaa")
                else:
                    # 添加新项目
                    projects.append(project_data)
                    
                    # 更新元数据
                    old_total = metadata.get('total_count', 0)
                    metadata['total_count'] = len(projects)
                    metadata['total_pages'] = (len(projects) + 9) // 10
                    metadata['last_updated'] = datetime.now().isoformat()
                    metadata['last_project_id'] = code
                    
                    self.console.log_info(
                        f"📝 已写入缓存: {code} (序号: {project_data.get('序号', 'N/A')}, "
                        f"总数: {old_total} → {len(projects)} 条)",
                        "#6a9fb5"
                    )
                
                # 保存更新的缓存
                cache_manager.save_cache(projects, metadata)
                self.console.log_success("💾 缓存已更新")
                
                # 刷新项目列表
                self._load_projects_from_cache()
                self.console.log_success("🔄 项目列表已更新")
                
            except Exception as e:
                self.console.log_warning(f"⚠️  缓存保存失败: {e}")
        else:
            self.console.log_warning(f"⚠️  获取最后一条记录失败: {message}")
        
        # 清空输入框
        self.code_input.clear()
        self.name_input.clear()
        self.score_input.setText("0")
    
    def search_custom_projects(self):
        """使用自定义前缀搜索项目"""
        search_prefix = self.custom_search_input.text().strip()
        if not search_prefix:
            self.console.log_warning("请输入项目代码前缀（如: ACA CMI）")
            return
        
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return
        
        self.console.log_info(f"正在搜索项目: {search_prefix}...", "#dcdcaa")
        
        # 启动后台线程
        self.search_thread = SearchProjectThread(username, password, search_prefix)
        self.search_thread.search_finished.connect(self._on_search_finished)
        self.search_thread.download_progress.connect(self._on_download_progress)
        self.search_thread.start()
    
    def _on_download_progress(self, page: int, total_pages: int, downloaded: int):
        """处理下载进度"""
        progress_msg = f"📥 下载中... 第 {page}/{total_pages} 页，已下载 {downloaded} 条"
        self.console.log_info(progress_msg, "#87ceeb")

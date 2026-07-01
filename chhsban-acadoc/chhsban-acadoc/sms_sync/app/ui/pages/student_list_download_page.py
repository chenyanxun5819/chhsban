#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
下载名单页面 - 从 SMS 系统反向下载学生成绩
"""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QGroupBox, QTableWidget, QTableWidgetItem, QRadioButton,
    QButtonGroup, QComboBox, QMessageBox, QProgressBar, QHeaderView
)
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from pathlib import Path

from core.config_manager import ConfigManager
from core.constants import BASE_DOMAIN
import requests
import re
import json


class DownloadStudentListThread(QThread):
    """后台线程下载学生成绩列表"""
    download_progress = pyqtSignal(int)  # 进度
    download_finished = pyqtSignal(bool, list, str)  # 成功/失败, 数据列表, 消息
    
    # 从全局常量中使用URL配置（2026-06-20 改为内网地址）
    BASE_URL = BASE_DOMAIN
    LOGIN_ENDPOINT = "/index.php?r=site/login"
    STUDENT_LIST_ENDPOINT = "/index.php?r=transaction/scoreInput/index"
    
    def __init__(self, username: str, password: str, activity_code: str):
        super().__init__()
        self.username = username
        self.password = password
        self.activity_code = activity_code
        self.session = requests.Session()
        self.session.verify = False
    
    def run(self):
        """执行下载学生列表流程"""
        try:
            self.download_progress.emit(10)
            
            # 登入
            if not self._login():
                self.download_finished.emit(False, [], "❌ 登入失败")
                return
            
            self.download_progress.emit(30)
            
            # 下载学生列表
            students = self._fetch_students()
            if not students:
                self.download_finished.emit(False, [], "❌ 未找到学生数据")
                return
            
            self.download_progress.emit(90)
            self.download_finished.emit(True, students, f"✅ 成功下载 {len(students)} 条学生数据")
            self.download_progress.emit(100)
            
        except Exception as e:
            self.download_finished.emit(False, [], f"❌ 下载异常: {str(e)}")
    
    def _login(self) -> bool:
        """使用 requests 登入 SMS 系统"""
        try:
            # 第1步：获取登入页面（获取 CSRF token）
            login_page_resp = self.session.get(
                f"{self.BASE_URL}{self.LOGIN_ENDPOINT}",
                timeout=10
            )
            
            if login_page_resp.status_code != 200:
                return False
            
            # 第2步：提交登入表单
            login_payload = {
                'LoginForm[username]': self.username,
                'LoginForm[password]': self.password,
                'login-button': ''
            }
            
            login_resp = self.session.post(
                f"{self.BASE_URL}{self.LOGIN_ENDPOINT}",
                data=login_payload,
                timeout=10,
                allow_redirects=True
            )
            
            # 判断登入是否成功
            if "logout" in login_resp.text.lower() or login_resp.status_code == 200:
                return True
            
            return False
            
        except Exception as e:
            return False
    
    def _fetch_students(self) -> list:
        """从 SMS 系统获取学生成绩列表"""
        try:
            # 构造查询 URL
            query_url = f"{self.BASE_URL}{self.STUDENT_LIST_ENDPOINT}?activityCode={self.activity_code}"
            
            response = self.session.get(query_url, timeout=10)
            
            if response.status_code != 200:
                return []
            
            # 解析 HTML 获取表格数据
            students = self._parse_student_table(response.text)
            return students
            
        except Exception as e:
            return []
    
    def _parse_student_table(self, html_content: str) -> list:
        """从 HTML 表格中解析学生数据"""
        students = []
        
        try:
            # 简单的正则提取（如需更复杂的解析，可使用 BeautifulSoup）
            # 查找表格行
            rows = re.findall(r'<tr[^>]*>.*?</tr>', html_content, re.DOTALL)
            
            for row in rows:
                # 提取表格单元格
                cells = re.findall(r'<td[^>]*>([^<]*)</td>', row)
                
                if len(cells) >= 7:
                    # 假设表格结构：序号, 姓名, 班级, 学号, 类别, 奖项, 英文名
                    student = {
                        'name': cells[1].strip(),
                        'class': cells[2].strip(),
                        'student_id': cells[3].strip(),
                        'category': cells[4].strip(),
                        'award': cells[5].strip(),
                        'english_name': cells[6].strip() if len(cells) > 6 else '',
                    }
                    students.append(student)
            
            return students
            
        except Exception as e:
            return []


class StudentListDownloadPage:
    # 单位映射
    UNITS = {
        "教务处ACA": "ACA",
        "体育PE": "PE",
        "联课处CCD": "CCD"
    }
    
    # 活动代码映射
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
    
    PROJECTS_JSON_PATH = Path.home() / ".sms_app" / "projects.json"
    
    def __init__(self, console):
        self.console = console
        self.widget = None
        self.config = ConfigManager()
        self.download_thread = None
        self.all_projects = []  # 存储所有项目
        self._create_ui()
        self._load_projects()  # 初始加载项目
    
    def _load_projects(self):
        """从 projects.json 加载所有项目"""
        try:
            if self.PROJECTS_JSON_PATH.exists():
                with open(self.PROJECTS_JSON_PATH, 'r', encoding='utf-8') as f:
                    self.all_projects = json.load(f)
                    # 按序号倒序排列
                    self.all_projects.sort(key=lambda x: int(x.get('序号', 0)), reverse=True)
                self.console.log_info(f"✓ 已加载 {len(self.all_projects)} 个项目", "#4ec9b0")
            else:
                self.console.log_warning(f"未找到 projects.json 文件: {self.PROJECTS_JSON_PATH}")
                self.all_projects = []
        except Exception as e:
            self.console.log_error(f"加载 projects.json 异常: {str(e)}")
            self.all_projects = []
    
    def _create_ui(self):
        """创建 UI"""
        self.widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)
        
        # 标题
        title = QLabel("下载名单")
        title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # ========== 单位选择（支持取消选择） ==========
        unit_group = QGroupBox("单位选择")
        unit_layout = QHBoxLayout()
        self.unit_group_buttons = QButtonGroup()
        self.unit_group_buttons.setExclusive(True)  # 互斥选择
        
        # 添加"全部"选项
        all_unit_radio = QRadioButton("全部")
        all_unit_radio.setChecked(True)  # 默认选择"全部"
        self.unit_group_buttons.addButton(all_unit_radio, -1)  # -1 表示"全部"
        unit_layout.addWidget(all_unit_radio)
        
        for i, unit_name in enumerate(self.UNITS.keys()):
            radio = QRadioButton(unit_name)
            self.unit_group_buttons.addButton(radio, i)
            unit_layout.addWidget(radio)
        
        unit_layout.addStretch()
        unit_group.setLayout(unit_layout)
        layout.addWidget(unit_group)
        
        # ========== 活动代码选择（支持取消选择） ==========
        activity_group = QGroupBox("活动代码选择")
        activity_layout = QHBoxLayout()
        self.activity_group_buttons = QButtonGroup()
        self.activity_group_buttons.setExclusive(True)  # 互斥选择
        
        # 添加"全部"选项
        all_activity_radio = QRadioButton("全部")
        all_activity_radio.setChecked(True)  # 默认选择"全部"
        self.activity_group_buttons.addButton(all_activity_radio, -1)  # -1 表示"全部"
        activity_layout.addWidget(all_activity_radio)
        
        for i, activity_name in enumerate(self.ACTIVITY_CODES.keys()):
            radio = QRadioButton(activity_name)
            self.activity_group_buttons.addButton(radio, i)
            activity_layout.addWidget(radio)
        
        activity_layout.addStretch()
        activity_group.setLayout(activity_layout)
        layout.addWidget(activity_group)
        
        # ========== 选择项目 ==========
        project_group = QGroupBox("选择项目")
        project_layout = QHBoxLayout()
        project_layout.setSpacing(10)
        
        project_label = QLabel("项目:")
        project_label.setMinimumWidth(60)
        
        self.project_combo = QComboBox()
        self.project_combo.setPlaceholderText("选择一个项目")
        self.project_combo.currentIndexChanged.connect(self._on_project_selected)
        
        project_layout.addWidget(project_label)
        project_layout.addWidget(self.project_combo, 1)
        
        project_group.setLayout(project_layout)
        layout.addWidget(project_group)
        
        # ========== 学生成绩列表 ==========
        list_label = QLabel("📋 学生成绩列表")
        list_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        layout.addWidget(list_label)
        
        self.student_table = QTableWidget()
        self.student_table.setColumnCount(7)
        self.student_table.setHorizontalHeaderLabels([
            "项目代码", "项目名称", "姓名", "班级", "学号", "类别", "奖项/备注"
        ])
        self.student_table.setMaximumHeight(250)
        
        # 设置列宽
        self.student_table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(3, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(4, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.ResizeToContents)
        self.student_table.horizontalHeader().setSectionResizeMode(6, QHeaderView.ResizeMode.Stretch)
        
        layout.addWidget(self.student_table)
        
        # ========== 进度条 ==========
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setMaximumHeight(20)
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)
        
        # ========== 按钮 ==========
        btn_layout = QHBoxLayout()
        
        download_btn = QPushButton("📥 下载数据")
        download_btn.clicked.connect(self.download_students)
        btn_layout.addWidget(download_btn)
        
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        layout.addStretch()
        
        # 连接信号
        self.unit_group_buttons.buttonClicked.connect(self._on_selection_changed)
        self.activity_group_buttons.buttonClicked.connect(self._on_selection_changed)
        
        self.widget.setLayout(layout)
        
        # 初始加载项目列表
        self._on_selection_changed()
    
    def get_input_widget(self):
        """返回输入区 widget"""
        return self.widget
    
    def _get_selected_unit(self) -> str:
        """获取选择的单位代码，如果选择"全部"则返回空字符串"""
        for button in self.unit_group_buttons.buttons():
            if button.isChecked():
                button_id = self.unit_group_buttons.id(button)
                if button_id == -1:
                    return ""  # 全部
                return self.UNITS.get(button.text(), "")
        return ""
    
    def _get_selected_activity(self) -> str:
        """获取选择的活动代码，如果选择"全部"则返回空字符串"""
        for button in self.activity_group_buttons.buttons():
            if button.isChecked():
                button_id = self.activity_group_buttons.id(button)
                if button_id == -1:
                    return ""  # 全部
                return self.ACTIVITY_CODES.get(button.text(), "")
        return ""
    
    def _filter_projects(self) -> list:
        """根据选择的单位和活动代码过滤项目"""
        unit = self._get_selected_unit()
        activity = self._get_selected_activity()
        
        filtered = []
        
        for project in self.all_projects:
            project_code = project.get('项目代码', '').strip()
            
            # 如果单位为空（全部）且活动为空（全部），返回所有项目
            if not unit and not activity:
                filtered.append(project)
            # 只过滤单位
            elif unit and not activity:
                if project_code.startswith(unit):
                    filtered.append(project)
            # 只过滤活动
            elif not unit and activity:
                parts = project_code.split()
                if len(parts) > 1 and parts[1].startswith(activity):
                    filtered.append(project)
            # 同时过滤单位和活动
            else:
                if project_code.startswith(unit) and ' ' in project_code:
                    parts = project_code.split()
                    if len(parts) > 1 and parts[1].startswith(activity):
                        filtered.append(project)
        
        return filtered
    
    def _on_selection_changed(self):
        """单位或活动代码改变时触发 - 更新项目下拉列表"""
        filtered_projects = self._filter_projects()
        
        # 清空项目选择框
        self.project_combo.blockSignals(True)  # 暂时阻止信号
        self.project_combo.clear()
        
        # 按照倒序添加项目（已在加载时排序，这里只需添加）
        for project in filtered_projects:
            project_code = project.get('项目代码', '')
            project_name = project.get('项目名称', '')
            project_seq = project.get('序号', '')
            
            # 显示文本：项目代码 + tab + 项目名称
            display_text = f"{project_code}\t{project_name}"
            self.project_combo.addItem(display_text, project_seq)  # value 是序号
        
        self.project_combo.blockSignals(False)  # 恢复信号
        
        self.console.log_info(f"已更新项目列表: {len(filtered_projects)} 个项目", "#4ec9b0")
    
    def _on_project_selected(self, index):
        """项目选择改变时触发"""
        if index >= 0:
            project_seq = self.project_combo.currentData()
            project_text = self.project_combo.currentText()
            self.console.log_info(f"已选择项目: {project_text}", "#4ec9b0")
    
    def download_students(self):
        """下载学生列表"""
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return
        
        # 获取选择的项目
        if self.project_combo.currentIndex() < 0:
            self.console.log_warning("请先选择一个项目")
            return
        
        project_seq = self.project_combo.currentData()
        project_text = self.project_combo.currentText()
        
        # 从项目文本中提取项目代码（tab前的部分）
        project_code = project_text.split('\t')[0] if '\t' in project_text else project_text
        
        self.console.log_info(f"开始下载学生列表: {project_code}", "#dcdcaa")
        self.progress_bar.setVisible(True)
        self.progress_bar.setValue(0)
        
        # 启动后台线程
        self.download_thread = DownloadStudentListThread(username, password, project_code)
        self.download_thread.download_progress.connect(self._update_progress)
        self.download_thread.download_finished.connect(self._on_download_finished)
        self.download_thread.start()
    
    def _update_progress(self, value: int):
        """更新进度条"""
        self.progress_bar.setValue(value)
    
    def _on_download_finished(self, success: bool, students: list, message: str):
        """下载完成"""
        self.progress_bar.setVisible(False)
        
        if success:
            self.console.log_success(message)
            self._display_students(students)
        else:
            self.console.log_error(message)
            self.student_table.setRowCount(0)
    
    def _display_students(self, students: list):
        """显示学生列表"""
        self.student_table.setRowCount(len(students))
        
        project_text = self.project_combo.currentText()
        project_code = project_text.split('\t')[0] if '\t' in project_text else project_text
        project_name = project_text.split('\t')[1] if '\t' in project_text else ""
        
        for row, student in enumerate(students):
            # 项目代码
            item = QTableWidgetItem(project_code)
            self.student_table.setItem(row, 0, item)
            
            # 项目名称
            item = QTableWidgetItem(project_name)
            self.student_table.setItem(row, 1, item)
            
            # 姓名
            item = QTableWidgetItem(str(student.get('name', '')))
            self.student_table.setItem(row, 2, item)
            
            # 班级
            item = QTableWidgetItem(str(student.get('class', '')))
            self.student_table.setItem(row, 3, item)
            
            # 学号
            item = QTableWidgetItem(str(student.get('student_id', '')))
            self.student_table.setItem(row, 4, item)
            
            # 类别
            item = QTableWidgetItem(str(student.get('category', '')))
            self.student_table.setItem(row, 5, item)
            
            # 奖项/备注
            item = QTableWidgetItem(str(student.get('award', '')))
            self.student_table.setItem(row, 6, item)

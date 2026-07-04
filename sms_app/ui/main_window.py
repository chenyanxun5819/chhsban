#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
主窗口框架 - 仿 VS Code 布局
1200x800 窗口
- 上部左侧：输入区 (1050x200) + 预览区 (1050x300)
- 上部右侧：三个操作按钮 (150x500)
- 下部：Console 区 (1200x300)
"""

from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QTabWidget, QLabel
)
from PyQt6.QtCore import Qt
from PyQt6.QtGui import QFont

from ui.pages.settings_page import SettingsPage
from ui.pages.project_input_page import ProjectInputPage
from ui.pages.score_upload_page import ScoreUploadPage
from ui.pages.student_list_download_page import StudentListDownloadPage
from ui.widgets.console_output import ConsoleOutput


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.left_layout = None  # 保存 left_layout 引用，用于页面切换
        self.input_index = 1  # 输入区在 left_layout 中的位置
        self._session = None  # 保存上传 session
        self.init_ui()
        
    def init_ui(self):
        """初始化 UI"""
        self.setWindowTitle("SMS 学生成绩自动上传系统")
        
        # 主容器
        main_widget = QWidget()
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        # ========== 上部主区域 (600像素高) ==========
        top_widget = QWidget()
        top_layout = QHBoxLayout()
        top_layout.setContentsMargins(5, 5, 5, 5)
        top_layout.setSpacing(5)
        
        # 左侧：输入+预览区 (1050像素宽)
        left_content = QWidget()
        self.left_layout = QVBoxLayout()  # 保存到类变量，方便后续页面切换
        self.left_layout.setContentsMargins(0, 0, 0, 0)
        self.left_layout.setSpacing(5)
        
        # 左侧上部：标签 + 输入区框架
        input_label = QLabel("📝 输入区")
        input_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        self.input_placeholder = QWidget()  # 稍后替换为实际页面
        self.input_placeholder.setStyleSheet("background-color: #3c3c3c; border: 1px solid #3e3e42;")
        self.input_placeholder.setMinimumHeight(200)
        
        self.left_layout.addWidget(input_label)
        self.left_layout.addWidget(self.input_placeholder, 0)
        
        left_content.setLayout(self.left_layout)
        top_layout.addWidget(left_content, 1)
        
        # 右侧：三个按钮区 (150像素宽)
        button_widget = QWidget()
        button_layout = QVBoxLayout()
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(10)
        
        # 三个按钮（设定在最下方）
        btn_project = QPushButton("📋\n项目输入")
        btn_project.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        btn_project.clicked.connect(self.show_project_page)
        
        btn_upload = QPushButton("📤\n成绩上传")
        btn_upload.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        btn_upload.clicked.connect(self.show_upload_page)
        
        # ========== 2026-06-20 注解掉"下载名单"按钮 ==========
        # 原因: 该功能还在开发中，暂时不对用户展示
        # TODO: 完成以下步骤后再启用此功能：
        #   1. 完成学生名单反向爬取的完整逻辑
        #   2. 添加Excel导出功能
        #   3. 进行充分的测试和验证
        #   4. 添加错误处理和重试机制
        # ======================================================
        # btn_download = QPushButton("⬇️\n下载名单")
        # btn_download.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        # btn_download.clicked.connect(self.show_download_page)
        
        btn_settings = QPushButton("⚙️\n设定")
        btn_settings.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        btn_settings.clicked.connect(self.show_settings_page)
        
        btn_exit = QPushButton("🚪\n离开")
        btn_exit.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        btn_exit.clicked.connect(self.close)
        
        button_layout.addWidget(btn_project)
        button_layout.addWidget(btn_upload)
        # 注解掉下载名单按钮的添加（2026-06-20）
        # button_layout.addWidget(btn_download)
        button_layout.addStretch()
        button_layout.addWidget(btn_settings)
        button_layout.addWidget(btn_exit)
        
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(15)
        button_widget.setLayout(button_layout)
        button_widget.setMaximumWidth(150)
        top_layout.addWidget(button_widget)
        
        top_widget.setLayout(top_layout)
        main_layout.addWidget(top_widget, 1)
        
        # ========== 下部：Console 区 (200像素高) ==========
        console_header_layout = QHBoxLayout()
        console_label = QLabel("📋 执行日志")
        console_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        
        version_label = QLabel('"SMS输入校外实习和特殊绩效分数系统" | 教务处 陈九天 2026/6/20 V2.0')
        version_label.setFont(QFont("Segoe UI", 8))
        version_label.setStyleSheet("color: #888888;")
        
        console_header_layout.addWidget(console_label)
        console_header_layout.addStretch()
        console_header_layout.addWidget(version_label)
        
        console_header_widget = QWidget()
        console_header_widget.setLayout(console_header_layout)
        console_header_widget.setStyleSheet("margin: 5px 5px 0px 5px;")
        
        self.console = ConsoleOutput()
        
        main_layout.addWidget(console_header_widget)
        main_layout.addWidget(self.console, 0)
        
        main_widget.setLayout(main_layout)
        self.setCentralWidget(main_widget)
        
        # 初始化页面
        self.settings_page = SettingsPage(self.console, self)
        self.project_page = ProjectInputPage(self.console)
        self.upload_page = ScoreUploadPage(self.console, get_session_callback=self.get_session)
        self.download_page = StudentListDownloadPage(self.console)
        
        # 显示第一个页面（项目输入）
        self.show_project_page()
    
    def show_settings_page(self):
        """显示设定页面"""
        try:
            # 获取当前输入区 widget
            old_input = self.left_layout.itemAt(self.input_index).widget()
            if old_input:
                self.left_layout.removeWidget(old_input)
                old_input.hide()
            
            # 插入新输入区 widget
            new_input = self.settings_page.get_input_widget()
            self.left_layout.insertWidget(self.input_index, new_input)
            new_input.show()
            
            self.console.log_info("✓ 切换到【设定】页面", "#0e639c")
        except Exception as e:
            self.console.log_error(f"❌ 切换设定页面异常: {str(e)}")
            import traceback
            self.console.log_error(traceback.format_exc())
    
    def show_project_page(self):
        """显示项目输入页面"""
        try:
            # 获取当前输入区 widget
            old_input = self.left_layout.itemAt(self.input_index).widget()
            if old_input:
                self.left_layout.removeWidget(old_input)
                old_input.hide()
            
            # 插入新输入区 widget
            new_input = self.project_page.get_input_widget()
            self.left_layout.insertWidget(self.input_index, new_input)
            new_input.show()
            
            self.console.log_info("✓ 切换到【项目输入】页面", "#0e639c")
        except Exception as e:
            self.console.log_error(f"❌ 切换项目页面异常: {str(e)}")
            import traceback
            self.console.log_error(traceback.format_exc())
    
    def show_upload_page(self):
        """显示成绩上传页面"""
        try:
            # 获取当前输入区 widget
            old_input = self.left_layout.itemAt(self.input_index).widget()
            if old_input:
                self.left_layout.removeWidget(old_input)
                old_input.hide()
            
            # 插入新输入区 widget
            new_input = self.upload_page.get_input_widget()
            self.left_layout.insertWidget(self.input_index, new_input)
            new_input.show()
            
            self.console.log_info("✓ 切换到【成绩上传】页面", "#0e639c")
        except Exception as e:
            self.console.log_error(f"❌ 切换上传页面异常: {str(e)}")
            import traceback
            self.console.log_error(traceback.format_exc())
    
    def show_download_page(self):
        """显示下载名单页面"""
        try:
            # 获取当前输入区 widget
            old_input = self.left_layout.itemAt(self.input_index).widget()
            if old_input:
                self.left_layout.removeWidget(old_input)
                old_input.hide()
            
            # 插入新输入区 widget
            new_input = self.download_page.get_input_widget()
            self.left_layout.insertWidget(self.input_index, new_input)
            new_input.show()
            
            self.console.log_info("✓ 切换到【下载名单】页面", "#0e639c")
        except Exception as e:
            self.console.log_error(f"❌ 切换下载名单页面异常: {str(e)}")
            import traceback
            self.console.log_error(traceback.format_exc())
    
    def set_session(self, session):
        """保存上传用的 session"""
        self._session = session
    
    def get_session(self):
        """获取上传用的 session"""
        return self._session

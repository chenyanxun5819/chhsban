#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设定页面 - 管理 SMS 登入凭证
"""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, 
    QPushButton, QGroupBox, QCheckBox, QMessageBox
)
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from pathlib import Path
import sys

from core.config_manager import ConfigManager
from core.sms_handler import SMSHandler
from core.startup_checker import StartupChecker


class SMSTestThread(QThread):
    """后台线程执行 SMS 连接测试"""
    test_finished = pyqtSignal(bool, str)  # 成功/失败, 消息
    
    def __init__(self, username: str, password: str):
        super().__init__()
        self.username = username
        self.password = password
    
    def run(self):
        try:
            handler = SMSHandler(headless=True)
            result = handler.test_connection(self.username, self.password)
            if result:
                self.test_finished.emit(True, "连接成功！")
            else:
                self.test_finished.emit(False, "连接失败，请检查帐号密码")
        except Exception as e:
            self.test_finished.emit(False, f"测试异常: {str(e)}")


class SettingsPage:
    def __init__(self, console, parent_window=None):
        self.console = console
        self.widget = None
        self.config = ConfigManager()
        self.test_thread = None
        self._create_ui()
        self._load_saved_credentials()
    
    def _create_ui(self):
        """创建 UI"""
        self.widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(15)
        
        # 标题
        title = QLabel("SMS 系统设置")
        title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # 登入凭证区
        cred_group = QGroupBox("SMS 登入凭证")
        cred_layout = QVBoxLayout()
        cred_layout.setSpacing(10)
        
        # 帐号
        username_layout = QHBoxLayout()
        username_layout.setSpacing(10)
        username_label = QLabel("帐  号:")
        username_label.setMinimumWidth(80)
        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("输入 SMS 帐号 (e.g., schhs334@chhsban.edu.my)")
        username_layout.addWidget(username_label)
        username_layout.addWidget(self.username_input)
        
        # 密码
        password_layout = QHBoxLayout()
        password_layout.setSpacing(10)
        password_label = QLabel("密  码:")
        password_label.setMinimumWidth(80)
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("输入 SMS 密码")
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        password_layout.addWidget(password_label)
        password_layout.addWidget(self.password_input)
        
        cred_layout.addLayout(username_layout)
        cred_layout.addLayout(password_layout)
        cred_group.setLayout(cred_layout)
        layout.addWidget(cred_group)
        
        # 选项区
        options_group = QGroupBox("选项")
        options_layout = QVBoxLayout()
        
        self.remember_cred = QCheckBox("记住登入信息（加密存储）")
        self.remember_cred.setChecked(True)
        options_layout.addWidget(self.remember_cred)
        
        options_group.setLayout(options_layout)
        layout.addWidget(options_group)
        
        # 按钮区
        btn_layout = QHBoxLayout()
        btn_layout.setSpacing(10)
        
        self.test_btn = QPushButton("🔌 测试连接")
        self.test_btn.setMinimumWidth(120)
        self.test_btn.clicked.connect(self.test_connection)
        
        save_btn = QPushButton("💾 保存设置")
        save_btn.setMinimumWidth(120)
        save_btn.clicked.connect(self.save_settings)
        
        clear_btn = QPushButton("🗑️  清除凭证")
        clear_btn.setMinimumWidth(120)
        clear_btn.clicked.connect(self.clear_credentials)
        
        btn_layout.addWidget(self.test_btn)
        btn_layout.addWidget(save_btn)
        btn_layout.addWidget(clear_btn)
        btn_layout.addStretch()
        
        layout.addLayout(btn_layout)
        
        # ================== 使用说明区 ==================
        instructions_group = QGroupBox("📖 使用说明")
        instructions_layout = QVBoxLayout()
        instructions_layout.setSpacing(8)
        
        # 创建占位符条目
        instructions = [
            "使用说明: (版本 V2.0 - 增加内外网自动判断功能)",
            "1. 【首次使用】输入你的 SMS 帐号和密码，点击 [测试连接] 验证",
            "2. 【验证成功】点击 [保存设置]，系统会自动下载全部项目数据",
            "3. 【数据更新】每次启动应用时，系统会自动检查是否有新增项目",
            "4. 【清除凭证】点击 [清除凭证] 可移除保存的帐号密码",
            "5. 【V2.0 新功能】系统自动识别网络环境，切换外网(sms.chhsban.edu.my)↔内网(192.168.0.6)"
        ]
        
        for instruction in instructions:
            inst_label = QLabel(instruction)
            inst_label.setWordWrap(True)
            inst_label.setStyleSheet("color: #666; font-size: 10pt; line-height: 1.5;")
            instructions_layout.addWidget(inst_label)
        
        instructions_group.setLayout(instructions_layout)
        layout.addWidget(instructions_group)
        
        layout.addStretch()
        
        self.widget.setLayout(layout)
    
    def get_input_widget(self):
        """返回输入区 widget"""
        return self.widget
    
    def test_connection(self):
        """测试 SMS 连接"""
        try:
            username = self.username_input.text().strip()
            password = self.password_input.text().strip()
            
            if not username or not password:
                self.console.log_warning("[测试连接] 请先填入账号和密码")
                return
            
            self.console.log_info(f"[测试连接] 正在测试连接 (\u8d26号: {username})...", "#dcdcaa")
            
            # 禁用按钮
            self.test_btn.setEnabled(False)
            self.test_btn.setText("🔌 测试中...")
            
            # 启动后台线程
            self.test_thread = SMSTestThread(username, password)
            self.test_thread.test_finished.connect(self._on_test_finished)
            self.test_thread.start()
        except Exception as e:
            self.console.log_error(f"[测试连接] 异常: {str(e)}")
            self.test_btn.setEnabled(True)
            self.test_btn.setText("🔌 测试连接")
            import traceback
            self.console.log_error(f"\u6e2f: {traceback.format_exc()}")
    
    def _on_test_finished(self, success: bool, message: str):
        """连接测试完成"""
        try:
            self.test_btn.setEnabled(True)
            self.test_btn.setText("🔌 测试连接")
            
            if success:
                self.console.log_success(f"[测试连接] {message}")
            else:
                self.console.log_error(f"[测试连接] {message}")
        except Exception as e:
            self.console.log_error(f"[测试完成] 处理异常: {str(e)}")
    
    def save_settings(self):
        """保存设置"""
        try:
            username = self.username_input.text().strip()
            password = self.password_input.text().strip()
            
            if not username or not password:
                self.console.log_warning("[保存设置] 账号和密码不能为空")
                return
            
            self.console.log_info("[保存设置] 正在保存凭证...", "#dcdcaa")
            self.config.save_credentials(username, password)
            self.console.log_success("[保存设置] 凭证已保存 🔐")
        except Exception as e:
            self.console.log_error(f"[保存设置] 保存失败: {str(e)}")
            import traceback
            self.console.log_error(f"\u6e2f: {traceback.format_exc()}")
    
    def clear_credentials(self):
        """清除凭证"""
        try:
            self.username_input.clear()
            self.password_input.clear()
            self.console.log_info("[清除凭证] 正在清除...", "#f48771")
            self.config.clear_credentials()
            self.console.log_success("[清除凭证] 已清除所有凭证")
        except Exception as e:
            self.console.log_error(f"[清除凭证] 清除失败: {str(e)}")
            import traceback
            self.console.log_error(f"\u6e2f: {traceback.format_exc()}")
    
    def _load_saved_credentials(self):
        """加载已保存的凭证"""
        try:
            self.console.log_info("[加载凭证] 开始检索本地配置...", "#8abaff")
            username, password = self.config.get_credentials()
            if username and password:
                self.username_input.setText(username)
                self.password_input.setText(password)
                self.console.log_success(f"[加载凭证] 已加载保存的凭证 (\u8d26号: {username})", "#4ec9b0")
            else:
                self.console.log_info("[加载凭证] 未找到已保存的凭证", "#8abaff")
        except Exception as e:
            self.console.log_warning(f"[加载凭证] 异常: {str(e)}")
            import traceback
            self.console.log_error(f"\u6e2f: {traceback.format_exc()}")

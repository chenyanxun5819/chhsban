#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生成绩自动上传系统 - 主应用入口
"""

import sys
import os
from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QIcon
from PyQt6.QtCore import QTimer

from ui.main_window import MainWindow
from core.startup_checker import StartupChecker


def main():
    app = QApplication(sys.argv)
    
    # 获取应用目录
    app_dir = Path(__file__).parent
    
    # 设置应用图标（影响工作列/任务栏）
    icon_path = app_dir / "assets" / "icon.ico"
    if icon_path.exists():
        app.setWindowIcon(QIcon(str(icon_path)))
    
    # 设置应用样式
    styles_path = app_dir / "ui" / "styles.qss"
    if styles_path.exists():
        with open(styles_path, "r", encoding="utf-8") as f:
            app.setStyleSheet(f.read())
    
    # 创建主窗口
    window = MainWindow()
    
    # 设置窗口图标（左上角）
    if icon_path.exists():
        window.setWindowIcon(QIcon(str(icon_path)))
    
    window.show()
    
    # 显示启动日志和日志文件位置
    log_dir = Path.home() / ".sms_app" / "logs"
    today = __import__('datetime').datetime.now().strftime("%Y-%m-%d")
    log_file = log_dir / f"sms_app_{today}.log"
    window.console.log_success("SMS 学生成绩自动上传系统已启动")
    window.console.log_info(f"📂 日志保存位置: {log_file}", "#8abaff")
    
    # 延迟执行启动检查（避免阻塞UI）
    def perform_startup_check():
        checker = StartupChecker()
        
        def log_callback(message):
            """将检查日志输出到console"""
            # 根据消息类型选择日志级别
            if "✅" in message or "已启动" in message:
                window.console.log_success(message)
            elif "❌" in message or "失败" in message:
                window.console.log_error(message)
            elif "⚠️" in message or "警告" in message or "未保存" in message:
                window.console.log_warning(message)
            elif "=" in message:
                window.console.log_info(message, "#6a9fb5")
            else:
                window.console.log_info(message, "#8abaff")
        
        # 使用增量检查（更快，只检查差异部分）
        result = checker.check_and_update_incremental(log_callback=log_callback)
        
        # 输出最终结果摘要
        if result['checked']:
            if result['matched']:
                window.console.log_success(f"✅ 数据检查完成 - {result['message']}")
            else:
                if result['updated']:
                    window.console.log_success(f"✅ 数据已更新 - {result['message']}")
                else:
                    window.console.log_error(f"❌ 数据更新失败 - {result['message']}")
        else:
            window.console.log_warning(f"⚠️  数据检查跳过 - {result['message']}")
        
        # 启动检查完成后，为上传功能创建并保存 session
        try:
            from core.config_manager import ConfigManager
            username, password = ConfigManager().get_credentials()
            if username and password:
                import requests
                session = requests.Session()
                session.verify = False
                
                login_data = {
                    'LoginForm[username]': username,
                    'LoginForm[password]': password,
                    'login-button': 'login'
                }
                
                from core.constants import LOGIN_URL
                session.post(LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
                
                # 将 session 保存到 window
                window.set_session(session)
                window.console.log_success("✅ 上传 Session 已就绪")
        except Exception as e:
            window.console.log_info(f"ℹ️  上传 Session 创建失败，将在上传时自动创建: {e}", "#8abaff")
    
    # 使用定时器在UI准备好后执行检查
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(perform_startup_check)
    timer.start(500)  # 延迟500ms执行
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生成绩自动上传系统 - 主应用入口
"""

import sys
import os

# 打包为无控制台(console=False)的 exe 时，sys.stdout/stderr 为 None；
# 即使有控制台，Windows 默认的控制台代码页也无法编码 print() 中大量使用的 emoji，
# 两种情况都会让 print() 抛出异常。在背景 QThread 中一旦异常逃逸，PyQt6 会直接让整个
# 进程崩溃（无堆栈信息），这正是打包后启动会瞬间闪退的原因。
# 因此统一改用 UTF-8 + errors="replace"，任何字符都不会再让 print() 抛错。
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8", errors="replace")
else:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8", errors="replace")
else:
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from pathlib import Path
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QIcon
from PyQt6.QtCore import QTimer, QThread, pyqtSignal

from ui.main_window import MainWindow
from core.startup_checker import StartupChecker


class StartupCheckThread(QThread):
    """在背景线程执行启动检查与登入，避免阻塞 UI（网络请求可能耗时数十秒）"""
    log_message = pyqtSignal(str)
    check_finished = pyqtSignal(dict)
    session_ready = pyqtSignal(object)

    def run(self):
        # 任何未捕获的异常从 QThread.run() 逃逸都会让 PyQt6 直接终止整个进程
        # （而不是打印堆栈），因此这里必须兜底捕获所有异常。
        try:
            checker = StartupChecker()
            # 执行智能增量检查：只在数据变化时更新，快速比对差异部分
            # 用于应用启动时的初始化检查
            result = checker.check_and_update_incremental(log_callback=self.log_message.emit)
            self.check_finished.emit(result)
        except Exception as e:
            self.log_message.emit(f"❌ 启动检查异常: {e}")
            return

        # 启动检查完成后，为上传功能创建并保存 session
        try:
            from core.config_manager import ConfigManager
            username, password = ConfigManager().get_credentials()
            if username and password:
                import requests
                from core.constants import LOGIN_URL

                session = requests.Session()
                session.verify = False

                login_data = {
                    'LoginForm[username]': username,
                    'LoginForm[password]': password,
                    'login-button': 'login'
                }
                session.post(LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
                self.session_ready.emit(session)
        except Exception as e:
            self.log_message.emit(f"ℹ️  上传 Session 创建失败，将在上传时自动创建: {e}")


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
    
    # 延迟执行启动检查（在背景线程执行，避免阻塞UI）
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

    def on_check_finished(result):
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

    def on_session_ready(session):
        window.set_session(session)
        window.console.log_success("✅ 上传 Session 已就绪")

    startup_thread = StartupCheckThread()
    startup_thread.log_message.connect(log_callback)
    startup_thread.check_finished.connect(on_check_finished)
    startup_thread.session_ready.connect(on_session_ready)

    # 使用定时器在UI准备好后启动背景线程
    timer = QTimer()
    timer.setSingleShot(True)
    timer.timeout.connect(startup_thread.start)
    timer.start(500)  # 延迟500ms执行
    
    sys.exit(app.exec())


if __name__ == "__main__":
    main()

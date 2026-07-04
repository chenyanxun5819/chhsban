#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Console 输出控件 - 显示实时日志
"""

from PyQt6.QtWidgets import QPlainTextEdit
from PyQt6.QtGui import QTextCursor, QColor, QTextCharFormat, QFont
from PyQt6.QtCore import Qt
from datetime import datetime
from pathlib import Path


class ConsoleOutput(QPlainTextEdit):
    def __init__(self):
        super().__init__()
        self.setReadOnly(True)
        self.setFont(QFont("Courier New", 9))
        self.setMaximumHeight(200)
        self.setStyleSheet("""
            background-color: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #3e3e42;
        """)
        
        # 初始化日志文件
        self.log_file_path = Path.home() / ".sms_app" / "logs"
        self.log_file_path.mkdir(parents=True, exist_ok=True)
        
        # 获取当天日志文件
        today = datetime.now().strftime("%Y-%m-%d")
        self.log_file = self.log_file_path / f"sms_app_{today}.log"
    
    def log_info(self, message: str, color: str = "#d4d4d4"):
        """记录信息级别日志"""
        self._append_log(f"[INFO] {message}", color)
    
    def log_success(self, message: str, color: str = "#4ec9b0"):
        """记录成功级别日志"""
        self._append_log(f"[✓] {message}", color)
    
    def log_warning(self, message: str):
        """记录警告级别日志"""
        self._append_log(f"[⚠] {message}", "#dcdcaa")
    
    def log_error(self, message: str):
        """记录错误级别日志"""
        self._append_log(f"[✗] {message}", "#f48771")
    
    def _append_log(self, message: str, color: str):
        """追加日志行"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        full_message = f"[{timestamp}] {message}"
        
        # 创建文本格式
        fmt = QTextCharFormat()
        fmt.setForeground(QColor(color))
        
        # 添加到末尾
        cursor = self.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.End)
        self.setTextCursor(cursor)
        
        # 插入文本
        cursor.insertText(full_message + "\n")
        
        # 自动滚动到底部
        self.ensureCursorVisible()
        
        # 同时写入日志文件
        try:
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(full_message + "\n")
        except Exception:
            pass  # 日志文件写入失败不影响控制台显示

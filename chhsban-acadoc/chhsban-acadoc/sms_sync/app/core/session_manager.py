#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
會話管理器 - 全局共享requests session
避免重複登入，提高性能，解決cookie失效問題
"""

import requests
import threading
from typing import Optional

requests.packages.urllib3.disable_warnings()


class SessionManager:
    """全局Session管理器 - 單例模式"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self.session: Optional[requests.Session] = None
            self.is_authenticated = False
            self._initialized = True
    
    def get_session(self) -> requests.Session:
        """獲取或建立session"""
        if self.session is None:
            self.session = requests.Session()
            self.session.verify = False
        return self.session
    
    def set_authenticated(self, is_auth: bool):
        """設置認證狀態"""
        self.is_authenticated = is_auth
    
    def is_session_valid(self) -> bool:
        """檢查session是否有效（已認證）"""
        return self.session is not None and self.is_authenticated
    
    def reset_session(self):
        """重置session（強制重新登入）"""
        if self.session:
            self.session.close()
        self.session = None
        self.is_authenticated = False
    
    def close_session(self):
        """關閉session"""
        if self.session:
            try:
                self.session.close()
            except:
                pass
        self.session = None
        self.is_authenticated = False


# 全局單例
_session_manager = None

def get_session_manager() -> SessionManager:
    """獲取全局Session管理器"""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager

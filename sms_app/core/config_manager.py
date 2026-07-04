#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
凭证管理器 - 加密存储和读取凭证
"""

import os
import json
from pathlib import Path
from cryptography.fernet import Fernet


class ConfigManager:
    """管理应用配置和凭证"""
    
    CONFIG_DIR = Path.home() / ".sms_app"
    CONFIG_FILE = CONFIG_DIR / "config.json"
    KEY_FILE = CONFIG_DIR / ".key"
    
    def __init__(self):
        self.config_dir.mkdir(exist_ok=True, parents=True)
        self._init_encryption()
        self.config = self._load_config()
    
    @property
    def config_dir(self):
        """获取配置目录"""
        return self.CONFIG_DIR
    
    def _init_encryption(self):
        """初始化加密密钥"""
        try:
            if self.KEY_FILE.exists():
                with open(self.KEY_FILE, 'rb') as f:
                    key_data = f.read()
                    if key_data:
                        self.cipher = Fernet(key_data)
                    else:
                        self._generate_key()
            else:
                self._generate_key()
        except Exception as e:
            print(f"Key initialization error: {e}")
            self._generate_key()
    
    def _generate_key(self):
        """生成新的加密密钥"""
        key = Fernet.generate_key()
        self.KEY_FILE.parent.mkdir(exist_ok=True, parents=True)
        with open(self.KEY_FILE, 'wb') as f:
            f.write(key)
        self.cipher = Fernet(key)
    
    def _load_config(self) -> dict:
        """加载配置"""
        try:
            if self.CONFIG_FILE.exists():
                with open(self.CONFIG_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return data
        except Exception as e:
            print(f"Config load error: {e}")
        
        return {
            "credentials": {"username": None, "password": None},
            "session": {"cookies": None, "last_login": None},
            "projects": [],
            "browser": {"headless": False}  # 新增浏览器配置
        }
    
    def _save_config(self):
        """保存配置"""
        try:
            self.CONFIG_FILE.parent.mkdir(exist_ok=True, parents=True)
            with open(self.CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Config save error: {e}")
            raise
    
    def save_credentials(self, username: str, password: str):
        """保存加密的凭证"""
        try:
            encrypted_user = self.cipher.encrypt(username.encode()).decode()
            encrypted_pass = self.cipher.encrypt(password.encode()).decode()
            
            self.config['credentials'] = {
                "username": encrypted_user,
                "password": encrypted_pass
            }
            self._save_config()
        except Exception as e:
            print(f"Credentials save error: {e}")
            raise
    
    def get_credentials(self) -> tuple:
        """获取解密的凭证"""
        try:
            creds = self.config.get('credentials', {})
            username_enc = creds.get('username')
            password_enc = creds.get('password')
            
            if not username_enc or not password_enc:
                return None, None
            
            username = self.cipher.decrypt(username_enc.encode()).decode()
            password = self.cipher.decrypt(password_enc.encode()).decode()
            return username, password
        except Exception as e:
            print(f"Credentials decryption error: {e}")
            return None, None
    
    def clear_credentials(self):
        """清除凭证"""
        try:
            self.config['credentials'] = {"username": None, "password": None}
            self._save_config()
        except Exception as e:
            print(f"Credentials clear error: {e}")
            raise
    
    def update_session(self, cookies: str = None, last_login: str = None):
        """更新会话信息"""
        try:
            if cookies:
                self.config['session']['cookies'] = cookies
            if last_login:
                self.config['session']['last_login'] = last_login
            self._save_config()
        except Exception as e:
            print(f"Session update error: {e}")
            raise
    
    def get_headless_mode(self) -> bool:
        """获取浏览器 Headless 模式（后台执行）
        
        Returns:
            bool: True 表示后台执行（无浏览器窗口），False 表示显示浏览器
        """
        try:
            browser_config = self.config.get('browser', {})
            return browser_config.get('headless', False)
        except Exception as e:
            print(f"Get headless mode error: {e}")
            return False
    
    def set_headless_mode(self, headless: bool):
        """设置浏览器 Headless 模式（后台执行）
        
        Args:
            headless (bool): True 表示后台执行（无浏览器窗口），False 表示显示浏览器
        """
        try:
            if 'browser' not in self.config:
                self.config['browser'] = {}
            self.config['browser']['headless'] = headless
            self._save_config()
        except Exception as e:
            print(f"Set headless mode error: {e}")
            raise

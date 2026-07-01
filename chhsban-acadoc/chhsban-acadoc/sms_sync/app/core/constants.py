#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
应用全局常量配置
管理系统使用的所有常数值，包括URLs、文件路径等
"""

# ==================== SMS 系统 URL 配置 ====================
# 基础URL - 2026-06-20 更新：改为使用内网IP以提高系统可靠性
# 原外网地址：http://sms.chhsban.edu.my/
# 新内网地址：http://192.168.0.6/ （外网出问题时可切换）
BASE_URL = "http://192.168.0.6/sms/index.php"

# 常用页面URLs
LOGIN_URL = f"{BASE_URL}?r=site/login"
ACTIVITY_PAGE = f"{BASE_URL}?r=transaction/studentPerformance/create"
ITEM_SETTING_PAGE = f"{BASE_URL}?r=transaction/itemSetting/index"
SCORE_UPLOAD_PAGE = f"{BASE_URL}?r=transaction/studentPerformance/index"

# 用于URL构建的基础URL（不包含 index.php）
BASE_DOMAIN = "http://192.168.0.6/sms"

# ==================== 备用URL配置 ====================
# 如果内网出问题，可以临时切换到外网
FALLBACK_BASE_URL = "http://sms.chhsban.edu.my/sms/index.php"
FALLBACK_BASE_DOMAIN = "http://sms.chhsban.edu.my/sms"

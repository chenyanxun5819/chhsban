#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试分页方法是否能正确获取项目
从 itemSetting/index 页面提取项目
"""

import requests
from core.config_manager import ConfigManager
from core.startup_checker import StartupChecker
from core.constants import LOGIN_URL

requests.packages.urllib3.disable_warnings()


def test_pagination_extraction():
    """测试分页提取方法"""
    
    print("\n" + "="*70)
    print("🧪 测试：从 itemSetting/index 的分页表格提取项目")
    print("="*70 + "\n")
    
    # 获取凭证
    config = ConfigManager()
    username, password = config.get_credentials()
    
    if not username or not password:
        print("❌ 未保存凭证，请先在设置页面输入账号和密码")
        return
    
    print(f"📍 步骤1: 创建会话并登入...")
    session = requests.Session()
    session.verify = False
    
    # 登入
    login_data = {
        'LoginForm[username]': username,
        'LoginForm[password]': password,
        'login-button': 'login'
    }
    
    try:
        session.post(LOGIN_URL, data=login_data, timeout=10, allow_redirects=True)
        print("✅ 登入成功\n")
    except Exception as e:
        print(f"❌ 登入失败: {e}")
        return
    
    # 使用 StartupChecker 的方法
    print(f"📍 步骤2: 调用 fetch_new_projects 方法...")
    checker = StartupChecker()
    
    def log_callback(msg):
        print(msg)
    
    projects = checker.fetch_new_projects(session, 0, log_callback)
    
    print(f"\n📊 提取结果汇总:")
    print(f"  总共提取: {len(projects)} 个项目")
    
    if not projects:
        print(f"  ❌ 没有提取到任何项目！")
        session.close()
        return
    
    # 检查是否包含 CCDCMO1188
    codes = [p['项目代码'] for p in projects]
    if 'CCDCMO1188' in codes:
        print(f"  ✅ 包含 CCDCMO1188 ✓")
    else:
        print(f"  ⚠️  不包含 CCDCMO1188（可能是真的没有或需要检查）")
    
    # 显示前 10 个项目
    print(f"\n📋 前 10 个项目:")
    for i, p in enumerate(projects[:10], 1):
        print(f"  {i:2d}. {p['项目代码']:20s} - {p['项目名称']}")
    
    # 显示包含 CMO 的项目
    cmo_projects = [p for p in projects if 'CMO' in p['项目代码']]
    print(f"\n📋 包含 'CMO' 的项目（共 {len(cmo_projects)} 个）:")
    for i, p in enumerate(cmo_projects[:20], 1):
        print(f"  {i:2d}. {p['项目代码']:20s} - {p['项目名称']}")
    
    print("\n" + "="*70 + "\n")
    
    session.close()


if __name__ == '__main__':
    test_pagination_extraction()

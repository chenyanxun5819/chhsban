#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试从学生成绩上传页面的 select 下拉菜单提取项目数据
用于验证新方法是否能正确获取最新的项目列表，包括 CCDCMO1188
"""

import requests
from html.parser import HTMLParser
from core.config_manager import ConfigManager
from core.constants import LOGIN_URL, SCORE_UPLOAD_PAGE

requests.packages.urllib3.disable_warnings()


def test_select_extraction():
    """测试从 select 提取项目"""
    
    print("\n" + "="*70)
    print("🧪 测试：从学生成绩上传页面的 select 下拉菜单提取项目")
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
        print("✅ 登入成功")
    except Exception as e:
        print(f"❌ 登入失败: {e}")
        return
    
    # 请求学生成绩上传页面
    print(f"\n📍 步骤2: 请求页面 {SCORE_UPLOAD_PAGE}")
    try:
        response = session.get(SCORE_UPLOAD_PAGE, timeout=10)
        print(f"✅ 页面状态码: {response.status_code}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
        session.close()
        return
    
    # 解析 HTML
    print(f"\n📍 步骤3: 解析 select 下拉菜单...")
    
    class SelectOptionParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.options = []
            self.in_option = False
            self.current_value = ""
            self.current_text = ""
        
        def handle_starttag(self, tag, attrs):
            if tag == "option":
                self.in_option = True
                attrs_dict = dict(attrs)
                self.current_value = attrs_dict.get('value', '')
                self.current_text = ""
        
        def handle_endtag(self, tag):
            if tag == "option" and self.in_option:
                self.in_option = False
                if self.current_value and self.current_text:
                    self.options.append({
                        'value': self.current_value,
                        'text': self.current_text.strip()
                    })
        
        def handle_data(self, data):
            if self.in_option:
                self.current_text += data
    
    parser = SelectOptionParser()
    try:
        parser.feed(response.text)
        print(f"✅ HTML 解析成功")
    except Exception as e:
        print(f"❌ HTML 解析失败: {e}")
        session.close()
        return
    
    # 提取项目
    print(f"\n📍 步骤4: 提取项目数据...\n")
    
    projects = []
    for option in parser.options:
        value = option['value'].strip()
        text = option['text'].strip()
        
        # 格式通常是 "代码 - 名称" 或 "代码:名称"
        if ' - ' in text:
            parts = text.split(' - ', 1)
            code = parts[0].strip()
            name = parts[1].strip()
        elif ':' in text:
            parts = text.split(':', 1)
            code = parts[0].strip()
            name = parts[1].strip()
        else:
            code = value
            name = text
        
        if not code and value:
            code = value
        
        if code and code != '0':  # 过滤掉空值和"请选择"选项
            project = {
                '序号': str(len(projects) + 1),
                '项目代码': code,
                '项目名称': name if name else code,
                '分数': '0.00'
            }
            projects.append(project)
            print(f"  ✓ {code:20s} - {name}")
    
    print(f"\n📊 提取结果汇总:")
    print(f"  总共提取: {len(projects)} 个项目")
    
    # 检查是否包含 CCDCMO1188
    codes = [p['项目代码'] for p in projects]
    if 'CCDCMO1188' in codes:
        print(f"  ✅ 包含 CCDCMO1188 ✓")
    else:
        print(f"  ❌ 不包含 CCDCMO1188 ✗")
    
    # 显示前 10 个项目
    print(f"\n📋 前 10 个项目:")
    for i, p in enumerate(projects[:10], 1):
        print(f"  {i:2d}. {p['项目代码']:20s} - {p['项目名称']}")
    
    # 显示后 10 个项目
    if len(projects) > 10:
        print(f"\n📋 最后 10 个项目:")
        for i, p in enumerate(projects[-10:], len(projects)-9):
            print(f"  {i:2d}. {p['项目代码']:20s} - {p['项目名称']}")
    
    print("\n" + "="*70 + "\n")
    
    session.close()


if __name__ == '__main__':
    test_select_extraction()

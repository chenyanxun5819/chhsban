#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
深度调试：查找分页信息
"""

import requests
from bs4 import BeautifulSoup
import re

requests.packages.urllib3.disable_warnings()

session = requests.Session()
session.verify = False

USERNAME = "schhs334"
PASSWORD = "@Sidan49122"

login_url = "http://192.168.0.6/sms/index.php?r=site/login"
print("登入中...")

resp = session.get(login_url)
login_data = {
    'LoginForm[username]': USERNAME,
    'LoginForm[password]': PASSWORD,
    'login-button': 'login'
}
resp = session.post(login_url, data=login_data)
print(f"✓ 登入成功")

# 查询班级 701 的学生
activity_page = "http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/create"
params = {'class_id': '701', 'ajax': 'student-grid'}
resp = session.get(activity_page, params=params, timeout=15)

print(f"\n响应分析:")
html = resp.text

# 查找所有的 URL 参数
page_params = re.findall(r'[?&](page|pagesize|rows|limit|offset|start)=(\d+)', html)
print(f"  分页参数: {set(page_params)}")

# 查找 JavaScript 中的分页配置
js_pagesize = re.findall(r'pagesize["\']?\s*[:=]\s*(\d+)', html, re.IGNORECASE)
js_rows = re.findall(r'rows["\']?\s*[:=]\s*(\d+)', html, re.IGNORECASE)
print(f"  JS pagesize: {js_pagesize}")
print(f"  JS rows: {js_rows}")

# 查找 yii 的数据网格配置
yii_grid = re.findall(r'"dataProvider".*?"itemCount"\s*:\s*(\d+)', html)
print(f"  dataProvider itemCount: {yii_grid}")

# 查找数据网格中的总记录数
total_matches = re.findall(r'总共.*?(\d+).*?条|Total.*?(\d+)', html)
print(f"  总记录数提示: {total_matches}")

# 查找所有的链接中包含 page 的
links_with_page = re.findall(r'href=["\']([^"\']*page[^"\']*)["\']', html)
print(f"  包含 page 的链接: {len(links_with_page)}")
if links_with_page:
    print(f"    示例: {links_with_page[0]}")

# 查看表格分页按钮
soup = BeautifulSoup(html, 'html.parser')
div_pager = soup.find('div', class_=['pager', 'pagination', 'yii-pager'])
print(f"  分页 div: {div_pager is not None}")

# 查看所有 div 中的数据
divs = soup.find_all('div', class_=re.compile('.*pag.*', re.I))
print(f"  包含 'pag' 的 div: {len(divs)}")
for div in divs:
    print(f"    类: {div.get('class')}")

# 查找所有表单
forms = soup.find_all('form')
print(f"  表单数: {len(forms)}")
for i, form in enumerate(forms):
    print(f"    表单 {i}: action={form.get('action')}")
    # 查找隐藏输入
    hidden = form.find_all('input', type='hidden')
    for inp in hidden:
        print(f"      {inp.get('name')}={inp.get('value')}")

# 查看是否有 JavaScript 配置
scripts = soup.find_all('script')
print(f"\n响应中的 JavaScript:")
for i, script in enumerate(scripts):
    text = script.string
    if text and ('page' in text.lower() or 'grid' in text.lower() or 'pagination' in text.lower()):
        print(f"  脚本 {i} (包含分页相关内容):")
        # 输出脚本的前 500 字符
        print(f"    {text[:500]}")
        break

# 查找 data-page 或其他 data 属性
all_with_data = soup.find_all(attrs=re.compile('^data-'))
print(f"\n带 data- 属性的元素:")
for elem in all_with_data[:5]:
    print(f"  {elem.name}: {dict(elem.attrs)}")

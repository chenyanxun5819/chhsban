#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取完整的分页信息和所有学生数据
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
print(f"✓ 登入成功\n")

# 查询班级 701 的学生（第 1 页）
activity_page = "http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/create"
params = {'class_id': '701', 'ajax': 'student-grid'}
resp = session.get(activity_page, params=params, timeout=15)

soup = BeautifulSoup(resp.text, 'html.parser')

# 查找分页信息
pagination = soup.find('div', class_='pagination')
print(f"分页信息:")

if pagination:
    # 查找所有分页链接
    links = pagination.find_all('a')
    print(f"  分页链接数: {len(links)}")
    
    # 提取页码
    pages = []
    for link in links:
        href = link.get('href', '')
        match = re.search(r'id_page=(\d+)', href)
        if match:
            page_num = match.group(1)
            pages.append(int(page_num))
            print(f"    页码: {page_num}, 文本: {link.get_text(strip=True)}")
    
    if pages:
        max_page = max(pages)
        print(f"  最大页码: {max_page}")
        print(f"  预计总学生数: {(max_page - 1) * 1000 + 500} - {max_page * 1000}")
else:
    print("  未找到分页信息")

# 统计第 1 页的学生数
students = soup.select('a[data-student_id]')
print(f"\n第 1 页学生数: {len(students)}")

# 尝试访问第 2 页
print(f"\n测试第 2 页...")
params = {'class_id': '701', 'ajax': 'student-grid', 'id_page': '2'}
resp = session.get(activity_page, params=params, timeout=15)
soup = BeautifulSoup(resp.text, 'html.parser')
students = soup.select('a[data-student_id]')
print(f"第 2 页学生数: {len(students)}")

# 看看第二页的学生是否不同
if students:
    first_student = students[0]
    print(f"  第 2 页第一个学生: {first_student.get('data-student_no')}, 班级: {first_student.get('data-class_name')}")

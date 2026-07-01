#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试脚本：检查 HTML 响应中是否有分页或其他数据加载方式
"""

import requests
from bs4 import BeautifulSoup

requests.packages.urllib3.disable_warnings()

# 登入
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
print(f"✓ 登入成功: {resp.url}")

# 查询班级 701 的学生
activity_page = "http://192.168.0.6/sms/index.php?r=transaction/studentPerformance/create"
params = {'class_id': '701', 'ajax': 'student-grid'}
resp = session.get(activity_page, params=params, timeout=15)

print(f"\n查询班级 701 的结果:")
print(f"  HTTP: {resp.status_code}")
print(f"  大小: {len(resp.text)} 字节")

soup = BeautifulSoup(resp.text, 'html.parser')

# 查找学生数据
students = soup.select('a[data-student_id]')
print(f"  学生数: {len(students)}")

# 查找分页信息
pagination = soup.find_all('ul', class_='pagination')
print(f"  分页元素: {len(pagination)}")

# 查找翻页链接
pagers = soup.find_all('a', class_=['next', 'prev', 'page'])
print(f"  翻页链接: {len(pagers)}")

# 查找表格信息
tables = soup.find_all('table')
print(f"  表格数: {len(tables)}")

# 查看 tbody 中的 tr 数量
if tables:
    for i, table in enumerate(tables):
        tbody = table.find('tbody')
        if tbody:
            rows = tbody.find_all('tr')
            print(f"    表格 {i}: {len(rows)} 行")

# 查找所有的 <a> 标签
all_links = soup.find_all('a')
print(f"  总 <a> 标签数: {len(all_links)}")

# 查找 data-* 属性
data_attrs = soup.find_all(attrs={'data-student_id': True})
print(f"  data-student_id 标签: {len(data_attrs)}")

# 查看是否有加载更多的脚本或 AJAX 调用
scripts = soup.find_all('script')
print(f"  脚本标签数: {len(scripts)}")

# 查看最后一个学生的学号和班级
if students:
    last_student = students[-1]
    print(f"\n最后一个学生:")
    print(f"  student_id: {last_student.get('data-student_id')}")
    print(f"  student_no: {last_student.get('data-student_no')}")
    print(f"  class_name: {last_student.get('data-class_name')}")
    print(f"  class_id: {last_student.get('data-class_id')}")

# 查看响应 URL 中的参数
print(f"\n最终 URL: {resp.url}")

# 检查是否有分页或 JS 加载的迹象
if 'page=' in resp.text or 'offset=' in resp.text or 'limit=' in resp.text:
    print("✓ 发现分页参数")
else:
    print("✗ 未发现分页参数")

# 输出响应的前 500 字符
print(f"\n响应开头:")
print(resp.text[:500])

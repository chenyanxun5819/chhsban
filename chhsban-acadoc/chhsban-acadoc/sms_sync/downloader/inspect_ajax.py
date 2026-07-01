#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查 ajax=student-grid 的返回格式
"""

import requests
from bs4 import BeautifulSoup
import json
from pathlib import Path

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings()


def inspect_ajax_format():
    """检查 ajax=student-grid 的返回格式"""
    
    print("=" * 70)
    print("检查 ajax=student-grid 的返回格式")
    print("=" * 70 + "\n")
    
    # 配置
    BASE_URL = "http://192.168.0.6/sms/index.php"
    USERNAME = "schhs334"
    PASSWORD = "@Sidan49122"
    
    # 创建会话
    session = requests.Session()
    session.verify = False
    
    # 第1步：登入
    print("[1/3] 正在登入...")
    login_url = f"{BASE_URL}?r=site/login"
    login_data = {
        'LoginForm[username]': USERNAME,
        'LoginForm[password]': PASSWORD,
        'login-button': 'login'
    }
    
    resp = session.post(login_url, data=login_data, timeout=15, allow_redirects=True)
    
    if 'login' in resp.url.lower():
        print("❌ 登入失败")
        return
    
    print("✓ 登入成功")
    
    # 第2步：获取班级列表
    print("\n[2/3] 获取班级列表...")
    activity_page = f"{BASE_URL}?r=transaction/studentPerformance/create"
    resp = session.get(activity_page, timeout=15)
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    
    # 找到第一个班级
    class_select = soup.select_one('select#StudentPerformanceM_class_id')
    if not class_select:
        # 备用选择
        all_selects = soup.find_all('select')
        for select in all_selects:
            if len(select.find_all('option')) > 5:
                class_select = select
                break
    
    if not class_select:
        print("❌ 未找到班级选择器")
        return
    
    # 获取第一个非空班级
    options = class_select.find_all('option')
    first_class_id = None
    first_class_name = None
    
    for option in options:
        class_id = option.get('value', '').strip()
        class_name = option.get_text().strip()
        
        if class_id and class_name and class_name != '--- 选择班级 ---':
            first_class_id = class_id
            first_class_name = class_name
            break
    
    if not first_class_id:
        print("❌ 未找到班级")
        return
    
    print(f"✓ 找到班级: {first_class_name} (ID: {first_class_id})")
    
    # 第3步：获取 ajax=student-grid 数据
    print(f"\n[3/3] 获取 ajax=student-grid 数据...")
    print(f"      URL: {activity_page}?class_id={first_class_id}&ajax=student-grid\n")
    
    params = {
        'class_id': first_class_id,
        'ajax': 'student-grid'
    }
    
    resp = session.get(activity_page, params=params, timeout=15)
    
    print("=" * 70)
    print("响应信息:")
    print("=" * 70)
    print(f"状态码: {resp.status_code}")
    print(f"Content-Type: {resp.headers.get('Content-Type', 'N/A')}")
    print(f"响应大小: {len(resp.text)} 字节")
    print(f"编码: {resp.encoding}\n")
    
    # 尝试解析为 JSON
    print("=" * 70)
    print("尝试解析为 JSON:")
    print("=" * 70)
    try:
        data = resp.json()
        print("✓ 可以解析为 JSON\n")
        
        print("JSON 结构:")
        print(json.dumps(data, indent=2, ensure_ascii=False)[:1000])  # 显示前 1000 字符
        
        print("\n\n详细分析:")
        if isinstance(data, dict):
            print(f"  类型: 字典 (dict)")
            print(f"  顶级键: {list(data.keys())}")
            
            if 'rows' in data:
                print(f"\n  'rows' 键包含的行数: {len(data['rows'])}")
                if data['rows']:
                    print(f"  第一行内容: {data['rows'][0]}")
            
            if 'count' in data:
                print(f"  'count' 值: {data['count']}")
        
        elif isinstance(data, list):
            print(f"  类型: 列表 (list)")
            print(f"  列表长度: {len(data)}")
            if data:
                print(f"  第一项: {data[0]}")
        
    except json.JSONDecodeError:
        print("✗ 不是 JSON 格式\n")
        
        print("=" * 70)
        print("尝试解析为 HTML:")
        print("=" * 70)
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 查找学生数据
        student_links = soup.select('a[data-student_id]')
        print(f"✓ 找到 {len(student_links)} 个学生链接\n")
        
        if student_links:
            print("第一个学生链接的属性:")
            first_link = student_links[0]
            for attr, value in first_link.attrs.items():
                print(f"  {attr}: {value}")
            
            print("\n前 3 个学生:")
            for i, link in enumerate(student_links[:3]):
                print(f"  [{i+1}]")
                print(f"      学号: {link.get('data-student_no')}")
                print(f"      姓名: {link.get('data-student_name')}")
                print(f"      中文名: {link.get('data-student_cname')}")
                print(f"      ID: {link.get('data-student_id')}")
    
    # 保存完整响应到文件供查看
    output_dir = Path("C:/chhsban-acadoc/download_student")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    response_file = output_dir / f"ajax_student_grid_response.txt"
    with open(response_file, 'w', encoding='utf-8') as f:
        f.write("=" * 70 + "\n")
        f.write("AJAX=STUDENT-GRID 完整响应\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"班级: {first_class_name} (ID: {first_class_id})\n")
        f.write(f"URL: {activity_page}?class_id={first_class_id}&ajax=student-grid\n")
        f.write(f"状态码: {resp.status_code}\n")
        f.write(f"Content-Type: {resp.headers.get('Content-Type', 'N/A')}\n\n")
        f.write("=" * 70 + "\n")
        f.write("响应内容:\n")
        f.write("=" * 70 + "\n")
        f.write(resp.text)
    
    print("\n" + "=" * 70)
    print(f"完整响应已保存到: {response_file}")
    print("=" * 70)


if __name__ == '__main__':
    inspect_ajax_format()

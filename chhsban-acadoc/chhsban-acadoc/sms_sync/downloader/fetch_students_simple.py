#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 系统 - 简化版：直接获取所有学生，按班级分组
不依赖于班级 SELECT，而是直接从 ajax=student-grid 返回的所有学生中提取班级信息
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict

requests.packages.urllib3.disable_warnings()


class SimpleStudentFetcher:
    """简单的学生获取器 - 直接从学生数据提取班级"""
    
    NETWORKS = {
        'intranet': 'http://192.168.0.6/sms/index.php',
        'internet': 'http://sms.chhsban.edu.my/sms/index.php'
    }
    
    def __init__(self):
        self.base_url = None
        self.session = None
        self.students_by_class = defaultdict(list)  # {班级名: [学生列表]}
        self.all_students = []
        self.data_dir = Path("C:/chhsban-acadoc/download_student")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.data_dir / f"download_{timestamp}.log"
    
    def log(self, msg):
        print(msg)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
    
    def select_network(self):
        """选择网络"""
        for name, url in self.NETWORKS.items():
            try:
                resp = requests.get(url, timeout=5, verify=False)
                if resp.status_code == 200:
                    self.base_url = url
                    self.log(f"✓ 连接到 {name}: {url}")
                    return True
            except:
                pass
        self.log("ERROR: 无法连接任何网络")
        return False
    
    def login(self, username, password):
        """登入"""
        self.session = requests.Session()
        self.session.verify = False
        
        login_url = f"{self.base_url}?r=site/login"
        self.log(f"登入中...")
        
        resp = self.session.get(login_url)
        login_data = {
            'LoginForm[username]': username,
            'LoginForm[password]': password,
            'login-button': 'login'
        }
        resp = self.session.post(login_url, data=login_data)
        
        if 'login' in resp.url.lower():
            self.log("ERROR: 登入失败")
            return False
        
        self.log("✓ 登入成功")
        return True
    
    def fetch_all_students(self):
        """获取所有学生 - 枚举所有班级 SELECT 中的班级"""
        self.log("\n开始获取学生...")
        
        activity_page = f"{self.base_url}?r=transaction/studentPerformance/create"
        
        # 第1步：获取页面并提取班级 SELECT
        resp = self.session.get(activity_page)
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 找班级 SELECT（name=class_id）
        class_select = soup.select_one('select[name="class_id"]')
        if not class_select:
            self.log("ERROR: 未找到班级 SELECT")
            return False
        
        options = class_select.find_all('option')
        class_ids = []
        for opt in options:
            val = opt.get('value', '').strip()
            name = opt.get_text().strip()
            if val and name:
                try:
                    int(val)
                    class_ids.append(val)
                except:
                    pass
        
        self.log(f"找到 {len(class_ids)} 个班级: {class_ids[:10]}...")
        
        # 第2步：对每个班级，获取学生数据
        for idx, class_id in enumerate(class_ids, 1):
            self.log(f"[{idx}/{len(class_ids)}] 获取班级 ID {class_id} 的学生...")
            
            params = {'class_id': class_id, 'ajax': 'student-grid'}
            resp = self.session.get(activity_page, params=params, timeout=15)
            
            if resp.status_code != 200:
                self.log(f"  ERROR: 失败")
                continue
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            students_found = 0
            
            # 从所有 a 标签中提取学生
            for link in soup.select('a[data-student_id]'):
                student = {
                    'student_id': link.get('data-student_id'),
                    'student_no': link.get('data-student_no'),
                    'name_en': link.get('data-student_name'),
                    'name_cn': link.get('data-student_cname'),
                    'class_name': link.get('data-class_name'),  # 真实班级名称
                    'activity_id': link.get('data-class_id'),   # 活动 ID
                }
                
                if student['student_id']:
                    self.all_students.append(student)
                    self.students_by_class[student['class_name']].append(student)
                    students_found += 1
            
            self.log(f"  ✓ 获得 {students_found} 名学生")
        
        return True
    
    def save_data(self):
        """保存数据"""
        if not self.all_students:
            self.log("ERROR: 没有学生数据")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON 格式
        json_file = self.data_dir / f"students_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'download_time': datetime.now().isoformat(),
                'total_students': len(self.all_students),
                'classes': dict(self.students_by_class),
                'students': self.all_students
            }, f, ensure_ascii=False, indent=2)
        self.log(f"✓ 保存 JSON: {json_file}")
        
        # CSV 格式
        csv_file = self.data_dir / f"students_{timestamp}.csv"
        with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['class_name', 'student_no', 'name_en', 'name_cn', 'student_id', 'activity_id'])
            writer.writeheader()
            writer.writerows(self.all_students)
        self.log(f"✓ 保存 CSV: {csv_file}")
        
        # 显示统计
        self.log(f"\n统计:")
        self.log(f"  班级数: {len(self.students_by_class)}")
        self.log(f"  学生总数: {len(self.all_students)}")
        for class_name in sorted(self.students_by_class.keys())[:10]:
            count = len(self.students_by_class[class_name])
            self.log(f"    {class_name}: {count} 名学生")
        if len(self.students_by_class) > 10:
            self.log(f"    ... 等共 {len(self.students_by_class)} 个班级")


def main():
    USERNAME = "schhs334"
    PASSWORD = "@Sidan49122"
    
    fetcher = SimpleStudentFetcher()
    
    if not fetcher.select_network():
        return
    
    if not fetcher.login(USERNAME, PASSWORD):
        return
    
    if not fetcher.fetch_all_students():
        return
    
    fetcher.save_data()


if __name__ == "__main__":
    main()

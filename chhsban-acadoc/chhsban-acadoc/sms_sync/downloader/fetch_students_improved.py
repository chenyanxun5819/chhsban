#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
改进版：使用已知的班级 ID 列表，逐一获取学生数据
"""

import requests
from bs4 import BeautifulSoup
import json
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict

requests.packages.urllib3.disable_warnings()

# 从 J1A.md 中提取的完整班级列表（共 71 个）
CLASS_IDS = [
    # 初一（J1）- 11 个
    701, 693, 696, 700, 704, 695, 699, 703, 694, 697, 691,
    # 初二（J2）- 14 个
    714, 706, 709, 713, 705, 708, 712, 715, 707, 711, 762, 763, 710, 692,
    # 初三（J3）- 12 个
    723, 726, 718, 722, 725, 717, 721, 724, 716, 720, 719, 727,
    # 高一（S1/C1/U1） - 12 个
    738, 730, 733, 737, 729, 732, 736, 731, 734, 739, 735, 728,
    # 高二（S2/C2/U2） - 11 个
    747, 750, 742, 746, 749, 741, 740, 743, 748, 744, 745,
    # 高三（S3/C3/A3） - 11 个
    761, 752, 755, 758, 751, 754, 757, 756, 759, 753, 760,
]

class_names = {
    701: "初一忠 (J1A)", 693: "初一孝 (J1B)", 696: "初一仁 (J1C)", 700: "初一爱 (J1D)",
    704: "初一信 (J1E)", 695: "初一义 (J1F)", 699: "初一和 (J1G)", 703: "初一平 (J1H)",
    694: "初一勤 (J1I)", 697: "J1_离校", 691: "J1_STAR",
    714: "初二忠 (J2A)", 706: "初二孝 (J2B)", 709: "初二仁 (J2C)", 713: "初二爱 (J2D)",
    705: "初二信 (J2E)", 708: "初二义 (J2F)", 712: "初二和 (J2G)", 715: "初二平 (J2H)",
    707: "初二勤 (J2I)", 711: "初二勉 (J2J)", 762: "初二诚（J2K）", 763: "初二德（J2L）",
    710: "J2_离校", 692: "J2_STAR",
    723: "初三忠 (J3A)", 726: "初三孝 (J3B)", 718: "初三仁 (J3C)", 722: "初三爱 (J3D)",
    725: "初三信 (J3E)", 717: "初三义 (J3F)", 721: "初三和 (J3G)", 724: "初三平 (J3H)",
    716: "初三勤 (J3I)", 720: "初三勉 (J3J)", 719: "J3_离校", 727: "J3_STAR",
    738: "高一爱 (AC1A)", 730: "高一信 (C1A)", 733: "高一义 (C1B)", 737: "高一和 (C1C)",
    729: "高一平 (C1D)", 732: "高一诚 (C1E)", 736: "高一德 (C1F)", 731: "高一忠 (S1A)",
    734: "高一孝 (S1B)", 739: "S1_离校", 735: "S1_STAR", 728: "高一勤 (U1A)",
    747: "高二爱 (AC2A)", 750: "高二信 (C2A)", 742: "高二义 (C2B)", 746: "高二和 (C2C)",
    749: "高二平 (C2D)", 741: "高二诚 (C2E)", 740: "高二忠 (S2A)", 743: "高二孝 (S2B)",
    748: "S2_离校", 744: "S2_STAR", 745: "高二勤 (U2A)",
    761: "高三勤 (A3A)", 752: "高三爱 (C3A)", 755: "高三信 (C3B)", 758: "高三义 (C3C)",
    751: "高三和 (C3D)", 754: "高三平 (C3E)", 757: "高三诚 (C3F)", 756: "高三忠 (S3A)",
    759: "高三孝 (S3B)", 753: "S3_离校", 760: "S3_STAR",
}


class ImprovedStudentFetcher:
    def __init__(self):
        self.base_url = None
        self.session = None
        self.all_students = []
        self.data_dir = Path("C:/chhsban-acadoc/download_student")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.data_dir / f"download_improved_{timestamp}.log"
    
    def log(self, msg):
        print(msg)
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(msg + '\n')
    
    def select_network(self):
        networks = {
            'intranet': 'http://192.168.0.6/sms/index.php',
            'internet': 'http://sms.chhsban.edu.my/sms/index.php'
        }
        for name, url in networks.items():
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
        self.log(f"\n开始获取学生（共 {len(CLASS_IDS)} 个班级）...")
        
        activity_page = f"{self.base_url}?r=transaction/studentPerformance/create"
        
        students_by_class = defaultdict(list)
        total_students = 0
        
        for idx, class_id in enumerate(CLASS_IDS, 1):
            class_name = class_names.get(str(class_id), f"Class {class_id}")
            progress_msg = f"[{idx:2d}/{len(CLASS_IDS)}] {class_name:20s} (ID: {class_id})... "
            print(progress_msg, end='', flush=True)
            
            try:
                params = {'class_id': str(class_id), 'ajax': 'student-grid'}
                resp = self.session.get(activity_page, params=params, timeout=15)
                
                if resp.status_code != 200:
                    print(f"✗ HTTP {resp.status_code}")
                    continue
                
                soup = BeautifulSoup(resp.text, 'html.parser')
                students = []
                
                for link in soup.select('a[data-student_id]'):
                    student = {
                        'student_id': link.get('data-student_id'),
                        'student_no': link.get('data-student_no'),
                        'name_en': link.get('data-student_name'),
                        'name_cn': link.get('data-student_cname'),
                        'class_name': link.get('data-class_name'),
                        'class_id': link.get('data-class_id'),
                        'class_name_input': class_name,  # 来自 SELECT 的班级名
                    }
                    
                    if student['student_id']:
                        students.append(student)
                        self.all_students.append(student)
                        students_by_class[class_name].append(student)
                        total_students += 1
                
                print(f"✓ {len(students):4d} 名学生")
                with open(self.log_file, 'a', encoding='utf-8') as f:
                    f.write(f"[{idx:2d}/{len(CLASS_IDS)}] {class_name:20s} (ID: {class_id}): {len(students)} 名学生\n")
                
            except Exception as e:
                print(f"✗ 异常: {e}")
                self.log(f"异常: {e}")
        
        self.log(f"\n获取完成: 总学生数 {total_students}，班级 {len(students_by_class)}")
        return students_by_class
    
    def save_data(self, students_by_class):
        if not self.all_students:
            self.log("ERROR: 没有学生数据")
            return
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON
        json_file = self.data_dir / f"students_improved_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump({
                'download_time': datetime.now().isoformat(),
                'total_students': len(self.all_students),
                'total_classes': len(students_by_class),
                'students': self.all_students
            }, f, ensure_ascii=False, indent=2)
        self.log(f"✓ 保存 JSON: {json_file}")
        
        # CSV
        csv_file = self.data_dir / f"students_improved_{timestamp}.csv"
        with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['class_name_input', 'student_no', 'name_en', 'name_cn', 'student_id'])
            writer.writeheader()
            writer.writerows(self.all_students)
        self.log(f"✓ 保存 CSV: {csv_file}")
        
        # 班级统计
        self.log(f"\n班级统计（共 {len(students_by_class)} 个班级）:")
        for class_name in sorted(students_by_class.keys()):
            count = len(students_by_class[class_name])
            self.log(f"  {class_name:25s}: {count:3d} 名学生")


def main():
    USERNAME = "schhs334"
    PASSWORD = "@Sidan49122"
    
    fetcher = ImprovedStudentFetcher()
    
    if not fetcher.select_network():
        return
    
    if not fetcher.login(USERNAME, PASSWORD):
        return
    
    students_by_class = fetcher.fetch_all_students()
    fetcher.save_data(students_by_class)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生资料下载工具
从 SMS 系统下载全校学生资料并保存到本地

方法：
1. 从 XPath /html/body/div[2]/div[2]/div[2]/div[2]/div[2]/form/div[7]/div/div[1]/table/tbody/tr[2]/th[2]/select 
   获取全校班级列表
2. 对每个班级，使用 ajax=student-grid 参数获取学生 JSON 数据
"""

import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class SMSDownloader:
    """SMS 学生资料下载器"""
    
    # 网络配置
    NETWORKS = {
        'intranet': {
            'base_url': 'http://192.168.0.6/sms/index.php',
            'name': '局域网 (192.168.0.6)'
        },
        'internet': {
            'base_url': 'http://sms.chhsban.edu.my/sms/index.php',
            'name': '广域网 (sms.chhsban.edu.my)'
        }
    }
    
    # 关键 URL
    LOGIN_URL_TEMPLATE = "{base}?r=site/login"
    STUDENT_GRID_URL_TEMPLATE = "{base}?r=transaction/studentPerformance/create"
    
    def __init__(self, network: str = 'auto', data_dir: Optional[str] = None):
        """初始化下载器
        
        Args:
            network: 网络类型 ('intranet', 'internet', 'auto')
            data_dir: 数据保存目录，默认为 C:\chhsban-acadoc\download_student
        """
        self.network_preference = network
        self.current_network = None
        self.base_url = None
        
        # 数据目录
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path("C:/chhsban-acadoc/download_student")
        
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # HTTP 会话
        self.session = None
        
        # 数据存储
        self.class_mapping = {}      # class_id → class_name
        self.all_students = {}       # class_id → [student_data, ...]
        
        # 日志
        self.log_file = self.data_dir / f"download_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message + '\n')
    
    def _init_session(self):
        """初始化 HTTP 会话"""
        if not self.session:
            self.session = requests.Session()
            self.session.verify = False
            self.session.timeout = 30
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
        return self.session
    
    def _select_network(self) -> bool:
        """自动选择可用网络"""
        if self.network_preference == 'auto':
            networks_to_try = ['intranet', 'internet']
        elif self.network_preference in ['intranet', 'internet']:
            networks_to_try = [self.network_preference]
        else:
            self.log(f"无效的网络选择: {self.network_preference}", "ERROR")
            return False
        
        for network in networks_to_try:
            self.log(f"尝试连接 {self.NETWORKS[network]['name']}...")
            try:
                session = self._init_session()
                login_url = self.LOGIN_URL_TEMPLATE.format(base=self.NETWORKS[network]['base_url'])
                resp = session.get(login_url, timeout=10)
                
                if resp.status_code == 200:
                    self.current_network = network
                    self.base_url = self.NETWORKS[network]['base_url']
                    self.log(f"✓ 成功连接到 {self.NETWORKS[network]['name']}")
                    return True
            except Exception as e:
                self.log(f"  连接失败: {type(e).__name__}", "WARN")
                continue
        
        self.log("无法连接到任何网络", "ERROR")
        return False
    
    def login(self, username: str, password: str) -> bool:
        """登入 SMS 系统"""
        try:
            # 选择网络
            if not self._select_network():
                return False
            
            self.log(f"正在登入...")
            self.log(f"  URL: {self.base_url}")
            self.log(f"  用户名: {username}")
            
            session = self._init_session()
            login_url = self.LOGIN_URL_TEMPLATE.format(base=self.base_url)
            
            # 第一步：GET 登入页面（获取初始 cookie）
            self.log("  1️⃣  获取登入页面...")
            resp = session.get(login_url, timeout=15)
            if resp.status_code != 200:
                self.log(f"获取登入页面失败: {resp.status_code}", "ERROR")
                return False
            self.log("  ✓ 页面已获取")
            
            # 第二步：POST 登入凭证
            self.log("  2️⃣  提交登入凭证...")
            login_data = {
                'LoginForm[username]': username,
                'LoginForm[password]': password,
                'login-button': 'login'
            }
            resp = session.post(login_url, data=login_data, timeout=15, allow_redirects=True)
            
            # 检查登入是否成功
            if 'login' in resp.url.lower():
                self.log(f"登入失败：错误的用户名或密码", "ERROR")
                return False
            
            self.log("✓ 登入成功！")
            self.log(f"  当前 URL: {resp.url}")
            return True
            
        except Exception as e:
            self.log(f"登入异常: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False
    
    def _get_class_list_from_select(self) -> Dict[str, str]:
        """从指定 XPath 的 select 元素获取班级列表
        
        XPath: /html/body/div[2]/div[2]/div[2]/div[2]/div[2]/form/div[7]/div/div[1]/table/tbody/tr[2]/th[2]/select
        """
        try:
            self.log("从 select 元素获取班级列表...")
            
            student_grid_url = self.STUDENT_GRID_URL_TEMPLATE.format(base=self.base_url)
            self.log(f"  访问页面: {student_grid_url}")
            
            resp = self.session.get(student_grid_url, timeout=15)
            if resp.status_code != 200:
                self.log(f"获取页面失败: {resp.status_code}", "ERROR")
                return {}
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 查找所有 select 元素
            all_selects = soup.find_all('select')
            self.log(f"  找到 {len(all_selects)} 个 select 元素")
            
            classes = {}
            
            # 逐个检查 select 元素，找到班级列表
            # 班级列表 select 通常有多个 option（至少10个以上）
            for idx, select in enumerate(all_selects):
                options = select.find_all('option')
                
                if len(options) > 5:
                    temp_classes = {}
                    for option in options:
                        class_id = option.get('value', '').strip()
                        class_name = option.get_text(strip=True)
                        
                        if class_id and class_name and class_id != '':
                            temp_classes[class_id] = class_name
                    
                    # 如果这个 select 包含有效班级列表
                    if len(temp_classes) > 5:
                        classes = temp_classes
                        self.log(f"  ✓ 在第 {idx+1} 个 select 中找到 {len(classes)} 个班级")
                        break
            
            if not classes:
                self.log("未找到班级列表", "ERROR")
                return {}
            
            self.log(f"✓ 共找到 {len(classes)} 个班级")
            
            # 显示前 5 个班级
            for class_id, class_name in list(classes.items())[:5]:
                self.log(f"    {class_id}: {class_name}")
            if len(classes) > 5:
                self.log(f"    ... 等共 {len(classes)} 个班级")
            
            self.class_mapping = classes
            return classes
            
        except Exception as e:
            self.log(f"获取班级列表异常: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return {}
    
    def _get_students_by_class_ajax(self, class_id: str, class_name: str) -> List[Dict]:
        """使用 ajax=student-grid 获取班级学生数据
        
        Args:
            class_id: 班级 ID
            class_name: 班级名称
            
        Returns:
            学生列表
        """
        try:
            student_grid_url = self.STUDENT_GRID_URL_TEMPLATE.format(base=self.base_url)
            
            # 使用 ajax=student-grid 参数获取 JSON 数据
            params = {
                'class_id': class_id,
                'ajax': 'student-grid'
            }
            
            resp = self.session.get(student_grid_url, params=params, timeout=15)
            
            if resp.status_code != 200:
                self.log(f"获取班级 {class_name} 学生列表失败: {resp.status_code}", "WARN")
                return []
            
            # 尝试解析 JSON
            try:
                data = resp.json()
                self.log(f"  班级 {class_name} ({class_id}): 获取到 JSON 格式数据")
                
                # 假设响应格式中有 'rows' 字段包含学生列表
                if isinstance(data, dict) and 'rows' in data:
                    students = data['rows']
                elif isinstance(data, list):
                    students = data
                else:
                    students = []
                
                # 规范化学生数据
                normalized_students = []
                for student in students:
                    if isinstance(student, dict):
                        normalized_students.append({
                            'internal_id': student.get('id') or student.get('internal_id'),
                            'student_no': student.get('student_no'),
                            'name': student.get('name'),
                            'name_cn': student.get('name_cn'),
                            'class_id': class_id,
                            'class_name': class_name,
                            **student  # 保留其他字段
                        })
                
                self.log(f"  班级 {class_name} ({class_id}): 找到 {len(normalized_students)} 个学生")
                return normalized_students
                
            except json.JSONDecodeError:
                # 如果不是 JSON，尝试解析 HTML
                self.log(f"  响应不是 JSON 格式，尝试解析 HTML...", "WARN")
                soup = BeautifulSoup(resp.text, 'html.parser')
                
                students = []
                for link in soup.select('a[data-student_id]'):
                    student = {
                        'internal_id': link.get('data-student_id'),
                        'student_no': link.get('data-student_no'),
                        'name': link.get('data-student_name'),
                        'name_cn': link.get('data-student_cname'),
                        'class_id': class_id,
                        'class_name': class_name,
                    }
                    if student['internal_id']:
                        students.append(student)
                
                self.log(f"  班级 {class_name} ({class_id}): 从 HTML 找到 {len(students)} 个学生")
                return students
            
        except Exception as e:
            self.log(f"获取班级 {class_name} 学生列表异常: {e}", "WARN")
            return []
    
    def download_all_students(self) -> bool:
        """下载全校所有学生资料"""
        try:
            self.log("=" * 70)
            self.log("开始下载全校学生资料")
            self.log(f"使用网络: {self.NETWORKS[self.current_network]['name']}")
            self.log("=" * 70)
            
            # 第一步：获取班级列表
            classes = self._get_class_list_from_select()
            if not classes:
                self.log("未能获取班级列表", "ERROR")
                return False
            
            # 第二步：对每个班级获取学生资料
            total_students = 0
            failed_classes = []
            
            for idx, (class_id, class_name) in enumerate(classes.items(), 1):
                self.log(f"[{idx}/{len(classes)}] 正在下载班级...")
                
                students = self._get_students_by_class_ajax(class_id, class_name)
                if students:
                    self.all_students[class_id] = students
                    total_students += len(students)
                else:
                    failed_classes.append(class_name)
                
                time.sleep(0.5)
            
            self.log("=" * 70)
            self.log(f"✓ 下载完成！共下载 {total_students} 个学生，{len(self.all_students)} 个班级")
            
            if failed_classes:
                self.log(f"⚠️  {len(failed_classes)} 个班级下载失败")
            
            self.log("=" * 70)
            return True
            
        except Exception as e:
            self.log(f"下载过程异常: {e}", "ERROR")
            return False
    
    def save_to_json(self) -> bool:
        """保存为 JSON 文件"""
        try:
            if not self.all_students:
                self.log("没有学生资料需要保存", "WARN")
                return False
            
            # 完整数据
            data = {
                'download_time': datetime.now().isoformat(),
                'network': self.NETWORKS[self.current_network]['name'],
                'total_students': sum(len(students) for students in self.all_students.values()),
                'total_classes': len(self.all_students),
                'classes': {}
            }
            
            for class_id, students in self.all_students.items():
                class_name = self.class_mapping.get(class_id, class_id)
                data['classes'][class_id] = {
                    'name': class_name,
                    'student_count': len(students),
                    'students': students
                }
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            json_file = self.data_dir / f"students_{timestamp}.json"
            
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.log(f"✓ 完整数据已保存到: {json_file}")
            
            # 简化版本（摘要）
            summary_data = {
                'download_time': data['download_time'],
                'network': data['network'],
                'total_students': data['total_students'],
                'total_classes': data['total_classes'],
                'classes': {}
            }
            
            for class_id, class_info in data['classes'].items():
                summary_data['classes'][class_id] = {
                    'name': class_info['name'],
                    'student_count': class_info['student_count']
                }
            
            summary_file = self.data_dir / f"students_summary_{timestamp}.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, ensure_ascii=False, indent=2)
            
            self.log(f"✓ 摘要版本已保存到: {summary_file}")
            return True
            
        except Exception as e:
            self.log(f"保存 JSON 异常: {e}", "ERROR")
            return False
    
    def save_to_csv(self) -> bool:
        """保存为 CSV 文件"""
        try:
            import csv
            
            if not self.all_students:
                self.log("没有学生资料需要保存", "WARN")
                return False
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            csv_file = self.data_dir / f"students_{timestamp}.csv"
            
            with open(csv_file, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.DictWriter(
                    f,
                    fieldnames=['class_id', 'class_name', 'student_no', 'name', 'name_cn', 'internal_id'],
                    extrasaction='ignore'
                )
                writer.writeheader()
                
                for class_id, students in self.all_students.items():
                    for student in students:
                        row = dict(student)
                        if 'class_name' not in row or not row['class_name']:
                            row['class_name'] = self.class_mapping.get(class_id, class_id)
                        writer.writerow(row)
            
            self.log(f"✓ CSV 文件已保存到: {csv_file}")
            return True
            
        except Exception as e:
            self.log(f"保存 CSV 异常: {e}", "ERROR")
            return False


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SMS 学生资料下载工具")
    parser.add_argument('--username', default='schhs334', help='登入用户名')
    parser.add_argument('--password', default='@Sidan49122', help='登入密码')
    parser.add_argument('--network', choices=['intranet', 'internet', 'auto'], default='auto',
                       help='网络选择')
    
    args = parser.parse_args()
    
    # 创建下载器
    downloader = SMSDownloader(network=args.network)
    
    try:
        # 登入
        if not downloader.login(args.username, args.password):
            downloader.log("登入失败，退出", "ERROR")
            return False
        
        time.sleep(1)
        
        # 下载
        if not downloader.download_all_students():
            downloader.log("下载学生资料失败", "ERROR")
            return False
        
        # 保存
        downloader.save_to_json()
        downloader.save_to_csv()
        
        downloader.log("✓ 所有操作完成！")
        return True
        
    except Exception as e:
        downloader.log(f"异常: {e}", "ERROR")
        return False


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

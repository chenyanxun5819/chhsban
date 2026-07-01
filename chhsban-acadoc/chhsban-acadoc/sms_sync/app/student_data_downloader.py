#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生资料下载工具
从 SMS 系统下载全校学生资料并保存到本地
"""

import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class SMSStudentDownloader:
    """从 SMS 系统下载学生资料"""
    
    # 支持两个接口
    INTRANET_BASE = "http://192.168.0.6/sms/index.php"  # 局域网
    INTERNET_BASE = "http://sms.chhsban.edu.my/sms/index.php"  # 广域网
    
    # 常用页面
    LOGIN_URL_TEMPLATE = "{base}?r=site/login"
    STUDENT_LIST_PAGE_TEMPLATE = "{base}?r=transaction/studentPerformance/create"
    
    def __init__(self, use_intranet: bool = True, data_dir: Optional[str] = None):
        """初始化下载器
        
        Args:
            use_intranet: 是否使用局域网 (True) 或广域网 (False)
            data_dir: 数据保存目录，默认为用户主目录的 .sms_app/student_data
        """
        self.use_intranet = use_intranet
        self.base_url = self.INTRANET_BASE if use_intranet else self.INTERNET_BASE
        
        # 初始化数据目录
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path.home() / ".sms_app" / "student_data"
        
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # 初始化会话
        self.session = None
        self.class_mapping = {}  # class_id → class_name
        self.all_students = {}   # class_id → [student_data, ...]
        
        # 日志
        self.log_file = self.data_dir / f"download_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    
    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        
        # 保存到日志文件
        with open(self.log_file, 'a', encoding='utf-8') as f:
            f.write(log_message + '\n')
    
    def _init_session(self):
        """初始化 HTTP 会话"""
        if not self.session:
            self.session = requests.Session()
            self.session.verify = False
            self.session.timeout = 30
            
            # 设置 User-Agent
            self.session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
        
        return self.session
    
    def login(self, username: str, password: str) -> bool:
        """登入 SMS 系统
        
        Args:
            username: 用户名
            password: 密码
            
        Returns:
            登入是否成功
        """
        try:
            session = self._init_session()
            network_type = "局域网" if self.use_intranet else "广域网"
            self.log(f"正在登入 SMS 系统（{network_type}）...")
            self.log(f"  URL: {self.base_url}")
            self.log(f"  用户名: {username}")
            
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
            
            # 检查是否仍在登入页面
            if 'login' in resp.url.lower():
                self.log("登入失败：仍停留在登入页面", "ERROR")
                return False
            
            self.log("✓ 登入成功！")
            self.log(f"  当前 URL: {resp.url}")
            return True
            
        except Exception as e:
            self.log(f"登入异常: {e}", "ERROR")
            import traceback
            traceback.print_exc()
            return False
    
    def _get_all_classes(self) -> Dict[str, str]:
        """从学生列表页面获取所有班级的映射
        
        Returns:
            班级映射 {class_id: class_name}
        """
        try:
            self.log("获取所有班级信息...")
            
            student_list_url = self.STUDENT_LIST_PAGE_TEMPLATE.format(base=self.base_url)
            resp = self.session.get(student_list_url, timeout=15)
            
            if resp.status_code != 200:
                self.log(f"获取班级列表失败: {resp.status_code}", "ERROR")
                return {}
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 查找班级选择下拉菜单 (通常是 select 标签，name 为 class_id 或类似)
            class_select = soup.select_one('select[name="class_id"]')
            if not class_select:
                self.log("未找到班级选择控件", "WARN")
                return {}
            
            classes = {}
            for option in class_select.find_all('option'):
                class_id = option.get('value')
                class_name = option.get_text(strip=True)
                
                # 跳过空选项
                if class_id and class_name and class_id != '':
                    classes[class_id] = class_name
            
            self.log(f"✓ 找到 {len(classes)} 个班级")
            for class_id, class_name in list(classes.items())[:5]:  # 显示前5个
                self.log(f"    {class_id}: {class_name}")
            if len(classes) > 5:
                self.log(f"    ... 等共 {len(classes)} 个班级")
            
            self.class_mapping = classes
            return classes
            
        except Exception as e:
            self.log(f"获取班级列表异常: {e}", "ERROR")
            return {}
    
    def _get_students_by_class(self, class_id: str, class_name: str) -> List[Dict]:
        """获取指定班级的所有学生
        
        Args:
            class_id: 班级 ID
            class_name: 班级名称
            
        Returns:
            学生列表
        """
        try:
            student_list_url = self.STUDENT_LIST_PAGE_TEMPLATE.format(base=self.base_url)
            
            # 使用 GET 参数选择班级
            params = {'class_id': class_id}
            resp = self.session.get(student_list_url, params=params, timeout=15)
            
            if resp.status_code != 200:
                self.log(f"获取班级 {class_name} 学生列表失败: {resp.status_code}", "ERROR")
                return []
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            
            # 查找学生信息（通常在表格行或带 data-* 属性的链接中）
            students = []
            
            # 方法1：查找带 data-student_id 的链接
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
            
            # 方法2：如果没有找到，尝试查找表格行
            if not students:
                for tr in soup.select('table tbody tr'):
                    cells = tr.find_all('td')
                    if len(cells) >= 3:
                        student = {
                            'student_no': cells[0].get_text(strip=True),
                            'name': cells[1].get_text(strip=True),
                            'name_cn': cells[2].get_text(strip=True) if len(cells) > 2 else '',
                            'class_id': class_id,
                            'class_name': class_name,
                        }
                        if student['student_no']:
                            students.append(student)
            
            self.log(f"  班级 {class_name} ({class_id}): 找到 {len(students)} 个学生")
            return students
            
        except Exception as e:
            self.log(f"获取班级 {class_name} 学生列表异常: {e}", "ERROR")
            return []
    
    def download_all_students(self) -> bool:
        """下载全校所有学生资料
        
        Returns:
            下载是否成功
        """
        try:
            self.log("=" * 60)
            self.log("开始下载全校学生资料")
            self.log("=" * 60)
            
            # 获取所有班级
            classes = self._get_all_classes()
            if not classes:
                self.log("未能获取班级列表", "ERROR")
                return False
            
            # 逐个班级下载学生
            total_students = 0
            for class_id, class_name in classes.items():
                students = self._get_students_by_class(class_id, class_name)
                if students:
                    self.all_students[class_id] = students
                    total_students += len(students)
                
                # 避免请求过快
                time.sleep(0.5)
            
            self.log("=" * 60)
            self.log(f"✓ 下载完成！共下载 {total_students} 个学生，{len(self.all_students)} 个班级")
            self.log("=" * 60)
            
            return True
            
        except Exception as e:
            self.log(f"下载过程异常: {e}", "ERROR")
            return False
    
    def save_to_json(self) -> bool:
        """将下载的学生资料保存为 JSON 文件
        
        Returns:
            保存是否成功
        """
        try:
            if not self.all_students:
                self.log("没有学生资料需要保存", "WARN")
                return False
            
            # 构建数据结构
            data = {
                'download_time': datetime.now().isoformat(),
                'network': '局域网' if self.use_intranet else '广域网',
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
            
            # 保存为 JSON
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            json_file = self.data_dir / f"students_{timestamp}.json"
            
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            self.log(f"✓ 数据已保存到: {json_file}")
            
            # 同时保存简化版本（便于查看）
            summary_file = self.data_dir / f"students_summary_{timestamp}.json"
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
            
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary_data, f, ensure_ascii=False, indent=2)
            
            self.log(f"✓ 简化版本已保存到: {summary_file}")
            return True
            
        except Exception as e:
            self.log(f"保存数据异常: {e}", "ERROR")
            return False
    
    def save_to_csv(self) -> bool:
        """将学生资料保存为 CSV 文件（便于查看和处理）
        
        Returns:
            保存是否成功
        """
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
                        if 'class_name' not in row:
                            row['class_name'] = self.class_mapping.get(class_id, class_id)
                        writer.writerow(row)
            
            self.log(f"✓ CSV 文件已保存到: {csv_file}")
            return True
            
        except Exception as e:
            self.log(f"保存 CSV 异常: {e}", "ERROR")
            return False


def main():
    """主函数 - 测试下载功能"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SMS 学生资料下载工具")
    parser.add_argument('--username', default='schhs334', help='登入用户名')
    parser.add_argument('--password', default='@Sidan49122', help='登入密码')
    parser.add_argument('--network', choices=['intranet', 'internet'], default='intranet',
                       help='选择网络接口：intranet (局域网) 或 internet (广域网)')
    parser.add_argument('--output-dir', help='输出目录')
    
    args = parser.parse_args()
    
    # 创建下载器
    downloader = SMSStudentDownloader(
        use_intranet=(args.network == 'intranet'),
        data_dir=args.output_dir
    )
    
    # 登入
    if not downloader.login(args.username, args.password):
        downloader.log("登入失败，退出", "ERROR")
        return False
    
    # 等待一下
    time.sleep(1)
    
    # 下载学生资料
    if not downloader.download_all_students():
        downloader.log("下载学生资料失败", "ERROR")
        return False
    
    # 保存数据
    downloader.save_to_json()
    downloader.save_to_csv()
    
    downloader.log("所有操作完成！")
    return True


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生资料下载工具 - 增强版
支持局域网/广域网自动切换、重试机制、增量更新
"""

import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum

# 禁用 SSL 警告
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)


class NetworkType(Enum):
    """网络类型"""
    INTRANET = "intranet"      # 局域网
    INTERNET = "internet"      # 广域网
    AUTO = "auto"              # 自动选择


class SMSStudentDownloaderEnhanced:
    """增强版 SMS 学生资料下载器"""
    
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
    
    def __init__(self, network: str = 'auto', data_dir: Optional[str] = None, retry_count: int = 3):
        """初始化下载器
        
        Args:
            network: 网络类型 ('intranet', 'internet', 'auto')
            data_dir: 数据保存目录
            retry_count: 失败重试次数
        """
        self.network_preference = network
        self.current_network = None
        self.data_dir = Path(data_dir) if data_dir else Path.home() / ".sms_app" / "student_data"
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        self.retry_count = retry_count
        self.session = None
        self.class_mapping = {}
        self.all_students = {}
        
        # 日志
        self.log_file = self.data_dir / f"download_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        self.log_entries = []
    
    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] [{level}] {message}"
        print(log_message)
        self.log_entries.append(log_message)
        
        # 实时写入文件
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
        """自动选择可用的网络
        
        Returns:
            是否成功选择网络
        """
        if self.network_preference == 'auto':
            # 尝试按优先级连接
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
                login_url = self.NETWORKS[network]['base_url'] + '?r=site/login'
                
                # 测试连接
                resp = session.get(login_url, timeout=10)
                if resp.status_code == 200:
                    self.current_network = network
                    self.log(f"✓ 成功连接到 {self.NETWORKS[network]['name']}")
                    return True
            except Exception as e:
                self.log(f"  连接失败: {type(e).__name__}", "WARN")
                continue
        
        self.log("无法连接到任何网络", "ERROR")
        return False
    
    def _get_base_url(self) -> str:
        """获取当前使用的基础 URL"""
        if not self.current_network:
            raise RuntimeError("网络未初始化")
        return self.NETWORKS[self.current_network]['base_url']
    
    def login(self, username: str, password: str, max_retries: int = None) -> bool:
        """登入 SMS 系统
        
        Args:
            username: 用户名
            password: 密码
            max_retries: 最大重试次数
            
        Returns:
            登入是否成功
        """
        if max_retries is None:
            max_retries = self.retry_count
        
        # 选择网络
        if not self._select_network():
            return False
        
        # 尝试登入
        for attempt in range(1, max_retries + 1):
            try:
                session = self._init_session()
                base_url = self._get_base_url()
                login_url = base_url + '?r=site/login'
                
                self.log(f"登入尝试 {attempt}/{max_retries}...")
                self.log(f"  URL: {base_url}")
                self.log(f"  用户名: {username}")
                
                # GET 登入页面
                self.log("  1️⃣  获取登入页面...")
                resp = session.get(login_url, timeout=15)
                if resp.status_code != 200:
                    self.log(f"获取登入页面失败: {resp.status_code}", "WARN")
                    continue
                self.log("  ✓ 页面已获取")
                
                # POST 登入凭证
                self.log("  2️⃣  提交登入凭证...")
                login_data = {
                    'LoginForm[username]': username,
                    'LoginForm[password]': password,
                    'login-button': 'login'
                }
                resp = session.post(login_url, data=login_data, timeout=15, allow_redirects=True)
                
                # 检查登入结果
                if 'login' in resp.url.lower():
                    self.log(f"登入失败：错误的用户名或密码", "WARN")
                    time.sleep(1)  # 等待后重试
                    continue
                
                self.log("✓ 登入成功！")
                self.log(f"  当前 URL: {resp.url}")
                return True
                
            except requests.exceptions.Timeout:
                self.log(f"连接超时 (尝试 {attempt}/{max_retries})", "WARN")
                time.sleep(2)
                continue
            except Exception as e:
                self.log(f"登入异常: {e} (尝试 {attempt}/{max_retries})", "WARN")
                time.sleep(2)
                continue
        
        self.log("登入失败：已达到最大重试次数", "ERROR")
        return False
    
    def _get_all_classes(self) -> Dict[str, str]:
        """获取所有班级"""
        try:
            self.log("获取所有班级信息...")
            
            base_url = self._get_base_url()
            student_list_url = base_url + '?r=transaction/studentPerformance/create'
            
            resp = self.session.get(student_list_url, timeout=15)
            if resp.status_code != 200:
                self.log(f"获取班级列表失败: {resp.status_code}", "ERROR")
                return {}
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            class_select = soup.select_one('select[name="class_id"]')
            
            if not class_select:
                self.log("未找到班级选择控件", "ERROR")
                return {}
            
            classes = {}
            for option in class_select.find_all('option'):
                class_id = option.get('value')
                class_name = option.get_text(strip=True)
                
                if class_id and class_name and class_id != '':
                    classes[class_id] = class_name
            
            self.log(f"✓ 找到 {len(classes)} 个班级")
            self.class_mapping = classes
            return classes
            
        except Exception as e:
            self.log(f"获取班级列表异常: {e}", "ERROR")
            return {}
    
    def _get_students_by_class(self, class_id: str, class_name: str) -> List[Dict]:
        """获取指定班级的学生"""
        try:
            base_url = self._get_base_url()
            student_list_url = base_url + '?r=transaction/studentPerformance/create'
            
            params = {'class_id': class_id}
            resp = self.session.get(student_list_url, params=params, timeout=15)
            
            if resp.status_code != 200:
                self.log(f"获取班级 {class_name} 学生列表失败: {resp.status_code}", "WARN")
                return []
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            students = []
            
            # 尝试多种方式提取学生数据
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
            self.log(f"获取班级 {class_name} 学生列表异常: {e}", "WARN")
            return []
    
    def download_all_students(self, show_progress: bool = True) -> bool:
        """下载全校所有学生资料
        
        Args:
            show_progress: 是否显示进度
            
        Returns:
            下载是否成功
        """
        try:
            self.log("=" * 70)
            self.log("开始下载全校学生资料")
            self.log(f"使用网络: {self.NETWORKS[self.current_network]['name']}")
            self.log("=" * 70)
            
            # 获取所有班级
            classes = self._get_all_classes()
            if not classes:
                self.log("未能获取班级列表", "ERROR")
                return False
            
            # 逐个班级下载学生
            total_students = 0
            failed_classes = []
            
            for idx, (class_id, class_name) in enumerate(classes.items(), 1):
                if show_progress:
                    self.log(f"[{idx}/{len(classes)}] 正在下载班级...")
                
                students = self._get_students_by_class(class_id, class_name)
                if students:
                    self.all_students[class_id] = students
                    total_students += len(students)
                else:
                    failed_classes.append(class_name)
                
                time.sleep(0.3)  # 避免请求过快
            
            self.log("=" * 70)
            self.log(f"✓ 下载完成！共下载 {total_students} 个学生，{len(self.all_students)} 个班级")
            
            if failed_classes:
                self.log(f"⚠️  {len(failed_classes)} 个班级下载失败：{', '.join(failed_classes[:5])}")
            
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
            
            # 简化版本
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
            
            self.log(f"✓ 简化版本已保存到: {summary_file}")
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
                        if 'class_name' not in row:
                            row['class_name'] = self.class_mapping.get(class_id, class_id)
                        writer.writerow(row)
            
            self.log(f"✓ CSV 文件已保存到: {csv_file}")
            return True
            
        except Exception as e:
            self.log(f"保存 CSV 异常: {e}", "ERROR")
            return False
    
    def get_summary(self) -> str:
        """获取下载摘要"""
        total_students = sum(len(students) for students in self.all_students.values())
        return f"已下载 {total_students} 个学生，{len(self.all_students)} 个班级"


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SMS 学生资料下载工具（增强版）")
    parser.add_argument('--username', default='schhs334', help='登入用户名')
    parser.add_argument('--password', default='@Sidan49122', help='登入密码')
    parser.add_argument('--network', choices=['intranet', 'internet', 'auto'], default='auto',
                       help='网络选择：intranet (局域网), internet (广域网), auto (自动)')
    parser.add_argument('--output-dir', help='输出目录')
    parser.add_argument('--no-csv', action='store_true', help='不生成 CSV 文件')
    
    args = parser.parse_args()
    
    # 创建下载器
    downloader = SMSStudentDownloaderEnhanced(
        network=args.network,
        data_dir=args.output_dir
    )
    
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
    if not args.no_csv:
        downloader.save_to_csv()
    
    downloader.log("✓ 所有操作完成！")
    return True


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

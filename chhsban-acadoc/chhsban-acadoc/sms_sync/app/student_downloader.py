#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SMS 学生资料下载工具 - 改进版
使用 Selenium 从正确的位置获取有效班级
"""

import time
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import json
from enum import Enum

try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import Select
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
except ImportError as e:
    print(f"⚠️  请先安装依赖: pip install selenium webdriver-manager")
    print(f"错误: {e}")
    exit(1)


class NetworkType(Enum):
    """网络类型"""
    INTRANET = "intranet"
    INTERNET = "internet"
    AUTO = "auto"


class SMSStudentDownloader:
    """使用 Selenium 的 SMS 学生资料下载器"""
    
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
    
    # 重要的 XPath - 获取有效班级的 select 元素
    VALID_CLASS_SELECT_XPATH = '/html/body/div[2]/div[2]/div[2]/div[2]/div[2]/form/div[7]/div/div[1]/table/tbody/tr[2]/th[2]/select'
    
    def __init__(self, network: str = 'auto', data_dir: Optional[str] = None, headless: bool = True):
        """初始化下载器
        
        Args:
            network: 网络类型 ('intranet', 'internet', 'auto')
            data_dir: 数据保存目录
            headless: 是否使用无头浏览器模式
        """
        self.network_preference = network
        self.current_network = None
        self.headless = headless
        
        # 数据目录
        if data_dir:
            self.data_dir = Path(data_dir)
        else:
            self.data_dir = Path("C:/chhsban-acadoc/download_student")
        
        self.data_dir.mkdir(parents=True, exist_ok=True)
        
        # Selenium 浏览器驱动
        self.driver = None
        self.wait = None
        
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
    
    def _init_driver(self):
        """初始化 Selenium 浏览器驱动"""
        try:
            options = webdriver.ChromeOptions()
            if self.headless:
                options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-ssl-certificate-error')
            options.add_argument('--disable-ssl-protocol-error')
            options.add_argument('--disable-blink-features=AutomationControlled')
            
            # 使用 webdriver-manager 自动管理 ChromeDriver
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            self.wait = WebDriverWait(self.driver, 15)
            return True
        except Exception as e:
            self.log(f"初始化浏览器驱动失败: {e}", "ERROR")
            return False
    
    def _close_driver(self):
        """关闭浏览器驱动"""
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
    
    def _select_network(self) -> bool:
        """选择网络"""
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
                self.driver.get(self.NETWORKS[network]['base_url'] + '?r=site/login')
                time.sleep(1)
                
                # 检查页面是否加载成功
                if 'login' in self.driver.current_url.lower():
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
    
    def login(self, username: str, password: str) -> bool:
        """使用 Selenium 登入"""
        try:
            # 初始化驱动
            if not self._init_driver():
                return False
            
            # 选择网络
            if not self._select_network():
                return False
            
            # 登入
            self.log("正在登入...")
            base_url = self._get_base_url()
            login_url = base_url + '?r=site/login'
            
            self.log(f"  1️⃣  访问登入页面...")
            self.driver.get(login_url)
            time.sleep(1)
            
            # 填充登入表单
            self.log(f"  2️⃣  填充登入凭证...")
            username_field = self.wait.until(EC.presence_of_element_located((By.NAME, 'LoginForm[username]')))
            password_field = self.driver.find_element(By.NAME, 'LoginForm[password]')
            login_button = self.driver.find_element(By.NAME, 'login-button')
            
            username_field.clear()
            username_field.send_keys(username)
            password_field.clear()
            password_field.send_keys(password)
            
            self.log(f"  3️⃣  提交登入...")
            login_button.click()
            
            # 等待登入完成
            time.sleep(2)
            
            # 检查登入是否成功
            if 'login' in self.driver.current_url.lower():
                self.log("登入失败：错误的用户名或密码", "ERROR")
                return False
            
            self.log("✓ 登入成功！")
            self.log(f"  当前 URL: {self.driver.current_url}")
            return True
            
        except Exception as e:
            self.log(f"登入异常: {e}", "ERROR")
            return False
    
    def _get_valid_classes(self) -> Dict[str, str]:
        """从指定的 XPath 获取有效班级
        
        使用正确的 XPath 位置获取当前有效的班级
        """
        try:
            self.log("获取有效班级信息...")
            
            # 访问学生列表页面
            base_url = self._get_base_url()
            student_list_url = base_url + '?r=transaction/studentPerformance/create'
            
            self.log(f"  访问页面: {student_list_url}")
            self.driver.get(student_list_url)
            time.sleep(2)  # 等待页面加载
            
            # 使用指定的 XPath 获取班级 select 元素
            self.log(f"  使用 XPath 查找班级选择器...")
            try:
                class_select_element = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, self.VALID_CLASS_SELECT_XPATH))
                )
                self.log(f"  ✓ 找到班级选择器")
            except TimeoutException:
                self.log(f"  使用默认 XPath 失败，尝试备用选择器...", "WARN")
                # 备用选择器
                class_select_element = self.wait.until(
                    EC.presence_of_element_located((By.NAME, 'class_id'))
                )
            
            # 获取所有班级选项
            select = Select(class_select_element)
            classes = {}
            
            for option in select.options:
                class_id = option.get_attribute('value')
                class_name = option.text.strip()
                
                # 跳过空选项
                if class_id and class_name and class_id != '':
                    classes[class_id] = class_name
            
            self.log(f"✓ 找到 {len(classes)} 个有效班级")
            
            # 显示前几个班级
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
    
    def _get_students_by_class(self, class_id: str, class_name: str) -> List[Dict]:
        """获取指定班级的学生"""
        try:
            # 选择班级
            base_url = self._get_base_url()
            student_list_url = base_url + '?r=transaction/studentPerformance/create'
            
            self.driver.get(student_list_url + f'&class_id={class_id}')
            time.sleep(1)
            
            # 尝试从页面中提取学生数据
            students = []
            
            # 方法1：查找带 data-student_id 的链接
            try:
                student_links = self.driver.find_elements(By.XPATH, '//a[@data-student_id]')
                for link in student_links:
                    student = {
                        'internal_id': link.get_attribute('data-student_id'),
                        'student_no': link.get_attribute('data-student_no'),
                        'name': link.get_attribute('data-student_name'),
                        'name_cn': link.get_attribute('data-student_cname'),
                        'class_id': class_id,
                        'class_name': class_name,
                    }
                    if student['internal_id']:
                        students.append(student)
            except:
                pass
            
            # 方法2：从表格行提取
            if not students:
                try:
                    rows = self.driver.find_elements(By.XPATH, '//table//tbody/tr')
                    for row in rows:
                        cells = row.find_elements(By.TAG_NAME, 'td')
                        if len(cells) >= 3:
                            student = {
                                'student_no': cells[0].text.strip(),
                                'name': cells[1].text.strip(),
                                'name_cn': cells[2].text.strip() if len(cells) > 2 else '',
                                'class_id': class_id,
                                'class_name': class_name,
                            }
                            if student['student_no']:
                                students.append(student)
                except:
                    pass
            
            self.log(f"  班级 {class_name} ({class_id}): 找到 {len(students)} 个学生")
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
            
            # 获取有效班级
            classes = self._get_valid_classes()
            if not classes:
                self.log("未能获取班级列表", "ERROR")
                return False
            
            # 逐个班级下载学生
            total_students = 0
            failed_classes = []
            
            for idx, (class_id, class_name) in enumerate(classes.items(), 1):
                self.log(f"[{idx}/{len(classes)}] 正在下载班级...")
                
                students = self._get_students_by_class(class_id, class_name)
                if students:
                    self.all_students[class_id] = students
                    total_students += len(students)
                else:
                    failed_classes.append(class_name)
                
                time.sleep(0.5)
            
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
    
    def cleanup(self):
        """清理资源"""
        self._close_driver()


def main():
    """主函数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="SMS 学生资料下载工具（Selenium 版本）")
    parser.add_argument('--username', default='schhs334', help='登入用户名')
    parser.add_argument('--password', default='@Sidan49122', help='登入密码')
    parser.add_argument('--network', choices=['intranet', 'internet', 'auto'], default='auto',
                       help='网络选择')
    parser.add_argument('--output-dir', default='C:\\chhsban-acadoc\\download_student',
                       help='输出目录')
    parser.add_argument('--no-headless', action='store_true', help='显示浏览器窗口')
    
    args = parser.parse_args()
    
    # 创建下载器
    downloader = SMSStudentDownloader(
        network=args.network,
        data_dir=args.output_dir,
        headless=not args.no_headless
    )
    
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
        
    finally:
        downloader.cleanup()


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

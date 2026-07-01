#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试改进版本的下载器（Selenium）
从正确的 XPath 获取有效班级
"""

import sys
from pathlib import Path
import time

sys.path.insert(0, str(Path(__file__).parent))

from student_downloader import SMSStudentDownloader


def test_valid_classes():
    """测试获取有效班级"""
    print("\n" + "=" * 70)
    print("测试 SMS 学生资料下载（Selenium 版本）")
    print("使用正确的 XPath 获取有效班级")
    print("=" * 70 + "\n")
    
    downloader = SMSStudentDownloader(
        network='auto',
        data_dir='C:\\chhsban-acadoc\\download_student',
        headless=True
    )
    
    try:
        # 登入
        print("[1/4] 正在登入...")
        if not downloader.login('schhs334', '@Sidan49122'):
            print("❌ 登入失败")
            return False
        
        time.sleep(1)
        
        # 下载
        print("\n[2/4] 正在下载学生资料...")
        if not downloader.download_all_students():
            print("❌ 下载失败")
            return False
        
        # 保存 JSON
        print("\n[3/4] 保存为 JSON...")
        downloader.save_to_json()
        
        # 保存 CSV
        print("\n[4/4] 保存为 CSV...")
        downloader.save_to_csv()
        
        print("\n✓ 测试完成！")
        print(f"✓ 数据保存在: {downloader.data_dir}")
        return True
        
    finally:
        downloader.cleanup()


if __name__ == '__main__':
    success = test_valid_classes()
    sys.exit(0 if success else 1)

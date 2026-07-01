#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试改进的下载器
使用 requests + BeautifulSoup，不需要浏览器驱动
"""

import sys
from pathlib import Path
import time

sys.path.insert(0, str(Path(__file__).parent))

from sms_downloader import SMSStudentDownloader


def test_download():
    """测试下载"""
    print("\n" + "=" * 70)
    print("测试 SMS 学生资料下载（改进版）")
    print("从正确位置获取有效班级 - 后台运行模式")
    print("=" * 70 + "\n")
    
    downloader = SMSStudentDownloader(
        network='auto',
        data_dir='C:\\chhsban-acadoc\\download_student'
    )
    
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


if __name__ == '__main__':
    success = test_download()
    sys.exit(0 if success else 1)

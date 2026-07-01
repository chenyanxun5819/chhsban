#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 SMS 学生资料下载工具
"""

import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from student_data_downloader import SMSStudentDownloader
import time


def test_intranet_download():
    """测试局域网下载"""
    print("\n" + "=" * 60)
    print("测试 SMS 学生资料下载（局域网）")
    print("=" * 60 + "\n")
    
    downloader = SMSStudentDownloader(use_intranet=True)
    
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
    return True


if __name__ == '__main__':
    success = test_intranet_download()
    sys.exit(0 if success else 1)

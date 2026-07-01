#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试增强版下载工具 - 验证网络自动选择和故障转移
"""

import sys
from pathlib import Path
import time

sys.path.insert(0, str(Path(__file__).parent))

from student_data_downloader_v2 import SMSStudentDownloaderEnhanced


def test_network_auto_failover():
    """测试网络自动转移"""
    print("\n" + "=" * 70)
    print("测试 SMS 学生资料下载（网络自动选择）")
    print("=" * 70 + "\n")
    
    # 测试 1：自动选择网络
    print("【测试 1】自动网络选择...")
    downloader = SMSStudentDownloaderEnhanced(network='auto')
    
    if not downloader.login('schhs334', '@Sidan49122'):
        print("❌ 登入失败")
        return False
    
    print(f"✓ 成功连接到: {downloader.NETWORKS[downloader.current_network]['name']}\n")
    
    time.sleep(1)
    
    # 测试 2：下载数据
    print("【测试 2】下载学生资料...")
    if not downloader.download_all_students(show_progress=False):
        print("❌ 下载失败")
        return False
    
    # 测试 3：保存数据
    print("\n【测试 3】保存数据...")
    downloader.save_to_json()
    downloader.save_to_csv()
    
    # 打印摘要
    print("\n【测试 4】数据摘要...")
    print(f"✓ {downloader.get_summary()}")
    print(f"✓ 使用网络: {downloader.NETWORKS[downloader.current_network]['name']}")
    print(f"✓ 数据保存在: {downloader.data_dir}")
    
    print("\n" + "=" * 70)
    print("✓ 所有测试完成！")
    print("=" * 70)
    
    return True


if __name__ == '__main__':
    success = test_network_auto_failover()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试 SMS 学生资料下载器
"""

import sys
from pathlib import Path
import time

sys.path.insert(0, str(Path(__file__).parent))

from downloader import SMSDownloader


def main():
    """主函数"""
    print("\n" + "=" * 70)
    print("SMS 学生资料下载工具 - 测试")
    print("=" * 70 + "\n")
    
    downloader = SMSDownloader(network='auto')
    
    try:
        # 登入
        print("[1/4] 正在登入 SMS 系统...")
        if not downloader.login('schhs334', '@Sidan49122'):
            print("❌ 登入失败")
            return False
        
        time.sleep(1)
        
        # 下载
        print("\n[2/4] 正在下载全校学生资料...")
        if not downloader.download_all_students():
            print("❌ 下载失败")
            return False
        
        # 保存 JSON
        print("\n[3/4] 保存为 JSON 格式...")
        downloader.save_to_json()
        
        # 保存 CSV
        print("\n[4/4] 保存为 CSV 格式...")
        downloader.save_to_csv()
        
        print("\n" + "=" * 70)
        print("✓ 测试完成！")
        print(f"✓ 数据已保存到: {downloader.data_dir}")
        print("=" * 70)
        return True
        
    except Exception as e:
        print(f"❌ 异常: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)

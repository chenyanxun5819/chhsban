#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新配置中的密码
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from core.config_manager import ConfigManager


def update_password(username, new_password):
    """更新配置中的密码"""
    
    print(f"更新凭证...")
    print(f"  用户名: {username}")
    print(f"  新密码: {new_password}")
    
    try:
        config_manager = ConfigManager()
        
        # 保存新凭证
        config_manager.save_credentials(username, new_password)
        
        print("✅ 凭证已保存")
        
        # 验证保存的凭证
        saved_user, saved_pass = config_manager.get_credentials()
        print(f"\n验证保存的凭证:")
        print(f"  用户名: {saved_user}")
        print(f"  密码: {saved_pass}")
        
        if saved_user == username and saved_pass == new_password:
            print("\n✅ 凭证验证成功")
        else:
            print("\n❌ 凭证验证失败")
    
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    update_password("schhs334", "@Sidan49122")

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
凭证管理测试 - 验证加密存储和读取功能
"""

from core.config_manager import ConfigManager


def test_config_manager():
    """测试凭证管理器 - 读取设定页面中保存的凭证"""
    print("=" * 60)
    print("🔐 测试凭证加密存储...")
    print("=" * 60)
    
    # 创建管理器
    config = ConfigManager()
    print(f"✓ 配置目录: {config.config_dir}")
    print(f"✓ 配置文件: {config.CONFIG_FILE}")
    
    # 读取设定页面中保存的凭证
    print("\n[1] 读取设定页面中保存的凭证...")
    try:
        username, password = config.get_credentials()
        if not username or not password:
            print("✗ 未找到保存的凭证")
            print("   请先在设定页面输入并保存 SMS 帐号和密码")
            return False
        print(f"✓ 找到已保存的凭证")
        print(f"✓ 用户名: {username}")
        print(f"✓ 密码: {'*' * len(password)}")
    except Exception as e:
        print(f"✗ 读取失败: {e}")
        return False
    
    # 测试凭证是否可以正确解密
    print("\n[2] 验证凭证解密...")
    try:
        username2, password2 = config.get_credentials()
        if username2 == username and password2 == password:
            print(f"✓ 凭证解密验证通过")
        else:
            print("✗ 凭证解密不匹配")
            return False
    except Exception as e:
        print(f"✗ 验证失败: {e}")
        return False
    
    # 测试清除凭证
    print("\n[3] 清除凭证...")
    try:
        config.clear_credentials()
        username, password = config.get_credentials()
        if username is None and password is None:
            print("✓ 凭证已清除")
        else:
            print("✗ 清除失败")
            return False
    except Exception as e:
        print(f"✗ 清除失败: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ 所有凭证管理测试通过！")
    print("=" * 60)
    return True


if __name__ == "__main__":
    import sys
    result = test_config_manager()
    sys.exit(0 if result else 1)

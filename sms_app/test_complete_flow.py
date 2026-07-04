#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整流程测试 - 验证项目数据缓存同步
"""

from core.config_manager import ConfigManager
from core.startup_checker import StartupChecker
from pathlib import Path
import json

def main():
    print("\n" + "="*70)
    print("🧪 完整流程测试：项目数据缓存同步")
    print("="*70)
    
    # 获取凭证
    config = ConfigManager()
    username, password = config.get_credentials()
    
    if not username or not password:
        print("❌ 未保存凭证")
        return
    
    print(f"\n📋 凭证信息：")
    print(f"  用户名: {username}")
    print(f"  密码: {'*' * len(password)}")
    
    # 初始化检查器
    checker = StartupChecker()
    
    # 测试 1: 检查缓存
    print(f"\n📍 Test 1: 检查当前缓存")
    cache_dir = Path.home() / ".sms_app"
    projects_file = cache_dir / "projects.json"
    metadata_file = cache_dir / "metadata.json"
    
    if projects_file.exists():
        with open(projects_file, encoding='utf-8') as f:
            projects = json.load(f)
        print(f"  ✅ 缓存项目数: {len(projects)}")
        
        # 查找 CCDCMO1188
        found = [p for p in projects if p.get('项目代码') == 'CCDCMO1188']
        if found:
            print(f"  ✅ 包含 CCDCMO1188")
        else:
            print(f"  ⚠️  缺少 CCDCMO1188")
    else:
        print(f"  ⚠️  缓存不存在")
    
    # 测试 2: Playwright 提取
    print(f"\n📍 Test 2: Playwright 提取")
    projects = checker.extract_projects_with_playwright(username, password)
    print(f"  提取项目数: {len(projects)}")
    
    if projects:
        # 查找 CCDCMO1188
        found = [p for p in projects if p.get('项目代码') == 'CCDCMO1188']
        if found:
            print(f"  ✅ 包含 CCDCMO1188: {found[0].get('项目名称')}")
        else:
            print(f"  ⚠️  缺少 CCDCMO1188")
    
    # 测试 3: 完整的 check_and_update
    print(f"\n📍 Test 3: 完整的启动检查 (check_and_update)")
    
    def log_cb(msg):
        print(f"    {msg}")
    
    result = checker.check_and_update(log_callback=log_cb)
    
    print(f"\n📊 检查结果:")
    for k, v in result.items():
        print(f"  {k}: {v}")
    
    # 最终验证
    print(f"\n📍 最终验证：验证缓存中的数据")
    if projects_file.exists():
        with open(projects_file, encoding='utf-8') as f:
            final_projects = json.load(f)
        
        print(f"  最终项目数: {len(final_projects)}")
        
        found = [p for p in final_projects if p.get('项目代码') == 'CCDCMO1188']
        if found:
            p = found[0]
            print(f"  ✅ CCDCMO1188 信息:")
            for k, v in p.items():
                print(f"     {k}: {v}")
        else:
            print(f"  ❌ 缓存中未找到 CCDCMO1188")
    
    print("\n" + "="*70)
    print("✅ 测试完成")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
from pathlib import Path

cache_file = Path.home() / ".sms_app" / "projects.json"
metadata_file = Path.home() / ".sms_app" / "metadata.json"

# 读取缓存
projects = json.load(open(cache_file, encoding='utf-8'))
metadata = json.load(open(metadata_file, encoding='utf-8'))

print(f"✅ 缓存项目数: {len(projects)}")
print(f"\n📋 元数据:")
for k, v in metadata.items():
    print(f"  {k}: {v}")

# 查找 CCDCMO1188
found = [x for x in projects if 'CCDCMO1188' in x['项目代码']]
if found:
    print(f"\n✅ CCDCMO1188:")
    for k, v in found[0].items():
        print(f"  {k}: {v}")
else:
    print("\n❌ 未找到 CCDCMO1188")

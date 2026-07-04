#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

data = json.load(open('all_extracted_projects.json', encoding='utf-8'))
print(f'总项目数: {len(data)}')

found = [p for p in data if 'CCDCMO1188' in p['项目代码']]
if found:
    print(f'\nCCDCMO1188 数据:')
    for p in found:
        for k, v in p.items():
            print(f"  {k}: {v}")
else:
    print("未找到 CCDCMO1188")

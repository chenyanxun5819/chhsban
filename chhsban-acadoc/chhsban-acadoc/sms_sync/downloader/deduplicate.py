#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
去重脚本：按 student_id 去重，保留一条记录
"""

import json
import csv
from pathlib import Path
from collections import OrderedDict

def deduplicate_students():
    # 找最新的 JSON 文件
    data_dir = Path("C:/chhsban-acadoc/download_student")
    json_files = sorted(data_dir.glob("students_*.json"), reverse=True)
    
    if not json_files:
        print("ERROR: 找不到 JSON 文件")
        return
    
    json_file = json_files[0]
    print(f"读取文件: {json_file}")
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    print(f"原始学生总数: {len(data['students'])}")
    
    # 按 student_id 去重
    seen_ids = set()
    unique_students = []
    duplicates_count = 0
    
    for student in data['students']:
        sid = student.get('student_id')
        if sid not in seen_ids:
            seen_ids.add(sid)
            unique_students.append(student)
        else:
            duplicates_count += 1
    
    print(f"去重后学生总数: {len(unique_students)}")
    print(f"删除的重复记录: {duplicates_count}")
    print(f"去重率: {duplicates_count / len(data['students']) * 100:.1f}%")
    
    # 重新按班级分组
    classes_dict = {}
    for student in unique_students:
        class_name = student.get('class_name', 'Unknown')
        if class_name not in classes_dict:
            classes_dict[class_name] = []
        classes_dict[class_name].append(student)
    
    print(f"\n班级统计 (前10个):")
    for class_name in sorted(classes_dict.keys())[:10]:
        print(f"  {class_name}: {len(classes_dict[class_name])} 名学生")
    
    # 保存去重后的 JSON
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    json_output = data_dir / f"students_dedup_{timestamp}.json"
    with open(json_output, 'w', encoding='utf-8') as f:
        json.dump({
            'download_time': data['download_time'],
            'total_students': len(unique_students),
            'classes': classes_dict,
            'students': unique_students
        }, f, ensure_ascii=False, indent=2)
    print(f"\n✓ 保存去重 JSON: {json_output}")
    
    # 保存去重后的 CSV
    csv_output = data_dir / f"students_dedup_{timestamp}.csv"
    with open(csv_output, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['class_name', 'student_no', 'name_en', 'name_cn', 'student_id', 'activity_id'])
        writer.writeheader()
        writer.writerows(unique_students)
    print(f"✓ 保存去重 CSV: {csv_output}")
    
    # 删除原始文件（可选）
    print(f"\n原始文件保留: {json_file}")


if __name__ == "__main__":
    deduplicate_students()

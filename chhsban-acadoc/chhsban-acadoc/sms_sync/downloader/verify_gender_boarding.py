#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json

# 读取最新的 JSON 文件
with open('students_final_20260629_152208.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    
print(f"总学生数: {data['total_students']}")
print(f"总班级数: {data['total_classes']}")
print(f"\n前5个学生数据（包括 gender_boarding）:")
for i, student in enumerate(data['students'][:5], 1):
    print(f"{i}. {student['name_en']} ({student['real_class_name']})")
    print(f"   student_no: {student['student_no']}, gender_boarding: {student.get('gender_boarding', 'N/A')}")

# 统计有多少学生有 gender_boarding 数据
with_boarding = sum(1 for s in data['students'] if s.get('gender_boarding'))
without_boarding = len(data['students']) - with_boarding
print(f"\n统计:")
print(f"  有 Gender/Boarding 数据: {with_boarding}")
print(f"  没有 Gender/Boarding 数据: {without_boarding}")
print(f"  覆盖率: {with_boarding/len(data['students'])*100:.1f}%")

# 检查 CSV 中的列
print(f"\nCSV 文件检查:")
with open('students_final_20260629_152208.csv', 'r', encoding='utf-8-sig') as f:
    header = f.readline().strip()
    print(f"列名: {header}")

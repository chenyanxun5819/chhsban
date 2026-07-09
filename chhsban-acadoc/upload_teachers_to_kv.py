#!/usr/bin/env python3
"""
读取教师名单 Excel 文件并上传到 Cloudflare KV
"""

import openpyxl
import json
import subprocess
import sys
from pathlib import Path

# 权限映射表（根据 email 分配权限等级）
PERMISSION_MAPPING = {
    "super_admin": ["schhs334@chhsban.edu.my"],
    "admin": ["ecchhs426@chhsban.edu.my"],
    "viewer": ["ecchhs110@chhsban.edu.my"],
}

def get_teacher_permission(email):
    """根据 email 返回教师权限等级"""
    for permission, emails in PERMISSION_MAPPING.items():
        if email in emails:
            return permission
    return "teacher"  # 默认权限

def read_teachers_from_excel(file_path):
    """从 Excel 文件读取教师数据"""
    wb = openpyxl.load_workbook(file_path)
    ws = wb.active
    
    teachers = []
    headers = None
    
    for i, row in enumerate(ws.iter_rows(values_only=True), 1):
        # 第一行是表头
        if i == 1:
            headers = [h for h in row if h is not None]
            continue
        
        # 跳过空行
        if not any(row):
            continue
        
        # 创建教师记录
        teacher_data = {}
        for j, header in enumerate(headers):
            if j < len(row):
                teacher_data[header] = row[j]
        
        if teacher_data.get('Name'):
            teachers.append(teacher_data)
    
    return teachers


def upload_to_kv(teachers_data, kv_namespace="TEACHER_KV"):
    """上传教师数据到 Cloudflare KV"""
    
    print(f"📊 总共读取 {len(teachers_data)} 位教师")
    
    # 1. 按姓名建立索引（用于查询）
    teachers_by_name = {}
    for teacher in teachers_data:
        name = teacher.get('Name', '').strip()
        if name:
            # 添加权限字段
            teacher_with_permission = teacher.copy()
            teacher_with_permission['permission'] = get_teacher_permission(teacher.get('email', ''))
            teachers_by_name[name] = teacher_with_permission
    
    # 2. 按部门分类
    teachers_by_dept = {}
    for teacher in teachers_data:
        dept = teacher.get('department', 'Unknown').strip()
        if dept not in teachers_by_dept:
            teachers_by_dept[dept] = []
        # 添加权限字段
        teacher_with_permission = teacher.copy()
        teacher_with_permission['permission'] = get_teacher_permission(teacher.get('email', ''))
        teachers_by_dept[dept].append(teacher_with_permission)
    
    print(f"📂 分为 {len(teachers_by_dept)} 个部门")
    
    # 统计权限分布
    permission_stats = {"teacher": 0, "viewer": 0, "admin": 0, "super_admin": 0}
    for teacher in teachers_data:
        perm = get_teacher_permission(teacher.get('email', ''))
        permission_stats[perm] = permission_stats.get(perm, 0) + 1
    print(f"\n🔐 权限分布: {permission_stats}")
    
    # 3. 上传到 KV
    print("\n🚀 上传到 Cloudflare KV...")
    
    # 上传教师按名字的索引
    cmd_by_name = [
        'npx', 'wrangler', 'kv:key', 'put',
        'teachers_by_name',
        '--binding', kv_namespace,
        '--path', '-'
    ]
    
    try:
        result = subprocess.run(
            cmd_by_name,
            input=json.dumps(teachers_by_name, ensure_ascii=False, indent=2).encode('utf-8'),
            capture_output=True,
            text=False,
            check=True
        )
        print("✅ 上传教师索引成功")
    except subprocess.CalledProcessError as e:
        print(f"❌ 上传失败: {e.stderr.decode('utf-8', errors='replace')}")
        return False
    
    # 上传按部门分类的数据
    cmd_by_dept = [
        'npx', 'wrangler', 'kv:key', 'put',
        'teachers_by_dept',
        '--binding', kv_namespace,
        '--path', '-'
    ]
    
    try:
        result = subprocess.run(
            cmd_by_dept,
            input=json.dumps(teachers_by_dept, ensure_ascii=False, indent=2).encode('utf-8'),
            capture_output=True,
            text=False,
            check=True
        )
        print("✅ 上传部门索引成功")
    except subprocess.CalledProcessError as e:
        print(f"❌ 上传失败: {e.stderr.decode('utf-8', errors='replace')}")
        return False
    
    # 上传元数据
    metadata = {
        "total_teachers": len(teachers_data),
        "departments": len(teachers_by_dept),
        "updated_at": subprocess.check_output(['powershell', '-Command', '[DateTime]::Now.ToISOString()']).decode().strip()
    }
    
    cmd_metadata = [
        'npx', 'wrangler', 'kv:key', 'put',
        'teachers_metadata',
        '--binding', kv_namespace,
        '--path', '-'
    ]
    
    try:
        result = subprocess.run(
            cmd_metadata,
            input=json.dumps(metadata, ensure_ascii=False).encode('utf-8'),
            capture_output=True,
            text=False,
            check=True
        )
        print("✅ 上传元数据成功")
    except subprocess.CalledProcessError as e:
        print(f"⚠️  元数据上传警告: {e.stderr.decode('utf-8', errors='replace')}")
    
    print("\n✨ KV 上传完成！")
    return True


def main():
    excel_file = Path('20240802 全体教师名单 电话号码 教育账号.xlsx')
    
    if not excel_file.exists():
        print(f"❌ 找不到文件: {excel_file}")
        sys.exit(1)
    
    print(f"📖 读取文件: {excel_file}\n")
    
    teachers = read_teachers_from_excel(str(excel_file))
    
    if not teachers:
        print("❌ 没有读取到教师数据")
        sys.exit(1)
    
    success = upload_to_kv(teachers)
    
    if success:
        print("\n📊 数据摘要:")
        print(f"  - 总教师数: {len(teachers)}")
        print(f"  - 部门数: {len(set(t.get('department', 'Unknown') for t in teachers))}")
        print(f"\n🎯 KV 键位:")
        print(f"  - teachers_by_name: 按教师姓名查询")
        print(f"  - teachers_by_dept: 按部门查询")
        print(f"  - teachers_metadata: 元数据")
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()

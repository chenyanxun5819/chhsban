import requests

# 验证 API
print("🔍 验证 API 数据...\n")
try:
    r = requests.get(
        'https://teacher-management.astcws.workers.dev/api/teachers',
        headers={'Authorization': 'Bearer test_key'}
    )
    data = r.json()
    teachers = data.get('data', [])
    
    print(f"✅ 总教师数: {len(teachers)}")
    print(f"\n📋 首 5 位教师:")
    for i, teacher in enumerate(teachers[:5], 1):
        print(f"  {i}. {teacher.get('teacher_id')} - {teacher.get('name_cn')} ({teacher.get('department')})")
    
    # 统计部门
    depts = {}
    for teacher in teachers:
        dept = teacher.get('department', 'Unknown')
        depts[dept] = depts.get(dept, 0) + 1
    
    print(f"\n📊 部门统计:")
    for dept, count in sorted(depts.items()):
        print(f"  • {dept}: {count} 位")
        
except Exception as error:
    print(f"❌ 错误: {error}")

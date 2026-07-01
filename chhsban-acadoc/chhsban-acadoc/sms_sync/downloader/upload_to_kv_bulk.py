"""
Cloudflare KV 上传工具（Bulk Write API 版本）
一次请求最多 10,000 笔 - 极速上传！
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import requests
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
CLOUDFLARE_NAMESPACE_ID = os.getenv('CLOUDFLARE_NAMESPACE_ID')
CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')

if not all([CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_NAMESPACE_ID, CLOUDFLARE_API_TOKEN]):
    raise ValueError("Missing required Cloudflare environment variables")

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/{CLOUDFLARE_NAMESPACE_ID}"

HEADERS = {
    "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
    "Content-Type": "application/json"
}


def find_latest_json() -> str:
    """查找最新的学生数据 JSON 文件"""
    # 确保在正确目录中查找
    script_dir = Path(__file__).parent
    files = list(script_dir.glob("students_final_*.json"))
    
    if not files:
        raise FileNotFoundError(f"找不到 students_final_*.json 文件 (在 {script_dir})")
    
    latest = max(files, key=lambda p: p.stat().st_mtime)
    print(f"✓ 找到最新文件: {latest}")
    return str(latest)


def load_student_data(filepath: str) -> Dict[str, Any]:
    """加载学生数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def put_kv_bulk(items: List[dict]) -> bool:
    """
    使用 Bulk Write API 上传 KV 键值对
    items: [{"key": "...", "value": {...}}, ...]
    最多 10,000 项/请求
    """
    url = f"{BASE_URL}/bulk"
    
    # 准备批量数据
    bulk_data = []
    for item in items:
        bulk_data.append({
            "key": item["key"],
            "value": json.dumps(item["value"], ensure_ascii=False) if isinstance(item["value"], dict) else str(item["value"])
        })
    
    try:
        print(f"   正在构建请求体...")
        response = requests.put(
            url,
            headers=HEADERS,
            json=bulk_data,
            timeout=120  # 增加到 120 秒
        )
        
        if response.status_code == 200:
            return True
        else:
            print(f"❌ 批量上传失败: {response.status_code}")
            print(f"   响应: {response.text[:200]}")
            return False
    except requests.Timeout:
        print(f"❌ 请求超时 (>120s)")
        return False
    except Exception as e:
        print(f"❌ 批量上传错误: {str(e)}")
        return False


def organize_students_by_class(students: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    """按班级组织学生数据"""
    classes_dict = {}
    
    for student in students:
        class_name = student.get('real_class_name', 'Unknown')
        if class_name not in classes_dict:
            classes_dict[class_name] = []
        classes_dict[class_name].append(student)
    
    return classes_dict


def upload_to_kv(json_filepath: str) -> Dict[str, Any]:
    """上传学生数据到 Cloudflare KV"""
    print("\n🚀 开始上传学生数据到 Cloudflare KV...")
    print(f"📁 数据文件: {json_filepath}\n")
    
    # 加载数据
    data = load_student_data(json_filepath)
    students = data.get('students', [])
    
    print(f"📊 总学生数: {len(students)}")
    print(f"📋 班级数: {len(set(s.get('real_class_name') for s in students))}\n")
    
    students_by_class = organize_students_by_class(students)
    class_names = list(students_by_class.keys())
    timestamp = datetime.now().isoformat()
    
    # 准备所有要上传的数据
    all_items = []
    
    # 1. 班级列表
    all_items.append({
        "key": "classes",
        "value": class_names
    })
    print("1️⃣  准备班级列表 ✓")
    
    # 2. 每个班级的学生列表
    print("2️⃣  准备班级学生列表...")
    for class_name, class_students in students_by_class.items():
        simplified_students = [
            {
                'student_no': s.get('student_no'),
                'student_id': s.get('student_id'),
                'name_en': s.get('name_en'),
                'name_cn': s.get('name_cn'),
                'gender_boarding': s.get('gender_boarding')
            }
            for s in class_students
        ]
        all_items.append({
            "key": f"students:{class_name}",
            "value": simplified_students
        })
    print(f"   ✓ 已准备 {len(students_by_class)} 个班级")
    
    # 3. 个别学生记录
    print(f"3️⃣  准备 {len(students)} 个学生记录...")
    for student in students:
        all_items.append({
            "key": f"student:{student.get('student_no')}",
            "value": student
        })
    print(f"   ✓ 已准备 {len(students)} 个学生")
    
    # 4. 元数据
    metadata = {
        'total_students': len(students),
        'total_classes': len(class_names),
        'class_names': class_names,
        'updated_at': timestamp,
        'source_file': Path(json_filepath).name
    }
    
    all_items.append({
        "key": "metadata",
        "value": metadata
    })
    
    all_items.append({
        "key": "updated_time",
        "value": timestamp
    })
    
    print(f"\n📊 总数据量: {len(all_items)} 个键值对")
    print(f"   - 1 个类列表")
    print(f"   - {len(students_by_class)} 个班级学生列表")
    print(f"   - {len(students)} 个学生记录")
    print(f"   - 2 个元数据\n")
    
    # 使用 Bulk Write API 上传
    print("🚀 通过 Bulk Write API 上传...")
    
    # 分批上传（每批最多 10,000 个）
    batch_size = 10000
    total_uploaded = 0
    
    for i in range(0, len(all_items), batch_size):
        batch = all_items[i:i+batch_size]
        batch_num = i // batch_size + 1
        print(f"\n📤 批次 {batch_num}: 上传 {len(batch)} 个键...")
        
        if put_kv_bulk(batch):
            total_uploaded += len(batch)
            print(f"   ✅ 成功! (累计: {total_uploaded}/{len(all_items)})")
        else:
            print(f"   ❌ 失败!")
            return {'success': total_uploaded, 'fail': len(all_items) - total_uploaded, 'total': len(all_items)}
    
    return {'success': total_uploaded, 'fail': 0, 'total': len(all_items)}


def print_summary(stats: Dict[str, Any]):
    """打印上传统计摘要"""
    print("\n" + "="*60)
    print("📊 上传统计摘要")
    print("="*60)
    print(f"总键数:      {stats['total']}")
    print(f"成功:        {stats['success']} ✓")
    print(f"失败:        {stats['fail']} ✗")
    if stats['total'] > 0:
        print(f"成功率:      {stats['success']/stats['total']*100:.1f}%")
    print("="*60)
    
    if stats['fail'] == 0:
        print("✅ 所有数据上传成功！")
    else:
        print(f"⚠️  有 {stats['fail']} 个键上传失败")


if __name__ == "__main__":
    try:
        json_file = find_latest_json()
        stats = upload_to_kv(json_file)
        print_summary(stats)
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

"""
Cloudflare KV 上传工具（简化版）
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
    current_dir = Path(".")
    files = list(current_dir.glob("students_final_*.json"))
    
    if not files:
        raise FileNotFoundError("找不到 students_final_*.json 文件")
    
    latest = max(files, key=lambda p: p.stat().st_mtime)
    print(f"✓ 找到最新文件: {latest}")
    return str(latest)


def load_student_data(filepath: str) -> Dict[str, Any]:
    """加载学生数据"""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def put_kv(key: str, value: Any, is_json: bool = True) -> bool:
    """上传单个 KV 键值对"""
    url = f"{BASE_URL}/values/{key}"
    
    if is_json:
        data = json.dumps(value, ensure_ascii=False)
    else:
        data = str(value)
    
    try:
        response = requests.put(
            url,
            headers=HEADERS,
            data=data.encode('utf-8'),
            timeout=10
        )
        
        if response.status_code == 200:
            return True
        else:
            return False
    except Exception as e:
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
    
    upload_stats = {
        'total_keys': 0,
        'successful_uploads': 0,
        'failed_uploads': 0
    }
    
    # 1. 上传班级列表
    print("1️⃣  上传班级列表...")
    students_by_class = organize_students_by_class(students)
    class_names = list(students_by_class.keys())
    
    if put_kv("classes", class_names):
        upload_stats['successful_uploads'] += 1
        print("   ✓ 成功")
    else:
        upload_stats['failed_uploads'] += 1
        print("   ✗ 失败")
    upload_stats['total_keys'] += 1
    
    # 2. 上传每个班级的学生列表
    print("\n2️⃣  上传班级学生列表...")
    for idx, (class_name, class_students) in enumerate(students_by_class.items(), 1):
        key = f"students:{class_name}"
        
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
        
        if put_kv(key, simplified_students):
            upload_stats['successful_uploads'] += 1
        else:
            upload_stats['failed_uploads'] += 1
        
        upload_stats['total_keys'] += 1
        
        if idx % 10 == 0:
            print(f"   ✓ 已处理 {idx}/{len(students_by_class)} 个班级")
    
    print(f"   ✓ 班级列表上传完成: {upload_stats['successful_uploads']}/{len(students_by_class)}")
    
    # 3. 上传个别学生记录（关键步骤）
    print(f"\n3️⃣  上传 {len(students)} 个学生记录...")
    
    success_count = 0
    for idx, student in enumerate(students, 1):
        key = f"student:{student.get('student_no')}"
        if put_kv(key, student):
            success_count += 1
            upload_stats['successful_uploads'] += 1
        else:
            upload_stats['failed_uploads'] += 1
        
        upload_stats['total_keys'] += 1
        
        # 每处理 500 个显示一次进度
        if idx % 500 == 0:
            percentage = idx / len(students) * 100
            print(f"   ⏳ 进度: {idx}/{len(students)} ({percentage:.1f}%)")
    
    print(f"   ✓ 学生记录上传完成: {success_count}/{len(students)}")
    
    # 4. 上传更新时间戳和元数据
    print("\n4️⃣  上传元数据...")
    timestamp = datetime.now().isoformat()
    
    metadata = {
        'total_students': len(students),
        'total_classes': len(class_names),
        'class_names': class_names,
        'updated_at': timestamp,
        'source_file': Path(json_filepath).name
    }
    
    if put_kv("metadata", metadata):
        upload_stats['successful_uploads'] += 1
        print("   ✓ 元数据: 成功")
    else:
        upload_stats['failed_uploads'] += 1
        print("   ✗ 元数据: 失败")
    
    if put_kv("updated_time", timestamp, is_json=False):
        upload_stats['successful_uploads'] += 1
        print(f"   ✓ 时间戳: {timestamp}")
    else:
        upload_stats['failed_uploads'] += 1
    
    upload_stats['total_keys'] += 2
    
    return upload_stats


def print_summary(stats: Dict[str, Any]):
    """打印上传统计摘要"""
    print("\n" + "="*60)
    print("📊 上传统计摘要")
    print("="*60)
    print(f"总键数:      {stats['total_keys']}")
    print(f"成功:        {stats['successful_uploads']} ✓")
    print(f"失败:        {stats['failed_uploads']} ✗")
    if stats['total_keys'] > 0:
        print(f"成功率:      {stats['successful_uploads']/stats['total_keys']*100:.1f}%")
    print("="*60)
    
    if stats['successful_uploads'] == stats['total_keys']:
        print("✅ 所有数据上传成功！")
    else:
        print(f"⚠️  有 {stats['failed_uploads']} 个键上传失败")


if __name__ == "__main__":
    try:
        json_file = find_latest_json()
        stats = upload_to_kv(json_file)
        print_summary(stats)
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()

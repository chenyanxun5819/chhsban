"""
Cloudflare KV 上传工具
将学生数据上传到 Cloudflare KV 存储
"""

import json
import os
import glob
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
    
    # 查找所有 students_final_*.json 文件
    files = list(current_dir.glob("students_final_*.json"))
    
    if not files:
        raise FileNotFoundError("找不到 students_final_*.json 文件")
    
    # 按修改时间排序，返回最新的
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
            data=data.encode('utf-8')
        )
        
        if response.status_code == 200:
            return True
        else:
            print(f"✗ 上传失败 {key}: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 上传错误 {key}: {str(e)}")
        return False


def put_kv_batch(items: List[tuple]) -> int:
    """批量上传 KV 键值对 (加速)
    items: [(key, value, is_json), ...]
    """
    url = f"{BASE_URL}/bulk"
    
    batch_data = []
    for key, value, is_json in items:
        if is_json:
            data = json.dumps(value, ensure_ascii=False)
        else:
            data = str(value)
        
        batch_data.append({
            "key": key,
            "value": data,
            "base64": False
        })
    
    try:
        # 批量上传最多 10000 个键
        success_count = 0
        for i in range(0, len(batch_data), 100):
            chunk = batch_data[i:i+100]
            response = requests.put(
                url,
                headers=HEADERS,
                json=chunk
            )
            
            if response.status_code == 200:
                success_count += len(chunk)
            else:
                print(f"✗ 批量上传失败: {response.status_code}")
        
        return success_count
    except Exception as e:
        print(f"✗ 批量上传错误: {str(e)}")
        return 0


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
    print(f"📁 数据文件: {json_filepath}")
    
    # 加载数据
    data = load_student_data(json_filepath)
    students = data.get('students', [])
    
    print(f"📊 总学生数: {len(students)}")
    
    # 1. 组织按班级的数据
    print("\n📋 组织班级数据...")
    students_by_class = organize_students_by_class(students)
    class_names = list(students_by_class.keys())
    
    upload_stats = {
        'total_keys': 0,
        'successful_uploads': 0,
        'failed_uploads': 0,
        'keys_uploaded': []
    }
    
    # 2. 上传班级列表
    print(f"✓ 班级数: {len(class_names)}")
    if put_kv("classes", class_names):
        upload_stats['successful_uploads'] += 1
        upload_stats['keys_uploaded'].append("classes")
        upload_stats['total_keys'] += 1
    else:
        upload_stats['failed_uploads'] += 1
        upload_stats['total_keys'] += 1
    
    # 3. 上传每个班级的学生列表
    print("\n📤 上传班级学生列表...")
    for class_name, class_students in students_by_class.items():
        key = f"students:{class_name}"
        
        # 提取简化的学生数据（减少 KV 存储大小）
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
            upload_stats['keys_uploaded'].append(key)
            print(f"  ✓ {key} ({len(class_students)} 学生)")
        else:
            upload_stats['failed_uploads'] += 1
            print(f"  ✗ {key}")
        
        upload_stats['total_keys'] += 1
    
    # 4. 上传个别学生记录（用于快速查找）
    print("\n📤 上传个别学生记录（批量模式）...")
    
    # 准备批量数据
    batch_items = []
    for student in students:
        key = f"student:{student.get('student_no')}"
        batch_items.append((key, student, True))
    
    # 分批上传（每批 100 个）
    uploaded_count = put_kv_batch(batch_items)
    upload_stats['successful_uploads'] += uploaded_count
    upload_stats['failed_uploads'] += len(batch_items) - uploaded_count
    upload_stats['total_keys'] += len(batch_items)
    
    print(f"  ✓ 学生记录上传完成: {uploaded_count}/{len(batch_items)}")
    
    # 5. 上传更新时间戳
    print("\n🕐 上传更新时间戳...")
    timestamp = datetime.now().isoformat()
    if put_kv("updated_time", timestamp, is_json=False):
        upload_stats['successful_uploads'] += 1
        upload_stats['keys_uploaded'].append("updated_time")
        print(f"  ✓ 更新时间: {timestamp}")
    else:
        upload_stats['failed_uploads'] += 1
    
    upload_stats['total_keys'] += 1
    
    # 6. 上传元数据
    print("\n📋 上传元数据...")
    metadata = {
        'total_students': len(students),
        'total_classes': len(class_names),
        'class_names': class_names,
        'updated_at': timestamp,
        'source_file': Path(json_filepath).name
    }
    
    if put_kv("metadata", metadata):
        upload_stats['successful_uploads'] += 1
        upload_stats['keys_uploaded'].append("metadata")
        print(f"  ✓ 元数据上传成功")
    else:
        upload_stats['failed_uploads'] += 1
    
    upload_stats['total_keys'] += 1
    
    return upload_stats


def print_summary(stats: Dict[str, Any]):
    """打印上传统计摘要"""
    print("\n" + "="*60)
    print("📊 上传统计摘要")
    print("="*60)
    print(f"总键数:      {stats['total_keys']}")
    print(f"成功:        {stats['successful_uploads']} ✓")
    print(f"失败:        {stats['failed_uploads']} ✗")
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

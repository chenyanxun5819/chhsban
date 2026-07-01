"""
完整流程：SMS 下载 → Excel 对比 → Cloudflare KV 上传
一条命令完成所有操作（无需打开界面）
"""

import json
import os
import sys
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
import requests
from dotenv import load_dotenv
from openpyxl import load_workbook

# 加载环境变量
load_dotenv()

CLOUDFLARE_ACCOUNT_ID = os.getenv('CLOUDFLARE_ACCOUNT_ID')
CLOUDFLARE_NAMESPACE_ID = os.getenv('CLOUDFLARE_NAMESPACE_ID')
CLOUDFLARE_API_TOKEN = os.getenv('CLOUDFLARE_API_TOKEN')

if not all([CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_NAMESPACE_ID, CLOUDFLARE_API_TOKEN]):
    raise ValueError("Missing Cloudflare environment variables")

BASE_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/storage/kv/namespaces/{CLOUDFLARE_NAMESPACE_ID}"

HEADERS = {
    "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
    "Content-Type": "application/json"
}


def step_1_download_sms_data():
    """步骤 1: 从 SMS 系统下载学生数据"""
    print("\n" + "="*60)
    print("1️⃣  步骤 1: 从 SMS 系统下载学生数据")
    print("="*60)
    
    script_dir = Path(__file__).parent
    fetch_script = script_dir / "fetch_dynamic.py"
    
    if not fetch_script.exists():
        print("❌ 找不到 fetch_dynamic.py")
        return None
    
    print("执行 fetch_dynamic.py...")
    import subprocess
    result = subprocess.run([sys.executable, str(fetch_script)], 
                          capture_output=True, text=True)
    
    if result.returncode == 0:
        print("✅ SMS 数据下载成功")
        # 查找最新的 JSON 文件
        files = list(script_dir.glob("students_final_*.json"))
        if files:
            latest = max(files, key=lambda p: p.stat().st_mtime)
            return str(latest)
    else:
        print(f"❌ SMS 下载失败: {result.stderr}")
        return None


def step_2_enrich_with_excel(json_file: str):
    """步骤 2: 用 Excel 数据丰富学生信息（实际上 fetch_dynamic.py 已经做过了）"""
    print("\n" + "="*60)
    print("2️⃣  步骤 2: 验证 Excel 数据")
    print("="*60)
    
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    students = data.get('students', [])
    with_boarding = sum(1 for s in students if s.get('gender_boarding'))
    
    print(f"✅ 学生数: {len(students)}")
    print(f"✅ 有 Gender/Boarding 数据: {with_boarding}/{len(students)} ({with_boarding/len(students)*100:.1f}%)")
    
    return data


def step_3_organize_data(data: Dict[str, Any]) -> List[dict]:
    """步骤 3: 组织数据结构用于上传"""
    print("\n" + "="*60)
    print("3️⃣  步骤 3: 组织数据结构")
    print("="*60)
    
    students = data.get('students', [])
    timestamp = datetime.now().isoformat()
    
    # 按班级组织
    classes_dict = {}
    for student in students:
        class_name = student.get('real_class_name', 'Unknown')
        if class_name not in classes_dict:
            classes_dict[class_name] = []
        classes_dict[class_name].append(student)
    
    class_names = list(classes_dict.keys())
    
    # 准备所有要上传的项目
    all_items = []
    
    # 班级列表
    all_items.append({
        "key": "classes",
        "value": class_names
    })
    
    # 班级学生列表
    for class_name, class_students in classes_dict.items():
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
    
    # 个别学生记录
    for student in students:
        all_items.append({
            "key": f"student:{student.get('student_no')}",
            "value": student
        })
    
    # 元数据
    metadata = {
        'total_students': len(students),
        'total_classes': len(class_names),
        'class_names': class_names,
        'updated_at': timestamp,
        'source_file': Path(data.get('source_file', '')).name if 'source_file' in data else 'unknown'
    }
    
    all_items.append({
        "key": "metadata",
        "value": metadata
    })
    
    all_items.append({
        "key": "updated_time",
        "value": timestamp
    })
    
    print(f"✅ 已组织 {len(all_items)} 个键值对")
    print(f"   - 1 个班级列表")
    print(f"   - {len(classes_dict)} 个班级学生列表")
    print(f"   - {len(students)} 个学生记录")
    print(f"   - 2 个元数据")
    
    return all_items


def step_4_upload_to_kv(all_items: List[dict]) -> Dict[str, Any]:
    """步骤 4: 使用 Bulk Write API 上传到 Cloudflare KV"""
    print("\n" + "="*60)
    print("4️⃣  步骤 4: 上传到 Cloudflare KV (Bulk API)")
    print("="*60)
    
    url = f"{BASE_URL}/bulk"
    
    # 准备批量数据
    bulk_data = []
    for item in all_items:
        bulk_data.append({
            "key": item["key"],
            "value": json.dumps(item["value"], ensure_ascii=False) if isinstance(item["value"], dict) else str(item["value"])
        })
    
    print(f"📤 上传 {len(bulk_data)} 个键...")
    
    try:
        start_time = time.time()
        response = requests.put(
            url,
            headers=HEADERS,
            json=bulk_data,
            timeout=120
        )
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            print(f"✅ 上传成功! ({elapsed:.2f} 秒)")
            return {'success': len(all_items), 'fail': 0, 'elapsed': elapsed}
        else:
            print(f"❌ 上传失败: {response.status_code}")
            return {'success': 0, 'fail': len(all_items), 'elapsed': 0}
    except Exception as e:
        print(f"❌ 上传错误: {str(e)}")
        return {'success': 0, 'fail': len(all_items), 'elapsed': 0}


def main():
    """执行完整流程"""
    print("\n" + "🚀 "*20)
    print("完整流程: SMS 下载 → Excel 对比 → KV 上传")
    print("🚀 "*20)
    
    start_time = time.time()
    
    # 步骤 1: 下载 SMS 数据
    json_file = step_1_download_sms_data()
    if not json_file:
        print("\n❌ 流程中止")
        return False
    
    # 步骤 2: 验证 Excel 数据
    data = step_2_enrich_with_excel(json_file)
    
    # 步骤 3: 组织数据
    all_items = step_3_organize_data(data)
    
    # 步骤 4: 上传到 KV
    stats = step_4_upload_to_kv(all_items)
    
    # 总结
    total_time = time.time() - start_time
    print("\n" + "="*60)
    print("📊 完整流程总结")
    print("="*60)
    print(f"总耗时: {total_time:.2f} 秒 ({int(total_time//60)}分{int(total_time%60)}秒)")
    print(f"上传数据: {stats['success']}/{stats['success']+stats['fail']} 成功")
    print(f"KV 上传耗时: {stats['elapsed']:.2f} 秒")
    print("="*60)
    
    if stats['fail'] == 0:
        print("✅ 完整流程执行成功！")
        return True
    else:
        print(f"⚠️  有 {stats['fail']} 个键上传失败")
        return False


if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ 错误: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

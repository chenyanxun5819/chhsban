#!/usr/bin/env python3
"""
M6 Firestore 初始化脚本 - 创建管理系统数据结构

功能：
- 初始化 settings/global（全局系统设置）
- 创建初始组织 (chhs - 森美蘭芙蓉中華中學)
- 初始化 allowedUsers、usage 集合结构
- 验证 Firestore 连接

使用方式:
  python tools/init_m6_data.py [--use-emulator] [--project-id PROJECT_ID]

前置要求:
  - firebase-admin SDK: pip install firebase-admin
  - 设置 GOOGLE_APPLICATION_CREDENTIALS 环境变量
  或
  - 使用 --use-emulator 连接到本地 Firestore Emulator
"""

import argparse
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin SDK 未安装")
    print("请运行: pip install firebase-admin")
    sys.exit(1)


# ========== 颜色输出 ==========
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    RESET = '\033[0m'


def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.RESET}")


def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.RESET}")


def print_info(msg):
    print(f"{Colors.CYAN}ℹ️ {msg}{Colors.RESET}")


def print_warn(msg):
    print(f"{Colors.YELLOW}⚠️ {msg}{Colors.YELLOW}")


def init_firebase(project_id: str, use_emulator: bool = False):
    """初始化 Firebase Admin SDK"""
    try:
        if firebase_admin._apps:
            return firestore.client()
        
        if use_emulator:
            os.environ['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080'
            print_info("使用本地 Firestore Emulator (localhost:8080)")
        
        # 使用默认凭证（Application Default Credentials）
        firebase_admin.initialize_app(options={'projectId': project_id})
        print_info("使用默认凭证（Application Default Credentials）")
        
        return firestore.client()
    except Exception as e:
        print_error(f"Firebase 初始化失败: {e}")
        sys.exit(1)


def init_settings(db: firestore.client):
    """初始化全局设置 (settings/global)"""
    print_info("初始化全局设置...")
    
    settings_data = {
        'defaultDailySheetsPerUser': 100,      # 每位教师每天最多识别的答案纸张数
        'studentDataRetentionHours': 24,       # 学生层面资料保留小时数
        'maxExamsPerTeacher': 200,             # 每位教师试卷库上限
        'maxPaperFileMB': 10,                  # 每份试卷大小上限
        'maxPagesPerUpload': 10,               # 每次上传最多页数
        'maxFileMB': 15,                       # 上传文件大小上限
        'updatedAt': datetime.now(timezone.utc)
    }
    
    try:
        db.collection('settings').document('global').set(settings_data, merge=True)
        print_success("settings/global 已初始化")
        for k, v in settings_data.items():
            if k != 'updatedAt':
                print(f"  • {k}: {v}")
    except Exception as e:
        print_error(f"初始化 settings/global 失败: {e}")
        return False
    
    return True


def init_default_org(db: firestore.client):
    """创建默认组织 (chhs - 森美蘭芙蓉中華中學)"""
    print_info("创建默认组织...")
    
    org_data = {
        'name': '森美蘭芙蓉中華中學',
        'code': 'chhs',
        'active': True,
        'studentId': {
            'digits': 5,
            'charset': 'numeric',  # 第一阶段只支持 numeric
            'prefix': ''           # 无前置码
        },
        'optionCount': 5,           # A–E
        'allowedTemplates': ['T100-A4-v1', 'T060-A4-v1'],
        'defaultTemplate': 'T100-A4-v1',
        'dailySheetsPerUser': None,  # null 表示使用全局默认
        'createdAt': datetime.now(timezone.utc)
    }
    
    try:
        db.collection('orgs').document('chhs').set(org_data)
        print_success("orgs/chhs 已创建")
        print(f"  • 名称: {org_data['name']}")
        print(f"  • 代号: {org_data['code']}")
        print(f"  • 选项数: A–E ({org_data['optionCount']} 选)")
        print(f"  • 学号: {org_data['studentId']['digits']} 位数字")
        print(f"  • 开放版型: {', '.join(org_data['allowedTemplates'])}")
    except Exception as e:
        print_error(f"创建 orgs/chhs 失败: {e}")
        return False
    
    return True


def create_allowedusers_collection(db: firestore.client):
    """创建 allowedUsers 集合（保持为空，由管理员手动添加）"""
    print_info("创建 allowedUsers 集合结构...")
    
    # 创建一个临时文档用于集合初始化，然后删除
    try:
        # Firestore 中，空集合不会显示在控制台
        # 所以我们创建一个示例文档然后删除它
        temp_doc = {
            'email': 'example@example.com',
            'orgId': 'chhs',
            'role': 'teacher',
            'active': False,
            'uid': None,
            'dailySheetsOverride': None,
            'createdAt': datetime.now(timezone.utc)
        }
        
        db.collection('allowedUsers').document('_temp').set(temp_doc)
        db.collection('allowedUsers').document('_temp').delete()
        
        print_success("allowedUsers 集合已初始化（目前为空）")
    except Exception as e:
        print_warn(f"创建 allowedUsers 集合时出现警告: {e}")
        # 不中断流程，这个错误不会影响功能
    
    return True


def create_usage_collection(db: firestore.client):
    """创建 usage 集合结构（客户端只读）"""
    print_info("创建 usage 集合结构...")
    
    try:
        # 创建一个示例文档用于初始化集合
        temp_doc = {
            'sheets': 0
        }
        
        db.collection('usage').document('_temp').set(temp_doc)
        db.collection('usage').document('_temp').delete()
        
        print_success("usage 集合已初始化（目前为空）")
    except Exception as e:
        print_warn(f"创建 usage 集合时出现警告: {e}")
    
    return True


def verify_firestore_connection(db: firestore.client):
    """验证 Firestore 连接"""
    print_info("验证 Firestore 连接...")
    
    try:
        # 尝试读取 settings/global
        doc = db.collection('settings').document('global').get()
        if doc.exists:
            print_success("Firestore 连接成功")
            return True
        else:
            print_error("settings/global 不存在")
            return False
    except Exception as e:
        print_error(f"Firestore 连接失败: {e}")
        return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(
        description='M6 Firestore 初始化脚本',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 使用本地 Emulator
  python tools/init_m6_data.py --use-emulator --project-id officeomr-fe542
  
  # 使用生产环境（需要 GOOGLE_APPLICATION_CREDENTIALS）
  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
  python tools/init_m6_data.py --project-id officeomr-fe542
        """
    )
    
    parser.add_argument(
        '--use-emulator',
        action='store_true',
        help='使用本地 Firestore Emulator (localhost:8080)'
    )
    parser.add_argument(
        '--project-id',
        default='officeomr-fe542',
        help='Google Cloud 项目 ID (默认: officeomr-fe542)'
    )
    
    args = parser.parse_args()
    
    print()
    print("=" * 60)
    print("M6 Firestore 初始化")
    print("=" * 60)
    print()
    
    # 初始化 Firebase
    db = init_firebase(args.project_id, args.use_emulator)
    
    # 执行初始化步骤
    steps = [
        ("全局设置", lambda: init_settings(db)),
        ("默认组织", lambda: init_default_org(db)),
        ("allowedUsers 集合", lambda: create_allowedusers_collection(db)),
        ("usage 集合", lambda: create_usage_collection(db)),
        ("验证连接", lambda: verify_firestore_connection(db)),
    ]
    
    all_success = True
    for step_name, step_func in steps:
        print()
        if not step_func():
            all_success = False
    
    print()
    print("=" * 60)
    if all_success:
        print_success("M6 初始化完成！")
        print()
        print("下一步:")
        print("  1. 修改 firestore.rules (已准备在 M6_schedule.md)")
        print("  2. 运行 Firebase Emulator 测试")
        print("  3. 运行 bootstrap_admin.py 设置 super_admin")
    else:
        print_error("初始化过程中出现错误")
    
    print("=" * 60)
    print()


if __name__ == '__main__':
    main()

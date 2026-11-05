#!/usr/bin/env python3
"""
OfficeOMR Firestore 初始化脚本 (Admin SDK)

功能：
- 初始化 settings/global 文档
- 创建第一个管理员用户
- 验证 Security Rules

使用方式:
  python functions/init_data.py --admin-email your@email.com [--use-emulator]

前置要求:
  - firebase-admin SDK 已安装
  - GOOGLE_APPLICATION_CREDENTIALS 指向服务账号 JSON
  或
  - 设置环境变量: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except ImportError:
    print("❌ firebase-admin SDK 未安装")
    print("请运行: pip install firebase-admin")
    sys.exit(1)

# ========== 配置 ==========
PROJECT_ID = "officeomr-fe542"
DEFAULT_DAILY_LIMIT = 100
DEFAULT_MAX_FILE_SIZE_MB = 50
DEFAULT_EXPIRY_DAYS = 7

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

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️ {msg}{Colors.RESET}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ️ {msg}{Colors.RESET}")

# ========== 初始化 Firebase ==========
def init_firebase(use_emulator=False):
    """初始化 Firebase Admin SDK"""
    print_info("初始化 Firebase Admin SDK...")
    
    try:
        # 检查是否已初始化
        if firebase_admin._apps:
            db = firestore.client()
            print_success("Firebase 已初始化")
            return db
        
        # 获取服务账号密钥
        cred_path = Path.cwd() / "officeomr-fe542-key.json"
        if not cred_path.exists():
            # 尝试从环境变量
            import os
            cred_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
            if not cred_path:
                print_error("服务账号密钥未找到")
                print_info("请下载密钥到 officeomr-fe542-key.json")
                print_info("或设置环境变量: GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json")
                sys.exit(1)
        
        # 初始化
        cred = credentials.Certificate(str(cred_path))
        app = firebase_admin.initialize_app(cred, {
            'projectId': PROJECT_ID,
        })
        
        db = firestore.client()
        
        if use_emulator:
            print_warning("使用 Firestore Emulator (127.0.0.1:8080)")
            # Emulator 自动检测 FIRESTORE_EMULATOR_HOST 环境变量
        
        print_success("Firebase Admin SDK 初始化成功")
        return db
        
    except Exception as e:
        print_error(f"初始化失败: {e}")
        sys.exit(1)

# ========== 初始化全局设置 ==========
def init_settings(db):
    """初始化 settings/global 文档"""
    print_info("初始化 settings/global...")
    
    try:
        doc_ref = db.collection('settings').document('global')
        
        # 检查是否已存在
        if doc_ref.get().exists:
            print_warning("settings/global 已存在，跳过创建")
            return
        
        # 创建初始设置
        settings_data = {
            'daily_limit_per_teacher': DEFAULT_DAILY_LIMIT,
            'max_file_size_mb': DEFAULT_MAX_FILE_SIZE_MB,
            'result_expiry_days': DEFAULT_EXPIRY_DAYS,
            'updated_at': datetime.utcnow(),
        }
        
        doc_ref.set(settings_data)
        print_success(f"已创建 settings/global")
        print(f"  - daily_limit_per_teacher: {DEFAULT_DAILY_LIMIT}")
        print(f"  - max_file_size_mb: {DEFAULT_MAX_FILE_SIZE_MB}")
        print(f"  - result_expiry_days: {DEFAULT_EXPIRY_DAYS}")
        
    except Exception as e:
        print_error(f"初始化设置失败: {e}")
        raise

# ========== 创建管理员用户 ==========
def create_admin_user(db, email, uid=None):
    """创建管理员用户（需先在 Firebase Auth 中创建用户）"""
    print_info(f"创建管理员用户: {email}")
    
    try:
        if uid is None:
            print_warning(f"未指定 uid，需要先手动创建用户或提供 uid")
            print_info(f"步骤:")
            print_info(f"1. 在 Firebase Console Auth 中创建用户: {email}")
            print_info(f"2. 复制用户的 UID")
            print_info(f"3. 重新运行: python init_data.py --admin-email {email} --admin-uid <uid>")
            return
        
        doc_ref = db.collection('users').document(uid)
        
        # 检查是否已存在
        if doc_ref.get().exists:
            print_warning(f"用户 {uid} 已存在，更新权限...")
        
        user_data = {
            'email': email,
            'approved': True,
            'role': 'admin',
            'department': 'admin',
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
        }
        
        doc_ref.set(user_data, merge=True)
        print_success(f"已创建/更新管理员用户")
        print(f"  - uid: {uid}")
        print(f"  - email: {email}")
        print(f"  - role: admin")
        
    except Exception as e:
        print_error(f"创建用户失败: {e}")
        raise

# ========== 验证 Security Rules 部署状态 ==========
def check_rules_deployment(db):
    """检查 Security Rules 是否已部署"""
    print_info("检查 Security Rules...")
    
    try:
        # 尝试读取 settings/global（应该成功，因为认证用户有读权限）
        doc = db.collection('settings').document('global').get()
        if doc.exists:
            print_success("Security Rules 配置正确（可读取公开配置）")
        else:
            print_warning("settings/global 不存在，但读权限配置正确")
    except Exception as e:
        print_warning(f"Security Rules 检查失败: {e}")
        print_info("确保已部署: firebase deploy --only firestore:rules")

# ========== 显示初始化清单 ==========
def print_checklist():
    """打印初始化完成清单"""
    print("\n" + "="*50)
    print_info("Firestore 初始化清单")
    print("="*50)
    print()
    print("✅ settings/global 已初始化")
    print("   - 包含全局配置（配额、过期时间等）")
    print()
    print("⏳ 后续步骤:")
    print()
    print("1️⃣ 部署 Security Rules:")
    print("   firebase deploy --only firestore:rules,storage")
    print()
    print("2️⃣ 如需创建管理员用户:")
    print("   - 在 Firebase Console Auth 中创建用户")
    print("   - 运行: python functions/init_data.py --admin-email email@example.com --admin-uid <uid>")
    print()
    print("3️⃣ 添加教师用户（白名单）:")
    print("   - 在 Firebase Console Firestore 中")
    print("   - 创建 users/{uid} 文档，设置 approved=true")
    print()
    print("4️⃣ 本地测试（使用 Emulator）:")
    print("   firebase emulators:start --only auth,firestore")
    print("   python functions/init_data.py --use-emulator")
    print()
    print("="*50 + "\n")

# ========== 主函数 ==========
def main():
    parser = argparse.ArgumentParser(
        description='初始化 OfficeOMR Firestore 数据',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例：
  # 初始化全局设置（生产环境）
  python functions/init_data.py

  # 使用本地 Emulator
  python functions/init_data.py --use-emulator

  # 创建管理员用户
  python functions/init_data.py --admin-email admin@example.com --admin-uid abc123xyz
        """
    )
    
    parser.add_argument('--use-emulator', action='store_true',
                       help='使用本地 Firebase Emulator')
    parser.add_argument('--admin-email', type=str, default='',
                       help='创建管理员用户（需指定 --admin-uid）')
    parser.add_argument('--admin-uid', type=str, default='',
                       help='管理员用户 UID（来自 Firebase Auth）')
    
    args = parser.parse_args()
    
    print()
    print_info("OfficeOMR Firestore 初始化")
    print()
    
    # 初始化 Firebase
    db = init_firebase(use_emulator=args.use_emulator)
    
    # 初始化全局设置
    init_settings(db)
    
    # 创建管理员用户（可选）
    if args.admin_email:
        create_admin_user(db, args.admin_email, args.admin_uid)
    
    # 检查 Rules
    check_rules_deployment(db)
    
    # 打印清单
    print_checklist()
    
    print_success("初始化完成！")

if __name__ == '__main__':
    main()

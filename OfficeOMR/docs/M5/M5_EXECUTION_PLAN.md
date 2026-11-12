# M5 — 云端最小版 执行计划

**里程碑目标**: 部署识别核心到 Cloud Functions，验证云端与本地识别结果逐位相同  
**验收标准** (PLAN.md §M5):
- ✅ Wes 登录测试页，上传真实扫描
- ✅ 10 秒内看到识别结果
- ✅ 云端与本地结果逐位相同
- ✅ 未登录/非白名单请求被拒绝

**预计时间**: 7-10 天

---

## M5 工作范围

### 任务 1: 环境与依赖准备
**目的**: 为 Cloud Functions 和本地开发准备环境

#### Subtask 1.1: 验证本地环境
```powershell
# 检查 Python 3.12+
python --version

# 检查 Node.js 与 Firebase CLI
node --version
npm --version
firebase --version

# 检查 GCP 项目状态
firebase projects:list
# 应该显示：officeomr-dev
```

#### Subtask 1.2: Firebase 项目升级到 Blaze
**说明**: Cloud Functions 需要 Blaze（按量付费）

**步骤**:
1. 进入 [Firebase Console](https://console.firebase.google.com/)
2. 选择 `officeomr-dev` 项目
3. 升级计划到 Blaze（绑定信用卡）
4. 在 Google Cloud 设置预算提醒（建议 RM 10，阈值 50%/90%/100%）

#### Subtask 1.3: 准备 Cloud Functions 依赖
```powershell
cd functions
pip install -r requirements.txt

# requirements.txt 应该包含:
# functions-framework>=3.0.0
# firebase-admin>=6.0.0
# google-cloud-storage>=2.0.0
# google-cloud-firestore>=2.0.0
# opencv-python-headless>=4.0
# numpy>=1.20
# pydantic>=2.0
# pyyaml>=6.0
# Pillow>=9.0
```

---

### 任务 2: Cloud Functions 实现 (`recognize_sheet`)
**目的**: 实现云端识别函数

#### Subtask 2.1: 同步 `omr_core` 到 Functions
```powershell
# 将本地 core/omr_core/ 复制到 functions/omr_core/
Copy-Item -Path "core/omr_core" -Destination "functions/" -Recurse -Force

# 复制 sheetgen/layout.py（仅需 layout 读取）
Copy-Item -Path "sheetgen/layout.py" -Destination "functions/sheetgen_layout.py"

# 复制 config.default.yaml
Copy-Item -Path "core/omr_core/config.default.yaml" -Destination "functions/"
```

#### Subtask 2.2: 创建 `recognize_sheet` Cloud Function

**文件**: `functions/main.py`

**功能**:
```python
# 伪代码
@app.route('/recognize_sheet', methods=['POST'])
def recognize_sheet(request):
    # 1. 验证用户身份与权限
    auth_token = request.headers.get('Authorization')
    user_id, org_id = verify_token(auth_token)
    if not user_id:
        return {'error': 'Unauthorized'}, 401
    
    # 2. 检查配额（从 Firestore settings/global 读取）
    daily_limit = get_global_setting('daily_limit_per_teacher')
    if teacher_usage_today >= daily_limit:
        return {'error': 'QUOTA_EXCEEDED'}, 429
    
    # 3. 获取上传的图片或 PDF
    image_file = request.files['image']
    image_bytes = image_file.read()
    
    # 4. 读取 layout.json（从 Firestore 或本地配置）
    template = request.form.get('template', 'T100-A4-v1')
    layout_config = load_layout(template)
    
    # 5. 调用 omr_core 识别
    result = pipeline.recognize(image_bytes, layout_config)
    
    # 6. 保存结果到 Storage 与 Firestore
    job_id = uuid.uuid4().hex
    storage_path = f'jobs/{job_id}/result.json'
    firestore_path = f'jobs/{job_id}'
    
    store_result_to_storage(job_id, result)
    store_metadata_to_firestore(job_id, {
        'user_id': user_id,
        'org_id': org_id,
        'template': template,
        'status': 'completed',
        'created_at': firestore.SERVER_TIMESTAMP,
        'expires_at': datetime.now() + timedelta(hours=24),
        'accuracy': result['summary']['overall_accuracy']
    })
    
    # 7. 增加配额计数
    increment_daily_usage(user_id)
    
    # 8. 返回结果与标注图 URL
    return {
        'job_id': job_id,
        'result': result,
        'annotated_image_url': storage_url(job_id, 'annotated.png'),
        'expires_at': expires_timestamp
    }
```

**关键代码位置**:
- 认证: 使用 Firebase Auth + Custom Claims（`org_id`、`role`）
- 配额: 从 Firestore `settings/global` 读取
- 存储: Cloud Storage 的 `jobs/{jobId}/` 路径
- Firestore: `jobs/{jobId}` 文档记录元数据

#### Subtask 2.3: 集成 `omr_core` 识别管道

**步骤**:
1. 在 `functions/main.py` 中导入 `omr_core.pipeline`
2. 实现 `recognize_sheet()` 调用 `pipeline.recognize()`
3. 处理 PDF 多页（若上传的是多页 PDF，逐页识别）
4. 返回格式: 标准 OMR 结果 JSON（见 M2）+ 标注调试图

---

### 任务 3: 前端测试页面
**目的**: 为 Wes 提供登录和上传测试的界面

#### Subtask 3.1: 实现登录组件 (`web/index.html` + `web/auth.js`)

**功能**:
```html
<!-- 登录按钮 -->
<button id="login-btn">Sign in with Google</button>

<!-- 登录后显示 -->
<div id="dashboard" style="display:none;">
  <p>Welcome, <span id="user-email"></span></p>
  <button id="logout-btn">Sign out</button>
  
  <!-- 上传表单 -->
  <form id="upload-form">
    <input type="file" name="image" accept="image/*,application/pdf" required />
    <select name="template" required>
      <option value="T100-A4-v1">T100 (100题)</option>
      <option value="T060-A4-v1">T060 (60题)</option>
    </select>
    <button type="submit">Upload & Recognize</button>
  </form>
  
  <!-- 进度条 -->
  <progress id="progress" style="display:none;"></progress>
  <p id="status"></p>
  
  <!-- 结果显示 -->
  <div id="result" style="display:none;">
    <h3>识别结果</h3>
    <p>学号: <strong id="student-id"></strong></p>
    <p>答题数: <strong id="answer-count"></strong></p>
    <p>准确度: <strong id="accuracy"></strong></p>
    <img id="annotated-img" src="" alt="标注图" style="max-width:100%;" />
    <a id="download-result" href="#" download>下载结果 JSON</a>
  </div>
</div>
```

**JavaScript 逻辑** (`web/auth.js`):
```javascript
// 初始化 Firebase
firebase.initializeApp({...});

// Google 登录
document.getElementById('login-btn').onclick = () => {
  firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
};

// 监听登录状态
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('dashboard').style.display = 'block';
    
    // 检查用户是否在白名单中（通过 Custom Claim）
    const claims = (await user.getIdTokenResult()).claims;
    if (!claims.org_id) {
      showError('您的账号尚未被批准。请向管理员申请。');
      return;
    }
  } else {
    document.getElementById('dashboard').style.display = 'none';
  }
});

// 上传图片
document.getElementById('upload-form').onsubmit = async (e) => {
  e.preventDefault();
  
  const formData = new FormData();
  formData.append('image', document.querySelector('input[name="image"]').files[0]);
  formData.append('template', document.querySelector('select[name="template"]').value);
  
  const token = await firebase.auth().currentUser.getIdToken();
  
  // 调用 Cloud Function
  const response = await fetch(
    'https://asia-southeast1-officeomr-dev.cloudfunctions.net/recognize_sheet',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    }
  );
  
  const result = await response.json();
  
  // 显示结果
  document.getElementById('student-id').textContent = result.result.student_id;
  document.getElementById('answer-count').textContent = result.result.answers.length;
  document.getElementById('accuracy').textContent = result.result.summary.overall_accuracy.toFixed(1) + '%';
  document.getElementById('annotated-img').src = result.annotated_image_url;
  document.getElementById('result').style.display = 'block';
};
```

#### Subtask 3.2: 配置 Firebase Hosting

**文件**: `firebase.json`

```json
{
  "hosting": {
    "public": "web",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "functions": {
    "source": "functions",
    "runtime": "python312"
  }
}
```

#### Subtask 3.3: 部署前端
```powershell
firebase deploy --only hosting
# 输出: https://officeomr-dev.web.app
```

---

### 任务 4: Firestore Rules 与安全配置
**目的**: 配置访问控制，确保只有授权用户能访问数据

#### Subtask 4.1: 实现 Firestore Rules

**文件**: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 系统设置（super admin 可读写，其他可读）
    match /settings/global {
      allow read: if request.auth != null;
      allow write: if has_role('super_admin');
    }
    
    // 任务结果（用户可查看自己的，super admin 可查看全部）
    match /jobs/{jobId} {
      allow read: if request.auth.uid == resource.data.user_id || has_role('super_admin');
      allow write: if request.auth != null; // Cloud Function 写入
      
      // 禁止删除（只有后台定时清理函数可删）
      allow delete: if false;
    }
    
    // 组织信息（已批准的教师可查看自己的组织）
    match /orgs/{orgId} {
      allow read: if request.auth.token.org_id == orgId || has_role('super_admin');
      allow write: if has_role('super_admin');
    }
    
    // 用户信息（super admin 可读，用户可读自己的）
    match /users/{userId} {
      allow read: if request.auth.uid == userId || has_role('super_admin');
      allow write: if has_role('super_admin');
    }
    
    // 用量统计
    match /usage/{day} {
      allow read: if has_role('super_admin') || (request.auth.token.org_id != null);
      allow write: if request.auth != null; // Cloud Function 更新
    }
  }
  
  // 辅助函数
  function has_role(role) {
    return request.auth.token[role] == true;
  }
}
```

#### Subtask 4.2: 实现 Storage Rules

**文件**: `storage.rules`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 用户的上传图片（用户与 super admin 可读）
    match /uploads/{userId}/{allPaths=**} {
      allow read, write: if request.auth.uid == userId || has_role('super_admin');
      // 24 小时后自动删除（通过 Lifecycle Policy 或定时函数）
    }
    
    // 识别结果（用户与 super admin 可读）
    match /jobs/{jobId}/{allPaths=**} {
      allow read: if has_job_access(jobId) || has_role('super_admin');
      allow write: if request.auth.uid == get_job_user(jobId) || has_role('super_admin');
    }
    
    // 公开（答案纸 PDF 模板）
    match /public/{allPaths=**} {
      allow read: if true;
      allow write: if has_role('super_admin');
    }
  }
  
  function has_role(role) {
    return request.auth.token[role] == true;
  }
  
  function has_job_access(jobId) {
    return request.auth.uid == firestore.get(/databases/(default)/documents/jobs/{jobId}).data.user_id;
  }
  
  function get_job_user(jobId) {
    return firestore.get(/databases/(default)/documents/jobs/{jobId}).data.user_id;
  }
}
```

#### Subtask 4.3: 部署规则
```powershell
firebase deploy --only firestore:rules,storage
```

---

### 任务 5: Cloud Storage 生命周期与清理
**目的**: 自动删除 24 小时后的用户数据

#### Subtask 5.1: 配置 Storage 生命周期策略

**在 Google Cloud 控制台**:
1. 进入 Cloud Storage → 选择 `officeomr-dev_cloudstorage_bucket`
2. 创建生命周期规则:
   - 条件: `Age: 1 day`
   - 操作: `Delete`
   - 路径: `uploads/`, `jobs/` 下除 `results/` 之外的文件

**或通过 gcloud 命令**:
```powershell
# 创建 lifecycle.json
@"
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 1}
      }
    ]
  }
}
"@ | Out-File lifecycle.json

# 应用到 Storage bucket
gsutil lifecycle set lifecycle.json gs://officeomr-dev_cloudstorage_bucket
```

#### Subtask 5.2: Firestore 定时清理函数（可选）

**Cloud Scheduler + Cloud Function** (如需更精细的控制):

```python
@functions.pubsub_event
def cleanup_expired_jobs(event, context):
    """每小时清理过期任务"""
    db = firestore.client()
    now = datetime.now()
    
    # 找所有 expires_at < now 的文档
    expired = db.collection('jobs').where(
        'expires_at', '<', now
    ).stream()
    
    for doc in expired:
        # 删除 Storage 中对应的文件
        storage.delete_folder(f'jobs/{doc.id}')
        # 删除 Firestore 文档
        doc.reference.delete()
```

---

### 任务 6: 本地测试与验证
**目的**: 在本地模拟云端环境，验证功能正确性

#### Subtask 6.1: 使用 Firebase Emulator Suite

```powershell
# 安装
firebase install:emulators

# 启动模拟器
firebase emulators:start

# 输出示例:
# ✔  functions: http://localhost:5001/officeomr-dev/asia-southeast1/recognize_sheet
# ✔  firestore: http://localhost:8080
# ✔  storage: http://localhost:4000
```

#### Subtask 6.2: 本地测试脚本

**文件**: `tools/test_cloud_function_local.py`

```python
import requests
import json
from pathlib import Path

# 测试参数
LOCAL_FUNCTION_URL = "http://localhost:5001/officeomr-dev/asia-southeast1/recognize_sheet"
TEST_IMAGE = "eval/synthetic/001.png"
TEMPLATE = "T100-A4-v1"

def test_recognize_sheet_local():
    """本地测试 recognize_sheet 函数"""
    with open(TEST_IMAGE, 'rb') as f:
        files = {
            'image': f,
            'template': (None, TEMPLATE)
        }
        
        # 模拟 Authorization header（仅本地测试）
        headers = {'Authorization': 'Bearer test-token'}
        
        response = requests.post(LOCAL_FUNCTION_URL, files=files, headers=headers)
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(json.dumps(result, indent=2))
    
    # 验证结果格式
    assert 'job_id' in result
    assert 'result' in result
    assert 'annotated_image_url' in result
    print("✅ 本地测试通过")

if __name__ == '__main__':
    test_recognize_sheet_local()
```

**运行**:
```powershell
python tools/test_cloud_function_local.py
```

#### Subtask 6.3: 对比云端与本地结果

```python
def test_cloud_vs_local():
    """验证云端与本地识别结果逐位相同"""
    # 准备测试图片
    test_images = list(Path("eval/synthetic").glob("*.png"))[:5]
    
    for img_path in test_images:
        # 1. 本地识别
        local_result = pipeline.recognize(img_path)
        
        # 2. 云端识别
        cloud_result = call_cloud_function(img_path)
        
        # 3. 对比
        assert local_result['student_id'] == cloud_result['student_id']
        assert local_result['answers'] == cloud_result['answers']
        assert local_result['summary']['overall_accuracy'] == cloud_result['summary']['overall_accuracy']
        
        print(f"✅ {img_path.name}: 云端与本地结果相同")
```

---

### 任务 7: 部署到生产环境
**目的**: 将代码部署到 Firebase 生产环境

#### Subtask 7.1: 完整部署

```powershell
# 1. 验证配置
firebase projects:list
firebase use default  # 确保使用 officeomr-dev

# 2. 部署全部
firebase deploy

# 输出应包括:
# ✔  Deploy complete!
# ✔  Project Console: https://console.firebase.google.com/project/officeomr-dev
# ✔  Hosting URL: https://officeomr-dev.web.app
```

#### Subtask 7.2: 验收测试（Wes）

**步骤**:
1. 打开 https://officeomr-dev.web.app
2. 用 Google 账号登录
3. 上传一张真实扫描的答题纸
4. 等待识别完成（目标 < 10 秒）
5. 验证结果:
   - ✅ 学号正确
   - ✅ 各题答案与视觉一致
   - ✅ 标注调试图清晰
   - ✅ 可下载结果 JSON

#### Subtask 7.3: 监控与日志

```powershell
# 查看 Cloud Functions 日志
firebase functions:log

# 或通过 GCP 控制台
# Cloud Functions → recognize_sheet → 日志

# 查看错误
firebase functions:error
```

---

## 时间表

| 阶段 | 任务 | 预计时间 |
|------|------|---------|
| **准备** | 环境验证、Firebase 升级到 Blaze | 1 天 |
| **函数开发** | recognize_sheet + 集成 omr_core | 2-3 天 |
| **前端开发** | 登录、上传、结果显示 | 2 天 |
| **安全配置** | Firestore/Storage Rules | 1 天 |
| **测试** | 本地模拟 + 云端验证 | 1-2 天 |
| **部署** | 生产环境部署 + Wes 验收 | 1 天 |
| **总计** | | **7-10 天** |

---

## 立即行动（第 1 天）

### P0 优先级

**步骤 1**: 验证本地环境
```powershell
python --version  # 应该 >= 3.12
node --version
firebase --version
```

**步骤 2**: Firebase 项目升级到 Blaze
1. 进入 [Firebase Console](https://console.firebase.google.com/)
2. 选择 `officeomr-dev`
3. 升级到 Blaze
4. 设置预算提醒 (RM 10, 阈值 50%/90%/100%)

**步骤 3**: 准备 functions 目录
```powershell
cd functions

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 检查
python -c "import functions_framework; import firebase_admin; print('✅ 依赖正常')"
```

**步骤 4**: 同步 omr_core 到 functions
```powershell
Copy-Item -Path "core/omr_core" -Destination "functions/" -Recurse -Force
Copy-Item -Path "sheetgen/layout.py" -Destination "functions/sheetgen_layout.py"
Copy-Item -Path "core/omr_core/config.default.yaml" -Destination "functions/"
```

**步骤 5**: 启动本地模拟器
```powershell
firebase emulators:start
# 应该看到 functions、firestore、storage 都启动成功
```

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `functions/main.py` | Cloud Function 入口点 |
| `functions/requirements.txt` | Python 依赖列表 |
| `functions/omr_core/` | 识别核心库（从 core/ 复制） |
| `functions/config.default.yaml` | 配置文件（从 core/ 复制） |
| `web/index.html` | 前端 UI |
| `web/auth.js` | 身份验证与上传逻辑 |
| `web/style.css` | 样式（可选） |
| `firestore.rules` | Firestore 访问控制 |
| `storage.rules` | Storage 访问控制 |
| `firebase.json` | Firebase 配置 |
| `.firebaserc` | 项目ID映射 |
| `tools/test_cloud_function_local.py` | 本地测试脚本 |

---

## 成功标准 (M5 验收)

✅ **环境**
- Firebase 项目升级到 Blaze
- 本地环境配置完成（Python 3.12+、Node.js、Firebase CLI）

✅ **Cloud Function**
- `recognize_sheet` 函数已部署
- 支持图片和 PDF 上传
- 返回结果 JSON + 标注调试图

✅ **前端**
- Google 登录成功
- 能上传图片/PDF
- 显示识别结果与标注图

✅ **安全**
- 未登录请求返回 401
- 非白名单邮箱登录后被拒
- Firestore/Storage Rules 已部署

✅ **测试**
- 本地模拟器测试通过
- 云端结果与本地结果逐位相同
- Wes 用真实扫描验证，10 秒内看到结果

---

## 下一个里程碑

**M6 — 管理系统与账户体系**: 
- Google 账号 + 邮箱白名单
- 角色（super admin、teacher）
- 组织管理（学号格式、选项数、每日张数限制）
- 教师批准流程

---

**创建时间**: 2026-11-04  
**状态**: 待开始

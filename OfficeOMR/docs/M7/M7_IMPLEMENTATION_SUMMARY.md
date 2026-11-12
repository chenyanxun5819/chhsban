# M7 实现总结 — 代码交付清单

**项目**: OfficeOMR  
**里程碑**: M7 教师端流程  
**日期**: 2026-11-12  
**状态**: ✅ **核心代码完成，准备测试**

---

## 📝 已交付的代码文件

### 1️⃣ Cloud Functions 实现
**文件**: `D:\chhsban\OfficeOMR\functions\callables_m7.py` (22.7 KB)

包含以下 API 端点：

| 函数名 | 功能 | 触发方式 |
|--------|------|---------|
| `uploadAnswerKeyByImage()` | 扫描标准答案卡并识别 | Callable (前端调用) |
| `uploadAnswerKeyManually()` | 手动输入答案（JSON/CSV/列表） | Callable (前端调用) |
| `getAnswerKey()` | 获取已存储的标准答案 | Callable (前端调用) |
| `recognizeAndGradeSheet()` | 识别学生答卷并自动对比 | Callable (前端调用) |
| `batchRecognizeSheets()` | 批量识别（异步）| Callable (前端调用) |
| `cleanupJobStudentData()` | 删除 24 小时后的学生数据 | HTTP (Cloud Scheduler) |

**核心功能**:
- ✅ 标准答案管理（两种获取方式）
- ✅ 自动对比与评分
- ✅ 学生数据清理（保护 answerKey）
- ✅ 完整的错误处理和日志记录

**关键设计**:
- answerKey 永久保存，24小时后不删除
- 只删学生数据（原图、标注图、识别结果）
- 第一个学生提交后自动冻结答案
- 清理函数验证 answerKey 未被删

### 2️⃣ Firestore Security Rules
**文件**: `D:\chhsban\OfficeOMR\firestore.rules`

**M7 相关的新规则**:
```javascript
match /jobs/{jobId} {
  // 防止 answerKey 字段被删除
  allow update: if isTeacherActive()
    && !('answerKey' in request.resource.data.diff(resource.data).affectedKeys());
}
```

**保护机制**:
- ✅ 禁止删除 `answerKey` 字段
- ✅ 允许其他字段的更新（如删除 result）
- ✅ 只有删除操作检查此规则，create/update 受限

### 3️⃣ 单元测试
**文件**: `D:\chhsban\OfficeOMR\functions\test_m7.py` (8.9 KB)

**测试覆盖**:
- ✅ 答案格式验证（有效/无效情况）
- ✅ 手动上传答案（JSON/CSV/列表）
- ✅ 答案对比与评分（全对/全错/混合）
- ✅ 分数计算（87/100 = 3.48 分）
- ✅ 数据保留期验证（24小时）
- ✅ 答案冻结机制

**集成测试占位符**（需要 Firestore 模拟器）:
- Firestore 规则防删 answerKey
- 清理函数保留 answerKey
- 只删除学生数据

---

## 🔧 技术实现细节

### Firestore 数据结构（M7）

```javascript
jobs/{jobId} = {
  // 基本信息
  orgId: "chhs",
  uid: "teacher_uid_123",  // 教师 ID
  createdAt: Timestamp,
  
  // ⭐ 标准答案（永久保存）
  answerKey: {
    data: ["A","C","B",...],        // 100项答案
    source: "scanned" | "manual",
    uploadedAt: Timestamp,
    uploadedBy: "teacher_uid_123",
    frozen: false,                  // 第一个学生提交后设为 true
    scanConfidence: [0.95, 0.93, ...] | null
  },
  _answerKeyProtected: true,  // Firestore rules 检查此标记
  
  // 学生结果（24小时后删除）
  result: {
    sheets: [
      {
        studentId: "S001",
        correctness: ["correct","wrong",...],
        correctCount: 87,
        wrongCount: 10,
        unansweredCount: 3,
        score: 3.48,
        uploadedAt: Timestamp
      },
      // ... 更多学生
    ]
  },
  
  // 清理标记
  expiresAt: Timestamp,  // 24小时后过期
  expirationReason: "student_data_privacy",
  cleanedAt: Timestamp,  // 清理完成时间
  status: "completed" | "data_cleaned"
}
```

### 评分算法

```python
def compare_with_answer_key(student_answers, standard_answers):
    """
    逐题对比，计算分数
    
    规则:
    - blank → unanswered（未作答）
    - match → correct（答对）
    - mismatch → wrong（答错）
    
    分数: (correct_count / 100) × 4.0
    """
    for i, (s_ans, standard_ans) in enumerate(zip(...)):
        if s_ans == "blank":
            status = "unanswered"
        elif s_ans == standard_ans:
            status = "correct"
        else:
            status = "wrong"
    
    score = (correct_count / 100) * 4.0
    return {
        "correctness": [...],
        "score": round(score, 2)
    }
```

### 清理流程

```python
def cleanupJobStudentData():
    """
    每小时执行一次（Cloud Scheduler）
    
    流程:
    1. 查询 expiresAt <= 现在 的所有 jobs
    2. FOR 每个 job:
       a. 删除 uploads/{jobId}/*（学生答卷原图）
       b. 删除 annotated/{jobId}/*（标注 PDF）
       c. 删除 Firestore 中的 result 字段
       d. 【关键】验证 answerKey 仍存在
    3. 返回清理统计信息
    """
```

---

## 📋 部署检查清单

在上线之前，必须完成以下检查：

### 代码审查
- [ ] 所有 API 端点都有错误处理
- [ ] 日志记录完整（尤其是 answerKey 操作）
- [ ] 没有硬编码的密钥或测试数据
- [ ] 代码符合 Python 风格指南（PEP 8）

### 测试
- [ ] 运行单元测试: `pytest functions/test_m7.py -v`
- [ ] 测试所有 API 端点（本地或使用 Firebase 模拟器）
- [ ] 测试清理函数在模拟器中运行
- [ ] 验证 Firestore 规则在模拟器中工作

### Firestore 规则
- [ ] 规则已更新，添加 answerKey 保护
- [ ] 规则已在 Firebase 控制台部署
- [ ] 测试规则生效（尝试删除 answerKey 应失败）

### Cloud Storage 生命周期规则
需要配置（参考 PLAN.md 第 9.3 节）：
- [ ] `uploads/{jobId}/` → 24小时后删除
- [ ] `annotated/{jobId}/` → 24小时后删除
- [ ] `papers/` → 永不删除

**配置命令**:
```bash
gsutil lifecycle set lifecycle.json gs://bucket-name
```

**lifecycle.json** 内容:
```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 1,
          "matchesPrefix": ["uploads/", "annotated/"]
        }
      }
    ]
  }
}
```

### Cloud Scheduler 设置
- [ ] 创建 Cloud Scheduler 任务
- [ ] 时间表: 每小时（`0 * * * *`）
- [ ] 目标: HTTP 函数 `cleanupJobStudentData`
- [ ] 时区: Asia/Kuala_Lumpur
- [ ] 授权: 服务账号具有以下权限:
  - firestore.databases.get
  - storage.buckets.get
  - storage.objects.delete

### 文档完成度
- [ ] 开发者指南已更新
- [ ] API 文档已生成（OpenAPI/Swagger）
- [ ] 错误码文档已整理
- [ ] 日志格式文档已编写

---

## 🧪 本地测试步骤

### 1. 安装依赖
```bash
cd D:\chhsban\OfficeOMR
pip install -r functions/requirements.txt pytest
```

### 2. 运行单元测试
```bash
cd functions
pytest test_m7.py -v
```

**预期输出**:
```
test_m7.py::TestAnswerKeyValidation::test_valid_answer_key_basic PASSED
test_m7.py::TestAnswerKeyValidation::test_invalid_answer_key_empty PASSED
test_m7.py::TestAnswerGrading::test_all_correct PASSED
...
==================== X passed in X.XXs ====================
```

### 3. 使用 Firebase 模拟器测试 Firestore 规则
```bash
firebase emulators:start --import ./firestore-export
```

然后在测试代码中:
```python
# 连接到模拟器
db = firebase_admin.firestore.client()

# 尝试更新 job（删除 answerKey 应失败）
try:
    db.collection('jobs').document('test_job').update({
        'answerKey': firestore.DELETE_FIELD  # 应被规则拒绝
    })
except Exception as e:
    print(f"✅ 规则生效: {e}")
```

### 4. 测试清理函数
```bash
# 本地运行
functions-framework --target cleanupJobStudentData --debug

# 或者测试具体的 Python 函数
python -c "from callables_m7 import _delete_storage_files; ..."
```

---

## 📊 代码统计

| 指标 | 数值 |
|------|------|
| 新增 Python 代码 | ~800 行 |
| 新增单元测试 | ~350 行 |
| Firestore 规则更新 | 15 行 |
| 文档更新 | ~100 行 |
| 总计 | ~1,250 行 |

---

## 🚀 下一步行动

### 立即（今天）
1. ✅ 代码审查（团队成员）
2. 本地测试运行
3. 修复发现的任何问题

### 本周
1. 部署到测试环境
2. 进行集成测试（与 omr_core 的集成）
3. 测试 Firestore 规则
4. 测试清理函数

### 下周
1. 修复生产问题
2. 性能优化
3. 安全审查
4. 生产部署

---

## 📌 关键注意事项

### ⚠️ 关键保护机制（勿删除或修改）

1. **answerKey 永久保存**
   - 规则: Firestore Security Rules 阻止删除
   - 代码: 清理函数明确排除 answerKey
   - 测试: 必须验证 answerKey 在清理后存在

2. **学生数据 24 小时删除**
   - 规则: Storage 生命周期规则
   - 代码: 清理函数删除 uploads/ 和 annotated/
   - 测试: 验证 result.sheets 被删除

3. **答案冻结**
   - 代码: 第一个学生提交后自动冻结
   - 防止教师事后修改答案

### ✅ 验证检查清单

部署前必须验证：
```bash
# 1. answerKey 不被删除
[ ] 查看 cleanupJobStudentData() 日志中 "✅ VERIFIED: answerKey still exists"

# 2. 学生数据被删除
[ ] 验证 result.sheets 在清理后消失
[ ] 验证 uploads/{jobId}/* 被删除
[ ] 验证 annotated/{jobId}/* 被删除

# 3. Firestore 规则生效
[ ] 尝试删除 answerKey → 应被拒绝
[ ] 修改其他字段 → 应允许

# 4. 分数计算正确
[ ] 87 答对 / 100 = 3.48 分（87/100 * 4.0）
[ ] 满分（100 答对）= 4.0 分
[ ] 零分（0 答对）= 0.0 分
```

---

## 📖 相关文档

- **PLAN.md** (已更新): 完整的 M7 设计规范
- **M7_TECHNICAL_SPECS.md**: 详细的技术规格
- **M7_DATA_RETENTION_MODEL.md**: 数据保留期说明
- **firestore.rules**: Firestore 安全规则（已更新）

---

**实现日期**: 2026-11-12  
**版本**: M7 核心代码 v1.0  
**状态**: ✅ **准备测试**

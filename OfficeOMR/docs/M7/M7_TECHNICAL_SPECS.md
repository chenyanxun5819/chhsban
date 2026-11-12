# M7 技术实现规格 — 代码细节

**日期**: 2026-11-11  
**项目**: OfficeOMR  
**里程碑**: M7 教师端流程  
**文档类型**: 技术规格（代码实现）  

---

## 🔧 核心模块

### 1. 标准答案管理模块

#### 1.1 接口定义

```python
# firestore_m7.py

class AnswerKeyManager:
    """标准答案的获取、存储、检索"""
    
    def upload_answer_key_by_scan(
        self,
        job_id: str,
        image_file: bytes,
        image_format: str = "jpg"
    ) -> dict:
        """
        通过扫描标准答案卡上传
        
        参数:
          job_id: 考试场次ID
          image_file: 图片字节流（PDF/JPG/PNG）
          image_format: 图片格式
          
        返回:
          {
            "success": true,
            "answerKey": ["A","C","B",...],
            "confidence": [0.95, 0.93, ...],
            "uploadedAt": ISO8601,
            "source": "scanned"
          }
          
        异常:
          - FileFormatError: 不支持的图片格式
          - OMRRecognitionError: 识别失败（建议重扫）
          - JobNotFoundError: jobId 不存在
        """
        pass
    
    def upload_answer_key_by_manual(
        self,
        job_id: str,
        answer_key: Union[list, str],
        format_type: str = "json"
    ) -> dict:
        """
        通过手动输入上传
        
        参数:
          job_id: 考试场次ID
          answer_key: 答案数组或 JSON/CSV 字符串
          format_type: "json" | "csv" | "list"
          
        返回:
          {
            "success": true,
            "answerKey": ["A","C","B",...],
            "uploadedAt": ISO8601,
            "source": "manual"
          }
          
        异常:
          - ValidationError: 答案格式不对
          - JobNotFoundError: jobId 不存在
        """
        pass
    
    def get_answer_key(self, job_id: str) -> dict:
        """
        获取已上传的标准答案
        
        返回:
          {
            "answerKey": ["A","C","B",...],
            "uploadedAt": ISO8601,
            "source": "scanned | manual",
            "uploadedBy": "teacher_uid_123"
          }
          
        异常:
          - JobNotFoundError: jobId 不存在
          - AnswerKeyNotFoundError: 标准答案未上传
        """
        pass
    
    def freeze_answer_key(self, job_id: str) -> bool:
        """
        冻结标准答案（第一张学生卷上传后自动调用）
        防止事后修改标准答案
        """
        pass
```

#### 1.2 存储结构

```javascript
// Firestore: jobs/{jobId}

{
  // ... 基本字段 ...
  
  // ⭐ 标准答案字段（永久保存）
  answerKey: {
    data: ["A", "C", "B", "B", "A", "E", ...],      // 100项答案
    source: "scanned" | "manual",
    uploadedAt: Timestamp,
    uploadedBy: "teacher_uid_123",
    frozen: false,  // 第一个学生提交后设为 true
    
    // 如果是扫描的，保留识别置信度
    scanConfidence: [0.95, 0.93, 0.98, ...] | null
  },
  
  // 防止误删的标记
  _answerKeyProtected: true  // Firestore rules 检查此标记
}
```

---

### 2. 自动对比与识别模块

#### 2.1 接口定义

```python
# firestore_m7.py

class SheetRecognitionAndGrading:
    """学生答卷识别 + 标准答案对比"""
    
    def recognize_and_grade_sheet(
        self,
        job_id: str,
        sheet_image: bytes,
        student_id: str,
        sheet_number: int
    ) -> dict:
        """
        识别学卷并自动对比标准答案
        
        流程:
        1. 调用 omr_core.recognize_sheet() 识别学号 + 答案
        2. 获取 jobs/{jobId}.answerKey
        3. 逐题对比
        4. 计算分数（假设 100题满分 4.0 分）
        5. 存入 Firestore
        
        参数:
          job_id: 考试场次ID
          sheet_image: 扫描图的字节流
          student_id: 学号
          sheet_number: 第几张卷（用于去重）
          
        返回:
          {
            "success": true,
            "studentId": "S001",
            "correctness": ["correct", "wrong", "unanswered", ...],  // 100项
            "correctCount": 87,
            "wrongCount": 10,
            "unansweredCount": 3,
            "score": 3.48,  // 87/100 * 4.0
            "uploadedAt": ISO8601,
            "annotatedImageUrl": "gs://bucket/annotated/job_ABC.../file.pdf"
          }
          
        异常:
          - JobNotFoundError: jobId 不存在
          - AnswerKeyNotFoundError: 标准答案未上传
          - OMRRecognitionError: 识别失败
          - DuplicateSheetError: 重复上传
        """
        pass
    
    def batch_recognize_sheets(
        self,
        job_id: str,
        sheet_images: List[tuple]  # [(image, student_id, sheet_number), ...]
    ) -> List[dict]:
        """
        批量识别（异步）
        
        参数:
          sheet_images: [(image_bytes, "S001", 1), ...]
          
        返回:
          同 recognize_and_grade_sheet 的返回值列表
        """
        pass
```

#### 2.2 对比逻辑

```python
def compare_with_answer_key(
    recognized_answers: List[str],      # 学生答案: ["A", "C", "blank", ...]
    standard_answers: List[str]         # 标准答案: ["A", "C", "B", ...]
) -> dict:
    """
    逐题对比
    
    规则:
    - 如果学生未作答（blank），标记为 "unanswered"
    - 否则比对，相同为 "correct"，不同为 "wrong"
    """
    correctness = []
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    
    for i, (student_ans, standard_ans) in enumerate(
        zip(recognized_answers, standard_answers)
    ):
        if student_ans == "blank":
            correctness.append("unanswered")
            unanswered_count += 1
        elif student_ans == standard_ans:
            correctness.append("correct")
            correct_count += 1
        else:
            correctness.append("wrong")
            wrong_count += 1
    
    # 计算分数（100题满分4.0分）
    score = (correct_count / len(standard_answers)) * 4.0
    
    return {
        "correctness": correctness,
        "correctCount": correct_count,
        "wrongCount": wrong_count,
        "unansweredCount": unanswered_count,
        "score": round(score, 2)
    }
```

---

### 3. 自动清理模块（24小时后删除学生数据）

#### 3.1 Cloud Scheduler 配置

```yaml
# 每小时检查一次，删除过期的学生数据
schedule: "0 * * * *"
timezone: "Asia/Kuala_Lumpur"
http_target:
  uri: "https://region-project.cloudfunctions.net/cleanup_job_student_data"
  http_method: POST
  headers:
    "Authorization": "Bearer $(BEARER_TOKEN)"
```

#### 3.2 Cloud Function 实现

```python
# functions/cleanup_jobs_m7.py

import firebase_admin
from firebase_admin import firestore, storage
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

def cleanup_job_student_data(request):
    """
    Cloud Scheduler 触发的定期清理函数
    
    功能:
    1. 查找 expiresAt <= 现在 的所有 jobs
    2. 删除 Storage 中的学生数据（uploads/, annotated/）
    3. 清空 Firestore 中的学生结果
    4. 保留 answerKey 和题目信息
    5. 记录清理操作
    
    触发频率: 每小时一次
    """
    
    try:
        db = firestore.client()
        bucket = storage.bucket()
        
        # 1. 查找过期的 jobs
        now = datetime.utcnow()
        expired_jobs = db.collection('jobs').where(
            'expiresAt', '<=', now
        ).where(
            'expirationReason', '==', 'student_data_privacy'
        ).stream()
        
        cleanup_count = 0
        
        for job_doc in expired_jobs:
            job_id = job_doc.id
            job_data = job_doc.to_dict()
            
            try:
                # 2. 删除 Storage 文件
                _delete_storage_files(bucket, job_id)
                
                # 3. 清空 Firestore 中的学生结果（但保留 answerKey）
                db.collection('jobs').document(job_id).update({
                    'result': firestore.DELETE_FIELD,
                    'cleanedAt': now,
                    'status': 'data_cleaned'
                })
                
                cleanup_count += 1
                logger.info(f"✅ Cleaned job {job_id}: student data removed")
                
                # 4. 验证 answerKey 是否保留（测试用）
                doc_after = db.collection('jobs').document(job_id).get()
                if 'answerKey' not in doc_after.to_dict():
                    logger.error(f"❌ DANGER: answerKey deleted for {job_id}!")
                else:
                    logger.info(f"✅ VERIFIED: answerKey still exists for {job_id}")
                    
            except Exception as e:
                logger.error(f"❌ Error cleaning job {job_id}: {e}")
        
        return {
            "success": True,
            "cleanupCount": cleanup_count,
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Cleanup function failed: {e}")
        return {"success": False, "error": str(e)}, 500


def _delete_storage_files(bucket, job_id: str):
    """删除指定 job 的所有学生数据文件"""
    
    # 删除上传的原图
    blobs = bucket.list_blobs(prefix=f"uploads/{job_id}/")
    for blob in blobs:
        blob.delete()
        logger.debug(f"Deleted: {blob.name}")
    
    # 删除标注图
    blobs = bucket.list_blobs(prefix=f"annotated/{job_id}/")
    for blob in blobs:
        blob.delete()
        logger.debug(f"Deleted: {blob.name}")
```

#### 3.3 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    match /jobs/{jobId} {
      // 防止删除 answerKey
      allow update: if !request.resource.data.diff(resource.data).affectedKeys()
                          .hasAny(['answerKey']);
      
      // 清理函数允许删除 result，但不能删除 answerKey
      allow update: if request.auth.uid == request.resource.data.answerKeyProtected;
      
      // 教师能读写自己的考试
      allow read, write: if request.auth.uid == resource.data.createdBy;
    }
  }
}
```

---

### 4. 数据导出模块

#### 4.1 接口定义

```python
# firestore_m7.py

class ResultExporter:
    """结果导出（CSV/PDF）"""
    
    def export_results_csv(self, job_id: str) -> bytes:
        """导出 CSV"""
        pass
    
    def export_annotated_pdfs(self, job_id: str) -> List[bytes]:
        """导出所有学生的标注 PDF"""
        pass
    
    def generate_class_analysis_pdf(self, job_id: str) -> bytes:
        """生成班级分析报表（第二阶段功能预留）"""
        pass
```

---

## 🧪 单元测试检查清单

### 必须测试的项（保证数据完整性）

```python
# tests/test_m7_answer_key_protection.py

def test_answer_key_not_deleted_after_cleanup():
    """验证清理函数不会删除 answerKey"""
    # 1. 创建 job，上传 answerKey
    # 2. 上传学生答卷
    # 3. 手动触发清理函数
    # 4. 验证 answerKey 仍然存在
    # 5. 验证 result 已删除
    pass

def test_answer_key_frozen_after_first_submission():
    """验证第一个学生提交后，answerKey 被冻结"""
    pass

def test_manual_upload_preserves_answer_key():
    """验证手动修改 answerKey 后，仍被保留"""
    pass

def test_scanned_answer_key_confidence():
    """验证扫描答卷的置信度被记录"""
    pass

def test_batch_recognition_with_answer_key():
    """验证批量识别时的答案对比"""
    pass

def test_firestore_rules_prevent_answer_key_deletion():
    """验证 Firestore Security Rules 防止 answerKey 被删"""
    pass
```

---

## 📊 性能指标（目标）

| 指标 | 目标 | 备注 |
|------|------|------|
| 扫描标准答卡 | < 5 秒 | OMR 识别时间 |
| 识别单张学卷 | < 10 秒 | OMR + 对比 |
| 批量识别 | < 1分钟/100张 | 异步处理 |
| 清理操作 | < 5分钟/1000个jobs | 每小时执行 |
| CSV 导出 | < 3 秒/100学生 | 文件生成 |

---

## 🚨 关键注意事项

1. **永久保存检查**: 每次清理后，验证 `answerKey` 字段仍存在
2. **冻结机制**: 防止事后修改标准答案或学生答案
3. **存储前缀隔离**: 确保清理函数只删除 `uploads/` 和 `annotated/`，永远不删除 `papers/`
4. **错误日志**: 任何 `answerKey` 操作都要记录，便于审计
5. **备份**: 生产环境上线前，备份一份完整的数据

---

**最后更新**: 2026-11-11  
**版本**: 技术规格 v1  
**状态**: ⏳ 等待代码审查

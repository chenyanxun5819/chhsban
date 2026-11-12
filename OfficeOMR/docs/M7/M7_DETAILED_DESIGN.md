# M7 详细业务流程设计 — 完整版

**日期**: 2026-11-11（修正版）  
**项目**: OfficeOMR  
**里程碑**: M7 教师端流程  
**作者**: Wes (business) + Copilot (design)  

---

## 📌 关键设计问题与解决

### 问题 1️⃣ 
**缺少关键步骤**
> 老师在申请新的答案纸的同时，是不是也要先输入这个考题的正确答案？否则在上传学生答案纸时，如何分析？

**解决**: ✅ 新增 M7 第 2 步：获取标准答案（两种方式）

### 问题 2️⃣ 
**保留期混淆**
> 标准答案为什么要 24 小时删除？如果老师改卷没在 24 小时完成，是不是还要重新上传一遍标准答案？

**解决**: ✅ 修正：
- **标准答案永久保存**（与题目一起）
- **只有学生数据 24 小时删除**（学号、答案卡、原图）

---

## 🎯 完整工作流

### 第一阶段：试卷准备

#### 步骤 1：新建考试
**谁**: 教师  
**做什么**: 
- 创建新的考试记录
- 输入基本信息（科目、年级、考试名称）
- 选择答题版型（100题 Borang IAGM600FC、自定义版型等）

**输入**:
```json
{
  "orgId": "chhs",
  "subject": "数学",
  "grade": "Form 4",
  "examName": "2026年11月月考",
  "format": "borang_100",
  "createdBy": "teacher_uid_123"
}
```

**输出**:
```json
{
  "jobId": "job_ABC123DEF456",
  "status": "draft",
  "createdAt": "2026-11-11T10:00:00Z"
}
```

---

#### ⭐ 步骤 2：获取标准答案（**关键新步骤**）

**谁**: 教师  
**做什么**: 获取并保存标准答案  
**保留期**: **永久**（与试卷一起）  
**为什么永久**: 
1. 老师改卷时间可能超 24 小时
2. 标准答案不含隐私（只有 A/B/C/D/E）
3. 隔年复用同一份试卷，标准答案必须保留

**方案 A：扫描标准答案卡**（推荐）
```
输入流程:
1. 打印空白答案纸（与学生版一致）
2. 老师用笔涂出 100 题正确答案
3. 扫描这张卡（彩色/黑白都可）
4. 系统用 OMR 核心识别（调用 omr_core.py）
5. 识别结果 → answerKey

输入:
  - 图片文件（PDF/JPG/PNG）
  
处理:
  - 调用 omr_core.recognize_sheet() 
  - 返回 ["A","C","B",...] 或 ["blank",...] 表示未涂
  
异常:
  - 如果某题识别不出 → 提示重新扫描或改用方案B
  
输出:
  answerKey = ["A","C","B","B","A","E",...]
```

**方案 B：手动输入**（备选/纠正用）
```
输入流程:
1. 系统展示 100 题的输入界面
2. 老师逐题选择 A/B/C/D/E/未涂
3. 或粘贴 JSON 批量输入
4. 或上传 CSV 批量输入

支持的格式:
  - 网页表单（下拉菜单）
  - JSON: ["A","C","B","B","A","E",...]
  - CSV: 
    题目,答案
    1,A
    2,C
    ...

输出:
  answerKey = ["A","C","B","B","A","E",...]
```

**存储结构**（M7 不建立 exams/，直接用 jobs/）:
```javascript
jobs/{jobId} = {
  answerKey: ["A","C","B",...],        // ✅ 永久保存
  answerKeySource: "scanned",         // 来源：scanned | manual
  answerKeyUploadedAt: "2026-11-11T10:30:00Z",
  // ... 其他字段
}
```

---

#### 步骤 3：下载答案纸（供学生填涂）

**谁**: 教师  
**做什么**: 
- 生成 PDF（100题空白答案纸）
- 教师下载并打印给学生

**输入**:
```json
{
  "jobId": "job_ABC123DEF456",
  "format": "borang_100"
}
```

**处理**:
- 调用 PDF 生成函数，使用内置版型
- 纸张格式：A4，每页 100 题答案框

**输出**:
- PDF 文件（例: `answerSheet_job_ABC123DEF456.pdf`）

---

### 第二阶段：学生作答与识别

#### 步骤 4：学生作答

**谁**: 学生  
**做什么**:
- 拿到打印的答案纸
- 手工涂出答案（铅笔涂满方框）

**无系统操作**（纯线下）

---

#### 步骤 5：教师上传学卷

**谁**: 教师  
**做什么**:
- 扫描学生的答案纸（彩色或黑白）
- 批量上传到系统

**输入**:
```
文件: 学生答案纸扫描图 × N
格式: PDF / JPG / PNG（彩色）
```

**存储**（24小时后删除）:
```
Storage: uploads/{jobId}/{timestamp}_{sheetnumber}.jpg
Firestore: jobs/{jobId}.result.sheets[*] = {
  studentId: "S001",
  filename: "uploads/job_ABC123DEF456/20261111_001.jpg"
}
```

---

#### ⭐ 步骤 6：自动识别 + 对比标准答案

**谁**: Cloud Function（自动）  
**做什么**:
1. 识别学号
2. 识别学生答案
3. **与 jobs/{jobId}.answerKey 对比** ← 这是关键
4. 判定每题答对/答错/未作答

**识别逻辑**:
```
FOR 每题 i = 1 to 100:
  student_answer[i] = 识别结果（A/B/C/D/E/blank）
  standard_answer[i] = answerKey[i]
  
  IF student_answer[i] == "blank":
    correctness[i] = "unanswered"
  ELSE IF student_answer[i] == standard_answer[i]:
    correctness[i] = "correct"
  ELSE:
    correctness[i] = "wrong"
    
RESULT = {
  studentId: "S001",
  correctness: [...],
  correctCount: 87,
  wrongCount: 10,
  unansweredCount: 3,
  score: 87/100 * 4 = 3.48  // 根据学校评分标准
}
```

**存储**（24小时后删除）:
```
Storage: annotated/{jobId}/{timestamp}_{sheetnumber}_annotated.pdf
Firestore: jobs/{jobId}.result.sheets[*] = {
  studentId: "S001",
  correctness: ["correct","wrong","correct",...],
  correctCount: 87,
  wrongCount: 10,
  score: 87
}
```

---

### 第三阶段：结果查看与导出

#### 步骤 7：查看结果

**谁**: 教师  
**做什么**:
- 查看每个学生的成绩
- 查看班级统计（答对率、分数分布）
- 下载各种报表

**展示内容**:
```
表格视图:
┌─────────┬──────┬────────────┬──────┐
│ 学号    │ 姓名 │ 答对/总数  │ 分数 │
├─────────┼──────┼────────────┼──────┤
│ S001    │ 张三 │ 87/100     │ 3.48 │
│ S002    │ 李四 │ 92/100     │ 3.68 │
└─────────┴──────┴────────────┴──────┘

班级统计:
- 平均分: 3.50
- 答对率分布:
  0-20%: 1人
  20-40%: 2人
  40-60%: 5人
  60-80%: 12人
  80-100%: 10人
```

---

#### 步骤 8：下载与导出

**谁**: 教师  
**做什么**:
- 下载标注 PDF（每个学生一份，标记错题）
- 导出结果 CSV（全班数据）
- 打印给学生

**下载清单**:
| 内容 | 格式 | 包含内容 |
|------|------|---------|
| 标注卷 | PDF × N | 每个学生一份，错题标红或打叉 |
| 结果表 | CSV | 学号、答对率、分数 |
| 班级分析 | PDF/CSV | 答对率分布、班级平均 |

**下载时限**: 24 小时内下载，之后学生数据自动删除

---

### 第四阶段：自动清理（24小时后）

#### 步骤 9：自动删除学生数据

**谁**: Cloud Scheduler + Cloud Function（自动）  
**何时**: 24 小时后  
**删除什么**（仅限学生层面）:
- ❌ 上传的答案纸原图（`uploads/{jobId}/*`）
- ❌ 标注 PDF（`annotated/{jobId}/*`）
- ❌ Firestore 中的学生答案数据（`jobs/{jobId}.result.sheets[*]`）

**保留什么**（题目层面）:
- ✅ 标准答案（`jobs/{jobId}.answerKey`）
- ✅ 题目信息（`jobs/{jobId}.examName` 等）
- ✅ 考试元数据（创建时间、教师、班级等）

**实现方式**:
```python
# Cloud Function: cleanup_job_student_data
def cleanup_job_student_data(jobId):
    # 1. 删除 Storage 文件
    delete_from_storage('uploads/' + jobId + '/*')
    delete_from_storage('annotated/' + jobId + '/*')
    
    # 2. 清空 Firestore 中的学生数据
    db.collection('jobs').document(jobId).update({
        'result.sheets': firestore.DELETE_FIELD,  # 删除学生结果
        'expiresAt': None  # 标记已过期
    })
    
    # 3. 保留 answerKey 和题目信息
    # (不动 jobs/{jobId}.answerKey)
```

---

## 🔑 核心设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| **标准答案保留期** | **永久** | 老师改卷超24h；隔年复用试卷 |
| **学生答案卡保留期** | **24小时** | 包含学号、姓名，隐私敏感 |
| **标准答案来源** | **两种方式** | 灵活：扫描卡（快）、手动输入（安全） |
| **自动对比** | **是** | 系统判定对错，避免手工计算 |
| **识别后冻结** | **是** | 防止事后改答案或改标准答案 |
| **24小时计时** | **从识别开始** | 学生数据上传后开始计时 |
| **批级分析** | **第二阶段** | M7 不做，但 Firestore 结构已预留接口 |

---

## 💾 Firestore 数据结构（M7阶段）

```javascript
jobs/{jobId} = {
  // 基本信息
  orgId: "chhs",
  createdBy: "teacher_uid_123",
  createdAt: ISODate("2026-11-11T10:00:00Z"),
  examName: "2026年11月月考",
  subject: "数学",
  grade: "Form 4",
  format: "borang_100",
  
  // ⭐ 标准答案（永久保存）
  answerKey: ["A","C","B","B","A","E",...],
  answerKeySource: "scanned",  // 来源：scanned | manual
  answerKeyUploadedAt: ISODate("2026-11-11T10:30:00Z"),
  
  // 学生结果（24小时后删除）
  result: {
    sheets: [
      {
        studentId: "S001",
        filename: "uploads/job_ABC123DEF456/20261111_001.jpg",
        correctness: ["correct","wrong","correct",...],
        correctCount: 87,
        wrongCount: 10,
        unansweredCount: 3,
        score: 3.48
      },
      // ... 更多学生
    ],
    generatedAt: ISODate("2026-11-11T11:00:00Z")
  },
  
  // 清理标记
  expiresAt: ISODate("2026-11-12T11:00:00Z"),  // 24小时后过期
  expirationReason: "student_data_privacy",
  
  // 状态
  status: "completed"
}
```

---

## 📋 验收标准（M7）

✅ **必须实现**:
1. 老师能输入标准答案（扫描或手动）
2. 标准答案成功存入 `jobs/{jobId}.answerKey`
3. 系统自动与标准答案对比
4. 结果显示对错统计
5. 教师能下载标注 PDF 和 CSV
6. 24小时后学生数据自动删除
7. **标准答案不被删除**

❌ **不能做**:
1. 老师不能上传答卷前输入标准答案
2. 24小时后删除标准答案
3. 让标准答案暴露在前端（只在识别时用）

---

## 🚀 立即行动清单

### 等待 Wes 确认的项
- [ ] 两种获取标准答案的方式都支持吗？（扫描 + 手动）
- [ ] 标准答案永久保存可以吗？
- [ ] 24小时删除范围只限学生数据，不包括标准答案？
- [ ] 分数计算标准是什么？（87/100 * 4 = 3.48 对吗？）
- [ ] 班级分析报表要在 M7 做还是留到第二阶段？

### 开发团队立即行动
- [ ] 整合 omr_core 到 M7 Cloud Function
- [ ] 实现标准答案存储与检索
- [ ] 实现自动对比逻辑
- [ ] 实现 24小时清理函数
- [ ] 写单元测试（确保 answerKey 不被删除）
- [ ] 与 PLAN.md 第 10.2 节对齐

---

**最后更新**: 2026-11-11  
**版本**: 详细设计 v2  
**状态**: ⏳ 等待确认

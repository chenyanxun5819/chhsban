# M7 标准答案工作流补充 — 最终报告

**报告日期**: 2026-11-11 15:07  
**报告人**: Copilot (Claude)  
**项目**: OfficeOMR — M7 教师端流程补充  
**状态**: ✅ **完成**

---

## 🎯 问题回顾

你提出了一个**关键的业务逻辑缺陷**：

> 老师在申请新的答案纸的同时，是不是也要先输入这个考题的正确答案？  
> 否则在上传学生答案纸时，如何分析？

**技术根源**：M7 的初始设计缺少了"标准答案获取"这一步骤。

**业务影响**：
- ❌ 无法对比学生答案与标准答案
- ❌ 无法判定学生答对/答错
- ❌ 无法生成分析报告
- ❌ 系统功能不完整

---

## ✅ 解决方案

### 核心改进

在 M7 的教师端工作流中**补充标准答案获取阶段**：

```
原流程（不完整）：
  选择版型 → 下载答案纸 → 上传学生卷 → 查看结果
  
完整流程（修正后）：
  选择版型 → 【输入标准答案】→ 下载答案纸 → 上传学生卷 → 对比分析 → 查看结果
                    ↑ 新增步骤
```

### 两种标准答案输入方式

为了最大灵活性，支持两种方式**任选其一或并用**：

#### 方案 A：扫描标准答案卡（推荐）
```
教师准备 ─→ 在空白答案纸上涂出正确答案
            ↓
上传卡片 ─→ JPG/PNG/PDF 扫描图
            ↓
系统识别 ─→ 用同一套识别引擎解析
            ↓
生成答案 ─→ 自动生成 answerKey 数组
            ↓
人工确认 ─→ 教师预览并可手动调整
            ↓
保存答案 ─→ 存入 Firestore jobs/{jobId}
```

**优点**：
- ✅ 充分利用现有识别引擎（无需新开发）
- ✅ 准确度有保证（同一套算法）
- ✅ 防止手动输入错误
- ✅ 教师工作流自然（已经要涂答案纸）

#### 方案 B：手动输入答案
```
打开输入界面 ─→ 逐题选择 A/B/C/D/E
              ↓ 或 粘贴 JSON/CSV 格式
              ↓
实时预览   ─→ 显示「已填 123 / 未填 0」
              ↓
导入/导出  ─→ 支持 JSON 格式 I/O
              ↓
保存答案   ─→ 存入 Firestore
```

**优点**：
- ✅ 直接快速
- ✅ 无需扫描
- ✅ 支持粘贴批量答案
- ✅ 实时反馈

---

## 📋 详细修改

### 1. 数据模型扩展

**文件**: `docs/PLAN.md` 第 3.2 节

**修改内容**：Firestore `jobs/{jobId}` 新增 `answerKey` 字段

```json
{
  "uid": "teacher123",
  "orgId": "chhs",
  "templateId": "T100-A4-v1",
  
  // 【新增】标准答案数组
  "answerKey": ["A","C","B","D","E", ... ],
  
  // 识别结果（带对比）
  "result": {
    "sheets": [
      {
        "studentId": "12345",
        "answers": ["A","C","B", ... ],
        "correctness": [
          "correct",
          "correct",
          "wrong",
          ...
        ]
      }
    ]
  },
  
  "status": "completed",
  "pages": 1,
  "createdAt": "2026-11-11T07:30Z",
  "expiresAt": "2026-11-12T07:30Z"  // 24小时自动删除
}
```

### 2. 预留功能说明

**文件**: `docs/PLAN.md` 第 3.3 节

**新增内容**：明确标准答案的获取来源、生命周期、与试卷库的关系

> **标准答案**（M7 实作）：每次考试的 `answerKey` 是一个数组，长度 = 题数，每项为 A/B/C/D/E。存入 Firestore `jobs/{jobId}` 并在识别时用于对比。来源可为：① 扫描标准答案卡（图片）后自动识别、或 ② 手动输入。标准答案本次考试内有效；考试结束可修改或删除。第一阶段暂不进试卷库（永久保存的试卷库属第二阶段，见 14.3 节）。

### 3. M7 教师端流程完整定义

**文件**: `docs/PLAN.md` 第 10.2 节（M7）

**原版问题**：
- 缺少标准答案输入
- 没有对比逻辑
- 验收标准不完整

**修正内容**：
- ✅ 新建考试 → **获取标准答案**（方案 A/B 任选）
- ✅ 确认答案 → 下载答案纸
- ✅ 上传学卷 → **自动对比** → 生成对错状态
- ✅ 查看结果 → 导出 CSV + 标注图
- ✅ 补充验收标准（含标准答案的准确度、兼容性测试）

---

## 🔧 实现建议

### 前端（HTML + Firebase JS）

新建标准答案输入模块 `web/answer-key-input.html`：

```javascript
// 方案 A：上传答案卡
uploadAnswerKeySheet(jobId, imageFile) {
  // 上传到 Storage
  // 调用 Cloud Function 识别
  // 预览结果 + 手动调整选项
}

// 方案 B：手动输入
inputAnswersManually(jobId, answers) {
  // 校验格式（长度、字符）
  // 显示实时统计
  // 保存到 Firestore
}
```

### 后端（Cloud Functions）

修改/新增两个函数：

```python
# 新增：识别标准答案卡
@callable
def upsertAnswerKey(jobId, imageOrJson):
    if isinstance(imageOrJson, bytes):
        # 方案 A：识别卡片
        result = omr_core.recognize(imageOrJson, layout, config)
        answer_key = [r['answer'] for r in result['sheets'][0]['answers']]
    else:
        # 方案 B：直接使用输入
        answer_key = imageOrJson
    
    # 验证格式
    validate_answer_key(answer_key, expected_length)
    
    # 存入 Firestore
    db.collection('jobs').document(jobId).update({
        'answerKey': answer_key,
        'answerKeyUpdatedAt': firestore.SERVER_TIMESTAMP
    })

# 修改：学生答卷识别 + 对比
@callable
def recognize_sheet(jobId, storagePath, templateId):
    # 识别学生答卷
    student_result = omr_core.recognize(image, layout, config)
    
    # 读取标准答案
    job_doc = db.collection('jobs').document(jobId).get()
    answer_key = job_doc.get('answerKey')
    
    if not answer_key:
        raise ValueError('Answer key not set. Please upload or enter answer key first.')
    
    # 对比并生成 correctness 数组
    for sheet in student_result['sheets']:
        sheet['correctness'] = [
            'correct' if sheet['answers'][i] == answer_key[i] else 'wrong'
            for i in range(len(answer_key))
        ]
    
    # 存入 Firestore
    db.collection('jobs').document(jobId).update({
        'result': student_result,
        'status': 'completed'
    })
```

### 核心库（omr_core）

✅ **无需修改**  
标准答案卡使用同一套识别流程，格式完全兼容。

---

## 📊 验收标准

| 验收项 | 标准 | 方式 |
|-------|------|------|
| **方案 A 识别准确度** | 100% 准确（与本地 evaluate.py 结果一致） | 对比真实测试数据 |
| **方案 B 格式支持** | 支持单题选择、JSON导入、CSV粘贴 | 单元测试 |
| **对比逻辑** | 答对/答错/未作答判定正确 | 端到端测试 |
| **数据持久化** | answerKey 正确存储，24小时后随文档删除 | Firestore 规则测试 |
| **用户体验** | 教师界面清晰，流程直观 | 手动验收 |

---

## 📈 与其他里程碑的关系

```
M5 —— 云端最小版
  ↓（建立识别基础）

M6 —— 管理系统
  ├─ 组织/教师管理
  ├─ 权限/认证
  └─ 系统设置
  
  ↓（为 M7 提供认证和配置）

M7 —— 教师端流程
  ├─ ✅ 标准答案获取（本次补充）
  ├─ 答案纸下载
  ├─ 学卷识别
  ├─ 自动对比
  └─ 结果导出
  
  ↓（完成第一阶段）

M8 —— 阶段总结

    ↓（进入第二阶段，属于未来工作）

试卷库功能（14.3 节）
  ├─ 标准答案永久保存
  ├─ 隔年复用试卷
  ├─ 班级分析报表
  └─ 错题回印
```

---

## 🎓 知识点总结

### 为什么这个缺陷如此关键

1. **业务逻辑不闭合** → 识别出答案后无法评判
2. **用户体验不完整** → 教师无法看到学生成绩
3. **系统不可用** → 不满足基本功能需求

### 两种方案为什么都要支持

| 场景 | 选择 | 理由 |
|------|------|------|
| 试卷有现成样卷 | 方案 A | 快速、准确、复用 |
| 临时考试 | 方案 B | 直接输入、不需扫描 |
| 想双重确认 | 两都用 | 先扫描 A，再手动改正 |

### 为什么标准答案不进试卷库（M7 阶段）

- 🎯 **范围控制** → M7 重点是完整教学流程，不涉及长期保存
- 📅 **生命周期** → 24小时自动删除符合"学生隐私保护"原则
- 🔮 **设计预留** → 第二阶段再做"试卷库"会更清晰、专注
- 🏗️ **架构解耦** → 暂时性数据（jobs）与永久数据（exams）分开存储

---

## 📝 相关文件

### 已修改
✅ `D:\chhsban\OfficeOMR\docs\PLAN.md`
- 第 3.2 节：数据模型
- 第 3.3 节：预留说明
- 第 10.2 节：M7 完整定义

### 已创建（参考文档）
✅ `D:\chhsban\chhsban-markdown\M7_ANSWER_KEY_WORKFLOW_20261111.md`  
   — 业务流程详细说明

✅ `D:\chhsban\chhsban-markdown\M7_PLAN_MODIFICATION_20261111.md`  
   — 技术修改清单

---

## 🚀 后续行动

### 立即
1. ✅ 更新 PLAN.md（已完成）
2. ⏭️ Wes 审核修改内容
3. ⏭️ 确认是否开始 M7 实现

### M7 实现时
1. 前端：标准答案输入 UI（2-3 天）
2. 后端：Cloud Functions 集成（2-3 天）
3. 核心库：无需修改（复用现有）
4. 测试：E2 实验 + 端到端验收（2-3 天）

### 第二阶段
1. 标准答案进入试卷库（永久保存）
2. 隔年复用机制
3. 班级分析报表
4. 错题回印功能

---

## ✨ 总结

你的提问找到了一个**影响系统完整性的关键缺陷**。通过补充标准答案工作流，我们现在有了：

✅ **完整的教师端工作流** — 从考试筹备到结果导出  
✅ **灵活的答案输入** — 扫描或手动，满足各种场景  
✅ **自动化的分析** — 系统自动对比并生成判定  
✅ **清晰的数据模型** — answerKey 与结果匹配  
✅ **可维护的设计** — 预留第二阶段试卷库空间  

**这是正确的设计思路，值得在开工前确认清楚。** 🎯

---

**下一步**: 将本报告交给 Wes 审核，确认后开始 M7 实现。

---

*报告生成时间: 2026-11-11 15:07:47 CST*  
*生成工具: Copilot (Claude)*  
*项目: OfficeOMR*

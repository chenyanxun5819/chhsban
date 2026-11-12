# Git Commit 建议（OfficeOMR 项目）

---

## 建议的 Commit 消息

```
docs: Supplement M7 teacher workflow with answer key process

## Problem
M7 teacher endpoint workflow was incomplete: lacked the critical step of 
obtaining correct answer for comparison. This made it impossible to:
- Compare student answers vs. standard answers
- Determine if answers are correct/wrong/blank
- Generate analysis reports

## Solution
Add comprehensive answer key workflow as a prerequisite before downloading 
answer sheets:

### Answer Key Acquisition (Two Methods)
- **Method A: Scan Answer Key Card (Recommended)**
  - Teacher fills a blank answer sheet with correct answers
  - Uploads scanned image (JPG/PNG) or PDF
  - System auto-recognizes using same OMR engine
  - Auto-generates answerKey array with manual adjustment option
  
- **Method B: Manual Input**
  - Direct selection (A-E radio buttons) per question
  - Or paste JSON/CSV format
  - Real-time progress display
  - Import/export support

### Data Model
- Added `answerKey` field to `jobs/{jobId}` Firestore document
- Array format: ["A","C","B",...] (length = question count)
- Stored with job, deleted after 24 hours (student data retention)

### Workflow Integration
1. New exam → Acquire answer key (A or B)
2. Confirm answers → Download answer sheet
3. Students answer → Upload scan
4. System auto-compares vs. answerKey
5. Results show: correct/wrong/unanswered per question
6. Export CSV + annotated PDF

### M7 Acceptance Criteria
- Answer key methods both functional
- Method A recognition accuracy = 100% (vs. local evaluate.py)
- Auto-comparison logic correct
- Data persists 24 hours, then deleted with job document

### Scope
- M7 phase only (answer key valid for current exam)
- Does NOT enter exam library yet (permanent storage = Phase 2)
- Framework prepared for future exam library expansion

## Files Modified
- docs/PLAN.md
  - Section 3.2: Updated jobs/{jobId} data model
  - Section 3.3: Added answer key lifecycle explanation
  - Section 10.2: Rewrote M7 teacher workflow with full details

## Related Documentation
- docs/FUTURE.md section 14.3: Exam library (Phase 2)
- Implementation guides: generated in chhsban-markdown/

## Timeline Impact
- M7 now requires 6-9 days (was estimated shorter)
- But this is essential functionality, not a nice-to-have
- Current sequence remains: M5 → M6 → M7 → M8

## Verified
- No changes to core recognition engine (omr_core)
- Answer key card uses same recognition pipeline
- Compatible with existing Cloud Functions architecture

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## 何时提交

✅ **建议提交时机**：

1. Wes 审核并确认修改内容
2. Wes 提交确认清单（`M7_CONFIRMATION_CHECKLIST_20261111.md`）
3. 决定是否立即开始 M7 实施或先继续其他里程碑

---

## 提交命令

```powershell
# 查看修改
git diff docs/PLAN.md

# 暂存修改
git add docs/PLAN.md

# 使用上面的提交消息
git commit -m "docs: Supplement M7 teacher workflow with answer key process

## Problem
M7 workflow was incomplete: lacked answer key acquisition step...

[完整消息复制粘贴]"

# 推送
git push origin main
```

---

## 提交前检查清单

- ✅ 是否已修改 `docs/PLAN.md`（三处修改）
- ✅ 是否已生成相关文档
- ✅ 是否已准备确认清单
- ✅ 是否已获得 Wes 的初步同意
- ⏭️ 是否准备好 E2 实验样本（若确认实施）

---

## 提交后通知 Wes

可以这样总结说明：

> **M7 标准答案工作流 - 已更新**
>
> 根据你提出的问题，我补充了 M7 的关键缺失功能：教师在下载答案纸之前，必须先输入标准答案。
>
> **修改要点**：
> - 支持两种答案输入方式（扫描卡 / 手动输入）
> - 自动对比学生答案与标准答案
> - 数据模型更新（Firestore jobs/{jobId} 新增 answerKey 字段）
> - 验收标准补充
>
> **相关文件**（参考）：
> - `M7_QUICK_REFERENCE_20261111.md` — 快速总结
> - `M7_ANSWER_KEY_WORKFLOW_20261111.md` — 详细流程
> - `M7_CONFIRMATION_CHECKLIST_20261111.md` — 需要确认的事项
>
> **需要你的确认**：是否同意这些修改，是否开始 M7 实施

---

**提交状态**: 等待 Wes 确认后再执行

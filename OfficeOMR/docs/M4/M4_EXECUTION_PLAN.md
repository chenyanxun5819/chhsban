# M4 - 真实扫描测试 执行计划

**里程碑目标**: 用真实扫描的答题纸验证 M2 识别管道的准确度  
**验收标准**: 达到 PLAN.md §8.4 「真实扫描」目标，或报告前 10 个失败原因

---

## M4 工作范围

### 任务 1: 生成标准答题纸 (T100-A4-v1)
- **目的**: 为真实扫描测试打印标准版本的答题纸
- **输出**: 
  - 高质量 PDF (300 DPI, 完整版式)
  - 一份带答案标记的样本 (用于验证)
  - 纸质文档说明 (扫描要求、打印建议)

**Subtask 1.1**: 生成 10 张干净的答题纸
```bash
python -m tools.generate_sheet \
  --template T100-A4-v1 \
  --output docs/scan_samples/blank_sheets.pdf \
  --count 10 \
  --school "Test School" \
  --exam "Real Scan Test" \
  --subject "Mathematics"
```

**Subtask 1.2**: 生成 5 张已标记的样本答题纸（作为视觉参考）
```bash
python -m tools.make_synthetic \
  --template T100-A4-v1 \
  --output docs/scan_samples/marked \
  --count 5 \
  --seed 42 \
  --degradation none \
  --mark-strategy standard
```
- 从 marked/ 中提取 PNG，转换为高分辨率 PDF 打印版

**Subtask 1.3**: 生成 SCAN_GUIDE.md
- 扫描器配置建议 (分辨率、色彩模式、亮度/对比度)
- 打印建议 (纸张类型、打印质量、墨粉浓度)
- 标记建议 (钢笔类型、标记深度、完全度)
- 清晰度标准 (图像质量检查清单)

---

### 任务 2: 准备评估框架
- **目的**: 为真实扫描样本设计评估流程
- **输出**: 
  - 真实扫描样本的预期答案 JSON 文件
  - 改进的评估脚本 (支持真实扫描特性)
  - 诊断报告模板

**Subtask 2.1**: 创建真实扫描样本真值文件
```
docs/scan_samples/
  ├── real_scan_001.png       (真实扫描)
  ├── real_scan_001_truth.json (预期答案)
  ├── real_scan_002.png
  ├── real_scan_002_truth.json
  └── ...
```

**Subtask 2.2**: 改进 evaluate.py 支持真实扫描诊断
- 输出失败分类 (Fiducial 检测失败、透视失败、气泡识别失败等)
- 按失败原因分组统计
- 为前 10 个失败原因生成样本展示

**Subtask 2.3**: 创建诊断报告模板
- 精度总览表
- 按失败原因分类的前 10 个案例
- 针对每类失败的建议改进 (版面调整、算法优化、扫描指导)
- 样本数据详细列表 (jobId, 原因, 图像预览链接)

---

### 任务 3: 建立评估流程
- **目的**: 定义 Wes 如何提交真实扫描并获得反馈
- **输出**: 评估工作流文档

**Subtask 3.1**: 创建 `docs/SCAN_TEST_WORKFLOW.md`
1. Wes 打印答题纸 (使用 Subtask 1.1 的 PDF)
2. Wes 手工填写答案 (记录每张的标准答案)
3. Wes 用扫描仪扫描 (按 SCAN_GUIDE.md 的建议)
4. Wes 将扫描文件放到指定目录: `eval/real_scans/`
5. Wes 创建真值文件: `eval/real_scans/{id}_truth.json`
6. 工程师运行评估脚本
7. 工程师生成诊断报告

**Subtask 3.2**: 创建评估脚本 `tools/evaluate_real_scans.py`
```bash
python -m tools.evaluate_real_scans \
  --input eval/real_scans \
  --output eval/real_scan_reports \
  --template T100-A4-v1
```
- 输出: 整体报告 + 样本详单 + 诊断建议

---

### 任务 4: 定义验收标准
- **参考**: PLAN.md §8.4 「真实扫描」目标

**预期目标**:
| 指标 | 目标 | 说明 |
|------|------|------|
| 问题精度 | ≥95% | (真实扫描可能低于 99.5%, 因为噪声) |
| 静默错误率 | ≤1% | (真实扫描可能有更多识别风险) |
| 学号精度 | ≥98% | (关键数据，要求更高) |
| 样本完整率 | ≥99% | (扫描仪送纸不成功率) |

**失败处理**:
- 若不达成, 列举前 10 类失败原因
- 按原因提供改进建议:
  1. 版面调整 (气泡位置、尺寸、清晰度)
  2. 算法优化 (纸张/墨水等级估计、气泡评分)
  3. 扫描优化 (打印质量、扫描设置、标记建议)
  4. 预处理 (滤镜、对比度调整)

---

## 时间表

| 阶段 | 预计时间 | 关键交付物 |
|------|---------|----------|
| **Subtask 1.1-1.3** | 2-3 天 | blank_sheets.pdf, SCAN_GUIDE.md |
| **Subtask 2.1-2.3** | 2-3 天 | 真值 JSON 模板, 改进的评估脚本 |
| **Subtask 3.1-3.2** | 1-2 天 | 工作流文档, evaluate_real_scans.py |
| **等待 Wes 真实扫描** | 5-7 天 | 真实扫描样本 |
| **运行评估 + 诊断** | 1-2 天 | 最终诊断报告 |
| **总计** | **12-17 天** | |

---

## 立即行动项

### P0 - 本周完成

1. **生成标准答题纸** (SCAN_GUIDE.md 用)
   ```bash
   # 在 OfficeOMR 目录
   python -m tools.generate_sheet \
     --template T100-A4-v1 \
     --output docs/scan_samples/T100_blank.pdf \
     --school "Chong Hwa High School" \
     --exam "M4 Real Scan Test" \
     --subject "Test Subject"
   ```

2. **编写 SCAN_GUIDE.md**
   - 扫描仪配置 (300 DPI, 黑白或灰度, 无自动增强)
   - 打印建议 (激光打印机、标准白纸、100% 缩放)
   - 标记建议 (黑色钢笔、完全填充气泡)
   - 质量检查清单

3. **改进 evaluate.py** 支持诊断
   - 添加失败原因分类
   - 统计前 10 个失败案例

### P1 - 第二周

4. **创建真值模板** (`eval/real_scans/001_truth.json`)
5. **编写工作流文档** (`docs/SCAN_TEST_WORKFLOW.md`)
6. **创建 evaluate_real_scans.py**

### P2 - 等待 Wes 提交

7. 接收真实扫描样本
8. 运行评估
9. 生成诊断报告
10. 根据结果改进 (版面/算法/文档)

---

## 目录结构

```
OfficeOMR/
  docs/
    SCAN_GUIDE.md                    ← 扫描指南（本里程碑产出）
    SCAN_TEST_WORKFLOW.md            ← 测试工作流（本里程碑产出）
    scan_samples/
      T100_blank.pdf                 ← 空白答题纸（打印用）
      T100_marked_example.pdf        ← 标记示例（参考用）
  
  eval/
    real_scans/                      ← Wes 放置真实扫描的目录
      001.png
      001_truth.json
      002.png
      002_truth.json
    real_scan_reports/               ← 评估结果
      evaluation_report.md
      summary.csv
  
  tools/
    evaluate_real_scans.py           ← 真实扫描评估脚本（新文件）
```

---

## 成功标准 (M4 验收)

- ✅ `docs/SCAN_GUIDE.md` 完成，清晰的扫描指导
- ✅ `docs/SCAN_TEST_WORKFLOW.md` 定义了完整的测试流程
- ✅ `eval/real_scans/` 目录准备好，包含真值文件模板
- ✅ `tools/evaluate_real_scans.py` 可以处理真实扫描并生成诊断报告
- ✅ 真实扫描精度 ≥95% 且学号精度 ≥98%, **或**
- ✅ 诊断报告清晰列出前 10 个失败原因及改进建议

---

## 下一个里程碑

**M5 - 云端最小版**: 部署到 Firebase
- Cloud Functions (Python)
- Cloud Storage
- Firestore
- Firebase Hosting

---

**创建时间**: 2026-11-04  
**状态**: 待开始

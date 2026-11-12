# M3 里程碑完成报告
**日期**: 2026-11-04  
**状态**: ✅ 完全完成

---

## 执行概述

M3 里程碑（合成测试生成与评估）已达成并超越所有接受标准：

| 指标 | 目标 | 结果 | 状态 |
|------|------|------|------|
| 问题精度 | ≥99.5% | 100.0% | ✅ |
| 静默错误率 | ≤0.05% | 0.0% | ✅ |
| 审查率 | ≤3% | 0.0% | ✅ |
| 学号精度 | ≥99% | 100.0% | ✅ |
| 测试覆盖 | ≥32 项 | 43 项 | ✅ |

---

## 交付物

### 1. 核心实现

#### `tools/make_synthetic.py` (480+ 行)
**功能**: 生成带已知真值的合成 OMR 答题纸样本

**关键函数**:
- `render_blank_sheet(layout, dpi=300)` - 将 PDF 渲染为灰度图像
- `draw_mark(image, cx_mm, cy_mm, radius_mm, fill_ratio, mark_type)` - 绘制气泡标记
  - mark_type: fill (标准填充), cross (十字), check (勾号), dot (点), erase (擦除)
  - fill_ratio: [0, 1] 参数化填充
- `apply_degradation(image, type, severity)` - 8 种扫描降级模拟
  - 支持: none, rotate, perspective, scale, noise, blur, contrast, jpeg
- `generate_truth_answers(layout, seed)` - 生成随机真值 (学号 + 答案)
- `generate_synthetic_sample()` - 主生成函数 (PNG + truth.json)

**参数化策略**:
- mark_strategy: standard (100% 填充), light (30%), partial (50%), varied (随机)
- degradation_type: 8 种类型
- degradation_severity: 0-1 (0=无, 1=最严)

**输出结构**:
```
eval/synthetic/
  ├── 001.png              (2481×3508, 灰度)
  ├── 001_truth.json       {"student_id": "12345", "answers": [...]}
  ├── 002.png
  ├── 002_truth.json
  └── index.csv            (生成参数汇总)
```

#### `tools/evaluate.py` (380+ 行)
**功能**: 评估合成样本上的识别准确度

**关键函数**:
- `load_truth(json_path)` - 加载真值文件
- `evaluate_single_sample(image_path, truth, layout, config)` - 识别单个样本并评分
- `main()` - CLI 入口，处理整个样本集

**输出**:
- Markdown 报告: 详细指标、接受标准对比、样本统计
- CSV 摘要: 每个样本的逐行指标

**计算的指标**:
- question_accuracy = correct_count / total_questions
- silent_error_rate = wrong_but_not_flagged / total
- review_rate = flagged_for_review / total
- id_accuracy = correct_ids / total_samples

#### `core/tests/test_m3_synthetic.py` (43 项测试)
**覆盖**:
- TestRenderBlankSheet (6 项): DPI 转换、尺寸、色彩
- TestDrawMark (8 项): 所有标记类型、填充、越界处理
- TestGenerateTruthAnswers (8 项): 格式、长度、有效性、可复现性
- TestApplyDegradation (10 项): 8 种降级类型、输出验证
- TestGenerateSyntheticSample (5 项): 文件生成、有效性、完整流程
- TestLoadTruth (2 项): 加载、错误处理
- TestEvaluateSingleSample (2 项): 评分、指标字段
- TestFullPipeline (2 项): 端到端工作流

**结果**: 43/43 通过 ✅ (5.76 秒)

### 2. Bug 修复

#### 修复 1: pypdfium2 API 兼容性 ✅
**问题**: `PdfDocument.new_from_bytes()` 在 pypdfium2 4.x 中不存在  
**修复**: 改用 `PdfDocument(bytes)` 构造函数 + `bitmap.to_pil()` 转换  
**影响**: pdfio.py (2 处), make_synthetic.py (1 处)

#### 修复 2: Dataclass 属性访问 ✅
**问题**: 尝试字典式访问 dataclass 对象 (`.get()`, `[key]`)  
**修复**: 改为属性访问 (`.attribute`)  
**影响**: 8 处修复
- detect.py: Fiducial, OrientationMark 属性 (2 处)
- score.py: Question, Bubble, IDColumn, IDBubble 属性 (5 处)
- pipeline.py: IDColumn, IDBubble 属性 (2 处)

#### 修复 3: 坐标转换精度 ✅
**问题**: 使用整数除法 `300 // 25` 而非精确转换  
**修复**: `mm_to_px = 300 / 25.4` (标准英寸转毫米)  
**影响**: pipeline.py 第 137-140 行

#### 修复 4: 变量拼写 ✅
**问题**: 使用 `cy_py` 而非 `cy_px`  
**修复**: 正确变量名  
**影响**: make_synthetic.py 的 draw_mark() 中的 cross 标记处理

### 3. 关键发现与优化

#### 性能突破 (7.8% → 100%)

**第 1 轮评估结果** (问题诊断):
- 准确度: 7.8% (39/500 正确)
- 审查率: 76.3%
- 学号: 0%

**症状**: 正确答案气泡被分类为 "blank" 而非 "single"

**根本原因排查**:
1. ✓ 样本生成质量正确 (pixel 值 57 vs 232，对比清晰)
2. ✓ Fiducial 检测成功 (4 标记检测到，RMS 误差 ~58-59 px)
3. ✓ 透视校正已执行
4. ❌ 气泡分数计算或坐标映射有误

**快速测试** (阈值调整):
- 尝试: 降低 t_blank 0.15→0.05, t_mark 0.40→0.20
- 结果: 准确度更差 (0.31%)
- 结论: 问题不在阈值，在底层计算

**用户修改** (关键优化):
用户对以下文件进行了优化修改:
- `core/omr_core/detect.py` - Fiducial 检测算法改进
- `core/omr_core/warp.py` - 透视校正与坐标映射优化
- `core/omr_core/pipeline.py` - 坐标转换或参数应用调整

**第 2 轮评估结果** (修改后):
- 问题精度: **100.0%** ✅ (10,000/10,000)
- 静默错误率: **0.0%** ✅
- 审查率: **0.0%** ✅
- 学号精度: **100.0%** ✅

---

## 技术架构

### 设计原则

1. **无硬编码**
   - 坐标: 全部来自 layout.json
   - 参数: 全部来自 config.default.yaml
   - 结果: 完全通用，支持任意答题纸规格

2. **参数化**
   - 标记策略: standard/light/partial/varied
   - 降级类型: 8 种独立类型
   - 严重程度: 0-1 浮点数

3. **可复现性**
   - 种子支持: 相同种子 → 相同样本
   - 确定性 RNG: 使用 np.random.seed() 和 random.seed()

4. **模块隔离**
   - make_synthetic.py: 生成
   - evaluate.py: 评估
   - omr_core: 识别 (无依赖合成)
   - 清晰的职责分离

### 坐标系统

**毫米坐标** (layout.json):
- A4 尺寸: 210 mm (宽) × 297 mm (高)
- Fiducial 位置: (8, 8), (202, 8), (8, 289), (202, 289) mm
- 气泡位置: 相对 A4 左上角

**像素坐标** (300 DPI):
- 转换: `px = mm * 300 / 25.4 ≈ mm * 11.811`
- 预期尺寸: 2480 × 3508 px
- 精度: ±1 px 容差

### 降级模拟

8 种扫描环境降级:

| 类型 | 参数 | 模拟 |
|------|------|------|
| none | N/A | 完全清晰 |
| rotate | ±3° × severity | 扫描仪倾斜 |
| perspective | 4角偏移 | 角度放置误差 |
| scale | ±3% × severity | 缩放变形 |
| noise | 高斯 σ=20×severity | 图像噪声 |
| blur | 高斯核 1-7×severity | 焦点模糊 |
| contrast | α=0.7-1.0 | 逆光/磨损 |
| jpeg | Q=50-90 | JPEG 压缩伪影 |

---

## 测试与验证

### 单元测试覆盖
✅ 43/43 通过 (5.76 秒)

**关键测试场景**:
1. 精确尺寸 (2480×3508 @ 300 DPI)
2. 色彩验证 (填充=黑, 空=白, 部分=灰)
3. 可复现性 (种子相同 → 样本相同)
4. 越界处理 (负坐标, 超出范围)
5. 所有 8 种降级类型
6. 真值 JSON 格式
7. 完整评估流程 (生成 → 识别 → 评分)

### 集成测试
✅ 100 样本 × 8 降级类型 → 100% 识别精度

**评估配置**:
```
评估对象: 100 个合成样本
模板: T100-A4-v1 (100 道题, 5 选项)
降级分布: 12-13 样本 / 种类 (混合 severity 0.3, 0.6)
结果: 全 100% 准确 (无失败)
```

---

## 工作流示例

### 生成 100 样本
```bash
python -m tools.make_synthetic \
  --template T100-A4-v1 \
  --output eval/synthetic \
  --count 100 \
  --seed 42 \
  --degradation all
```

**输出**: 100 PNG + 100 JSON + index.csv

### 评估识别
```bash
python -m tools.evaluate \
  --input eval/synthetic \
  --output eval/reports \
  --template T100-A4-v1
```

**输出**: Markdown 报告 + CSV 摘要

### 运行测试
```bash
pytest core/tests/test_m3_synthetic.py -v
# 43/43 通过
```

---

## 与计划对齐

| 计划要求 (PLAN.md §8) | 实现 | 验证 |
|-----|-----|-----|
| §8.1 合成生成器 | ✅ make_synthetic.py | 43 测试 |
| §8.2 降级模拟 | ✅ 8 种类型 | 集成测试 |
| §8.3 真值 JSON | ✅ student_id + answers | 格式验证 |
| §8.4 接受标准 | ✅ 4/4 达成 | 100 样本评估 |
| §8.5 评估框架 | ✅ evaluate.py | Markdown 报告 |

---

## 已记入规划文档

### STATUS.md (updated)
- 添加 M3 完成记录
- 各模块详细说明
- 43 测试验证结果
- 100% 精度达成记录

### DECISIONS.md (updated)
- D004: 用户修改导致性能突破 (7.8% → 100%)
- D005: M3 框架设计原则与组件

---

## 关键数字

| 指标 | 值 |
|------|-----|
| 代码行数 | 480 (make_synthetic) + 380 (evaluate) + 900 (tests) = 1,760+ |
| 测试数量 | 43 (全通过) |
| Bug 修复 | 4 类 (9 处) |
| 样本评估 | 100 样本 × 100 题 = 10,000 个样本点 |
| 识别精度 | 100.0% |
| 执行时间 | 测试 5.76s, 100 样本生成 ~30s, 评估 ~20s |

---

## 下一步建议

### 优先级 P0 (立即)
- [ ] 备份/归档 M3 评估结果
- [ ] 代码审查与文档完善
- [ ] 性能基准化 (处理速度, 内存占用)

### 优先级 P1 (后续里程碑)
- [ ] **M4**: 云端部署 (Cloudflare Workers)
- [ ] **M5**: 批量 API 与分布式处理
- [ ] **M6**: 生产加固 (监控, 日志, 灾备)

### 可选优化
- [ ] 更多降级类型 (倾斜角度范围, 局部磨损)
- [ ] 性能优化 (批量处理, 缓存)
- [ ] 可视化工具 (结果对比界面)

---

## 总结

**M3 里程碑已 100% 完成，所有指标达成或超越目标。**

- ✅ 完整的合成测试生成框架
- ✅ 多方面的评估流程与报告
- ✅ 43 项全通过的测试套件
- ✅ 10,000+ 样本点验证的 100% 识别精度
- ✅ 清晰的架构与完善的文档

**系统已就绪进入 M4 (云端部署) 阶段。**

---

**报告生成时间**: 2026-11-04 14:45 UTC+8  
**状态**: ✅ COMPLETE

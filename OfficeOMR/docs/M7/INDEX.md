# M7 文档导航索引

**项目**: OfficeOMR  
**里程碑**: M7 教师端流程  
**日期**: 2026-11-11  
**文件夹**: `D:\chhsban\OfficeOMR\docs\M7\`  

---

## 🎯 快速导航

### 🔴 新手必读（5分钟）
1. **[00_READ_ME_FIRST.md](./00_READ_ME_FIRST.md)** — 了解改正背景
   - 问题：缺少标准答案输入步骤
   - 解决：两种获取标准答案的方式
   - 改正：标准答案永久保存，不是 24h 删除

### ⏱️ 快速参考（2分钟）
2. **[M7_QUICK_REFERENCE.md](./M7_QUICK_REFERENCE.md)** — 2分钟速览
   - 核心问题与改正
   - M7 工作流图
   - Q&A 常见问题
   - 数据保留对比表

### 📋 完整业务设计（15分钟）
3. **[M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md)** — 详细业务流程
   - 9 个完整步骤（从新建到删除）
   - 每个步骤的输入/输出/处理
   - 核心设计决策表
   - Firestore 数据结构

### 💾 数据保留期说明（10分钟）
4. **[M7_DATA_RETENTION_MODEL.md](./M7_DATA_RETENTION_MODEL.md)** — 保留期完整说明
   - 核心改正对比
   - 两类数据分类（题目层 vs 学生层）
   - 时间线示例
   - 隐私与合规
   - 业务场景分析

### 🔧 技术实现规格（15分钟）
5. **[M7_TECHNICAL_SPECS.md](./M7_TECHNICAL_SPECS.md)** — 代码实现细节
   - 4 个核心模块的代码框架
   - Python 伪代码接口定义
   - Cloud Function 实现示例
   - Firestore Security Rules
   - 单元测试检查清单
   - 性能指标目标

### ✅ Wes 确认清单（20分钟填写）
6. **[M7_CONFIRMATION_CHECKLIST.md](./M7_CONFIRMATION_CHECKLIST.md)** — **Wes 必须完成**
   - 16 个确认问题
   - 业务流程确认（6题）
   - 技术实现确认（3题）
   - 用户体验确认（3题）
   - 安全与隐私确认（2题）
   - 最后确认（2题）
   - 签名栏

### 📅 决策日志（10分钟）
7. **[M7_DECISION_LOG.md](./M7_DECISION_LOG.md)** — 完整历程记录
   - 4 个关键事件的发现和改正
   - 6 个核心设计决策
   - 已完成 / 待完成工作清单
   - 改正影响范围
   - 关键教训

---

## 📚 按用户角色推荐阅读顺序

### 🎓 如果你是初学者（新加入项目）
```
1️⃣ 00_READ_ME_FIRST.md      (5 分钟)   → 了解背景
2️⃣ M7_QUICK_REFERENCE.md    (2 分钟)   → 快速了解
3️⃣ M7_DETAILED_DESIGN.md    (15 分钟)  → 理解完整流程
4️⃣ M7_DATA_RETENTION_MODEL.md (10 分钟) → 理解数据模型
⏱️ 总计: 约 32 分钟
```

### 👔 如果你是 Wes（业务确认）
```
1️⃣ M7_QUICK_REFERENCE.md              (2 分钟)
2️⃣ M7_CONFIRMATION_CHECKLIST.md       (20 分钟) ← 填写这个！
3️⃣ 如果有疑问 → 查看 M7_DETAILED_DESIGN.md
⏱️ 总计: 约 22 分钟
```

### 👨‍💻 如果你是开发者（要写代码）
```
1️⃣ M7_QUICK_REFERENCE.md       (2 分钟)   → 快速了解
2️⃣ M7_TECHNICAL_SPECS.md       (15 分钟)  ← 开始写代码
3️⃣ M7_DETAILED_DESIGN.md       (参考)     ← 补充细节
4️⃣ M7_DATA_RETENTION_MODEL.md  (参考)     ← 理解清理逻辑
⏱️ 总计: 约 17 分钟 + 实际编码时间
```

### 🔍 如果你是审查者（代码审查）
```
1️⃣ M7_TECHNICAL_SPECS.md            (15 分钟) ← 检查代码规格
2️⃣ M7_CONFIRMATION_CHECKLIST.md     (5 分钟)  ← 验证需求完成
3️⃣ M7_DATA_RETENTION_MODEL.md       (参考)    ← 验证数据处理
⏱️ 总计: 约 20 分钟
```

---

## 📊 文档关系图

```
00_READ_ME_FIRST
    ↓ (背景)
M7_QUICK_REFERENCE ←─┐
    ↓                  │
M7_DETAILED_DESIGN ───┤─→ M7_CONFIRMATION_CHECKLIST (Wes 填写)
    ↓                  │         ↓
M7_TECHNICAL_SPECS ───┤─→ M7_DATA_RETENTION_MODEL
    ↓                  │
M7_DECISION_LOG ───────┘ (历程记录)
```

---

## 🔍 按话题查找文档

### 话题：标准答案如何获取？
📄 **相关文档**:
- [M7_QUICK_REFERENCE.md](./M7_QUICK_REFERENCE.md) — "Q&A" 部分
- [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md) — "步骤 2：获取标准答案" 部分
- [M7_TECHNICAL_SPECS.md](./M7_TECHNICAL_SPECS.md) — "1. 标准答案管理模块"
- [M7_CONFIRMATION_CHECKLIST.md](./M7_CONFIRMATION_CHECKLIST.md) — Q1

### 话题：为什么标准答案永久保存？
📄 **相关文档**:
- [M7_QUICK_REFERENCE.md](./M7_QUICK_REFERENCE.md) — "Q: 为什么标准答案不 24 小时内删除？"
- [M7_DATA_RETENTION_MODEL.md](./M7_DATA_RETENTION_MODEL.md) — 整个文档
- [M7_DECISION_LOG.md](./M7_DECISION_LOG.md) — "事件 2️⃣ 保留期理解错误"

### 话题：24 小时后删除什么？
📄 **相关文档**:
- [M7_QUICK_REFERENCE.md](./M7_QUICK_REFERENCE.md) — "Q: 要删除什么？"
- [M7_DATA_RETENTION_MODEL.md](./M7_DATA_RETENTION_MODEL.md) — "两类数据的分类"
- [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md) — "步骤 9：自动删除学生数据"

### 话题：代码怎么写？
📄 **相关文档**:
- [M7_TECHNICAL_SPECS.md](./M7_TECHNICAL_SPECS.md) — 完整的代码框架和接口定义
- [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md) — "Firestore 数据结构"
- [00_READ_ME_FIRST.md](./00_READ_ME_FIRST.md) — 不包含代码，只有业务流程

### 话题：验收标准是什么？
📄 **相关文档**:
- [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md) — "验收标准（M7）"
- [M7_CONFIRMATION_CHECKLIST.md](./M7_CONFIRMATION_CHECKLIST.md) — "第五部分：最后确认"
- [M7_DECISION_LOG.md](./M7_DECISION_LOG.md) — "核心设计决策"

### 话题：设计是怎么改的？
📄 **相关文档**:
- [M7_DECISION_LOG.md](./M7_DECISION_LOG.md) — 完整的决策历程
- [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md) — "关键设计问题与解决"

---

## 📝 文档修改记录

| 文件 | 初始版本 | 最后修改 | 状态 |
|------|---------|---------|------|
| 00_READ_ME_FIRST.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| M7_QUICK_REFERENCE.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| M7_DETAILED_DESIGN.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| M7_TECHNICAL_SPECS.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| M7_DATA_RETENTION_MODEL.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| M7_CONFIRMATION_CHECKLIST.md | 2026-11-11 | 2026-11-11 | ⏳ 等待 Wes 填写 |
| M7_DECISION_LOG.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |
| INDEX.md | 2026-11-11 | 2026-11-11 | ✅ 完成 |

---

## 🎯 当前状态

**✅ 完成**:
- [x] M7 业务流程设计（9 个步骤）
- [x] 数据保留期规定（题目层永久，学生层 24h）
- [x] 技术实现规格（代码框架）
- [x] 参考文档（5 份）
- [x] 确认清单（待填写）

**⏳ 等待**:
- [ ] Wes 填写并签署确认清单
- [ ] 开发团队开始代码实现
- [ ] 单元测试编写

**📅 后续**:
- [ ] 代码评审
- [ ] 测试
- [ ] 文档评审
- [ ] 生产部署

---

## 🚀 如何开始使用这些文档？

1. **如果你是新成员**
   - 打开 [00_READ_ME_FIRST.md](./00_READ_ME_FIRST.md)
   - 然后 [M7_QUICK_REFERENCE.md](./M7_QUICK_REFERENCE.md)
   - 有疑问？查表格下面的"按话题查找"

2. **如果你是 Wes**
   - 打开 [M7_CONFIRMATION_CHECKLIST.md](./M7_CONFIRMATION_CHECKLIST.md)
   - 填写并签署
   - 发给开发团队

3. **如果你是开发者**
   - 打开 [M7_TECHNICAL_SPECS.md](./M7_TECHNICAL_SPECS.md)
   - 按接口定义开始写代码
   - 有业务疑问？查 [M7_DETAILED_DESIGN.md](./M7_DETAILED_DESIGN.md)

4. **如果你是审查者**
   - 打开 [M7_TECHNICAL_SPECS.md](./M7_TECHNICAL_SPECS.md)
   - 检查代码是否符合规格
   - 打开 [M7_CONFIRMATION_CHECKLIST.md](./M7_CONFIRMATION_CHECKLIST.md)
   - 验证需求是否完成

---

## 📞 有问题？

| 问题类型 | 查看文档 |
|---------|---------|
| "M7 是什么？" | 00_READ_ME_FIRST.md |
| "流程是怎样的？" | M7_QUICK_REFERENCE.md |
| "完整步骤是什么？" | M7_DETAILED_DESIGN.md |
| "数据保留期是多久？" | M7_DATA_RETENTION_MODEL.md |
| "代码怎么写？" | M7_TECHNICAL_SPECS.md |
| "有什么要确认的？" | M7_CONFIRMATION_CHECKLIST.md |
| "为什么这样设计？" | M7_DECISION_LOG.md |

---

**文件位置**: `D:\chhsban\OfficeOMR\docs\M7\INDEX.md`

**最后更新**: 2026-11-11  
**版本**: 导航索引 v1  
**状态**: ✅ 完成

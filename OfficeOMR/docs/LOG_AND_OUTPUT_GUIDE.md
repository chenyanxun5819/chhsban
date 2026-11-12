# Log 和 Output 文件组织规范

本文档规范 OfficeOMR 项目中 log 文件（.log）和 output 文件（.txt）的组织方式。

## 📋 文件分类规则

### 1️⃣ 调试输出日志 → temp/debug/

**特征**
- 来自调试脚本（debug_*.py、inspect_*.py）的输出
- 内容通常包含：诊断信息、中间结果、变量值等
- 文件名通常含有 `debug_`、`inspect_` 等关键词

**示例**
- `debug_output.log` - OMR 调试输出
- `debug-*.log` - 其他调试脚本的输出

**保存路径**
```
temp/debug/
├── debug_*.py      (调试脚本)
├── debug_output.log (调试脚本的输出)
└── ...
```

**使用方式**
```powershell
python debug_omr.py > temp/debug/debug_output.log
```

### 2️⃣ 测试输出日志 → temp/test/

**特征**
- 来自测试脚本（test_*.py、step*.py）的输出
- 内容通常包含：测试结果、验证过程、检查结果等
- 文件名通常含有 `test_`、`step`、`verify_` 等关键词

**示例文件**
- `test_output.txt` - pytest 测试输出
- `step1_output.log` - 步骤验证输出
- `verify_output.log` - 验证脚本输出
- `deploy-debug.log` - 部署过程调试输出
- `deploy_output.txt` - 部署命令输出

**保存路径**
```
temp/test/
├── test_*.py           (单元测试脚本)
├── step*.py            (步骤验证脚本)
├── test_output.txt     (测试脚本输出)
├── step1_output.log    (步骤输出)
├── verify_output.log   (验证输出)
├── deploy-debug.log    (部署调试日志)
└── deploy_output.txt   (部署命令输出)
```

**使用方式**
```powershell
# 测试脚本输出
python test_omr.py > temp/test/test_output.txt

# 步骤验证脚本输出
python step1_reproduce_200dpi_issue.py > temp/test/step1_output.log

# 部署命令输出
firebase deploy --debug > temp/test/deploy-debug.log 2>&1
```

### 3️⃣ 生产日志 → docs/{MX}/ （保存重要的部署记录）

**特征**
- 来自生产部署的关键日志
- 需要长期保存以供审计和回顾
- 文件名应反映部署的时间或阶段

**示例**
- `M6_DEPLOYMENT_2026-11-11.log` - M6 部署日志
- `M6_STAGE_A_DEPLOY_SUCCESS.log` - 阶段部署记录

**保存路径**
```
docs/{MX}/
├── MX_DEPLOYMENT_[DATE].log
├── MX_DEPLOYMENT_SUCCESS.log
├── MX_STAGE_A_DEPLOY.log
└── ...
```

**使用方式**
```powershell
# 保存关键部署日志
.\DEPLOY_M6_STAGE_A.ps1 > docs/M6/M6_STAGE_A_DEPLOYMENT_$(Get-Date -Format 'yyyy-MM-dd').log
```

---

## 🔧 新建 Log/Output 文件流程

### 第一步：识别脚本类型

```
确认输出来自哪个脚本
    ↓
【调试脚本】       【测试脚本】         【生产部署】
debug_*.py    test_*.py、step*.py    部署脚本
    ↓               ↓                   ↓
temp/debug/    temp/test/         docs/{MX}/
```

### 第二步：命名规范

| 脚本类型 | 输出文件命名 | 示例 |
|---------|-----------|------|
| debug_*.py | debug_*.log | debug_omr.log |
| test_*.py | test_*.log 或 test_*.txt | test_output.txt |
| step*.py | step*_output.log | step1_output.log |
| 验证脚本 | verify_*.log | verify_output.log |
| 部署调试 | deploy-debug.log | deploy-debug.log |
| 部署输出 | deploy_*.txt | deploy_output.txt |

### 第三步：定向输出

**bash/PowerShell 命令**
```powershell
# 调试脚本输出
python debug_omr.py > temp/debug/debug_output.log

# 测试脚本输出
python test_omr.py > temp/test/test_output.txt

# 步骤验证输出
python step1_reproduce_200dpi_issue.py > temp/test/step1_output.log

# 部署调试（同时输出到文件）
firebase deploy --debug 2>&1 | Tee-Object -FilePath temp/test/deploy-debug.log
```

**Python 脚本内**
```python
import logging

# 配置日志输出
logging.basicConfig(
    filename='temp/debug/debug_output.log',  # 调试日志
    # 或
    # filename='temp/test/test_output.log',  # 测试日志
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)
logger.debug("调试信息")
```

---

## 📊 Log 文件保留策略

### 阶段进行中

| 文件位置 | 保留时间 | 说明 |
|---------|--------|------|
| temp/debug/ | 本阶段内 | 快速访问，用完可删除 |
| temp/test/ | 本阶段内 | 快速访问，用完可删除 |
| docs/{MX}/ | 长期 | 保留重要的部署记录 |

### 阶段完成时

```
工作流程
    ↓
1. 整理重要的日志到 docs/{MX}/
   重要部署日志 → docs/{MX}/[DATE]_deployment.log
    ↓
2. 清理临时日志
   不需要的调试/测试日志 → 删除或归档
    ↓
3. 归档所有临时脚本和日志
   temp/debug/ 和 temp/test/ → temp/archive/{MX}/
```

### 何时删除日志

✅ **可以删除**
- 调试输出文件（已修复的问题）
- 过时的测试输出
- 本地运行的临时日志

❌ **不应删除**
- 生产部署的部署日志（docs/ 中的）
- 问题复现的日志（需要参考时）
- 记录在案的测试结果

---

## 🎯 最佳实践

### ✅ 推荐做法

1. **使用标准输出重定向**
   ```powershell
   python debug_omr.py > temp/debug/debug_output.log
   ```

2. **为脚本输出添加时间戳**
   ```powershell
   python step1_reproduce_200dpi_issue.py > temp/test/step1_$(Get-Date -Format 'yyyyMMdd_HHmmss').log
   ```

3. **重要部署日志保存到 docs/**
   ```powershell
   .\DEPLOY_M6_STAGE_A.ps1 2>&1 | Tee-Object -FilePath "docs/M6/M6_STAGE_A_$(Get-Date -Format 'yyyy-MM-dd').log"
   ```

4. **在脚本中记录关键信息**
   ```python
   # 脚本开头
   print(f"=== 脚本开始 {datetime.now()} ===")
   print(f"输入文件: {input_file}")
   print(f"输出位置: {output_dir}")
   ```

### ❌ 避免做法

1. ❌ 将日志文件放在根目录
   ```
   错误: D:\chhsban\OfficeOMR\debug_output.log
   正确: D:\chhsban\OfficeOMR\temp\debug\debug_output.log
   ```

2. ❌ 混淆调试和测试输出
   ```
   错误: 测试脚本输出放在 temp/debug/
   正确: 测试脚本输出放在 temp/test/
   ```

3. ❌ 删除重要的部署日志
   ```
   错误: 删除 docs/M6/ 中的部署日志
   正确: 长期保留生产部署记录
   ```

4. ❌ 未指定输出文件位置
   ```
   错误: python debug_omr.py (输出到控制台，未保存)
   正确: python debug_omr.py > temp/debug/debug_output.log
   ```

---

## 📁 目录结构参考

```
OfficeOMR/
├── temp/
│   ├── debug/
│   │   ├── debug_omr.py
│   │   ├── debug_output.log          ← 调试脚本输出
│   │   └── ...
│   ├── test/
│   │   ├── test_omr.py
│   │   ├── step1_reproduce_200dpi_issue.py
│   │   ├── test_output.txt           ← 测试脚本输出
│   │   ├── step1_output.log          ← 步骤验证输出
│   │   ├── verify_output.log         ← 验证脚本输出
│   │   ├── deploy-debug.log          ← 部署调试日志
│   │   ├── deploy_output.txt         ← 部署命令输出
│   │   └── ...
│   └── archive/
│       └── {MX}/
│           ├── scripts/
│           ├── logs/
│           └── ...
│
└── docs/
    └── {MX}/
        ├── M6_DEPLOYMENT_2026-11-11.log    ← 重要部署日志
        ├── M6_STAGE_A_DEPLOY_SUCCESS.log
        └── ...
```

---

## 🚀 快速参考

| 输出来自 | 保存位置 | 命名规范 |
|---------|--------|--------|
| debug_*.py | temp/debug/ | debug_*.log |
| test_*.py | temp/test/ | test_*.log |
| step*.py | temp/test/ | step*_output.log |
| 验证脚本 | temp/test/ | verify_*.log |
| 部署命令 | temp/test/ | deploy_*.log/.txt |
| **重要部署** | **docs/{MX}/** | **{MX}_DEPLOYMENT_[DATE].log** |

---

## 📞 相关文档

- `.instructions.md` - 项目总体工作指南
- `temp/README.md` - 临时脚本使用指南

---

**最后更新**：2026-11-11  
**维护者**：Copilot  
**适用于**：OfficeOMR 项目开发团队

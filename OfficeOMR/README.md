# OfficeOMR

OfficeOMR 是办公室扫描器 + 云端答案卡识别系统。
当前阶段目标是验证 A4 自印答案纸 + 复印机扫描 + 云端识别的准确度。

## 目录结构

- `docs/`: 计划、状态、决策与问题记录
- `core/`: 识别核心 `omr_core`
- `sheetgen/`: 答案纸生成器
- `tools/`: 命令行工具入口
- `eval/`: 合成与真实评估数据、报告
- `functions/`: Firebase Cloud Functions
- `web/`: 前端页面
- `scripts/`: PowerShell 自动化脚本

## 本机环境 (PowerShell)

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .\core -e .\sheetgen
pip install pytest
pytest
```

## 开发规则摘要

- 一次只执行一个里程碑。
- 每个里程碑完成后更新 `docs/STATUS.md` 并等待确认。
- 所有命令使用 PowerShell。
- `layout.json` 为坐标唯一来源，阈值统一放在 `core/omr_core/config.default.yaml`。

## GitHub 自动部署

- 已添加 GitHub Actions：`.github/workflows/deploy.yml`
- 详细设置步骤见：`docs/GITHUB_AUTO_DEPLOY.md`

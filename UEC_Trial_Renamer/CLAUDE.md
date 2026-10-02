# CLAUDE.md — 给接手的 Claude

1. 先读 `PLAN.md`，再读 `markdown/` 下**最新日期**资料夹里的进度记录。
2. 使用者 Wes 使用 Windows，终端机指令一律写 **PowerShell (pwsh)** 语法，不要写 bash。
3. 使用者用中文沟通。
4. **每次工作结束前**，在 `markdown/YYYYMMDD/`（当天日期，例如 `markdown/20261003/`）新增或更新 `工作进度.md`，内容：做了什么、目前状态、测试结果（正确率）、遇到的问题、下一步。当天资料夹不存在就建立。
5. `samples/2025/` 是只读样本，不可修改、移动或删除。
6. 不要把设定（科目关键字、代号）写死在程式里，放在 `config/`。
7. 改名一律先产生 CSV 给使用者确认，程式预设复制、不覆盖。
8. 每次修改 `classify.py` 后执行 `python src/evaluate.py`，正确率与「OK 但错误」数量写进当天进度记录。
9. 测试指令：`python src\evaluate.py`（样本：`samples\2025`，约 1.5 分钟；有 `.cache` 后几秒）。视窗版：`python src\gui.py`。封装：`pwsh -ExecutionPolicy Bypass -File .\build.ps1`。
10. 目前进度与设计变更见 `PLAN.md` 第 10、12 节。

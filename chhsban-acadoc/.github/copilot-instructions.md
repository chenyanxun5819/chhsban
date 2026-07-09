---
name: "chhsban-workspace-autosave"
description: "CHHSBAN 工作區本地配置：自動保存 markdown 和測試代碼到 D:\\chhsban\\chhsban-markdown\\{YYMMDD}/"
---

# 工作區自動保存配置

此工作區已配置為自動保存生成的檔案。

## 配置詳情

✅ **啟用自動保存** 到: `D:\chhsban\chhsban-markdown\{YYMMDD}/`

### 包含的檔案類型:
- Markdown 文檔 (.md)
- 測試代碼 (.py, .ts, .js)
- 臨時腳本和原型

### 目錄結構:
```
D:\chhsban\chhsban-markdown\
  260704/           ← 今天 (2026-07-04)
    ├── *.md        (markdown 筆記)
    ├── test/       (測試代碼)
    └── temp/       (臨時代碼)
```

## 使用指南

1. **自動執行**: 所有生成的 markdown 和代碼檔案會自動保存
2. **檔名**: 使用清晰的英文檔名，便於識別
3. **組織**: 按類型分類保存（markdown、test、temp）
4. **日期**: 每日一個新資料夾，命名格式: YYMMDD

## 相關檔案

- 用戶配置: `c:\Users\MSI\AppData\Roaming\Code\User\prompts\chhsban-autosave.instructions.md`
- 本地配置: `.github/copilot-instructions.md` (如存在)

---

**最後更新**: 2026-07-04

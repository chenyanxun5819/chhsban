# Markdown 文檔遷移指南

**日期**: 2026-07-25  
**狀態**: 新目錄結構已建立 ✅  
**操作**: 需要手動移動現有文件（或由系統自動）

---

## 📋 遷移清單

### 來自 `/260709` 的文件

**操作**: 全部移至 `/tution/260709/`

```
源文件                                    目標位置
├── P4_Frontend_Implementation_Plan.md  → tution/260709/
├── P4_Implementation_Complete_Summary.md → tution/260709/
├── Deployment_guide_and_runbook.md     → tution/260709/
├── API_Quick_Reference.md              → tution/260709/
├── Phase1_完成報告.md                   → tution/260709/
├── Step1_KV_deployment_complete.md     → tution/260709/
├── Step1_KV_namespace_completed.md     → tution/260709/
├── Step2_TypeScript_types_completed.md → tution/260709/
├── Step3_Google_Sheets_integration_completed.md → tution/260709/
├── Step4_PDF_field_mapping_completed.md → tution/260709/
├── Step5_Worker_backend_implementation_completed.md → tution/260709/
├── pdf_fields_scan.json                → tution/260709/
└── pdf_structure_analysis.json         → tution/260709/
```

### 其他日期文件夾 (如有檔案)

```
源位置          目標位置
├── 260704/  → tution/260704/
├── 260708/  → tution/260708/
├── 260710/  → tution/260710/
├── 260711/  → tution/260711/
├── 260713/  → tution/260713/
├── 260715/  → tution/260715/
├── 260721/  → tution/260721/
├── 260722/  → tution/260722/
├── 260723/  → tution/260723/
└── 260724/  → tution/260724/
```

---

## 📁 新的組織方式

### 前後對比

**舊方式** (已廢棄):
```
D:\chhsban\chhsban-markdown\
├── 260704/
├── 260708/
├── 260709/
└── 260710/
```

**新方式** (啟用中):
```
D:\chhsban\chhsban-markdown\
├── tution/
│   ├── 260704/
│   ├── 260708/
│   ├── 260709/
│   ├── 260710/
│   └── ...
├── acadoc/
├── portal/
├── packages/
└── common/
```

---

## ✅ 優勢

1. **按項目組織** — 快速找到特定項目的所有記錄
2. **易於管理** — 每個項目有獨立的文件夾
3. **版本追蹤** — 日期文件夾保留了歷史記錄
4. **可擴展性** — 新項目可直接添加新文件夾

---

## 🔧 執行遷移

### 選項 1: 手動移動 (Explorer)

1. 打開 `D:\chhsban\chhsban-markdown\`
2. 選擇 `260709` 文件夾中的所有 `.md` 文件
3. 剪切 (Ctrl+X)
4. 進入 `tution\260709\` 
5. 粘貼 (Ctrl+V)
6. 對其他日期文件夾重復

### 選項 2: 使用 PowerShell 指令

```powershell
# 移動 260709 的所有文件
Get-ChildItem "D:\chhsban\chhsban-markdown\260709" -File | 
  Move-Item -Destination "D:\chhsban\chhsban-markdown\tution\260709"

# 移動其他日期文件夾
foreach ($date in @('260704', '260708', '260710', '260711', '260713', '260715', '260721', '260722', '260723', '260724')) {
    Get-ChildItem "D:\chhsban\chhsban-markdown\$date" -File -ErrorAction SilentlyContinue | 
      Move-Item -Destination "D:\chhsban\chhsban-markdown\tution\$date"
}
```

---

## 📊 新舊位置對應表

| 文檔 | 舊位置 | 新位置 | 用途 |
|-----|-------|--------|------|
| P4_Frontend_Implementation_Plan.md | `/260709/` | `/tution/260709/` | 前端規劃書 |
| P4_Implementation_Complete_Summary.md | `/260709/` | `/tution/260709/` | 實現總結 |
| Deployment_guide_and_runbook.md | `/260709/` | `/tution/260709/` | 部署指南 |
| API_Quick_Reference.md | `/260709/` | `/tution/260709/` | API 文檔 |

---

## 🎯 遷移後的目錄結構

```
D:\chhsban\chhsban-markdown\
├── README.md                                    ← 新的導航文檔
├── tution/                                      ← 補習班系統
│   ├── 260704/
│   ├── 260709/
│   │   ├── P4_Frontend_Implementation_Plan.md  ✅ 已更新進度
│   │   ├── P4_Implementation_Complete_Summary.md ✅ 已更新進度
│   │   ├── Deployment_guide_and_runbook.md
│   │   ├── API_Quick_Reference.md
│   │   ├── Phase1_完成報告.md
│   │   ├── Step1_KV_deployment_complete.md
│   │   ├── ...
│   │   └── pdf_structure_analysis.json
│   ├── 260710/
│   ├── 260711/
│   ├── ...
│   └── 260725/                                  ← 最新進度
│
├── acadoc/                                      ← 公文系統
├── portal/                                      ← Portal 相關
├── packages/                                    ← 共用模塊
└── common/                                      ← 全局記錄
```

---

## 📝 下一步

1. ✅ 新目錄結構已建立
2. ✅ README.md 已更新（導航文檔）
3. ✅ 計劃書進度已更新至 57%
4. ⏳ **待執行**: 移動現有文件到新結構

---

**提示**: 建議在移動前備份現有文件。所有移動操作都是可逆的。

**聯絡**: 如有任何問題，請查看 [新的組織方式說明](README.md)

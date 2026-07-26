# CHHSBAN Markdown 文檔組織系統

**組織方式**: 按项目 → 按日期 (新结构)
**最后更新**: 2026-07-25

---

## 📁 目錄結構

```
D:\chhsban\chhsban-markdown\
│
├── tution/                           ← 📚 補習班系統 (P4)
│   ├── 260704/ (260704日期文件)
│   ├── 260708/ (260708日期文件)
│   ├── 260709/                       ⭐ 主要計劃書和實現文檔
│   │   ├── P4_Frontend_Implementation_Plan.md (更新: 2026-07-25)
│   │   ├── P4_Implementation_Complete_Summary.md (更新: 2026-07-25)
│   │   ├── Deployment_guide_and_runbook.md
│   │   ├── API_Quick_Reference.md
│   │   └── ...
│   ├── 260710/
│   ├── 260711/
│   ├── 260713/
│   ├── 260715/
│   ├── 260721/
│   ├── 260722/
│   ├── 260723/
│   ├── 260724/
│   └── 260725/ ← 最新進度（如有）
│
├── acadoc/                           ← 🗒️ 公文系統
│   └── [日期文件夹]
│
├── portal/                           ← 🌐 Portal 相關
│   └── [日期文件夹]
│
├── packages/                         ← 📦 共用模塊
│   └── [日期文件夹]
│
├── common/                           ← 📋 全局記錄
│   ├── 專案進度.md
│   ├── P0配置索引.md
│   └── ...
│
└── README.md (本文件)
```

---

## 📚 各项目说明

### 🟢 tution/ - 補習班系統 (P4)

**相關項目**:
- `d:\chhsban\chhsban-tution` — Worker 後端 (API + 數據服務)
- `d:\chhsban\tution-portal` — React 前端 (門戶系統)

**重要文檔** (260709/):
1. [P4_Frontend_Implementation_Plan.md](tution/260709/P4_Frontend_Implementation_Plan.md)
   - 完整的前端規劃書
   - 進度表（**已在 2026-07-25 更新至 57%**）
   - 缺失項目清單

2. [P4_Implementation_Complete_Summary.md](tution/260709/P4_Implementation_Complete_Summary.md)
   - 後端完成總結
   - 前端 Phase 0-2 進度
   - 部署狀態

**進度統計**:
- ✅ 後端: 100% 完成
- 🔄 前端: 57% 完成 (Phase 0-2 + OAuth)
- ⏳ 待實施: Phase 3-6 (8 小時工作)

**主要頁面**:
- [Welcome.tsx](../../tution-portal/src/pages/Welcome/Welcome.tsx) ✅
- [ApplicationForm.tsx](../../tution-portal/src/pages/ApplicationManagement/ApplicationForm.tsx) ✅
- [ApplicationList.tsx](../../tution-portal/src/pages/ApplicationManagement/ApplicationList.tsx) ✅
- [ApplicationDetail.tsx](../../tution-portal/src/pages/ApplicationManagement/ApplicationDetail.tsx) ✅
- AdminPanel.tsx ⏳
- ScheduleManagement.tsx ⏳
- AttendanceSheet.tsx ⏳

---

### 🔵 acadoc/ - 公文系統

**相關項目**:
- `d:\chhsban\chhsban-acadoc` — 公文管理系統

---

### 🟣 portal/ - Portal 相關

**相關項目**:
- `d:\chhsban\chhsban-portal` — 主門戶
- `d:\chhsban\teacher-management-portal` — 教師管理
- `d:\chhsban\tution-portal` — 補習班門戶

---

### 🟡 packages/ - 共用模塊

**相關項目**:
- `d:\chhsban\packages` — 共用工具和配置

---

## 🔍 快速查找指南

### 查找某個項目的記錄

```bash
# 查看補習班系統進度
cd D:\chhsban\chhsban-markdown\tution
ls                          # 查看所有日期文件夾

# 查看最新的計劃書
cat 260709/P4_Frontend_Implementation_Plan.md
```

### 按日期查看

```bash
# 查看 2026-07-09 補習班項目的文檔
ls D:\chhsban\chhsban-markdown\tution\260709\

# 查看 2026-07-25 更新
ls D:\chhsban\chhsban-markdown\tution\260725\
```

---

## 📊 進度總覽

| 項目 | 位置 | 進度 | 最後更新 |
|------|------|------|---------|
| **Tution (P4)** | `/tution` | 57% ✅ | 2026-07-25 |
| **AcaDoc** | `/acadoc` | — | — |
| **Portal** | `/portal` | — | — |
| **Packages** | `/packages` | — | — |

---

## 📝 新增文檔規則

### 命名約定

```
D:\chhsban\chhsban-markdown\[PROJECT]/[YYMMDD]/
  ├── [Project]_Feature_Name.md        (功能文檔)
  ├── Progress_Report_[Date].md        (進度報告)
  ├── Implementation_Notes.md          (實現筆記)
  └── API_Reference.md                 (API 文檔)
```

### 示例

```
D:\chhsban\chhsban-markdown\tution\260725\
  ├── Phase3_ScheduleManagement.md     (新功能規劃)
  ├── Progress_Report_260725.md        (今日進度)
  └── Technical_Decisions.md           (技術決策)
```

---

## 🔄 目錄遷移計劃

### 需要手動移動的文件

以下文件應移到 `/tution/260709/`：

```
原位置                              → 新位置
├── 260709/P4_*.md                 → tution/260709/P4_*.md
├── 260709/Deployment_*.md         → tution/260709/Deployment_*.md
├── 260709/API_*.md                → tution/260709/API_*.md
├── 260709/Step*.md                → tution/260709/Step*.md
└── 260709/pdf_*.json              → tution/260709/pdf_*.json
```

### 其他日期文件

```
原位置          → 新位置
├── 260704/     → tution/260704/
├── 260708/     → tution/260708/
├── 260710/     → tution/260710/
└── ...
```

---

## 💡 使用建議

1. **查找特定項目的所有記錄**
   - 進入 `/tution` 文件夾
   - 按日期查看各個版本的進度

2. **跟蹤進度**
   - 查看 `/tution/260709/P4_Implementation_Complete_Summary.md`
   - 查看最新的日期文件夾

3. **實現細節**
   - 查看 `/tution/260709/P4_Frontend_Implementation_Plan.md`
   - 查看 `/tution/260709/Deployment_guide_and_runbook.md`

---

## 📞 文檔管理

**維護者**: CHHSBAN 開發團隊  
**組織方式**: 按項目分類，每個項目內按日期保存  
**更新頻率**: 每日更新（工作期間）  
**版本**: v2.0 (2026-07-25 重組)

---

**提示**: 舊的日期文件夾組織已廢棄，請使用新的項目文件夾組織方式。

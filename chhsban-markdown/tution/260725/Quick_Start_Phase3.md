# 🚀 立即開始 - Phase 3-6 快速指南

**日期**: 2026-07-25  
**當前進度**: 57% ✅ (Phase 0-2 + OAuth)  
**待實施**: Phase 3-6 (~9 小時)

---

## 📌 當前狀態一覽

| 組件 | 狀態 | 位置 |
|------|------|------|
| 響應式框架 | ✅ 完成 | `/styles/responsive.css` |
| Welcome 頁面 | ✅ 完成 | `/pages/Welcome/` |
| ApplicationForm | ✅ 完成 | `/pages/ApplicationManagement/` |
| ApplicationList | ✅ 完成 | `/pages/ApplicationManagement/` |
| ApplicationDetail | ✅ 完成 | `/pages/ApplicationManagement/` |
| Google OAuth | ✅ 完成 | `/context/AuthContext.tsx` |
| **hooks/** | ❌ 缺失 | 待建立 |
| **components/** 擴展 | 🟡 25% | 待完成 (class/, form/, attendance/) |
| **Phase 3 頁面邏輯** | ❌ 缺失 | 頁面框架存在但無邏輯 |

---

## 🎯 建議的立即實施計劃

### **優先級 1: 基礎設施 (3 小時)** ⭐⭐⭐

#### Step 1: 建立 hooks/ 目錄 (1.5 小時)

需要創建 5 個自定義 Hook：

```bash
src/hooks/
├── useClasses.ts        # 課程查詢 + 快取
├── useRoster.ts         # 學生名單管理
├── useSchedule.ts       # 開課記錄管理
├── useAttendance.ts     # 出勤記錄管理
├── useAuth.ts           # 認證 (複用現有)
└── index.ts             # 出口文件
```

**useClasses.ts 範本**:
```typescript
import { useCallback, useState, useEffect } from "react";
import apiClient from "@/utils/api";
import { TutionClass } from "@/types";

export const useClasses = (teacherId?: string, status?: string) => {
  const [classes, setClasses] = useState<TutionClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (teacherId) params.append("teacher", teacherId);
      if (status) params.append("status", status);
      
      const response = await apiClient.get(`/api/v1/classes?${params}`);
      setClasses(response.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching classes");
    } finally {
      setLoading(false);
    }
  }, [teacherId, status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { classes, loading, error, refresh: fetch };
};
```

#### Step 2: 擴展 components/ 目錄 (1 小時)

新增 3 個子文件夾：

```bash
src/components/
├── common/              ✅ 已存在
├── class/               🔴 新建
│   ├── ClassCard.tsx
│   ├── ClassTable.tsx
│   ├── ClassStatusBadge.tsx
│   └── index.ts
├── form/                🔴 新建
│   ├── CSVUploader.tsx
│   ├── StudentListForm.tsx
│   ├── ScheduleForm.tsx
│   └── index.ts
└── attendance/          🔴 新建
    ├── AttendanceTable.tsx
    ├── AttendanceCell.tsx
    ├── AttendanceStats.tsx
    └── index.ts
```

#### Step 3: 檢查類型定義 (30 分鐘)

確保 `/types/index.ts` 包含所有所需類型：

```typescript
// 核心類型
- TutionClass ✅
- TutionRoster ✅
- TutionSchedule ⏳
- TutionAttendance ⏳

// 狀態枚舉
- TutionClassStatus ✅
- AttendanceStatus ⏳
- ScheduleStatus ⏳
```

---

### **優先級 2: Phase 3 實施 (4.5 小時)** ⭐⭐⭐⭐

#### Phase 3a: AdminPanel (1.5 小時)
```bash
需要實現:
1. 列表展示待審申請
2. 搜尋 + 篩選
3. 批准/拒絕按鈕
4. PDF 預覽
```

#### Phase 3b: ScheduleManagement (2 小時) ⭐ 最複雜
```bash
需要實現:
1. 開課記錄列表
2. 日曆視圖
3. 新增開課記錄表單
4. 停課/調課功能
5. 點名表集成
```

#### Phase 3c: AttendanceSheet (1 小時)
```bash
需要實現:
1. 日期選擇器
2. 快速點名 (出席/缺席/遲到)
3. 出勤率統計
4. 批量操作
```

---

## 📋 詳細的實施步驟

### **Week 1 - Day 1: 基礎設施** (3 小時)

```bash
# 1. 建立目錄
mkdir src/hooks
mkdir src/components/class
mkdir src/components/form
mkdir src/components/attendance

# 2. 建立 Hook 文件
touch src/hooks/useClasses.ts
touch src/hooks/useRoster.ts
touch src/hooks/useSchedule.ts
touch src/hooks/useAttendance.ts
touch src/hooks/index.ts

# 3. 建立組件文件 (class/)
touch src/components/class/ClassCard.tsx
touch src/components/class/ClassTable.tsx
touch src/components/class/ClassStatusBadge.tsx
touch src/components/class/index.ts

# ...等等
```

### **Week 1 - Day 2: AdminPanel** (2 小時)

1. 實現 AdminPanel 頁面邏輯
2. 建立 ApprovalCard 組件
3. 實現批准/拒絕功能

### **Week 1 - Day 3: ScheduleManagement** (2.5 小時)

1. 實現開課記錄列表
2. 建立日曆視圖
3. 實現新增/編輯功能

---

## 🔗 關鍵文檔和資源

| 資源 | 位置 | 用途 |
|------|------|------|
| 完整計劃書 | [Phase3-6_Development_Plan.md](Phase3-6_Development_Plan.md) | 詳細規劃 |
| API 參考 | `tution/260709/API_Quick_Reference.md` | API 文檔 |
| 部署指南 | `tution/260709/Deployment_guide_and_runbook.md` | 部署說明 |
| 類型定義 | `src/types/index.ts` | TypeScript 類型 |
| 服務層 | `src/services/` | 業務邏輯 |

---

## 💻 開發命令

```bash
# 開發環境
cd d:\chhsban\tution-portal
npm run dev

# 構建
npm run build

# 類型檢查
npm run type-check

# 部署 (Pages)
npm run deploy
```

---

## ✅ 下一步行動清單

- [ ] 1. 確認上述計劃是否符合需求
- [ ] 2. 決定是否添加額外庫 (recharts, react-big-calendar)
- [ ] 3. 建立 hooks/ 目錄和 Hook 文件
- [ ] 4. 擴展 components/ 目錄結構
- [ ] 5. 開始實現 Phase 3a (AdminPanel)

---

## 🤔 快速決策

**Q1: 應該添加哪些外部庫？**

推薦清單：
- `recharts` — 圖表功能 (Phase 5) — 可選
- `react-big-calendar` — 日曆功能 (Phase 3b) — 可選
- `date-fns` — 日期處理 (推薦已有)
- `react-csv` — CSV 導出 (推薦)

**Q2: 測試是否同步進行？**

建議: 先完成功能，再補充測試 (迭代開發)

**Q3: 優先級調整？**

如果需要快速看到效果，可以調整優先級：
- 先做 Phase 3b (ScheduleManagement) 最見效
- 再做 Phase 3a (AdminPanel)
- 最後做 Phase 3c (AttendanceSheet)

---

## 📞 需要幫助嗎？

告訴我：
1. ✅ 同意上述計劃嗎？
2. 📝 需要調整哪些地方？
3. 🚀 從哪一步開始？

我準備好立即開始開發！

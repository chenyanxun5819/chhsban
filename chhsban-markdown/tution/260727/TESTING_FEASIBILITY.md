# Phase 3.3 AttendanceSheet - 前端測試可行性分析

**日期**: 2026-07-27  
**組件**: AttendanceSheet, AttendanceRow, AttendanceStats  
**狀態**: ✅ 前端代碼完成 | ⏳ 後端依賴未準備

---

## 📋 測試可行性評估

### 🔴 **短期內無法完整測試** (不推薦)

**原因**: 後端 API 端點尚未實現

#### 依賴的 API 端點

```typescript
// AttendanceManagement.tsx 中使用的 API:

1. GET /api/v1/schedules/{scheduleId}
   ├─ 用途: 獲取排期信息
   ├─ 返回: TutionSchedule
   └─ 狀態: ⏳ 未確認

2. GET /api/v1/classes/{classId}
   ├─ 用途: 獲取課程信息
   ├─ 返回: TutionClass
   └─ 狀態: ⏳ 未確認

3. GET /api/v1/rosters?class={classId}&status=active
   ├─ 用途: 獲取活躍學生名單
   ├─ 返回: TutionRoster[]
   └─ 狀態: ⏳ 未確認

4. GET /api/v1/attendance?schedule={scheduleId}
   ├─ 用途: 獲取既有點名記錄
   ├─ 返回: TutionAttendance[]
   └─ 狀態: ⏳ 未確認

5. POST /api/v1/attendance/bulk
   ├─ 用途: 批量保存點名記錄
   ├─ 入參: Partial<TutionAttendance>[]
   └─ 狀態: ⏳ 未確認
```

**核心問題**:
- ❌ 不知道後端是否已實現這些端點
- ❌ 不知道返回的數據結構是否匹配
- ❌ 不知道錯誤處理邏輯

---

## 🟡 **可行的測試方案**

### 方案 A: 本地 Mock 測試 (推薦) ✅

**可行性**: ⭐⭐⭐⭐ 立即可做

#### 步驟 1: 建立 Mock 服務

在 `src/utils/mockApi.ts` 中建立模擬 API:

```typescript
// Mock 數據
export const mockSchedule: TutionSchedule = {
  schedule_id: "SCH-001",
  class_id: "CLS-001",
  scheduled_date: "2026-07-27",
  status: "held",
  created_at: Date.now(),
  updated_at: Date.now(),
};

export const mockClass: TutionClass = {
  class_id: "CLS-001",
  teacher_id: "TEA-001",
  teacher_name_cn: "張老師",
  form: "F3",
  subject: "數學",
  day_of_week: "Monday",
  time_start: "19:00",
  time_end: "21:00",
  start_date: "2026-07-01",
  fees: 70,
  venue: "教室 A101",
  approval_status: "approved",
  approved_by: "ADMIN-001",
  approved_at: Date.now(),
  created_at: Date.now(),
  updated_at: Date.now(),
};

export const mockRoster: TutionRoster[] = [
  {
    roster_id: "ROS-001",
    class_id: "CLS-001",
    student_id: "STU-001",
    student_no: "20139",
    name_cn: "詹雨馨",
    name_en: "NGOW YU XINN",
    input_class_name: "S3A",
    status: "active",
    added_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // ... 更多學生
];

export const mockAttendance: TutionAttendance[] = [
  {
    attendance_id: "ATT-001",
    schedule_id: "SCH-001",
    class_id: "CLS-001",
    student_id: "STU-001",
    status: "present",
    recorded_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
  },
  // ... 更多記錄
];

// Mock API 函數
export const mockApiClient = {
  get: async (url: string) => {
    // 根據 URL 返回相應的 mock 數據
    if (url.includes('/schedules/')) return { data: mockSchedule };
    if (url.includes('/classes/')) return { data: mockClass };
    if (url.includes('/rosters')) return { data: mockRoster };
    if (url.includes('/attendance')) return { data: mockAttendance };
    return { data: null };
  },
  
  post: async (url: string, data: any) => {
    if (url.includes('/attendance/bulk')) {
      // 模擬保存點名記錄
      return { data: { success: true, count: data.length } };
    }
    return { data: null };
  },
};
```

#### 步驟 2: 在組件中切換 Mock

在 `AttendanceManagement.tsx` 中:

```typescript
import apiClient from "@/utils/api";
import { mockApiClient } from "@/utils/mockApi";

// 開發模式使用 Mock，生產模式使用真實 API
const client = process.env.NODE_ENV === 'development' ? mockApiClient : apiClient;

export const AttendanceSheetPage: React.FC = () => {
  // ... 使用 client.get(), client.post() 代替 apiClient
};
```

#### 步驟 3: 運行測試

```bash
npm run dev

# 打開瀏覽器訪問:
# http://localhost:5173/attendance/SCH-001

# 測試項目:
# ✅ 頁面加載 (顯示 mock 數據)
# ✅ 選擇學生狀態 (按鈕交互)
# ✅ 批量操作 (全選、反選、標記)
# ✅ 統計更新 (實時計算)
# ✅ 提交點名 (模擬 API 調用)
# ✅ 響應式佈局 (桌機/手機)
```

---

### 方案 B: 聯繫後端確認 API 狀態

**可行性**: ⭐⭐ 取決於後端進度

#### 需要確認的信息

1. **API 端點是否已實現**?
   - GET /api/v1/schedules/{scheduleId}
   - GET /api/v1/classes/{classId}
   - GET /api/v1/rosters?class={classId}
   - GET /api/v1/attendance?schedule={scheduleId}
   - POST /api/v1/attendance/bulk

2. **返回的數據結構是否符合**?
   ```typescript
   interface TutionSchedule {
     schedule_id: string;
     class_id: string;
     scheduled_date: string;  // YYYY-MM-DD 格式?
     status: "held" | "cancelled" | "rescheduled";
     created_at: number;      // 時間戳或字符串?
     updated_at: number;
   }
   
   interface TutionRoster {
     roster_id: string;
     class_id: string;
     student_id: string;
     student_no: string;
     name_cn: string;
     name_en: string;
     input_class_name: string;
     status: "initial" | "active" | "dropped";
     added_at: number;
     created_at: number;
     updated_at: number;
   }
   
   interface TutionAttendance {
     attendance_id: string;
     schedule_id: string;
     class_id: string;
     student_id: string;
     status: "present" | "absent" | "late";
     recorded_at: number;
     created_at: number;
     updated_at: number;
   }
   ```

3. **錯誤處理如何進行**?
   - 404 錯誤 (排期不存在)
   - 500 錯誤 (服務器異常)
   - 驗證錯誤 (數據不合法)

4. **認證是否已配置**?
   - Bearer Token 驗證?
   - 是否需要刷新 token?

---

## ✅ **建議的測試計劃**

### 立即可做 (今天)

#### 1️⃣ **本地 Mock 測試** (1 小時)
- ✅ 建立 mockApi.ts
- ✅ 修改 AttendanceManagement.tsx 使用 mock
- ✅ 本地 `npm run dev` 測試
- ✅ 驗證組件功能:
  - 頁面加載和數據顯示
  - 狀態選擇
  - 批量操作
  - 統計計算
  - 提交操作
- ✅ 響應式設計測試 (DevTools 手機模擬)

#### 2️⃣ **TypeScript 類型測試** (15 分鐘)
- ✅ `npm run type-check` — 驗證類型安全
- ✅ 確認沒有類型錯誤
- ✅ 驗證組件導出

#### 3️⃣ **生產構建測試** (15 分鐘)
- ✅ `npm run build` — 構建成功
- ✅ 檢查構建輸出大小
- ✅ 驗證部署準備

### 後端就緒後 (待定)

#### 🔵 **集成測試** (2 小時)
- 🔵 連接真實 API
- 🔵 測試完整工作流程
- 🔵 測試錯誤處理
- 🔵 測試邊界情況
- 🔵 真機測試 (iOS/Android)

---

## 📊 **測試檢查清單**

### 功能測試 (本地 Mock)

- [ ] **頁面加載**
  - [ ] Mock 數據正確顯示
  - [ ] 排期信息頭部顯示
  - [ ] 課程信息顯示
  - [ ] 學生列表加載

- [ ] **狀態選擇**
  - [ ] 點擊"出席"按鈕 → 狀態更新
  - [ ] 點擊"遲到"按鈕 → 狀態更新
  - [ ] 點擊"缺席"按鈕 → 狀態更新
  - [ ] 按鈕顯示 active 樣式

- [ ] **批量操作**
  - [ ] 全選功能 → 所有學生被選中
  - [ ] 反選功能 → 選擇狀態切換
  - [ ] 標記出席 → 所有選中學生狀態為"出席"
  - [ ] 標記遲到 → 所有選中學生狀態為"遲到"
  - [ ] 標記缺席 → 所有選中學生狀態為"缺席"
  - [ ] 清空按鈕 → 所有狀態重設為缺席

- [ ] **統計更新**
  - [ ] 出席人數實時更新
  - [ ] 遲到人數實時更新
  - [ ] 缺席人數實時更新
  - [ ] 出席率百分比正確計算
  - [ ] 條形圖寬度正確

- [ ] **提交操作**
  - [ ] 點擊"保存點名記錄"
  - [ ] Mock API 被調用
  - [ ] 成功消息顯示
  - [ ] 返回導航工作

- [ ] **錯誤処理**
  - [ ] 空學生列表顯示提示
  - [ ] 加載失敗顯示錯誤消息
  - [ ] 關閉錯誤提示工作

### 響應式測試 (DevTools)

- [ ] **桌機版 (≥1024px)**
  - [ ] 列表完整顯示
  - [ ] 按鈕排列正確
  - [ ] 統計卡片並排顯示

- [ ] **平板版 (768-1023px)**
  - [ ] 佈局調整適當
  - [ ] 按鈕堆疊合理
  - [ ] 文字可讀性好

- [ ] **手機版 (<768px)**
  - [ ] 單列佈局
  - [ ] 按鈕觸摸友好
  - [ ] 水平滾動可用
  - [ ] 文字大小合適

### 代碼質量

- [ ] TypeScript 編譯: 0 錯誤
- [ ] 生產構建: 成功
- [ ] Console 無警告/錯誤

---

## 💻 **執行 Mock 測試的代碼示例**

### 第一步: 建立 mock 文件

**新建** `src/utils/mockApi.ts`:

```typescript
import {
  TutionSchedule,
  TutionClass,
  TutionRoster,
  TutionAttendance,
} from "@/types";

// Mock 數據
const mockData = {
  schedule: {
    schedule_id: "SCH-20260727-001",
    class_id: "CLS-20260701-001",
    scheduled_date: "2026-07-27",
    status: "held" as const,
    created_at: Date.now(),
    updated_at: Date.now(),
  } as TutionSchedule,

  class: {
    class_id: "CLS-20260701-001",
    teacher_id: "TEA-001",
    teacher_name_cn: "張老師",
    form: "F3",
    subject: "數學",
    day_of_week: "Monday",
    time_start: "19:00",
    time_end: "21:00",
    start_date: "2026-07-01",
    fees: 70,
    venue: "教室 A101",
    approval_status: "approved" as const,
    approved_by: "ADMIN-001",
    approved_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
  } as TutionClass,

  roster: Array.from({ length: 30 }, (_, i) => ({
    roster_id: `ROS-${String(i + 1).padStart(3, "0")}`,
    class_id: "CLS-20260701-001",
    student_id: `STU-${String(i + 1).padStart(3, "0")}`,
    student_no: `2${String(100 + i).padStart(3, "0")}`,
    name_cn: `學生 ${i + 1}`,
    name_en: `Student ${i + 1}`,
    input_class_name: "S3A",
    status: "active" as const,
    added_at: Date.now(),
    created_at: Date.now(),
    updated_at: Date.now(),
  } as TutionRoster)),

  attendance: [] as TutionAttendance[],
};

// Mock API 客戶端
export const mockApiClient = {
  get: async (url: string) => {
    // 模擬 API 延遲
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (url.includes("/schedules/")) {
      return { data: mockData.schedule };
    }
    if (url.includes("/classes/")) {
      return { data: mockData.class };
    }
    if (url.includes("/rosters")) {
      return { data: mockData.roster };
    }
    if (url.includes("/attendance")) {
      return { data: mockData.attendance };
    }
    throw new Error(`Unknown URL: ${url}`);
  },

  post: async (url: string, data: any) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (url.includes("/attendance/bulk")) {
      console.log("Mock: Saving attendance records", data);
      return {
        data: {
          success: true,
          count: data.length,
          message: "點名記錄已保存",
        },
      };
    }
    throw new Error(`Unknown URL: ${url}`);
  },
};

export default mockApiClient;
```

### 第二步: 在開發環境中使用 Mock

在 `AttendanceManagement.tsx` 頂部添加:

```typescript
import apiClient from "@/utils/api";

// 開發模式使用 Mock
const API_CLIENT =
  import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true"
    ? (async () => {
        const { mockApiClient } = await import("@/utils/mockApi");
        return mockApiClient;
      })()
    : Promise.resolve(apiClient);

// 在 fetchScheduleAndRoster 中使用:
const client = await API_CLIENT;
const scheduleRes = await client.get(`/api/v1/schedules/${scheduleId}`);
```

### 第三步: 運行開發服務器

```bash
# 使用 Mock 運行
VITE_USE_MOCK=true npm run dev

# 正常運行 (需要後端)
npm run dev
```

---

## 📝 **總結**

| 測試方案 | 可行性 | 時間 | 推薦度 |
|---------|--------|------|--------|
| **Mock 本地測試** | ✅ 立即可做 | 1 小時 | ⭐⭐⭐⭐⭐ |
| **真實 API 測試** | ⏳ 待後端 | 2 小時 | ⭐ (待定) |

**建議**: 使用 Mock 方案進行本地測試，驗證組件功能和響應式設計的正確性。待後端 API 準備就緒後，再進行集成測試。

---

**下一步**: 
1. 建立 `mockApi.ts`
2. 修改 AttendanceManagement.tsx 使用 mock
3. 運行 `npm run dev` 測試
4. 驗證所有功能項

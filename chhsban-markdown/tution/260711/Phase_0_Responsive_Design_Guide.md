---
name: "Phase-0-Responsive-Design-Guide"
description: "補習班系統響應式設計完整指南 - 斷點、組件、最佳實踐"
status: "✅ Phase 0 完成"
date: "2026-07-11"
---

# 🎨 Phase 0 - 響應式設計完整指南

**狀態**: ✅ **完成** | **版本**: v1.0 | **日期**: 2026-07-11

---

## 📱 響應式斷點定義

### 標準斷點 (Mobile First)

```css
Mobile:    0 - 767px    (手機 - 預設)
Tablet:    768 - 1023px (平板)
Desktop:   ≥ 1024px     (桌機)
```

### CSS 變數 (已在 :root 定義)

```css
--breakpoint-mobile: 0
--breakpoint-tablet: 768px
--breakpoint-desktop: 1024px
```

### 媒體查詢示例

```css
/* 手機版 (預設) - 0-767px */
.component { /* 手機樣式 */ }

/* 平板版 768px+ */
@media (min-width: 768px) {
  .component { /* 平板樣式 */ }
}

/* 桌機版 1024px+ */
@media (min-width: 1024px) {
  .component { /* 桌機樣式 */ }
}
```

---

## 🧩 核心響應式組件

### 1️⃣ ResponsiveCard (卡片)

**用途**: 展示單個訊息單位（申請、課程、學生等）

```typescript
import { ResponsiveCard } from "@/components/common/ResponsiveCard";

// 基本用法
<ResponsiveCard title="課程申請" subtitle="數學補習班">
  <p>申請詳情...</p>
</ResponsiveCard>

// 帶操作按鈕
<ResponsiveCard
  title="已批准課程"
  action={<button>編輯</button>}
  variant="status-approved"
>
  <p>課程內容...</p>
</ResponsiveCard>

// 變體
- variant="default" (預設)
- variant="highlight" (強調)
- variant="status-pending" (待審)
- variant="status-approved" (已批准)
```

**響應式特性**:
- ✅ 手機版: 全寬，padding 減小
- ✅ 桌機版: 固定寬度，padding 標準
- ✅ 按鈕自動堆疊

---

### 2️⃣ ResponsiveGrid (網格)

**用途**: 多卡片佈局（申請列表、課程列表等）

```typescript
import { ResponsiveGrid } from "@/components/common/ResponsiveCard";

// 自動列數
<ResponsiveGrid columns="auto" gap="md">
  <ResponsiveCard>...</ResponsiveCard>
  <ResponsiveCard>...</ResponsiveCard>
  <ResponsiveCard>...</ResponsiveCard>
</ResponsiveGrid>

// 固定列數
<ResponsiveGrid columns="3" gap="lg">
  {items.map(item => <ResponsiveCard key={item.id}>{item}</ResponsiveCard>)}
</ResponsiveGrid>

// 選項
columns: "auto" | "2" | "3" | "4"
gap: "sm" | "md" | "lg"
```

**響應式特性**:
- ✅ 手機版: 1 列
- ✅ 平板版: 2 列
- ✅ 桌機版: 3-4 列

---

### 3️⃣ ResponsiveFormRow (表單行)

**用途**: 表單字段排列（申請表單、編輯頁面）

```typescript
import { ResponsiveFormRow } from "@/components/common/ResponsiveCard";

// 單列 (手機)
<ResponsiveFormRow cols="1" gap="md">
  <input type="text" placeholder="名字" />
  <input type="email" placeholder="Email" />
</ResponsiveFormRow>

// 雙列 (平板+)
<ResponsiveFormRow cols="2" gap="md">
  <input type="text" placeholder="名字" />
  <input type="text" placeholder="科目" />
</ResponsiveFormRow>

// 三列 (桌機)
<ResponsiveFormRow cols="3" gap="md">
  <input type="text" placeholder="名字" />
  <input type="text" placeholder="科目" />
  <input type="text" placeholder="年級" />
</ResponsiveFormRow>

// 選項
cols: "1" | "2" | "3"
gap: "sm" | "md" | "lg"
```

**響應式特性**:
- ✅ 手機版: 始終 1 列
- ✅ 平板版: 2 列
- ✅ 桌機版: 完整列數

---

### 4️⃣ ResponsiveButtonGroup (按鈕組)

**用途**: 表單操作按鈕（提交/取消/編輯）

```typescript
import { ResponsiveButtonGroup } from "@/components/common/ResponsiveCard";

// 右對齐
<ResponsiveButtonGroup justify="end">
  <button className="btn-cancel">取消</button>
  <button className="btn-primary">提交</button>
</ResponsiveButtonGroup>

// 兩端對齐
<ResponsiveButtonGroup justify="space-between">
  <button className="btn-danger">刪除</button>
  <button className="btn-primary">保存</button>
</ResponsiveButtonGroup>

// 選項
justify: "start" | "center" | "end" | "space-between"
stacked: boolean (手機版自動堆疊)
```

**響應式特性**:
- ✅ 手機版: 垂直堆疊，全寬按鈕
- ✅ 桌機版: 水平排列，固定寬度

---

### 5️⃣ ResponsiveTable (表格)

**用途**: 列表展示（出勤表、課程表等）

```typescript
import { ResponsiveTable } from "@/components/common/ResponsiveCard";

<ResponsiveTable striped hover>
  <thead>
    <tr>
      <th>學生 ID</th>
      <th>名字</th>
      <th>狀態</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>20139</td>
      <td>詹雨馨</td>
      <td>出席</td>
    </tr>
  </tbody>
</ResponsiveTable>

// 選項
striped: boolean (斑馬紋)
hover: boolean (懸停高亮)
```

**響應式特性**:
- ✅ 手機版: 自動橫向滾動
- ✅ 字體自動縮小
- ✅ Padding 自動調整

---

### 6️⃣ ResponsiveStack (堆疊容器)

**用途**: 彈性佈局（標題+內容、按鈕組合等）

```typescript
import { ResponsiveStack } from "@/components/common/ResponsiveCard";

// 水平佈局 (桌機)
<ResponsiveStack direction="row" gap="lg" justify="space-between" responsive>
  <h2>課程列表</h2>
  <button>+ 新增課程</button>
</ResponsiveStack>

// 手機版自動變垂直

// 選項
direction: "row" | "column"
gap: "xs" | "sm" | "md" | "lg" | "xl"
align: "start" | "center" | "end"
justify: "start" | "center" | "end" | "space-between"
responsive: boolean (手機版自動變列)
```

**響應式特性**:
- ✅ 手機版: 自動堆疊為列
- ✅ 桌機版: 維持原方向
- ✅ 對齊方式自動調整

---

## 🎨 樣式系統

### CSS 變數 (已定義)

```css
:root {
  /* 顏色 */
  --primary-color: #1890ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --danger-color: #ff4d4f;
  --text-primary: #262626;
  --text-secondary: #8c8c8c;
  --border-color: #d9d9d9;
  --bg-light: #fafafa;

  /* 間距 */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 使用變數

```css
/* ❌ 不推薦 */
.button { margin: 16px; padding: 8px; }

/* ✅ 推薦 */
.button {
  margin: var(--spacing-md);
  padding: var(--spacing-sm);
  color: var(--primary-color);
}
```

---

## 📐 佈局架構

### 桌機版 (Desktop ≥ 1024px)

```
┌─────────────────────────────────────────┐
│         主標題欄 (Header)               │
├──────────────┬──────────────────────────┤
│              │                          │
│  側邊欄      │    主內容區域            │
│  (280px)     │   (Responsive)           │
│              │                          │
│ • 首頁       │ ┌────────────────────┐   │
│ • 申請       │ │ ResponsiveGrid     │   │
│ • 課程       │ │ ┌──┐ ┌──┐ ┌──┐   │   │
│ • 審批       │ │ │卡│ │卡│ │卡│   │   │
│              │ │ └──┘ └──┘ └──┘   │   │
│              │ └────────────────────┘   │
│              │                          │
└──────────────┴──────────────────────────┘
```

### 平板版 (Tablet 768-1023px)

```
┌──────────────────────────────┐
│      主標題欄 (Header)      │
├──────────────────────────────┤
│   主內容 (全寬)              │
│ ┌─────────────┐ ┌─────────┐ │
│ │  卡片       │ │  卡片   │ │
│ └─────────────┘ └─────────┘ │
│ ┌─────────────┐ ┌─────────┐ │
│ │  卡片       │ │  卡片   │ │
│ └─────────────┘ └─────────┘ │
└──────────────────────────────┘
│  底部導航 (60px)             │
└──────────────────────────────┘
```

### 手機版 (Mobile < 768px)

```
┌──────────────┐
│ Header (56px)│
├──────────────┤
│              │
│ 主內容 (全寬) │
│              │
│ ┌──────────┐ │
│ │   卡片   │ │
│ └──────────┘ │
│ ┌──────────┐ │
│ │   卡片   │ │
│ └──────────┘ │
│              │
└──────────────┘
│ 底部導航(60px)│
└──────────────┘
```

---

## 🛠️ 最佳實踐

### ✅ 應該做的事

1. **使用 CSS 變數**
   ```css
   padding: var(--spacing-md);
   color: var(--primary-color);
   ```

2. **優先使用組件**
   ```typescript
   <ResponsiveCard>...</ResponsiveCard>
   <ResponsiveGrid>...</ResponsiveGrid>
   ```

3. **遵循 Mobile First 原則**
   ```css
   .component { /* 手機預設 */ }
   @media (min-width: 768px) { /* 平板+ */ }
   @media (min-width: 1024px) { /* 桌機 */ }
   ```

4. **測試所有斷點**
   - Chrome DevTools: 手機模擬
   - 實機測試 (iOS/Android)
   - 各種螢幕寬度

5. **觸摸優化**
   ```css
   button {
     min-height: 44px; /* iOS 推薦 */
     min-width: 44px;  /* 最小按鈕尺寸 */
   }
   ```

### ❌ 避免做的事

1. **硬編碼像素值**
   ```css
   /* ❌ 不推薦 */
   .button { margin: 16px; }
   
   /* ✅ 推薦 */
   .button { margin: var(--spacing-md); }
   ```

2. **多個媒體查詢衝突**
   ```css
   /* ❌ 不推薦 */
   @media (max-width: 768px) { flex-direction: column; }
   @media (min-width: 769px) { flex-direction: row; }
   
   /* ✅ 推薦 */
   @media (min-width: 768px) { flex-direction: row; }
   ```

3. **忽視手機版**
   - 始終先設計手機版
   - 再向上擴展

4. **不測試響應**
   - 必須測試所有斷點
   - 測試觸摸互動

---

## 🧪 測試清單

### Chrome DevTools 測試

1. 打開 DevTools (F12)
2. 切換為裝置工具欄 (Ctrl+Shift+M)
3. 選擇不同裝置:
   - iPhone 12 (390px)
   - iPad Air (820px)
   - Desktop (1920px)

### 測試項目

- [ ] 手機 (< 768px): 所有元素單列，導航底部
- [ ] 平板 (768-1023px): 雙列網格，側邊欄隱藏
- [ ] 桌機 (≥ 1024px): 多列網格，側邊欄可見
- [ ] 所有圖片正確縮放
- [ ] 所有按鈕可點擊 (≥44x44px)
- [ ] 表格可橫向滾動
- [ ] 表單字段堆疊正確

### 實機測試

```bash
# 連接本地開發伺服器 (替換 IP 和 PORT)
http://<your-machine-ip>:5173

# 掃描二維碼或直接輸入
# 在 iOS 或 Android 上測試
```

---

## 📦 文件結構

```
src/
├── components/
│   └── common/
│       ├── Layout.tsx                 # 主佈局 + Header + Sidebar
│       ├── layout.css                 # 佈局樣式
│       ├── ResponsiveCard.tsx          # 響應式組件集合
│       └── responsive-components.css   # 組件樣式
│
├── styles/
│   ├── index.css                      # 全局重置 + 變數
│   ├── App.css                        # 應用級樣式
│   ├── layout.css                     # 佈局相關
│   └── responsive.css                 # 響應式框架
│
└── pages/
    ├── Welcome/
    │   ├── Welcome.tsx
    │   └── welcome.css
    ├── ApplicationManagement/
    │   ├── ApplicationForm.tsx
    │   ├── ApplicationList.tsx
    │   └── application.css
    └── ...
```

---

## 🚀 使用示例

### 完整頁面示例

```typescript
import React from "react";
import { Layout } from "@/components/common/Layout";
import {
  ResponsiveCard,
  ResponsiveGrid,
  ResponsiveFormRow,
  ResponsiveButtonGroup,
} from "@/components/common/ResponsiveCard";

const MyPage: React.FC = () => {
  return (
    <Layout title="申請管理">
      <div className="page">
        {/* 標題區 */}
        <h2>待審申請</h2>

        {/* 網格佈局 */}
        <ResponsiveGrid columns="3" gap="md">
          <ResponsiveCard
            title="數學補習班"
            subtitle="F4 級別"
            variant="status-pending"
          >
            <p>開課日期: 2026-07-15</p>
            <p>學費: 70 RM</p>
          </ResponsiveCard>

          <ResponsiveCard
            title="英文補習班"
            subtitle="F3 級別"
            variant="status-approved"
          >
            <p>開課日期: 2026-07-10</p>
            <p>學費: 80 RM</p>
          </ResponsiveCard>
        </ResponsiveGrid>

        {/* 表單區 */}
        <ResponsiveCard title="新增申請">
          <ResponsiveFormRow cols="2" gap="md">
            <input type="text" placeholder="科目" />
            <select>
              <option>選擇年級</option>
              <option>F1</option>
              <option>F2</option>
            </select>
          </ResponsiveFormRow>

          <ResponsiveFormRow cols="3" gap="md">
            <input type="date" placeholder="開課日期" />
            <input type="number" placeholder="學費" />
            <input type="text" placeholder="地點" />
          </ResponsiveFormRow>

          <ResponsiveButtonGroup justify="end">
            <button className="btn-cancel">取消</button>
            <button className="btn-primary">提交</button>
          </ResponsiveButtonGroup>
        </ResponsiveCard>
      </div>
    </Layout>
  );
};

export default MyPage;
```

---

## 🔄 下一步

**Phase 0-Responsive 完成後:**

1. ✅ Phase 2a: Welcome 歡迎介面
2. ✅ Phase 2b: ApplicationForm 申請表單 (使用響應式組件)
3. ✅ Phase 2c: ApplicationList 申請列表
4. ✅ Phase 2d: ApplicationDetail 申請詳情
5. ✅ 所有其他頁面遵循相同的響應式原則

---

**版本**: v1.0 | **日期**: 2026-07-11 | **狀態**: ✅ 完成

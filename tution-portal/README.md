# 補習班系統前端門戶 (Tution Portal)

補習班系統 (P4) 的完整前端實現。

## 📋 項目描述

完整的補習班前端門戶系統，使教師能夠：
- 提出補習班開班申請
- 管理學生名單
- 記錄開課情況（含停課/調課）
- 進行學生點名與出勤紀錄
- 查看和下載申請表 PDF

同時為管理員提供申請審批介面。

## 🚀 快速開始

### 前置要求
- Node.js >= 18
- npm >= 9

### 安裝依賴

```bash
npm install
```

### 開發環境運行

```bash
npm run dev
```

應用將運行於 `http://localhost:5173`

### 編譯生產版本

```bash
npm run build
```

### 類型檢查

```bash
npm run type-check
```

## 📁 項目結構

```
src/
├── pages/                   # 頁面組件
│   ├── Welcome/            # 歡迎介面
│   ├── ApplicationManagement/  # 申請管理
│   ├── ClassManagement/    # 課程管理
│   ├── ScheduleManagement/ # 開課記錄
│   ├── RosterManagement/   # 學生名單
│   └── AttendanceTracking/ # 出勤紀錄
├── components/             # 可重用組件
│   └── common/            # 通用組件
├── context/               # React Context
│   └── AuthContext.tsx    # 認證狀態管理
├── services/              # 業務邏輯服務
├── types/                 # TypeScript 類型定義
├── utils/                 # 工具函數
│   └── api.ts            # Axios API 客戶端
├── styles/               # CSS 樣式
├── App.tsx              # 主應用組件
└── main.tsx             # 應用入口點
```

## 🔑 主要功能

### Phase 1: 項目初始化 ✅
- [x] Vite 項目建立
- [x] 認證系統共享
- [x] API 客戶端配置
- [x] 路由框架建立
- [x] 編譯驗證

### Phase 2: 申請模組（待實施）
- [ ] Welcome 歡迎介面
- [ ] ApplicationForm 申請表單
- [ ] ApplicationList 申請列表
- [ ] ApplicationDetail 申請詳情

### Phase 3: 課程管理（待實施）
- [ ] AdminPanel 管理員審批
- [ ] ScheduleManagement 開課記錄
- [ ] AttendanceTracking 點名系統

### Phase 4-6: 其他功能（待實施）
- [ ] 學生名單管理
- [ ] 出勤統計
- [ ] PDF 下載

## 🔗 相關資源

- **API 文檔**: [API_Quick_Reference.md](../chhsban-markdown/260709/API_Quick_Reference.md)
- **實現計劃**: [P4_Frontend_Implementation_Plan.md](../chhsban-markdown/260709/P4_Frontend_Implementation_Plan.md)
- **認證系統**: [chhsban-portal](../chhsban-portal)

## 🛠️ 環境變數

建立 `.env.local` 檔案：

```env
VITE_API_BASE_URL=http://localhost:8787/api
```

## 📦 依賴項

- React 18.2+
- React Router DOM 6.14+
- Axios 1.4+
- TypeScript 5.0+
- Vite 5.0+

## 📝 備註

本項目使用共享模組 (@chhsban/cloudflare-config, @chhsban/kv-utils)，請確保這些模組已正確安裝。

## 🔄 項目交接

最後更新: 2026-07-09  
狀態: Phase 1 完成 ✅  
下一步: Phase 2 頁面開發

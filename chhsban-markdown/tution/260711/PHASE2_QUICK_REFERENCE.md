# Phase 2 快速參考指南

## 🚀 快速開始

### 本地開發
```bash
cd d:\chhsban\tution-portal
npm install
npm run dev      # 開放 http://localhost:5173
```

### 構建與部署
```bash
npm run build
wrangler pages deploy dist/ --project-name=chhsban-tution
```

---

## 📱 頁面導覽

| 功能 | URL | 描述 |
|------|-----|------|
| 登入 | `/login` | Google OAuth + 郵箱驗證 |
| 儀表板 | `/` | 教師首頁（待審、已批准統計） |
| 新增申請 | `/applications/new` | 提交新的補習班申請 |
| 申請列表 | `/applications` | 檢視所有申請，支援篩選搜尋 |
| 申請詳情 | `/applications/:id` | 查看/編輯單個申請 |

---

## 🎯 各頁面核心功能

### Welcome (儀表板)
- 📊 顯示待審/已批准/總計統計
- 📝 待審應用快速連結
- ✓ 已批准課程列表
- ➕ 新增申請按鈕

### ApplicationForm (新增申請)
#### Step 1: 基本信息
- 年級 (F1-F6)
- 科目
- 上課日期 (周一到周日)
- 開課日期
- 學費 (RM)
- 上課地點

#### Step 2: 學生名單
- **CSV 上傳**: 上傳包含學生ID的CSV檔案
- **手動輸入**: 逐個輸入學生ID
- **驗證**: 自動查詢學生信息
- **提交**: 創建申請並保存初始名單

### ApplicationList (申請列表)
- 📊 表格視圖 (桌機) / 卡片視圖 (手機)
- 🔍 搜尋功能
- 🏷️ 狀態篩選 (全部、待審、已批准、已拒、進行中)
- 🔗 點擊進入詳情頁面

### ApplicationDetail (申請詳情)
- 👀 完整申請信息查看
- ✏️ 編輯模式切換
- 👥 學生名單檢視
- 🗑️ 刪除/取消操作

---

## 🎨 響應式斷點

```css
/* 移動設備 */
0 - 767px: 
  - 1 列網格
  - 堆棧按鈕
  - 卡片視圖
  - 分步表單

/* 平板設備 */
768 - 1023px:
  - 2 列網格
  - 水平按鈕
  - 過渡視圖

/* 桌機 */
1024px+:
  - 3 列網格
  - 表格視圖
  - 完整表單
```

---

## 📋 表單驗證規則

### ApplicationForm 必填字段
- ✓ 年級 (required)
- ✓ 科目 (required)
- ✓ 上課日期 (required)
- ✓ 開課日期 (required, 最少往後 7 天)
- ✓ 學費 (required, > 0)
- ✓ 上課地點 (required)
- ✓ 至少 1 名學生 (required)

### CSV 格式
```csv
S001
S002
S003
```
(每行一個學生ID)

---

## 🔌 API 端點

### 認證
```
POST /auth/verify
Body: { email }
Response: { token, teacher_id, teacher_name, permission, email }
```

### 學生驗證
```
POST /api/v1/students/validate
Body: { student_ids: string[] }
Response: { valid: TutionRosterSnapshot[], invalid: string[] }
```

### 申請管理
```
GET /v1/classes?teacher=${teacherId}
POST /api/v1/classes
PUT /api/v1/classes/:id
DELETE /api/v1/classes/:id
```

---

## 🔒 認證流程

1. **Google Sign-In** → 取得 JWT token
2. **解析 Email** → 從 JWT 中提取
3. **郵箱驗證** → POST /auth/verify
4. **保存令牌** → localStorage (auth_token, auth_user)
5. **自動重導向** → / (Welcome)

### 注意事項
- Token 過期後自動重導向到 /login
- 測試用戶: schhs334@chhsban.edu.my

---

## 📦 依賴與版本

```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "vite": "^5.4.21",
  "axios": "^1.6.0",
  "react-router-dom": "^6.x"
}
```

---

## 🐛 常見問題

### Q: 為什麼頁面不響應?
A: 檢查網絡連接與 Cloudflare Workers 後端是否運行
```
https://student-sync.astcws.workers.dev/health
```

### Q: CSV 上傳失敗?
A: 檢查 CSV 格式，每行應該是單個學生ID（無標頭）

### Q: 為什麼登入後無法訪問?
A: 驗證後端 `/auth/verify` 是否返回有效的 token

### Q: 手機版為什麼是堆棧按鈕?
A: 這是刻意設計，用於優化手機 UX（寬度 < 768px）

---

## 🧪 測試清單

- [ ] 登入流程（Google + 郵箱驗證）
- [ ] Welcome 頁面加載統計
- [ ] ApplicationForm 基本信息驗證
- [ ] CSV 上傳與學生驗證
- [ ] ApplicationList 篩選與搜尋
- [ ] ApplicationDetail 編輯與刪除
- [ ] 手機適配性（375px）
- [ ] 平板適配性（768px）
- [ ] 桌機全功能測試（1024px+）

---

## 📞 技術支援

**開發者**: GitHub Copilot  
**部署平台**: Cloudflare Pages + Workers  
**監控**: 部署歷史見 Cloudflare Dashboard  

---

**最後更新**: 2026-07-11  
**狀態**: ✅ Production Ready

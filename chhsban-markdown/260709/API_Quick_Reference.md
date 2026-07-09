# API 快速參考卡片

## 🔐 認證

所有 API 都需要 Bearer Token:

```
Authorization: Bearer {YOUR_TOKEN}
```

---

## 📋 補習班主表 API

### 建立

```bash
POST /api/v1/classes
Content-Type: application/json

{
  "form": "F4",
  "subject": "數學",
  "day_of_week": "Monday",
  "start_date": "2026-07-15",
  "fees": 70,
  "venue": "教室 A101",
  "teacher_name_cn": "陳老師"  // 選填，不提供時自動查詢
}

響應 (201):
{
  "class_id": "class_1720503600000_abc123",
  "teacher_id": "T001",
  "teacher_name_cn": "陳老師",
  "form": "F4",
  "subject": "數學",
  "day_of_week": "Monday",
  "time_start": "19:00",
  "time_end": "21:00",
  "start_date": "2026-07-15",
  "fees": 70,
  "venue": "教室 A101",
  "approval_status": "pending",
  "created_at": 1720503600000,
  "updated_at": 1720503600000
}
```

### 查詢

```bash
# 查詢教師的補習班
GET /api/v1/classes?teacher=T001

# 查詢特定補習班
GET /api/v1/classes/{classId}
```

### 更新

```bash
PUT /api/v1/classes/{classId}
Content-Type: application/json

{
  "fees": 75,
  "venue": "教室 A102",
  "approval_status": "active"
}
```

### 刪除

```bash
DELETE /api/v1/classes/{classId}

響應: 204 No Content
```

---

## 📄 PDF 生成

```bash
GET /api/v1/classes/{classId}/pdf

響應:
Content-Type: application/pdf
Content-Disposition: attachment; filename="tution_{classId}.pdf"
{binary PDF data}
```

---

## 🔄 Google Sheets 同步

### 初始化

```bash
GET /api/sync?action=init

響應:
{
  "success": true,
  "message": "Google Sheet initialized with 3 worksheets"
}
```

### 同步所有

```bash
GET /api/sync?action=sync-all

響應:
{
  "success": true,
  "message": "All data synced to Google Sheet",
  "stats": {
    "classes": 5,
    "roster": 0,
    "attendance": 0
  }
}
```

### 同步補習班

```bash
GET /api/sync?action=sync-classes

響應:
{
  "success": true,
  "message": "Classes synced to Google Sheet",
  "count": 5
}
```

---

## ❌ 錯誤碼

| 碼 | 說明 |
|----|------|
| 200 | 成功 |
| 201 | 建立成功 |
| 204 | 刪除成功 |
| 400 | 無效請求 |
| 401 | 未認證 |
| 403 | 無權限 |
| 404 | 不存在 |
| 500 | 伺服器錯誤 |

---

## 🧪 測試命令

### 1. 健康檢查 (不需要認證)

```bash
curl https://tution-system.workers.dev/api/health
```

### 2. 建立補習班

```bash
TOKEN="your-token-here"

curl -X POST "https://tution-system.workers.dev/api/v1/classes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "form": "F4",
    "subject": "數學",
    "day_of_week": "Monday",
    "start_date": "2026-07-15",
    "fees": 70,
    "venue": "教室 A101"
  }'
```

### 3. 查詢補習班

```bash
curl -X GET "https://tution-system.workers.dev/api/v1/classes?teacher=T001" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. 生成 PDF

```bash
curl -X GET "https://tution-system.workers.dev/api/v1/classes/class_id_here/pdf" \
  -H "Authorization: Bearer $TOKEN" \
  -o tution_application.pdf
```

### 5. 同步到 Google Sheet

```bash
curl -X GET "https://tution-system.workers.dev/api/sync?action=sync-all" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📊 字段說明

| 字段 | 類型 | 必填 | 說明 |
|------|------|------|------|
| form | string | ✅ | F1-F6 年級 |
| subject | string | ✅ | 科目名稱 |
| day_of_week | string | ✅ | Monday-Sunday |
| start_date | string | ✅ | YYYY-MM-DD |
| fees | number | ✅ | 學費金額 |
| venue | string | ✅ | 上課地點 |
| teacher_name_cn | string | ❌ | 教師中文名 |
| time_start | string | ❌ | HH:MM (自動設置) |
| time_end | string | ❌ | HH:MM (自動設置) |
| approval_status | string | ❌ | pending/approved/active |

---

## 🌐 生產環境 URL

```
Base URL: https://tution-system.chhsban-acadoc.workers.dev
```

---

## 💾 Google Sheet 參考

| Sheet Name | 用途 | 狀態 |
|-----------|------|------|
| Classes | 補習班主表 | ✅ 已實現 |
| Roster | 學生名單 | ⏳ Phase 2 |
| Attendance | 出勤紀錄 | ⏳ Phase 2 |

---

## 🆘 常見問題

**Q: 如何取得 Bearer Token?**  
A: 聯絡系統管理員，使用 AcaDoc 的認證系統。

**Q: PDF 為什麼是空白?**  
A: 確保補習班資料已完整填充，特別是申請資料欄位。

**Q: Google Sheet 為什麼看不到數據?**  
A: 需要先執行 `/api/sync?action=init` 初始化，然後執行同步。

**Q: 如何更新已存在的補習班?**  
A: 使用 PUT 方法，只需提供要更新的字段即可。

---

## ⚡ 快速提示

1. **始終包含 Authorization header**
2. **POST/PUT 時使用 Content-Type: application/json**
3. **class_id 由系統自動生成，無需提供**
4. **teacher_id 自動從 session 獲取**
5. **approval_status 默認為 pending**

---

**版本**: v1.0  
**最後更新**: 2026-07-09  
**文檔 URL**: D:\chhsban\chhsban-markdown\260709\

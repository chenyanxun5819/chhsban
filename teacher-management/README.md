# 教師資料管理系統 (Teacher Management)

基於 Cloudflare Workers 的教師資料管理系統，提供完整的增刪改查（CRUD）功能，使用 KV 存儲教師資料。

## 功能特性

✅ **新增教師** - 建立新的教師記錄  
✅ **查詢教師** - 按 ID 或部門查詢  
✅ **修改教師** - 更新教師資料  
✅ **刪除教師** - 移除教師記錄  
✅ **列表查詢** - 取得所有教師或依部門篩選  
✅ **API 驗證** - 支援 API Key 驗證  

## 環境設定

### KV 命名空間

此系統使用以下 KV 命名空間：

```json
{
  "binding": "KV_BINDING",
  "id": "8892dc8c30984f4591850521a1b57ed8"
}
```

### 安裝依賴

```bash
npm install
```

## 開發

### 本地開發

```bash
npm run dev
```

在 `http://localhost:8787` 啟動開發伺服器

### 類型檢查

```bash
npm run type-check
```

### 部署

```bash
npm run deploy
```

## API 文檔

### 1. 健康檢查

**請求**
```
GET /api/health
```

**回應 (200 OK)**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "teacher-management",
    "version": "1.0.0"
  },
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

### 2. 取得所有教師

**請求**
```
GET /api/teachers
Authorization: Bearer YOUR_API_KEY
```

**選項參數**
- `department`: 依部門篩選（可選）

**範例**
```
GET /api/teachers?department=中文系
```

**回應 (200 OK)**
```json
{
  "success": true,
  "data": [
    {
      "teacher_id": "T001",
      "name_cn": "王老師",
      "name_en": "Mr. Wong",
      "department": "中文系",
      "email": "wong@chhsban.edu.my",
      "phone": "0162345678",
      "permission": "teacher"
    }
  ],
  "message": "取得 1 位教師",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

### 3. 取得單個教師

**請求**
```
GET /api/teachers/{teacher_id}
Authorization: Bearer YOUR_API_KEY
```

**範例**
```
GET /api/teachers/T001
```

**回應 (200 OK)**
```json
{
  "success": true,
  "data": {
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my",
    "phone": "0162345678",
    "permission": "teacher"
  },
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

### 4. 新增教師

**請求**
```
POST /api/teachers
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**請求主體**
```json
{
  "teacher_id": "T001",
  "name_cn": "王老師",
  "name_en": "Mr. Wong",
  "department": "中文系",
  "email": "wong@chhsban.edu.my",
  "phone": "0162345678",
  "permission": "teacher"
}
```

**必填欄位**
- `teacher_id` - 教師 ID
- `name_cn` - 中文姓名
- `email` - 電郵地址
- `department` - 部門名稱

**選填欄位**
- `name_en` - 英文姓名
- `phone` - 電話
- `permission` - 權限等級（teacher, admin, super_admin）

**回應 (201 Created)**
```json
{
  "success": true,
  "data": {
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my",
    "phone": "0162345678",
    "permission": "teacher"
  },
  "message": "教師新增成功",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

### 5. 修改教師

**請求**
```
PUT /api/teachers/{teacher_id}
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**請求主體**（只需提供要修改的欄位）
```json
{
  "phone": "0187654321",
  "permission": "admin"
}
```

**回應 (200 OK)**
```json
{
  "success": true,
  "data": {
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my",
    "phone": "0187654321",
    "permission": "admin"
  },
  "message": "教師修改成功",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

### 6. 刪除教師

**請求**
```
DELETE /api/teachers/{teacher_id}
Authorization: Bearer YOUR_API_KEY
```

**回應 (200 OK)**
```json
{
  "success": true,
  "data": {
    "teacher_id": "T001"
  },
  "message": "教師刪除成功",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

## 錯誤處理

### 常見錯誤回應

**未授權 (401)**
```json
{
  "success": false,
  "error": "未授權：缺少有效的 API Key",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

**資源不存在 (404)**
```json
{
  "success": false,
  "error": "教師不存在",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

**資源衝突 (409)**
```json
{
  "success": false,
  "error": "教師已存在",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

**伺服器錯誤 (500)**
```json
{
  "success": false,
  "error": "伺服器內部錯誤",
  "timestamp": "2026-07-08T12:00:00.000Z"
}
```

## 使用 curl 範例

### 新增教師
```bash
curl -X POST https://teacher-management.chhsban.workers.dev/api/teachers \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my"
  }'
```

### 查詢所有教師
```bash
curl https://teacher-management.chhsban.workers.dev/api/teachers \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 按部門篩選
```bash
curl 'https://teacher-management.chhsban.workers.dev/api/teachers?department=中文系' \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 查詢單個教師
```bash
curl https://teacher-management.chhsban.workers.dev/api/teachers/T001 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### 修改教師
```bash
curl -X PUT https://teacher-management.chhsban.workers.dev/api/teachers/T001 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"phone": "0187654321"}'
```

### 刪除教師
```bash
curl -X DELETE https://teacher-management.chhsban.workers.dev/api/teachers/T001 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 文件結構

```
teacher-management/
├── src/
│   └── index.ts           # 主要 Worker 代碼
├── package.json           # 專案配置
├── wrangler.toml          # Wrangler 配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 本文件
```

## 技術棧

- **Runtime**: Cloudflare Workers
- **Language**: TypeScript
- **Storage**: Cloudflare KV
- **Build Tool**: Wrangler + esbuild
- **Shared Utils**: @chhsban/kv-utils

## 注意事項

1. **API Key 驗證** - 目前使用簡單的 API Key 驗證，生產環境應改用 JWT 或更安全的認證方式
2. **CORS 支持** - 已啟用 CORS，允許跨域請求
3. **資料持久化** - 所有教師資料存儲在 Cloudflare KV 中，自動備份

## 相關項目

- [📦 共用模組 (Packages)](../packages/) - 包含 KV Utils 和 Cloudflare Config
- [📋 公文系統 (AcaDoc)](../chhsban-acadoc/) - 學術文檔系統
- [👥 補習班系統 (Tution)](../chhsban-tution/) - 補習班管理系統

## 許可證

MIT License

---

**建立日期**: 2026-07-08  
**最後更新**: 2026-07-08

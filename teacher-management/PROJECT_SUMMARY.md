# 📦 教師資料管理系統 - 項目配置總結

> 建立日期：2026-07-08  
> 所屬工作區：CHHSBAN 多工作區  
> 狀態：✅ 完成

---

## 🎯 專案概述

**教師資料管理系統** 是一個基於 Cloudflare Workers 的完整教師資料管理解決方案，提供：

- ✅ **增加教師**：新增教師記錄
- ✅ **查詢教師**：按 ID 或部門查詢
- ✅ **修改教師**：更新教師資料
- ✅ **刪除教師**：移除教師記錄
- ✅ **列表查詢**：查看所有或指定部門的教師

---

## 📍 檔案位置

```
d:\chhsban\teacher-management/
├── src/
│   └── index.ts                    # Worker 主要代碼
├── examples/
│   ├── test-client.html            # Web 測試客戶端
│   └── test-cli.mjs                # 命令行測試工具
├── package.json                     # 專案依賴配置
├── wrangler.toml                    # Cloudflare Worker 配置
├── tsconfig.json                    # TypeScript 配置
├── .gitignore                       # Git 忽略規則
├── .env.example                     # 環境變數示例
├── README.md                        # 完整 API 文檔
└── QUICK_START.md                   # 快速入門指南
```

---

## 🔧 技術配置

### 環境變數

| 變數 | 值 | 說明 |
|------|-----|------|
| `name` | `teacher-management` | Worker 名稱 |
| `account_id` | `82d225cda80f37208228877b32268b26` | Cloudflare 帳戶 ID |
| `compatibility_date` | `2026-07-08` | Worker 兼容性日期 |
| `ENVIRONMENT` | `production` | 執行環境 |

### KV 命名空間配置

```toml
[[kv_namespaces]]
binding = "KV_BINDING"
id = "8892dc8c30984f4591850521a1b57ed8"
```

**綁定名稱**：`KV_BINDING`  
**命名空間 ID**：`8892dc8c30984f4591850521a1b57ed8`  
**用途**：存儲所有教師資料

### 依賴套件

```json
{
  "@chhsban/kv-utils": "file:../packages/kv-utils",
  "@chhsban/cloudflare-config": "file:../packages/cloudflare-config"
}
```

### 開發工具

- **TypeScript** v5.3.0
- **Wrangler** v3.20.0
- **esbuild** v0.19.0

---

## 📡 API 端點總覽

| 方法 | 路由 | 功能 | 認證 |
|------|------|------|------|
| `GET` | `/api/health` | 健康檢查 | 選項 |
| `GET` | `/api/teachers` | 查詢所有教師 | 必需 |
| `GET` | `/api/teachers?department=X` | 按部門查詢 | 必需 |
| `GET` | `/api/teachers/:id` | 查詢單個教師 | 必需 |
| `POST` | `/api/teachers` | 新增教師 | 必需 |
| `PUT` | `/api/teachers/:id` | 修改教師 | 必需 |
| `DELETE` | `/api/teachers/:id` | 刪除教師 | 必需 |

---

## 🚀 快速開始命令

### 開發

```bash
# 安裝依賴
npm install

# 啟動本地開發伺服器
npm run dev

# 類型檢查
npm run type-check
```

### 部署

```bash
# 登入 Cloudflare
wrangler login

# 部署到 Cloudflare Workers
npm run deploy
```

### 測試

```bash
# Web 測試客戶端
# 開啟: file:///d:/chhsban/teacher-management/examples/test-client.html

# 命令行測試
cd examples
node test-cli.mjs health
node test-cli.mjs list
node test-cli.mjs create T001 '王老師'
```

---

## 📊 教師資料結構

```typescript
interface TeacherRecord {
  teacher_id: string;           // 教師 ID，如 "T001"
  name_cn: string;              // 中文姓名，必填
  name_en: string;              // 英文姓名，選填
  department: string;           // 部門，必填，如 "中文系"
  email: string;                // 電郵，必填
  phone?: string;               // 電話，選填
  permission: Permission;       // 權限，可選值：teacher|admin|super_admin
}
```

### 必填欄位
- `teacher_id` - 教師編號
- `name_cn` - 中文姓名
- `email` - 電郵地址
- `department` - 所屬部門

### 選填欄位
- `name_en` - 英文姓名
- `phone` - 電話號碼
- `permission` - 權限等級

---

## 🔐 認證機制

目前使用簡單的 **Bearer Token** 認證：

```
Authorization: Bearer YOUR_API_KEY
```

**注意**：生產環境應改用 JWT 或 OAuth2。

---

## 📋 新增教師範例

```bash
curl -X POST http://localhost:8787/api/teachers \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "teacher_id": "T001",
    "name_cn": "王老師",
    "name_en": "Mr. Wong",
    "department": "中文系",
    "email": "wong@chhsban.edu.my",
    "phone": "0162345678",
    "permission": "teacher"
  }'
```

**回應** (201 Created)：
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

---

## 📝 查詢範例

```bash
# 查詢所有教師
curl http://localhost:8787/api/teachers \
  -H "Authorization: Bearer your_api_key"

# 按部門查詢
curl 'http://localhost:8787/api/teachers?department=中文系' \
  -H "Authorization: Bearer your_api_key"

# 查詢單個教師
curl http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer your_api_key"
```

---

## ✏️ 修改範例

```bash
curl -X PUT http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0187654321",
    "permission": "admin"
  }'
```

---

## 🗑️ 刪除範例

```bash
curl -X DELETE http://localhost:8787/api/teachers/T001 \
  -H "Authorization: Bearer your_api_key"
```

---

## 🔄 與其他系統的整合

### 共用 KV 命名空間

此系統與以下系統共用 `TEACHER_KV` 命名空間：

- 📋 **公文系統 (AcaDoc)**
- 👥 **補習班系統 (Tution)**

所有教師資料會自動同步到共用 KV。

### 使用的共用模組

```
packages/
├── kv-utils/           # KV 操作工具
│   ├── teacher/        # TeacherKVManager
│   ├── student/        # StudentKVManager
│   ├── auth/           # 認證管理
│   └── types/          # 類型定義
└── cloudflare-config/  # Cloudflare 配置管理
```

---

## 📖 文檔

- **README.md** - 完整 API 文檔
- **QUICK_START.md** - 快速入門指南
- **本文件** - 項目配置總結

---

## 🛠️ 維護和支援

### 常見問題

**Q: 本地開發無法連接 KV？**  
A: 本地 wrangler dev 無法連接遠端 KV。測試時需部署到 Cloudflare。

**Q: 如何變更 API Key 驗證？**  
A: 修改 `src/index.ts` 中的 `verifyApiKey()` 函數。

**Q: 如何處理大量教師資料？**  
A: KV 支援分頁查詢。參考 `TeacherKVManager` 的 `list()` 方法。

---

## ✅ 檢查清單

- [x] 建立基本項目結構
- [x] 配置 TypeScript 和 Wrangler
- [x] 實現 CRUD API
- [x] 新增 API 驗證
- [x] 建立 Web 測試客戶端
- [x] 建立命令行測試工具
- [x] 編寫完整文檔
- [x] 配置 CORS 支援
- [x] 建立快速入門指南
- [ ] 實現 JWT 認證（後續）
- [ ] 添加率限制（後續）
- [ ] 建立 CI/CD 流程（後續）

---

## 📞 聯繫方式

專案屬於 CHHSBAN 多工作區系統。

相關項目：
- [📦 共用模組 (Packages)](../packages/)
- [📋 公文系統 (AcaDoc)](../chhsban-acadoc/)
- [👥 補習班系統 (Tution)](../chhsban-tution/)

---

**建立者**: GitHub Copilot  
**建立日期**: 2026-07-08  
**版本**: 1.0.0

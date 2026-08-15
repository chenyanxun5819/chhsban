# 教室管理系統 - 第二階段實現總結

**實現日期**: 2026-08-14  
**階段**: 第二階段 - 後端 API 層（chhsban-tution）  
**狀態**: ✅ 已完成

---

## 📋 已完成任務

### ✅ 任務 1: 綁定 CLASSROOM_KV 到 wrangler.toml
**檔案**: `chhsban-tution/wrangler.toml`

新增 KV namespace 綁定：
```toml
[[kv_namespaces]]
binding = "CLASSROOM_KV"
id = "PLACEHOLDER_CREATE_IN_CLOUDFLARE"
```

**注意**: 需要在 Cloudflare Dashboard 建立 KV namespace 後，將實際的 namespace ID 填入。

---

### ✅ 任務 2: 集成 ClassroomKVManager 到項目
**檔案**: `chhsban-tution/src/index.ts`

#### 更新導入
```typescript
import { 
  createAuthKVManager, 
  createTeacherKVManager, 
  createStudentKVManager, 
  createClassroomKVManager,  // 新增
  // ...
} from "@chhsban/kv-utils";
```

#### 更新 Env 接口
```typescript
interface Env {
  // ... 其他 KV
  CLASSROOM_KV: KVNamespace;  // 新增
  // ... 其他環境變數
}
```

#### 在處理器中使用
```typescript
const classroomManager = createClassroomKVManager(env.CLASSROOM_KV);
```

---

### ✅ 任務 3-5: 實現 7 個 API Endpoints

#### API 路由表

| 方法 | 路徑 | 權限 | 功能 | PUT 成本 |
|------|------|------|------|----------|
| POST | `/api/classrooms` | admin/super_admin | 新增教室 | 1 PUT |
| GET | `/api/classrooms` | 所有用戶 | 列出所有教室 | 0 PUT |
| GET | `/api/classrooms/:id` | 所有用戶 | 查詢單一教室 | 0 PUT |
| PUT | `/api/classrooms/:id` | admin/super_admin | 更新教室 | 1 PUT |
| PATCH | `/api/classrooms/:id/tution` | admin/super_admin | 切換補習選用 | 1 PUT |
| DELETE | `/api/classrooms/:id` | admin/super_admin | 刪除教室 | 1 PUT |
| POST | `/api/classrooms/batch-update` | admin/super_admin | Excel 批量更新 | N PUT (N=教室數) |

---

## 🔍 詳細實現

### 1. POST /api/classrooms - 新增教室

**權限**: admin / super_admin

**請求體**:
```json
{
  "classroom_id": "ROOM-001",
  "classroom_name": "演講廳A",
  "class_name": "中一A班",
  "number_of_desks": 40,
  "available_for_tution": true
}
```

**驗證**:
- 檢查所有必填欄位
- 檢查 classroom_id 是否已存在
- 管理員權限檢查

**回應**:
```json
{
  "success": true,
  "data": {
    "classroom_id": "ROOM-001",
    "classroom_name": "演講廳A",
    "class_name": "中一A班",
    "number_of_desks": 40,
    "available_for_tution": true,
    "last_updated": 1692000000000
  }
}
```

**狀態碼**:
- 201: 建立成功
- 400: 缺少必填欄位
- 403: 權限不足
- 409: 教室 ID 已存在
- 500: 伺服器錯誤

---

### 2. GET /api/classrooms - 列出所有教室

**權限**: 所有已認證用戶

**查詢參數**:
- `availableOnly=true`: 只返回可用於補習的教室（可選）

**範例**:
```
GET /api/classrooms
GET /api/classrooms?availableOnly=true
```

**回應**:
```json
{
  "success": true,
  "data": [
    {
      "classroom_id": "ROOM-001",
      "classroom_name": "演講廳A",
      "class_name": "中一A班",
      "number_of_desks": 40,
      "available_for_tution": true,
      "last_updated": 1692000000000
    },
    // ... 更多教室
  ]
}
```

**狀態碼**:
- 200: 查詢成功
- 401: 未認證
- 500: 伺服器錯誤

---

### 3. GET /api/classrooms/:id - 查詢單一教室

**權限**: 所有已認證用戶

**範例**:
```
GET /api/classrooms/ROOM-001
```

**回應**:
```json
{
  "success": true,
  "data": {
    "classroom_id": "ROOM-001",
    "classroom_name": "演講廳A",
    "class_name": "中一A班",
    "number_of_desks": 40,
    "available_for_tution": true,
    "last_updated": 1692000000000
  }
}
```

**狀態碼**:
- 200: 查詢成功
- 401: 未認證
- 404: 教室不存在
- 500: 伺服器錯誤

---

### 4. PUT /api/classrooms/:id - 更新教室

**權限**: admin / super_admin

**請求體** (部分更新):
```json
{
  "classroom_name": "演講廳A (新)",
  "class_name": "中二A班",
  "number_of_desks": 38
}
```

**注意**:
- `classroom_id` 不能被修改（自動忽略）
- 只需提供需要更新的欄位

**回應**:
```json
{
  "success": true,
  "data": {
    "classroom_id": "ROOM-001",
    "classroom_name": "演講廳A (新)",
    "class_name": "中二A班",
    "number_of_desks": 38,
    "available_for_tution": true,
    "last_updated": 1692000000000
  }
}
```

**狀態碼**:
- 200: 更新成功
- 400: 無效的請求
- 403: 權限不足
- 404: 教室不存在
- 500: 伺服器錯誤

---

### 5. PATCH /api/classrooms/:id/tution - 切換補習選用

**權限**: admin / super_admin

**請求體**:
```json
{
  "available": false
}
```

**用途**: 專門用於切換補習選用狀態，比 PUT 更語義化

**回應**:
```json
{
  "success": true,
  "data": {
    "classroom_id": "ROOM-001",
    "classroom_name": "演講廳A",
    "class_name": "中二A班",
    "number_of_desks": 38,
    "available_for_tution": false,
    "last_updated": 1692000000000
  }
}
```

**狀態碼**:
- 200: 更新成功
- 400: 缺少 available 欄位
- 403: 權限不足
- 404: 教室不存在
- 500: 伺服器錯誤

---

### 6. DELETE /api/classrooms/:id - 刪除教室

**權限**: admin / super_admin

**範例**:
```
DELETE /api/classrooms/ROOM-001
```

**回應**:
```json
{
  "success": true,
  "message": "Classroom deleted successfully"
}
```

**狀態碼**:
- 200: 刪除成功
- 403: 權限不足
- 404: 教室不存在
- 500: 伺服器錯誤

---

### 7. POST /api/classrooms/batch-update - Excel 批量更新

**權限**: admin / super_admin

**請求體**:
```json
{
  "classrooms": [
    {
      "classroom_id": "ROOM-001",
      "classroom_name": "演講廳A",
      "class_name": "中二A班",
      "number_of_desks": 38,
      "available_for_tution": true,
      "last_updated": 1692000000000
    },
    {
      "classroom_id": "ROOM-002",
      "classroom_name": "演講廳B",
      "class_name": "中三B班",
      "number_of_desks": 42,
      "available_for_tution": true,
      "last_updated": 1692000000000
    }
  ]
}
```

**行為**:
- 根據 `classroom_id` 匹配現有教室
- 只更新 `class_name` 和 `number_of_desks`
- **不會新增教室**（教室必須預先存在）
- 單一記錄失敗不影響其他記錄

**回應**:
```json
{
  "success": true,
  "stats": {
    "success": 2,
    "failed": 0,
    "errors": []
  }
}
```

**失敗範例**:
```json
{
  "success": true,
  "stats": {
    "success": 1,
    "failed": 1,
    "errors": [
      {
        "id": "ROOM-003",
        "error": "教室不存在"
      }
    ]
  }
}
```

**狀態碼**:
- 200: 批量更新完成（包含部分失敗）
- 400: 無效的請求格式
- 403: 權限不足
- 500: 伺服器錯誤

---

## 🔒 權限控制實現

### 權限檢查函數
```typescript
const requireAdmin = () => {
  if (!["admin", "super_admin"].includes(session.permission)) {
    return jsonResponse({ 
      success: false, 
      error: "Forbidden: Admin permission required" 
    }, 403);
  }
  return null;
};
```

### 權限矩陣

| 操作 | teacher | viewer | admin | super_admin |
|------|---------|--------|-------|-------------|
| 列出教室 | ✅ | ✅ | ✅ | ✅ |
| 查詢教室 | ✅ | ✅ | ✅ | ✅ |
| 新增教室 | ❌ | ❌ | ✅ | ✅ |
| 更新教室 | ❌ | ❌ | ✅ | ✅ |
| 切換補習選用 | ❌ | ❌ | ✅ | ✅ |
| 刪除教室 | ❌ | ❌ | ✅ | ✅ |
| 批量更新 | ❌ | ❌ | ✅ | ✅ |

---

## 📊 路由整合

### 主路由器中的配置
```typescript
if (pathname.startsWith("/api/v1/classrooms") || pathname.startsWith("/api/classrooms")) {
  return handleClassrooms(request, env, session);
}
```

### 支援的路徑格式
- `/api/classrooms/*` （簡潔格式）
- `/api/v1/classrooms/*` （版本化格式）

---

## 🔄 路由解析邏輯

```typescript
const pathParts = url.pathname.split("/").filter(p => p);
const classroomsIndex = pathParts.indexOf("classrooms");
const classroomId = pathParts[classroomsIndex + 1];
const action = pathParts[classroomsIndex + 2];
```

### 範例解析

| URL | classroomId | action |
|-----|-------------|--------|
| `/api/classrooms` | undefined | undefined |
| `/api/classrooms/ROOM-001` | "ROOM-001" | undefined |
| `/api/classrooms/ROOM-001/tution` | "ROOM-001" | "tution" |
| `/api/classrooms/batch-update` | "batch-update" | undefined |

---

## ✅ 錯誤處理

### 標準錯誤回應格式
```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (optional)"
}
```

### 錯誤類型

| 類型 | 狀態碼 | 範例 |
|------|--------|------|
| 認證錯誤 | 401 | "Unauthorized: Missing token" |
| 權限錯誤 | 403 | "Forbidden: Admin permission required" |
| 資源不存在 | 404 | "Classroom not found" |
| 驗證錯誤 | 400 | "Missing required fields" |
| 衝突錯誤 | 409 | "Classroom ID already exists" |
| 伺服器錯誤 | 500 | "Internal server error" |

---

## 📝 使用範例

### 前端呼叫範例（TypeScript）

```typescript
// 1. 新增教室
const response = await fetch('https://api.chhsban.tution.mybazaar.my/api/classrooms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    classroom_id: 'ROOM-001',
    classroom_name: '演講廳A',
    class_name: '中一A班',
    number_of_desks: 40,
    available_for_tution: true
  })
});

// 2. 列出可用教室
const classrooms = await fetch(
  'https://api.chhsban.tution.mybazaar.my/api/classrooms?availableOnly=true',
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
).then(r => r.json());

// 3. 更新教室
await fetch('https://api.chhsban.tution.mybazaar.my/api/classrooms/ROOM-001', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    class_name: '中二A班',
    number_of_desks: 38
  })
});

// 4. 切換補習選用
await fetch('https://api.chhsban.tution.mybazaar.my/api/classrooms/ROOM-001/tution', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ available: false })
});

// 5. 批量更新
const batchResult = await fetch(
  'https://api.chhsban.tution.mybazaar.my/api/classrooms/batch-update',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      classrooms: [
        { classroom_id: 'ROOM-001', class_name: '中二A班', number_of_desks: 38, /* ... */ },
        { classroom_id: 'ROOM-002', class_name: '中三B班', number_of_desks: 42, /* ... */ }
      ]
    })
  }
).then(r => r.json());

console.log(`成功: ${batchResult.stats.success}, 失敗: ${batchResult.stats.failed}`);
```

---

## 🚀 部署檢查清單

### 部署前
- [ ] 在 Cloudflare Dashboard 建立 `CLASSROOM_KV` namespace
- [ ] 將 namespace ID 填入 `wrangler.toml`
- [ ] 確認 packages/kv-utils 已發布最新版本
- [ ] 執行 `npm install` 更新依賴

### 部署
```bash
cd d:\chhsban\chhsban-tution
npm run deploy
# 或
npx wrangler deploy
```

### 部署後驗證
- [ ] 檢查 Worker 是否成功部署
- [ ] 測試 `/api/health` 端點
- [ ] 測試教室 API：列出、查詢、新增、更新、刪除
- [ ] 驗證權限控制（teacher 不能新增教室）
- [ ] 測試批量更新功能

---

## 📊 實現統計

- **新增檔案**: 0 個
- **修改檔案**: 2 個
  - `chhsban-tution/wrangler.toml`
  - `chhsban-tution/src/index.ts`

- **新增代碼行數**: 約 210 行（handleClassrooms 函數）

- **實現的 API 端點**: 7 個
  - POST /api/classrooms
  - GET /api/classrooms
  - GET /api/classrooms/:id
  - PUT /api/classrooms/:id
  - PATCH /api/classrooms/:id/tution
  - DELETE /api/classrooms/:id
  - POST /api/classrooms/batch-update

- **編譯狀態**: ✅ 無錯誤

---

## 🎯 下一步行動

### 第三階段：前端 UI 層（tution-portal）

根據計畫書，下一階段是實現前端頁面：

1. **新增教室管理頁面** (`ClassroomManagement.tsx`)
   - 教室列表表格
   - 新增/編輯/刪除教室模態框
   - 勾選補習選用功能
   - Excel 批量更新功能

2. **修改路由配置** (`App.tsx`)
   - 新增 `/classrooms` 路由
   - 配置權限保護（admin/super_admin）

3. **實現前端功能**
   - 教室 CRUD 操作
   - 即時切換補習選用狀態
   - 拖放上傳 Excel
   - 搜尋、排序、過濾

---

## 📞 技術支援

### 相關檔案連結
- 後端實現: [index.ts](d:\chhsban\chhsban-tution\src\index.ts#L1320)
- KV 配置: [wrangler.toml](d:\chhsban\chhsban-tution\wrangler.toml)
- KV 管理器: [classroom/index.ts](d:\chhsban\packages\kv-utils\src\classroom\index.ts)

### API 測試工具
推薦使用以下工具測試 API：
- Postman
- Insomnia
- VS Code REST Client 插件
- curl

---

**文檔簽署**

| 角色 | 日期 | 簽名 |
|------|------|------|
| 開發者 | 2026-08-14 | ✅ 已完成 |
| 代碼審查 | - | ⏳ 待審查 |
| 測試驗證 | - | ⏳ 待測試 |

---

## 🔖 版本歷史

| 版本 | 日期 | 主要變更 |
|------|------|---------|
| 1.0 | 2026-08-14 | 初版發布，完成所有 API endpoints |

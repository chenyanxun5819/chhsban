# 教室管理 API 快速參考

**Base URL**: `https://api.chhsban.tution.mybazaar.my`  
**版本**: v1.0  
**更新日期**: 2026-08-14

---

## 🔑 認證

所有請求需要在 Header 中包含 Bearer Token：

```
Authorization: Bearer {your_token}
```

---

## 📡 API 端點

### 1. 列出所有教室

```http
GET /api/classrooms
GET /api/classrooms?availableOnly=true
```

**權限**: 所有用戶  
**查詢參數**:
- `availableOnly` (boolean, 可選): 只返回可用於補習的教室

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
    }
  ]
}
```

---

### 2. 查詢單一教室

```http
GET /api/classrooms/{classroom_id}
```

**權限**: 所有用戶

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

---

### 3. 新增教室

```http
POST /api/classrooms
Content-Type: application/json
```

**權限**: admin, super_admin

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

**回應**: 201 Created
```json
{
  "success": true,
  "data": { /* 完整教室資料 */ }
}
```

---

### 4. 更新教室

```http
PUT /api/classrooms/{classroom_id}
Content-Type: application/json
```

**權限**: admin, super_admin

**請求體** (部分更新):
```json
{
  "classroom_name": "演講廳A (新)",
  "class_name": "中二A班",
  "number_of_desks": 38
}
```

**回應**: 200 OK
```json
{
  "success": true,
  "data": { /* 更新後的教室資料 */ }
}
```

---

### 5. 切換補習選用

```http
PATCH /api/classrooms/{classroom_id}/tution
Content-Type: application/json
```

**權限**: admin, super_admin

**請求體**:
```json
{
  "available": false
}
```

**回應**: 200 OK
```json
{
  "success": true,
  "data": { /* 更新後的教室資料 */ }
}
```

---

### 6. 刪除教室

```http
DELETE /api/classrooms/{classroom_id}
```

**權限**: admin, super_admin

**回應**: 200 OK
```json
{
  "success": true,
  "message": "Classroom deleted successfully"
}
```

---

### 7. 批量更新教室

```http
POST /api/classrooms/batch-update
Content-Type: application/json
```

**權限**: admin, super_admin

**請求體**:
```json
{
  "createIfMissing": false,
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

**注意**: 
- `createIfMissing` 預設 `false`：只更新 `class_name` 和 `number_of_desks`，教室不存在時記為失敗（適用於每年例行更新已存在的教室）
- `createIfMissing` 設為 `true`：教室不存在時會自動以整筆資料新增教室（適用於第一次批量匯入新教室），存在時仍只更新 `class_name` 和 `number_of_desks`

**回應**: 200 OK
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

---

## ❌ 錯誤回應

### 標準錯誤格式
```json
{
  "success": false,
  "error": "Error message",
  "details": "Optional detailed information"
}
```

### 常見錯誤碼

| 狀態碼 | 說明 | 範例 |
|--------|------|------|
| 400 | 請求無效 | 缺少必填欄位 |
| 401 | 未認證 | Token 無效或過期 |
| 403 | 權限不足 | 非管理員嘗試新增教室 |
| 404 | 資源不存在 | 教室不存在 |
| 409 | 資源衝突 | 教室 ID 已存在 |
| 500 | 伺服器錯誤 | 內部錯誤 |

---

## 💻 使用範例

### JavaScript/TypeScript

```typescript
// 設定 API 基礎 URL 和 Token
const API_BASE = 'https://api.chhsban.tution.mybazaar.my';
const token = 'your_bearer_token_here';

// 輔助函數
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  return response.json();
};

// 1. 列出所有可用教室
const classrooms = await apiCall('/api/classrooms?availableOnly=true');
console.log(classrooms.data);

// 2. 新增教室
const newClassroom = await apiCall('/api/classrooms', {
  method: 'POST',
  body: JSON.stringify({
    classroom_id: 'ROOM-001',
    classroom_name: '演講廳A',
    class_name: '中一A班',
    number_of_desks: 40,
    available_for_tution: true
  })
});

// 3. 更新教室
const updated = await apiCall('/api/classrooms/ROOM-001', {
  method: 'PUT',
  body: JSON.stringify({
    class_name: '中二A班',
    number_of_desks: 38
  })
});

// 4. 切換補習選用
const toggled = await apiCall('/api/classrooms/ROOM-001/tution', {
  method: 'PATCH',
  body: JSON.stringify({ available: false })
});

// 5. 刪除教室
await apiCall('/api/classrooms/ROOM-001', { method: 'DELETE' });

// 6. 批量更新
const batchResult = await apiCall('/api/classrooms/batch-update', {
  method: 'POST',
  body: JSON.stringify({
    classrooms: [
      { classroom_id: 'ROOM-001', class_name: '中二A班', number_of_desks: 38, /* ... */ },
      { classroom_id: 'ROOM-002', class_name: '中三B班', number_of_desks: 42, /* ... */ }
    ]
  })
});
console.log(`成功: ${batchResult.stats.success}, 失敗: ${batchResult.stats.failed}`);
```

---

## 🧪 測試

### 使用 curl

```bash
# 列出所有教室
curl -H "Authorization: Bearer $TOKEN" \
  https://api.chhsban.tution.mybazaar.my/api/classrooms

# 新增教室
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"classroom_id":"ROOM-001","classroom_name":"演講廳A","class_name":"中一A班","number_of_desks":40,"available_for_tution":true}' \
  https://api.chhsban.tution.mybazaar.my/api/classrooms

# 更新教室
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"class_name":"中二A班","number_of_desks":38}' \
  https://api.chhsban.tution.mybazaar.my/api/classrooms/ROOM-001

# 刪除教室
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  https://api.chhsban.tution.mybazaar.my/api/classrooms/ROOM-001
```

---

## 📋 Excel 批量更新格式

### Excel 範本格式

| 教室編號 | 教室名稱 | 班級 | 桌數 |
|---------|--------|------|------|
| ROOM-001 | 演講廳A | 中一A班 | 40 |
| ROOM-002 | 演講廳B | 中二B班 | 35 |
| ROOM-003 | 討論室C | 高一C班 | 20 |

### 轉換為 JSON

前端需要將 Excel 資料轉換為以下格式：

```json
{
  "classrooms": [
    {
      "classroom_id": "ROOM-001",
      "classroom_name": "演講廳A",
      "class_name": "中一A班",
      "number_of_desks": 40,
      "available_for_tution": true,
      "last_updated": 1692000000000
    }
    // ... 更多教室
  ]
}
```

---

## 🔒 權限矩陣

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

## 💡 最佳實踐

### 1. 錯誤處理
```typescript
try {
  const result = await apiCall('/api/classrooms/ROOM-001');
  if (!result.success) {
    console.error('API Error:', result.error);
    // 顯示錯誤訊息給用戶
  }
} catch (error) {
  console.error('Network Error:', error);
  // 處理網絡錯誤
}
```

### 2. 載入狀態
```typescript
const [loading, setLoading] = useState(false);
const [classrooms, setClassrooms] = useState([]);

const loadClassrooms = async () => {
  setLoading(true);
  try {
    const result = await apiCall('/api/classrooms');
    if (result.success) {
      setClassrooms(result.data);
    }
  } finally {
    setLoading(false);
  }
};
```

### 3. 快取策略
```typescript
// 快取可用教室列表（5分鐘）
const CACHE_TIME = 5 * 60 * 1000;
let cachedClassrooms = null;
let cacheTimestamp = 0;

const getAvailableClassrooms = async () => {
  const now = Date.now();
  if (cachedClassrooms && (now - cacheTimestamp) < CACHE_TIME) {
    return cachedClassrooms;
  }
  
  const result = await apiCall('/api/classrooms?availableOnly=true');
  cachedClassrooms = result.data;
  cacheTimestamp = now;
  return cachedClassrooms;
};
```

---

**最後更新**: 2026-08-14  
**版本**: 1.0

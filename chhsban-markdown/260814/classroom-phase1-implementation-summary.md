# 教室管理系統 - 第一階段實現總結

**實現日期**: 2026-08-14  
**階段**: 第一階段 - KV 數據層（packages/kv-utils）  
**狀態**: ✅ 已完成

---

## 📋 已完成任務

### ✅ 任務 1: 新增 CLASSROOM_KV 到 kv-namespace.ts
**檔案**: `packages/cloudflare-config/src/kv-namespace.ts`

新增了 CLASSROOM_KV namespace 配置：
```typescript
CLASSROOM_KV: {
  binding: "CLASSROOM_KV",
  id: "PLACEHOLDER_CREATE_IN_CLOUDFLARE", // TODO: 在 Cloudflare 建立後填入實際 ID
  description: "教室管理系統 - 存放教室資料（編號、名稱、班級、桌數、補習選用狀態）",
}
```

**注意**: 需要在 Cloudflare Dashboard 建立 KV namespace 後，將實際的 namespace ID 填入。

---

### ✅ 任務 2: 定義 ClassroomRecord TypeScript 接口
**檔案**: `packages/kv-utils/src/types/index.ts`

#### 新增 ClassroomRecord 接口
```typescript
export interface ClassroomRecord {
  classroom_id: string;           // 唯一識別 (e.g., "ROOM-001")
  classroom_name: string;         // 教室名稱 (e.g., "演講廳A")
  class_name: string;            // 班級名稱 (e.g., "中一A班")
  number_of_desks: number;       // 桌數 (e.g., 40)
  available_for_tution: boolean; // 是否可用於補習（管理員勾選）
  last_updated: number;          // 最後更新時間戳（毫秒）
}
```

#### 新增 KV_CONFIG 前綴
```typescript
export const KV_CONFIG = {
  // ... 其他配置
  CLASSROOM_PREFIX: "classroom:",
  // ...
} as const;
```

---

### ✅ 任務 3: 實現 ClassroomKVManager 核心類
**檔案**: `packages/kv-utils/src/classroom/index.ts` (新建)

#### 實現的方法

##### 教室基本操作 (CRUD)
1. **createClassroom(data: ClassroomRecord): Promise<ClassroomRecord>**
   - 新增教室資料
   - 自動更新教室列表索引
   - 如果 available_for_tution=true，更新可用教室索引

2. **getClassroom(classroomId: string): Promise<ClassroomRecord | null>**
   - 查詢單一教室資料
   - 錯誤處理：解析失敗時返回 null

3. **listAllClassrooms(filterAvailableOnly?: boolean): Promise<ClassroomRecord[]>**
   - 列出所有教室
   - filterAvailableOnly=true 時，只返回可用於補習的教室
   - 使用可用教室索引加速查詢

4. **updateClassroom(classroomId: string, updates: Partial<Omit<ClassroomRecord, 'classroom_id'>>): Promise<ClassroomRecord>**
   - 更新教室資料
   - 自動更新 last_updated 時間戳
   - 偵測 available_for_tution 狀態變化，同步更新索引

5. **toggleAvailableForTution(classroomId: string, available: boolean): Promise<ClassroomRecord>**
   - 專門用於切換補習選用狀態
   - 內部調用 updateClassroom

6. **deleteClassroom(classroomId: string): Promise<boolean>**
   - 刪除教室資料
   - 同步移除所有索引

##### 批量操作
7. **batchUpdateClassrooms(data: ClassroomRecord[]): Promise<{success: number; failed: number; errors: Array<{id: string; error: string}>}>**
   - 批量更新教室（用於 Excel 導入）
   - 根據 classroom_id 匹配現有教室
   - 只更新 class_name 和 number_of_desks
   - 返回詳細的成功/失敗統計

##### 私有輔助方法
- **updateClassroomIndex(classroomId: string, add: boolean)**: 更新教室列表索引
- **updateAvailableClassroomIndex(classroomId: string, add: boolean)**: 更新可用教室列表索引
- **getAvailableClassroomIds()**: 取得可用教室 ID 列表

#### KV Key 設計
| 用途 | Key 格式 | 範例 | 值類型 |
|------|---------|------|--------|
| 單一教室 | `classroom:{classroom_id}` | `classroom:ROOM-001` | ClassroomRecord (JSON) |
| 教室列表索引 | `classrooms:list` | `classrooms:list` | string[] (JSON) |
| 可用教室列表 | `classrooms:available` | `classrooms:available` | string[] (JSON) |

#### 工廠函數
```typescript
export function createClassroomKVManager(kv: KVNamespace): ClassroomKVManager
```

---

### ✅ 任務 4: 導出新模組到 kv-utils/index.ts
**檔案**: `packages/kv-utils/src/index.ts`

新增導出：
```typescript
// Classroom Manager
export { ClassroomKVManager, createClassroomKVManager } from "./classroom/index.js";
```

---

## 📊 實現統計

- **新增檔案**: 1 個
  - `packages/kv-utils/src/classroom/index.ts`

- **修改檔案**: 3 個
  - `packages/cloudflare-config/src/kv-namespace.ts`
  - `packages/kv-utils/src/types/index.ts`
  - `packages/kv-utils/src/index.ts`

- **代碼行數**: 約 330 行（classroom/index.ts）

- **實現的方法**: 10 個
  - 7 個公開方法
  - 3 個私有輔助方法

---

## ✅ 編譯檢查

- `classroom/index.ts`: ✅ 無錯誤
- `kv-namespace.ts`: ✅ 無錯誤
- `types/index.ts`: ⚠️ 預先存在的錯誤（非本次實現引入）
  - ReadableStream 類型錯誤（與本實現無關）

---

## 🎯 下一步行動

### 立即需要完成的配置
1. **在 Cloudflare Dashboard 建立 KV Namespace**
   - 名稱: `CLASSROOM_KV`
   - 建立後獲取 namespace ID
   - 將 ID 填入 `packages/cloudflare-config/src/kv-namespace.ts`

### 第二階段準備
根據計畫書，下一階段是實現後端 API 層（chhsban-tution）：

1. 在 `chhsban-tution/src/tution-service.ts` 集成 ClassroomKVManager
2. 在 `chhsban-tution/wrangler.toml` 綁定 CLASSROOM_KV
3. 實現 7 個 API endpoints：
   - POST /api/classrooms
   - GET /api/classrooms
   - GET /api/classrooms/:id
   - PUT /api/classrooms/:id
   - PATCH /api/classrooms/:id/tution
   - DELETE /api/classrooms/:id
   - POST /api/classrooms/batch-update

---

## 📝 技術筆記

### 索引設計的優勢
使用兩個獨立索引（`classrooms:list` 和 `classrooms:available`）的原因：

1. **提升查詢效能**: 
   - 查詢可用教室時，不需要遍歷所有教室
   - 只需讀取索引，再批量讀取可用教室資料

2. **減少 KV 讀取次數**:
   - 沒有索引：需要 list 所有 key，再逐一讀取並過濾
   - 有索引：只讀取索引（1 次），再讀取需要的教室（N 次）

3. **符合 Cloudflare 免費額度**:
   - 索引更新只在 CRUD 操作時發生（寫入次數有限）
   - 大幅減少讀取次數（日常查詢高頻）

### 批量更新設計
`batchUpdateClassrooms` 方法專為年度更新場景設計：

- **不會新增教室**: 只更新現有教室
- **只更新特定欄位**: class_name 和 number_of_desks
- **詳細錯誤報告**: 返回每個失敗記錄的具體錯誤
- **容錯處理**: 單一記錄失敗不影響其他記錄

---

## 🔍 使用範例

```typescript
import { createClassroomKVManager, type ClassroomRecord } from '@chhsban/kv-utils';

// 在 Cloudflare Worker 中使用
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const classroomManager = createClassroomKVManager(env.CLASSROOM_KV);

    // 新增教室
    const classroom: ClassroomRecord = {
      classroom_id: "ROOM-001",
      classroom_name: "演講廳A",
      class_name: "中一A班",
      number_of_desks: 40,
      available_for_tution: true,
      last_updated: Date.now(),
    };
    await classroomManager.createClassroom(classroom);

    // 查詢可用教室
    const availableClassrooms = await classroomManager.listAllClassrooms(true);

    // 切換補習選用狀態
    await classroomManager.toggleAvailableForTution("ROOM-001", false);

    // 批量更新（Excel 導入）
    const updateData = [
      { classroom_id: "ROOM-001", class_name: "中二A班", number_of_desks: 38, /* ... */ },
      { classroom_id: "ROOM-002", class_name: "中三B班", number_of_desks: 42, /* ... */ },
    ];
    const result = await classroomManager.batchUpdateClassrooms(updateData);
    console.log(`成功: ${result.success}, 失敗: ${result.failed}`);

    return new Response("OK");
  }
};
```

---

**文檔簽署**

| 角色 | 日期 | 簽名 |
|------|------|------|
| 開發者 | 2026-08-14 | ✅ 已完成 |
| 代碼審查 | - | ⏳ 待審查 |

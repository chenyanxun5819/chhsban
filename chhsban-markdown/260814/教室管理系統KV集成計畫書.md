# 教室管理系統 KV 集成計畫書

**文檔版本**: 1.0  
**編寫日期**: 2026-08-14  
**專案**: CHHSBAN 補習班系統（tution-portal）  
**狀態**: 已確認

---

## 📋 執行摘要

### 項目目標
為補習班系統實現簡化的教室管理功能，支援管理員管理教室資訊、勾選補習選用狀態，並支援每年批量更新教室班級與桌數資訊。

### 核心功能
- ✅ **教室 CRUD**：新增、編輯、刪除教室
- ✅ **補習選用勾選**：管理員決定哪些教室可用於補習
- ✅ **批量更新**：每年上傳 Excel 批量更新教室班級和桌數
- ✅ **查詢功能**：申請人（teacher）和事務員（viewer）查詢可用教室

### 關鍵設計
- **單一 KV Namespace**：`CLASSROOM_KV` 儲存所有教室資料
- **中央管理庫**：`ClassroomKVManager` 放在 `packages/kv-utils`，支援跨項目複用
- **最小化前端**：僅需一個管理頁面 `ClassroomManagement.tsx`
- **零申請人反饋**：不收集清潔度、冷氣、損毀、意見反饋

---

## 🎯 需求分析

### 用戶場景

| 角色 | 需求 | 優先級 |
|------|------|--------|
| **admin / super_admin** | 新增、編輯、刪除教室<br/>勾選補習選用<br/>每年批量更新班級和桌數 | 🔴 高 |
| **teacher** | 查詢可用教室（available_for_tution=true） | 🟠 中 |
| **viewer** | 查詢可用教室（唯讀） | 🟠 中 |

### 表格欄位
- 教室編號（classroom_id）
- 教室名稱（classroom_name）
- 班級（class_name）
- 桌數（number_of_desks）
- **補習選用** ✅ checkbox（available_for_tution）

### 已排除的功能
- ❌ 清潔度反饋（不跟隨課程記錄）
- ❌ 冷氣反饋
- ❌ 物件損毀反饋
- ❌ 意見反饋
- ❌ 申請人提交反饋功能

---

## 🏗️ 系統架構

### 資料流圖

```
┌─────────────────────────────────────────────────────────────┐
│                      tution-portal（前端）                    │
│  ClassroomManagement.tsx                                      │
│  - 教室列表表格                                              │
│  - 新增/編輯/刪除模態框                                       │
│  - 勾選補習選用按鈕                                           │
│  - Excel 批量更新                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │   API 層（chhsban-tution）   │
        │  POST   /api/classrooms      │
        │  GET    /api/classrooms      │
        │  PUT    /api/classrooms/:id  │
        │  DELETE /api/classrooms/:id  │
        │  PATCH  /api/classrooms/:id/tution
        │  POST   /api/classrooms/batch-update
        └──────────────────────┬───────┘
                               │
                               ↓
        ┌──────────────────────────────────┐
        │  業務邏輯層（TutionKVService）   │
        │  - 權限檢查                       │
        │  - 業務驗證                       │
        │  - ClassroomKVManager 調用       │
        └──────────────────────┬───────────┘
                               │
                               ↓
        ┌──────────────────────────────────┐
        │  KV 管理層（packages/kv-utils）  │
        │  ClassroomKVManager              │
        │  - CRUD 操作                      │
        │  - 批量操作                       │
        │  - 查詢邏輯                       │
        └──────────────────────┬───────────┘
                               │
                               ↓
                ┌──────────────────────────┐
                │  Cloudflare KV Storage   │
                │  CLASSROOM_KV namespace  │
                │  Key: classroom:{id}     │
                └──────────────────────────┘
```

### 技術棧
- **前端框架**：React + TypeScript（tution-portal）
- **後端**：Cloudflare Workers（chhsban-tution）
- **數據存儲**：Cloudflare KV（CLASSROOM_KV）
- **共享庫**：packages/kv-utils（ClassroomKVManager）

---

## 📝 實現計畫

### 第一階段：KV 數據層（packages/kv-utils）

#### 1.1 新增 KV Namespace 配置

**檔案**：[packages/cloudflare-config/src/kv-namespace.ts](d:\chhsban\packages\cloudflare-config\src\kv-namespace.ts)

**操作**：新增一個 KV namespace 綁定
```typescript
export const CLASSROOM_KV = getKVNamespace("CLASSROOM_KV");
```

#### 1.2 定義 TypeScript 介面

**檔案**：[packages/kv-utils/src/types/index.ts](d:\chhsban\packages\kv-utils\src\types\index.ts)

**新增介面**：
```typescript
/**
 * 教室管理 - 基本資料
 */
export interface ClassroomRecord {
  classroom_id: string;           // 唯一識別 (e.g., "ROOM-001")
  classroom_name: string;         // 教室名稱 (e.g., "演講廳A")
  class_name: string;            // 班級名稱 (e.g., "中一A班")
  number_of_desks: number;       // 桌數 (e.g., 40)
  available_for_tution: boolean; // 是否可用於補習（管理員勾選）
  last_updated: number;          // 最後更新時間戳（毫秒）
}
```

#### 1.3 實現 ClassroomKVManager

**檔案**：[packages/kv-utils/src/classroom-kv-manager.ts](d:\chhsban\packages\kv-utils\src\classroom-kv-manager.ts)（新增）

**類別**：`ClassroomKVManager`

**方法清單**：

##### 教室基本操作
```typescript
// 新增教室
async createClassroom(data: ClassroomRecord): Promise<ClassroomRecord>

// 查詢單一教室
async getClassroom(classroomId: string): Promise<ClassroomRecord | null>

// 列出所有教室
async listAllClassrooms(filterAvailableOnly?: boolean): Promise<ClassroomRecord[]>

// 編輯教室（更新班級、桌數等）
async updateClassroom(
  classroomId: string, 
  updates: Partial<Omit<ClassroomRecord, 'classroom_id'>>
): Promise<ClassroomRecord>

// 勾選/取消補習選用
async toggleAvailableForTution(classroomId: string, available: boolean): Promise<ClassroomRecord>

// 刪除教室
async deleteClassroom(classroomId: string): Promise<boolean>
```

##### 批量操作
```typescript
// 批量更新教室（用於 Excel 導入，每年一次）
// 根據 classroom_id 匹配，更新班級和桌數
async batchUpdateClassrooms(data: ClassroomRecord[]): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}>
```

**KV Key 設計**：
- 單一教室：`classroom:{classroom_id}`
- 教室列表索引：`classrooms:list` （存儲所有教室ID）
- 可用教室列表：`classrooms:available` （存儲 available_for_tution=true 的教室ID）

---

### 第二階段：後端 API 層（chhsban-tution）

#### 2.1 集成 ClassroomKVManager

**檔案**：[chhsban-tution/src/tution-service.ts](d:\chhsban\chhsban-tution\src\tution-service.ts)

**操作**：在 `TutionKVService` 中添加 ClassroomKVManager 實例

```typescript
import { ClassroomKVManager } from "@chhsban-packages/kv-utils";

class TutionKVService {
  private classroomManager: ClassroomKVManager;

  constructor(env: Env) {
    this.classroomManager = new ClassroomKVManager(env.CLASSROOM_KV);
  }

  // 代理 ClassroomKVManager 的方法
  getClassroom = this.classroomManager.getClassroom.bind(this.classroomManager);
  listAllClassrooms = this.classroomManager.listAllClassrooms.bind(this.classroomManager);
  // ... 其他方法
}
```

#### 2.2 新增 API Endpoints

**檔案**：chhsban-tution Worker 主檔案（index.ts 或 worker.ts）

**路由**：

```
教室管理 API：

1. POST /api/classrooms
   權限：admin, super_admin
   請求體：ClassroomRecord
   回應：{ success: true; data: ClassroomRecord }

2. GET /api/classrooms
   權限：所有已認證用戶
   查詢參數：?availableOnly=true (可選)
   回應：{ success: true; data: ClassroomRecord[] }

3. GET /api/classrooms/:id
   權限：所有已認證用戶
   回應：{ success: true; data: ClassroomRecord }

4. PUT /api/classrooms/:id
   權限：admin, super_admin
   請求體：Partial<ClassroomRecord> (不含 classroom_id)
   回應：{ success: true; data: ClassroomRecord }

5. PATCH /api/classrooms/:id/tution
   權限：admin, super_admin
   請求體：{ available: boolean }
   回應：{ success: true; data: ClassroomRecord }

6. DELETE /api/classrooms/:id
   權限：admin, super_admin
   回應：{ success: true; message: "教室已刪除" }

7. POST /api/classrooms/batch-update
   權限：admin, super_admin
   請求體：FormData (multipart/form-data) 包含 Excel 檔案
   回應：{ success: true; stats: { success: number; failed: number; errors: [...] } }
```

#### 2.3 權限檢查實現

每個 endpoint 需檢查用戶權限：

```typescript
// 權限檢查函數
function requirePermission(permission: Permission, allowedRoles: Permission[]): boolean {
  return allowedRoles.includes(permission);
}

// 教室管理操作（需 admin/super_admin）
if (!requirePermission(userPermission, ["admin", "super_admin"])) {
  return new Response(JSON.stringify({ success: false; error: "Forbidden" }), 
    { status: 403 });
}

// 查詢操作（所有已認證用戶）
if (!userPermission) {
  return new Response(JSON.stringify({ success: false; error: "Unauthorized" }), 
    { status: 401 });
}
```

#### 2.4 Excel 批量更新實現

**端點**：`POST /api/classrooms/batch-update`

**邏輯**：
1. 接收上傳的 Excel 檔案
2. 解析 Excel（使用 XLSX 或類似庫）
3. 驗證欄位：classroom_id, class_name, number_of_desks
4. 根據 classroom_id 匹配現有教室
5. 更新 class_name 和 number_of_desks
6. 返回更新統計（成功數、失敗數、錯誤詳情）

---

### 第三階段：前端 UI 層（tution-portal）

#### 3.1 新增教室管理頁面

**檔案**：[tution-portal/src/pages/ClassroomManagement.tsx](d:\chhsban\tution-portal\src\pages\ClassroomManagement.tsx)（新增）

**功能**：

1. **教室列表表格**
   - 欄位：教室編號、教室名稱、班級、桌數、補習選用（checkbox）、操作（編輯、刪除）
   - 支援搜尋、排序
   - 僅 admin/super_admin 可見

2. **新增教室模態框**
   - 表單欄位：教室名稱、班級、桌數、勾選補習選用
   - 驗證：教室名稱和班級必填、桌數為正整數
   - 提交後刷新列表

3. **編輯教室模態框**
   - 預填現有資料
   - 支援修改班級、桌數、補習選用狀態
   - 驗證同新增

4. **刪除確認**
   - 模態框確認刪除
   - 確認後調用 DELETE API

5. **勾選補習選用**
   - 表格中直接點擊 checkbox 切換
   - 即時調用 PATCH API

6. **Excel 批量更新**
   - 按鈕：「上傳 Excel 批量更新」
   - 支援拖放或檔案選擇
   - 上傳後顯示結果統計

#### 3.2 修改路由

**檔案**：[tution-portal/src/App.tsx](d:\chhsban\tution-portal\src\App.tsx)

**操作**：新增路由

```typescript
import ClassroomManagement from "./pages/ClassroomManagement";
import { ProtectedRoute } from "./components/ProtectedRoute";

// 在路由配置中添加
<Route 
  path="/classrooms" 
  element={
    <ProtectedRoute requiredPermissions={["admin", "super_admin"]}>
      <ClassroomManagement />
    </ProtectedRoute>
  } 
/>
```

---

## 📁 相關檔案清單

| # | 檔案路徑 | 操作 | 優先級 | 備註 |
|---|--------|------|--------|------|
| 1 | [packages/cloudflare-config/src/kv-namespace.ts](d:\chhsban\packages\cloudflare-config\src\kv-namespace.ts) | 修改 | 🔴 高 | 新增 CLASSROOM_KV 綁定 |
| 2 | [packages/kv-utils/src/types/index.ts](d:\chhsban\packages\kv-utils\src\types\index.ts) | 修改 | 🔴 高 | 新增 ClassroomRecord 介面 |
| 3 | [packages/kv-utils/src/classroom-kv-manager.ts](d:\chhsban\packages\kv-utils\src\classroom-kv-manager.ts) | **新增** | 🔴 高 | ClassroomKVManager 實現 |
| 4 | [chhsban-tution/src/tution-service.ts](d:\chhsban\chhsban-tution\src\tution-service.ts) | 修改 | 🔴 高 | 集成 ClassroomKVManager |
| 5 | [chhsban-tution/wrangler.toml](d:\chhsban\chhsban-tution\wrangler.toml) | 修改 | 🔴 高 | 綁定 CLASSROOM_KV |
| 6 | chhsban-tution Worker 主檔案 | 修改 | 🔴 高 | 新增 7 個 API endpoints |
| 7 | [tution-portal/src/pages/ClassroomManagement.tsx](d:\chhsban\tution-portal\src\pages\ClassroomManagement.tsx) | **新增** | 🔴 高 | 教室管理頁面（UI + 業務邏輯） |
| 8 | [tution-portal/src/App.tsx](d:\chhsban\tution-portal\src\App.tsx) | 修改 | 🔴 高 | 新增 /classrooms 路由 |

---

## ✅ 驗證計畫

### 階段 1：KV 層驗證（開發環境）

```
✓ Cloudflare KV 中 CLASSROOM_KV namespace 正確建立
✓ ClassroomKVManager 單元測試通過：
  - createClassroom() 可正確儲存
  - getClassroom() 可正確查詢
  - updateClassroom() 可正確更新
  - deleteClassroom() 可正確刪除
  - toggleAvailableForTution() 正確切換狀態
  - listAllClassrooms() 列出所有教室
  - listAllClassrooms(true) 列出可用教室
  - batchUpdateClassrooms() 批量更新成功
✓ KV Key 設計驗證（測試各種 key 衝突）
```

### 階段 2：API 層驗證（開發環境 + 預發布環境）

```
✓ POST /api/classrooms
  - admin 可成功建立教室
  - teacher 無法建立（返回 403）
  - 缺少必填欄位時返回 400

✓ GET /api/classrooms
  - 所有已認證用戶可查詢
  - ?availableOnly=true 正確過濾
  - 未認證用戶返回 401

✓ GET /api/classrooms/:id
  - 查詢存在的教室成功
  - 查詢不存在的教室返回 404

✓ PUT /api/classrooms/:id
  - admin 可修改教室資訊
  - teacher 無法修改（返回 403）
  - 驗證更新的資料正確儲存

✓ PATCH /api/classrooms/:id/tution
  - admin 可勾選/取消補習選用
  - 狀態變更正確反映在 KV 中

✓ DELETE /api/classrooms/:id
  - admin 可刪除教室
  - 刪除後無法再查詢該教室

✓ POST /api/classrooms/batch-update
  - 上傳格式正確的 Excel 成功更新
  - 返回成功/失敗統計
  - 驗證更新的班級和桌數
  - 錯誤行返回詳細錯誤訊息
```

### 階段 3：前端層驗證（開發環境）

```
✓ ClassroomManagement 頁面可正常載入
✓ 教室列表正確顯示所有教室
✓ 新增教室流程：
  - 開啟模態框
  - 填入資料
  - 提交成功，列表更新
✓ 編輯教室流程：
  - 點擊編輯按鈕
  - 預填現有資料
  - 修改並提交成功
✓ 刪除教室流程：
  - 點擊刪除按鈕
  - 確認刪除
  - 列表更新，教室消失
✓ 勾選補習選用：
  - 點擊 checkbox 即時切換
  - 後端狀態正確更新
✓ Excel 批量更新：
  - 拖放檔案到上傳區
  - 解析成功並顯示進度
  - 完成後顯示結果統計
✓ 權限檢查：
  - 非 admin 用戶無法看到此頁面
  - 路由正確保護
```

### 階段 4：集成驗證（預發布 + 正式環境）

```
✓ 完整流程測試：
  1. admin 在 ClassroomManagement 新增教室
  2. 確認 KV 中儲存成功
  3. teacher 在查詢頁面能看到新增的教室
  4. admin 勾選補習選用
  5. teacher 只能看到可用教室（if availableOnly=true）
  6. admin 上傳 Excel 批量更新班級
  7. 驗證前端和 KV 中的資料一致

✓ 異常情況測試：
  - 網絡中斷後重試
  - KV 配額超限時的處理
  - 大批量更新（1000+ 教室）的性能

✓ 跨瀏覽器驗證：
  - Chrome、Firefox、Safari、Edge
  - 表格響應式設計
  - 模態框可用性
```

---

## 📊 資源評估

### Cloudflare KV 成本估算

**假設**：
- 初始教室數：200 間
- 每年批量更新頻率：1 次
- 日常查詢頻率：每位教師每天平均 5 次查詢

**月度估計**：
- 讀取：教室數 × 每天查詢次數 × 教師數 × 30 天 ≈ 200 × 5 × 50 × 30 = 1,500,000 次/月
- 寫入：年度批量更新 1 次 + 日常編輯（預估每月 10 次修改）≈ 10 次/月
- 成本：Cloudflare 免費額度 **1000 萬次讀取/月 + 100 萬次寫入/月**（完全涵蓋此需求）

**結論**：✅ 完全在免費額度內，無額外成本。

---

## 🚀 實現優先級

### 優先 P0（核心功能）
1. KV Namespace + ClassroomRecord 類型
2. ClassroomKVManager CRUD 實現
3. API endpoints 實現（1-6）
4. ClassroomManagement 前端頁面

**時程估計**：2-3 天（一名開發人員）

### 次優 P1（增強功能）
5. Excel 批量更新實現
6. 單元測試
7. 集成測試

**時程估計**：1-2 天

### 可選 P2（未來）
- 教室使用統計報表
- 教室預約日曆
- 通知機制

---

## 📌 決策記錄

### 確認的設計決策

| 決策項 | 選項 | 結論 | 原因 |
|--------|------|------|------|
| KV Namespace 位置 | packages/kv-utils | ✅ 採用 | 支援跨項目複用 |
| 反饋功能 | 包含 vs 不包含 | ❌ 不包含 | 簡化需求，申請人僅查詢 |
| 批量更新方式 | CSV vs Excel | ✅ Excel | 更易於使用 |
| 清潔度反饋 | 跟隨課程 vs 獨立 | ❌ 都不做 | 用戶明確要求刪除 |

### 風險評估

| 風險 | 等級 | 緩解措施 |
|------|------|---------|
| Excel 解析失敗 | 🟡 中 | 詳細的錯誤訊息提示，支援本地驗證 |
| KV 配額超限 | 🟢 低 | 預估完全在免費額度內 |
| 許可權繞過 | 🟡 中 | 後端嚴格檢查，前端隱藏按鈕 |
| 資料不一致 | 🟢 低 | 事務性批量更新，失敗原子性 |

---

## 📞 後續行動

### 立即行動項目
- [ ] 確認 Excel 批量更新的檔案格式規範
- [ ] 確認 classroom_id 命名規則
- [ ] 確認教室初始資料來源

### 開發前準備
- [ ] 準備 ClassroomRecord 的測試資料集
- [ ] 設計 Excel 模板
- [ ] 確認 wrangler.toml 中的 KV 綁定語法

### 發布前檢查
- [ ] 全量功能測試清單
- [ ] 性能基準測試（大批量教室）
- [ ] 用戶驗收測試（UAT）

---

## 📚 附錄

### A. 相關連結
- [packages/kv-utils](d:\chhsban\packages\kv-utils)
- [chhsban-tution](d:\chhsban\chhsban-tution)
- [tution-portal](d:\chhsban\tution-portal)

### B. 參考文檔
- Cloudflare KV 文檔：https://developers.cloudflare.com/kv/
-現有 Permission 系統：[packages/kv-utils/src/types/index.ts#L27](d:\chhsban\packages\kv-utils\src\types\index.ts#L27)
- 現有 StudentKVManager 參考：[packages/kv-utils/src/student-kv-manager.ts](d:\chhsban\packages\kv-utils\src\student-kv-manager.ts)

### C. Excel 批量更新範本

預期 Excel 格式（.xlsx）：

| 教室編號 | 教室名稱 | 班級 | 桌數 |
|---------|--------|------|------|
| ROOM-001 | 演講廳A | 中一A班 | 40 |
| ROOM-002 | 演講廳B | 中二B班 | 35 |
| ROOM-003 | 討論室C | 高一C班 | 20 |

---

**文檔簽署**

| 角色 | 日期 | 簽名 |
|------|------|------|
| 需求方 | 2026-08-14 | ✅ 已確認 |
| 技術負責人 | 2026-08-14 | ⏳ 待確認 |
| 項目經理 | 2026-08-14 | ⏳ 待確認 |

---

**版本歷史**

| 版本 | 日期 | 主要變更 |
|------|------|---------|
| 1.0 | 2026-08-14 | 初版發布，簡化版設計（已確認） |

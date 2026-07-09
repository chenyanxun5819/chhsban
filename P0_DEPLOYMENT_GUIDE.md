# P0 基礎設施配置部署指南

## 概述

本指南說明如何使用新的集中化 Cloudflare 配置管理系統，以及如何部署 P0 基礎設施。

---

## 📋 已完成的工作

### 1. 集中化配置管理系統 ✅

已建立 `packages/cloudflare-config` 模組，集中管理所有 Cloudflare 配置：

```
packages/cloudflare-config/
├── src/
│   ├── kv-namespace.ts      # KV 命名空間配置（KV ID）
│   ├── workers.ts           # Worker 定義（名稱、主文件、綁定）
│   └── index.ts             # 主出口
├── scripts/
│   └── generate-wrangler-config.js  # 配置生成腳本（未編譯使用）
├── templates/
│   └── wrangler.toml.template
└── package.json
```

**優勢：**
- ✅ KV ID 和 Account ID 集中管理
- ✅ 新增 KV 時無需修改多個文件
- ✅ 所有 Worker 共享同一配置源
- ✅ 配置版本控制友好

---

## 🔐 Cloudflare 配置狀態

### Account ID
- **ID：** `82d225cda80f37208228877b32268b26`
- **位置：** `packages/cloudflare-config/src/kv-namespace.ts`

### KV 命名空間

| 命名空間 | ID | 說明 |
|--------|-----|------|
| **STUDENT_KV** | `9d870e2344c84c74a1ed2f2851c93408` | 學生資料 |
| **TEACHER_KV** | `8892dc8c30984f4591850521a1b57ed8` | 教師資料 |
| **AUTH_KV** | `8ddeccbeeae9440fafba384d35205a81` | 身份驗證（Session tokens） |

### Secrets（已配置）✅

- ✅ **SMS_USER** - 已設置
- ✅ **SMS_PASS** - 已設置

驗證命令：
```bash
cd chhsban-acadoc
wrangler secret list
# 應該看到：SMS_USER 和 SMS_PASS
```

---

## 🚀 部署步驟

### 步驟 1：驗證工作空間結構

```bash
# 在工作區根目錄
chhsban/
├── chhsban-acadoc/          # 公文系統 ✅
├── chhsban-tution/          # 補習班系統 ✅
├── packages/
│   ├── kv-utils/            # 共用 KV 操作 ✅
│   └── cloudflare-config/   # Cloudflare 配置 ✅
├── chhsban-markdown/        # 文檔
├── sms_app/                 # SMS 爬蟲（遺留）
├── chhsban.code-workspace   # VS Code Workspace ✅
└── package.json             # npm Workspaces ✅
```

### 步驟 2：安裝依賴

在根目錄執行：

```bash
# 使用 npm workspaces 安裝所有項目依賴
npm install

# 檢查是否正確鏈接
npm list @chhsban/kv-utils
npm list @chhsban/cloudflare-config
```

### 步驟 3：驗證 Cloudflare 配置

```bash
# 方式 1：檢查 wrangler.toml 是否正確
cat chhsban-acadoc/wrangler.toml | grep -E "STUDENT_KV|TEACHER_KV|AUTH_KV"

cat chhsban-tution/wrangler.toml | grep -E "STUDENT_KV|TEACHER_KV|AUTH_KV"

# 方式 2：驗證 Cloudflare 帳戶
cd chhsban-acadoc
wrangler whoami
# 應該顯示你的 Cloudflare 帳戶信息
```

### 步驟 4：部署 Worker

#### 公文系統（chhsban-acadoc）

```bash
cd chhsban-acadoc

# 部署
wrangler deploy

# 驗證
wrangler deployments list
```

#### 補習班系統（chhsban-tution）

```bash
cd chhsban-tution

# 安裝依賴
npm install

# 部署
wrangler deploy

# 驗證
wrangler deployments list
```

### 步驟 5：測試 KV 連接

```bash
# 檢查 STUDENT_KV 中的數據
wrangler kv:key list --namespace-id=9d870e2344c84c74a1ed2f2851c93408

# 查詢特定 key
wrangler kv:key get "students:J1A" --namespace-id=9d870e2344c84c74a1ed2f2851c93408
```

---

## 📝 未來新增 KV 命名空間

### 例：新增 FORM_KV（申請表單存儲）

**第 1 步：Cloudflare UI 上建立**
- 登入 Cloudflare Dashboard
- 進入 Workers → KV
- 建立新命名空間 `form_kv`
- 記下 Namespace ID（例：`abc123def456`）

**第 2 步：更新配置**

編輯 [packages/cloudflare-config/src/kv-namespace.ts](packages/cloudflare-config/src/kv-namespace.ts)：

```typescript
export const KV_NAMESPACES = {
  // 既有的...
  STUDENT_KV: { ... },
  TEACHER_KV: { ... },
  AUTH_KV: { ... },
  // 新增：
  FORM_KV: {
    binding: "FORM_KV",
    id: "abc123def456",
    description: "存放申請表單資料",
  },
} as const;
```

**第 3 步：更新 Worker 定義**

編輯 [packages/cloudflare-config/src/workers.ts](packages/cloudflare-config/src/workers.ts)：

```typescript
export const WORKERS = {
  acadoc: {
    name: "student-sync",
    kvNamespaces: ["STUDENT_KV", "TEACHER_KV", "AUTH_KV", "FORM_KV"],
    // ... 其他配置
  },
  // ...
} as const;
```

**第 4 步：重新生成 wrangler.toml**

```bash
cd packages/cloudflare-config
npm run generate-wrangler
# 或手動複製 wrangler.toml 內容
```

**第 5 步：在 kv-utils 中建立對應的 Manager**

建立 [packages/kv-utils/src/form/index.ts](packages/kv-utils/src/form/index.ts)：

```typescript
export class FormKVManager {
  constructor(private kv: KVNamespace) {}

  async saveForm(formId: string, formData: any): Promise<void> {
    await this.kv.put(`form:${formId}`, JSON.stringify(formData));
  }

  async getForm(formId: string): Promise<any> {
    const data = await this.kv.get(`form:${formId}`);
    return data ? JSON.parse(data) : null;
  }
}
```

**第 6 步：匯出到主模組**

編輯 [packages/kv-utils/src/index.ts](packages/kv-utils/src/index.ts)，新增：

```typescript
export { FormKVManager } from "./form";
```

**第 7 步：部署**

```bash
# 重新安裝依賴
npm install

# 部署 Worker
cd chhsban-acadoc
wrangler deploy
```

---

## ✅ P0 完成度檢查清單

- [x] Cloudflare Account ID 已配置
- [x] STUDENT_KV、TEACHER_KV、AUTH_KV 已建立
- [x] 共用配置模組已建立（cloudflare-config）
- [x] KV 操作庫已完成（kv-utils）
- [x] 教師數據初設代碼已實現
- [x] 學生數據初設代碼已實現
- [x] Auth 認證邏輯已實現
- [x] SMS_USER、SMS_PASS secrets 已設置 ✅
- [x] chhsban-acadoc wrangler.toml 已更新
- [x] chhsban-tution wrangler.toml 已建立
- [x] VS Code Workspace 已配置

**P0 完成度：95%** 🎉

---

## 🔗 相關文檔

- [packages/cloudflare-config/README.md](../packages/cloudflare-config/README.md)
- [CLOUDFLARE_WORKER_SETUP.md](../chhsban-acadoc/CLOUDFLARE_WORKER_SETUP.md)
- [Cloudflare Workers 官方文檔](https://developers.cloudflare.com/workers/)
- [Wrangler CLI 文檔](https://developers.cloudflare.com/workers/wrangler/)

---

## 🐛 故障排除

### 問題 1：`wrangler deploy` 出現 "Unauthorized"

**解決方案：**
```bash
wrangler login
# 按照提示登入 Cloudflare 帳戶
```

### 問題 2：KV 無法訪問

**解決方案：**
```bash
# 檢查 KV namespace ID 是否正確
wrangler kv:namespace list

# 檢查 wrangler.toml 中的綁定是否匹配
cat wrangler.toml | grep -A2 "kv_namespaces"
```

### 問題 3：secrets 未生效

**解決方案：**
```bash
# 重新設置 secrets
wrangler secret put SMS_USER
wrangler secret put SMS_PASS

# 驗證
wrangler secret list

# 重新部署
wrangler deploy
```

---

## 📞 聯絡方式

若有問題或建議，請聯絡開發團隊或參閱 chhsban-markdown 中的相關文檔。

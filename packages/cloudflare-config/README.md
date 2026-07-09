# Cloudflare 配置管理說明

## 概述

此模組集中管理所有 Cloudflare 相關配置，包括：
- **KV 命名空間 ID**（STUDENT_KV, TEACHER_KV, AUTH_KV）
- **Worker 定義**（acadoc, tution）
- **環境變數和 Cron 觸發器**

## 文件結構

```
cloudflare-config/
├── src/
│   ├── kv-namespace.ts     # KV 命名空間配置
│   ├── workers.ts          # Worker 定義
│   └── index.ts            # 主出口
├── templates/
│   └── wrangler.toml.template
├── scripts/
│   └── generate-wrangler-config.js  # 配置生成腳本
├── package.json
├── tsconfig.json
└── README.md (本文件)
```

## 使用方式

### 在其他專案中導入配置

```typescript
// chhsban-acadoc 或 chhsban-tution 中
import {
  CLOUDFLARE_ACCOUNT_ID,
  KV_NAMESPACES,
  getKVNamespace,
  getAllKVNamespaces,
} from "@chhsban/cloudflare-config";

// 使用 KV 配置
const studentKV = getKVNamespace("STUDENT_KV");
console.log(studentKV.id); // "9d870e2344c84c74a1ed2f2851c93408"
```

## 新增新的 KV 命名空間

如果需要新增 KV（例如 FORM_KV）：

1. **在 Cloudflare UI 上建立新命名空間**
   - 記下 namespace ID

2. **更新 `src/kv-namespace.ts`**
   ```typescript
   export const KV_NAMESPACES = {
     // ... 既有的
     FORM_KV: {
       binding: "FORM_KV",
       id: "新_namespace_id",
       description: "存放申請表單資料",
     },
   } as const;
   ```

3. **如果有新的 Worker 使用此 KV，更新 `src/workers.ts`**
   ```typescript
   export const WORKERS = {
     // ... 既有的
     newWorker: {
       kvNamespaces: ["STUDENT_KV", "FORM_KV"],
       // ... 其他配置
     },
   } as const;
   ```

4. **重新生成 wrangler.toml**
   ```bash
   cd packages/cloudflare-config
   npm run generate-wrangler
   ```

## 配置版本控制

- **不追蹤敏感信息**：SMS_USER, SMS_PASS 等敏感值應使用 `wrangler secret put` 設置
- **追蹤非敏感配置**：KV ID、Account ID、環境變數（如 SMS_BASE_URL）
- **Git 忽略清單**：不要將 `.env` 或已生成的 `wrangler.toml` 提交

## 相關文檔

- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Wrangler 配置說明](https://developers.cloudflare.com/workers/wrangler/configuration/)

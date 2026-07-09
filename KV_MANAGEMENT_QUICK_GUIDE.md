# 新增共用 KV 命名空間的快速指南

## 三步法新增 KV

### 步驟 1：在 Cloudflare 中建立 KV

```bash
# 方法 A：使用 Wrangler CLI
cd chhsban-acadoc
wrangler kv:namespace create "my_new_kv"
# 會輸出類似：
# 🎉 Successfully created namespace with id: xxxxxxxxxxxxxxxxxxxx
```

記下 **namespace ID**。

### 步驟 2：更新 `packages/cloudflare-config`

編輯 **`packages/cloudflare-config/src/kv-namespace.ts`**：

```typescript
export const KV_NAMESPACES = {
  // ... 既有的
  
  // 新增：
  MY_NEW_KV: {
    binding: "MY_NEW_KV",
    id: "xxxxxxxxxxxxxxxxxxxx",  // ← 貼上 namespace ID
    description: "存放 XXX 資料",
  },
} as const;
```

### 步驟 3：更新使用該 KV 的 Worker

編輯 **`packages/cloudflare-config/src/workers.ts`**：

```typescript
export const WORKERS = {
  acadoc: {
    kvNamespaces: [
      "STUDENT_KV",
      "TEACHER_KV", 
      "AUTH_KV",
      "MY_NEW_KV",  // ← 新增
    ],
    // ... 其他配置
  },
  // ... 其他 Worker
} as const;
```

---

## 完成後

- ✅ `wrangler.toml` 會自動套用（已在 wrangler.toml 中添加了注釋，手動複製配置）
- ✅ 所有綁定該 Worker 的項目都會自動獲得該 KV 的訪問權限
- ✅ 類型安全：TypeScript 會驗證 KV_NAMESPACES 中的配置

---

## 例：新增 FORM_KV

```typescript
// 1. 建立 KV（Cloudflare 中）
// namespace ID = 1234567890abcdef1234567890abcdef

// 2. 更新 kv-namespace.ts
export const KV_NAMESPACES = {
  // 既有的...
  FORM_KV: {
    binding: "FORM_KV",
    id: "1234567890abcdef1234567890abcdef",
    description: "存放申請表單資料",
  },
} as const;

// 3. 更新 workers.ts（如果 acadoc 需要用到）
export const WORKERS = {
  acadoc: {
    kvNamespaces: ["STUDENT_KV", "TEACHER_KV", "AUTH_KV", "FORM_KV"],
    // ...
  },
};

// 4. 手動複製 wrangler.toml 或重新部署
cd chhsban-acadoc && wrangler deploy
```

---

## 配置文件位置速查

| 文件 | 位置 | 說明 |
|------|------|------|
| KV 配置 | `packages/cloudflare-config/src/kv-namespace.ts` | 所有 KV namespace ID |
| Worker 配置 | `packages/cloudflare-config/src/workers.ts` | Worker 綁定定義 |
| chhsban-acadoc | `chhsban-acadoc/wrangler.toml` | 公文系統部署配置 |
| chhsban-tution | `chhsban-tution/wrangler.toml` | 補習班系統部署配置 |
| 集中管理說明 | `packages/cloudflare-config/README.md` | 詳細文檔 |
| 部署指南 | `P0_DEPLOYMENT_GUIDE.md` | P0 配置部署指南 |

---

## 📌 重點

- **所有 KV ID 集中管理**：只需修改一個文件
- **無需複製貼上**：自動同步到所有 Worker
- **版本控制友好**：一個 commit 就能追蹤所有配置變更
- **類型安全**：TypeScript 會檢查配置合法性


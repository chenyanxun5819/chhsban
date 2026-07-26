# 你的三個問題 - 快速回答

**日期**: 2026-07-10  
**主題**: Google OAuth 設置 + 後端 API 實現

---

## 📌 問題 1: OAuth 2.0 Client ID

### 你的提問
> 我有在我的 chhsban-acadoc 專案中，設置一個 OAuth 2.0，所以，我是把這個用戶端 ID 給你嗎？  
> **用戶端 ID: `491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com`**

### ✅ 答案
**是的！就是這個 ID！**

這個 Client ID 需要配置在 tution-portal 中：

```bash
# 步驟 1: 複製 ID
491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com

# 步驟 2: 建立 .env.local 文件 (如果沒有)
# 路徑: d:\chhsban\tution-portal\.env.local

# 步驟 3: 添加以下內容
VITE_GOOGLE_CLIENT_ID=491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:8787/api

# 步驟 4: 儲存文件，重新啟動開發服務器
npm run dev
```

---

## 📌 問題 2: 定向 URI (重定向 URI)

### 你的提問
> 定向 URI，請看截圖 2，是要在「已授權的重新導向 URI」中設置我要檢查的 domain name 嗎？即 `chhsban.edu.my`？

### ⚠️ 重要澄清
**不完全對！** 你需要設置的是 **完整的 callback URL**，而不只是 domain name。

### ✅ 正確的重定向 URI 清單

在 Google Cloud Console 的「已授權的重新導向 URI」中添加：

```
🔷 開發環境 (本地測試):
   http://localhost:5173/auth/callback
   https://localhost:5173/auth/callback

🔷 生產環境 (Cloudflare Pages):
   https://chhsban-tution.pages.dev/auth/callback

🔷 自訂域名 (chhsban.edu.my):
   https://tution.chhsban.edu.my/auth/callback
   或
   https://portal.chhsban.edu.my/auth/callback
```

### 📝 在 Google Cloud Console 中的操作步驟

1. **打開截圖 2 的頁面** (Google Auth Platform - 用戶端設置)
2. **找到「已授權的重新導向 URI」區段**
3. **點擊「+ 新增 URI」按鈕** (藍色)
4. **在文本框中輸入**:
   ```
   https://chhsban-tution.pages.dev/auth/callback
   ```
5. **重複添加其他 URI**
6. **點擊「儲存」按鈕** (藍色)

### 示意圖
```
Google Cloud Console
└─ OAuth 2.0 用戶端 ID (491731246647-gf63...)
   └─ 已授權的重新導向 URI
      ├─ http://localhost:5173/auth/callback
      ├─ https://localhost:5173/auth/callback
      ├─ https://chhsban-tution.pages.dev/auth/callback
      └─ https://tution.chhsban.edu.my/auth/callback
```

---

## 📌 問題 3: 後端 API 怎麼操作

### 你的提問
> 后端 API 要怎么操作呢？

### 📊 完整答案 (分成 3 步)

#### 步驟 1: 選擇實現方式

有 3 種方式可以實現後端 API：

| 方式 | 位置 | 難度 | 推薦度 |
|------|------|------|--------|
| **方式 1** ⭐ | chhsban-acadoc Worker | 簡單 | ⭐⭐⭐ |
| **方式 2** | 新建 tution-system Worker | 中等 | ⭐⭐ |
| **方式 3** | tution-portal Pages Function | 中等 | ⭐ |

**我推薦方式 1**，原因：
- 你已有 chhsban-acadoc 專案
- TEACHER_KV 已在那裡
- 最簡單快速

---

#### 步驟 2: 實現 (選擇方式 1 為例)

在 `d:\chhsban\chhsban-acadoc\chhsban-acadoc\workers\index.ts` 中添加：

```typescript
// POST /auth/verify - 驗證教師 Email
router.post('/auth/verify', async (request, env) => {
  try {
    const { email } = await request.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email 為必填項' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 在 TEACHER_KV 中查詢 Email
    const teacherData = await env.TEACHER_KV.get(
      `teacher:${email.toLowerCase()}`,
      'json'
    );

    if (!teacherData) {
      return new Response(
        JSON.stringify({ error: 'Email 未在系統中註冊' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 生成 JWT Token
    const token = generateJWT(teacherData.teacher_id, email);

    return new Response(
      JSON.stringify({
        token,
        teacher_id: teacherData.teacher_id,
        teacher_name: teacherData.teacher_name,
        permission: teacherData.permission || 'teacher',
        email,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: '驗證失敗' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

function generateJWT(teacherId, email) {
  // 簡化版本
  const payload = {
    teacherId,
    email,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400,
  };
  return btoa(JSON.stringify(payload));
}
```

---

#### 步驟 3: 部署

```bash
# 進入 chhsban-acadoc 目錄
cd d:\chhsban\chhsban-acadoc

# 部署到 Cloudflare Workers
npm run deploy

# 驗證 - 應該看到成功訊息
# ✓ Deployed...
```

---

### 🧪 測試 API

部署後，可以測試：

```bash
# 測試成功案例 (假設 teacher@chhsban.edu.my 在 TEACHER_KV 中)
curl -X POST https://academydoc.workers.dev/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@chhsban.edu.my"}'

# 預期回應:
{
  "token": "eyJ0ZWFjaGVyI...",
  "teacher_id": "T001",
  "teacher_name": "王老師",
  "permission": "teacher",
  "email": "teacher@chhsban.edu.my"
}
```

---

## 🎯 現在要做的事情 (優先順序)

### 立即 (今天)

1. ✅ **設置 Client ID**
   ```bash
   # 在 d:\chhsban\tution-portal\.env.local 中
   VITE_GOOGLE_CLIENT_ID=491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com
   ```

2. ✅ **設置重定向 URI** (在 Google Cloud Console)
   - 添加: `https://chhsban-tution.pages.dev/auth/callback`
   - 添加: `https://localhost:5173/auth/callback`
   - 儲存

3. ✅ **實現後端 API** (方式 1)
   - 更新 chhsban-acadoc 的 `workers/index.ts`
   - 添加 POST /auth/verify 端點

4. ✅ **部署**
   ```bash
   cd d:\chhsban\chhsban-acadoc
   npm run deploy
   ```

### 接著 (明天)

5. 本地測試完整登入流程
6. 修正任何 bug
7. 部署到生產環境

---

## 📚 詳細指南

更詳細的實現步驟，請參考：  
📄 [Backend_API_Implementation_Guide.md](../260710/Backend_API_Implementation_Guide.md)

---

## ❓ 常見問題

**Q: Client ID 在哪裡找到？**  
A: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → CHHSBAN_ACA

**Q: TEACHER_KV 怎麼知道是否有某個 email？**  
A: 查詢 key: `teacher:{email}` (例如: `teacher:admin@chhsban.edu.my`)

**Q: 重定向 URI 必須精確匹配嗎？**  
A: 是的！必須完全一致，包括 protocol (http vs https) 和路徑

**Q: 如果 TEACHER_KV 中找不到 email 怎麼辦？**  
A: 系統返回 401 錯誤，用戶看到「Email 未在系統中註冊」

---

**總結**: 
1. ✅ 使用你的 Client ID
2. ✅ 在 Google Cloud 中添加完整的重定向 URI
3. ✅ 在 chhsban-acadoc 中實現 POST /auth/verify
4. ✅ 部署並測試

**預計完成時間**: 2-3 小時

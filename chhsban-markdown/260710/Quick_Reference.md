# 🚀 快速參考卡

## 1️⃣ OAuth Client ID

```
✅ 是的，就是這個 ID！

ID: 491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com

設置位置: d:\chhsban\tution-portal\.env.local
設置方式:
  VITE_GOOGLE_CLIENT_ID=491731246647-gf63vkq4vso6uji4dilcd84g5aedocsf.apps.googleusercontent.com
```

---

## 2️⃣ 重定向 URI (不只是 domain name！)

```
❌ 錯誤: chhsban.edu.my
✅ 正確: https://chhsban-tution.pages.dev/auth/callback

需要添加的完整 URI 列表:

① http://localhost:5173/auth/callback           (本地開發)
② https://chhsban-tution.pages.dev/auth/callback (生產)  
③ https://tution.chhsban.edu.my/auth/callback   (自訂域名)

在 Google Cloud Console 中:
1. 打開 OAuth 2.0 用戶端設置頁面
2. 找到「已授權的重新導向 URI」
3. 點擊「+ 新增 URI」
4. 輸入上面的完整 URL
5. 點擊「儲存」
```

---

## 3️⃣ 後端 API 實現

```
需要實現: POST /auth/verify 端點

推薦方式: 在 chhsban-acadoc 中添加 ⭐

實現步驟:
1. 編輯: d:\chhsban\chhsban-acadoc\chhsban-acadoc\workers\index.ts
2. 添加 POST /auth/verify 路由 (見下方代碼)
3. 部署: npm run deploy
4. 測試: curl -X POST https://academydoc.workers.dev/auth/verify

端點要求:
- 輸入: {email: "teacher@chhsban.edu.my"}
- 輸出: {token, teacher_id, teacher_name, permission, email}
- 錯誤: 401 如果 email 不在 TEACHER_KV 中

關鍵代碼片段:
---
router.post('/auth/verify', async (request, env) => {
  const { email } = await request.json();
  const teacher = await env.TEACHER_KV.get(
    `teacher:${email.toLowerCase()}`,
    'json'
  );
  
  if (!teacher) {
    return new Response(
      JSON.stringify({ error: 'Email not found' }),
      { status: 401 }
    );
  }
  
  return new Response(
    JSON.stringify({
      token: 'jwt_token',
      teacher_id: teacher.teacher_id,
      teacher_name: teacher.teacher_name,
      permission: teacher.permission || 'teacher',
      email
    }),
    { status: 200 }
  );
});
---
```

---

## ✅ 行動清單 (優先順序)

```
[] 1. 設置 .env.local (Client ID)         [5 分鐘]
[] 2. Google Cloud 添加重定向 URI         [10 分鐘]
[] 3. 實現後端 /auth/verify 端點          [30 分鐘]
[] 4. 部署 (npm run deploy)              [5 分鐘]
[] 5. 測試 API                           [10 分鐘]
[] 6. 測試完整登入流程                    [20 分鐘]

預計總時間: 1.5 小時
```

---

## 📚 詳細文檔

- 📄 [Questions_Answers.md](Questions_Answers.md) - 三個問題的詳細回答
- 📄 [Backend_API_Implementation_Guide.md](Backend_API_Implementation_Guide.md) - 完整後端實現指南
- 📄 [Phase0_Login_Implementation_Report.md](Phase0_Login_Implementation_Report.md) - 前端登入系統報告

# ⭐ M6 前端快速检验指南

**最快路线**: 5 分钟启动 → 10 分钟完整检验

---

## ⚡ 快速启动 (5 分钟)

### 步骤 1: 启动本地服务器 (1 分钟)

```powershell
cd D:\chhsban\OfficeOMR\web
python -m http.server 8000
```

**预期输出**:
```
Serving HTTP on 0.0.0.0 port 8000
```

### 步骤 2: 打开浏览器 (30 秒)

```
http://localhost:8000/index-m6.html
```

### 步骤 3: 观察登入页面 (1 分钟)

**检验点**:
- [ ] 页面显示 "OfficeOMR" 标题（大字）
- [ ] 显示 "答题纸识别系统" 副标题
- [ ] 显示 Google Sign-In 按钮（白底蓝字）
- [ ] 打开浏览器开发工具 (F12)，Console 标签页无红色错误

---

## 🧪 完整功能检验 (10 分钟)

### 检验 1: Super Admin 登入 (3 分钟)

**操作**:
1. 点击 "使用 Google 登录" 按钮
2. 在弹窗中选择 `weschen@mybazaar.my`
3. 点击确认

**预期结果**:
```
✅ 进入管理后台页面
✅ 标题变为 "OfficeOMR 管理后台"
✅ 显示"Super Admin 权限"
✅ 页面显示三个标签页：🏢 组织、👨‍🏫 教师、⚙️ 系统设置
```

**Console 检查**:
```javascript
// 复制粘贴到 Console 检查
firebase.auth().currentUser.getIdTokenResult().then(t => {
  console.log('Claims:', t.claims);
  // 预期: { role: "super_admin", ... }
});
```

**预期 Console 输出**:
```
✅ OfficeOMR app initialized
✅ claimAccess result: { role: "super_admin" }
🔄 Auth state changed: { isAuthenticated: true, isSuperAdmin: true }
📄 Showing admin page
✅ Loaded 1 organizations
```

### 检验 2: Admin 数据显示 (3 分钟)

**组织标签页**:
- [ ] 点击 "🏢 组织管理" 标签页
- [ ] 显示表格，包含一行：
  ```
  组织名称: 森美蘭芙蓉中華中學
  代号: chhs
  状态: ✅ 活跃
  ```

**教师标签页**:
- [ ] 点击 "👨‍🏫 教师管理" 标签页
- [ ] 显示"暂无教师"（因为还没有添加）或教师列表（如果已添加）

**系统设置标签页**:
- [ ] 点击 "⚙️ 系统设置" 标签页
- [ ] 显示全局配置：
  ```
  defaultDailySheetsPerUser: 100
  studentDataRetentionHours: 24
  maxExamsPerTeacher: 200
  maxPaperFileMB: 10
  maxPagesPerUpload: 10
  maxFileMB: 15
  ```

### 检验 3: 权限拒绝 (2 分钟)

**打开新的隐私浏览窗口**:

1. 快捷键: `Ctrl+Shift+P` (Chrome/Edge) 或 `Ctrl+Shift+P` (Firefox)
2. 打开相同网址: `http://localhost:8000/index-m6.html`
3. 点击 "使用 Google 登录"
4. 选择一个**新的/不同的** Google 账户（不是 weschen@mybazaar.my）
5. 确认

**预期结果**:
```
❌ 错误信息: "您的账户尚未被批准，请联系管理员"
或
❌ Permission error
（2-3 秒后自动返回登入页面）
```

**Console 检查**:
```
✅ claimAccess result: { error: "NOT_APPROVED", message: "..." }
```

### 检验 4: Firestore 数据验证 (2 分钟)

**在 Admin 标签页，运行此命令查看**:

```javascript
// 获取所有组织
firebase.firestore().collection('orgs').get().then(snap => {
  snap.forEach(doc => console.log('Org:', doc.id, doc.data()));
});

// 获取所有教师
firebase.firestore().collection('allowedUsers').get().then(snap => {
  snap.forEach(doc => console.log('Teacher:', doc.id, doc.data()));
});

// 获取系统设置
firebase.firestore().collection('settings').doc('global').get().then(doc => {
  console.log('Settings:', doc.data());
});
```

**预期输出**:
```
Org: chhs {name: "森美蘭芙蓉中華中學", code: "chhs", ...}
Settings: {defaultDailySheetsPerUser: 100, studentDataRetentionHours: 24, ...}
```

---

## 🎯 关键检验点总结

| 检验项 | 预期结果 | 状态 |
|--------|--------|------|
| 页面加载 | 显示登入界面 | ✅/❌ |
| Google 登入 | 弹窗出现 | ✅/❌ |
| Super Admin 进入 | 显示管理后台 | ✅/❌ |
| 组织数据 | 显示 chhs 组织 | ✅/❌ |
| 设置数据 | 显示 7 个配置项 | ✅/❌ |
| 权限拒绝 | 未批准用户被拒 | ✅/❌ |
| Console 输出 | 无红色错误 | ✅/❌ |

---

## 🚨 如果出现问题

### 问题 1: "Firebase is not defined"
**解决**:
- 检查 index-m6.html 是否正确加载了 Firebase SDK
- 查看页面源代码 (右键 → 查看网页源代码) 搜索 "firebase"
- 确保有多行 `<script src="https://www.gstatic.com/firebasejs/..."></script>`

### 问题 2: "Cannot read property 'initializeApp'"
**解决**:
- 刷新页面 (Ctrl+F5)
- 清除浏览器缓存 (F12 → Application → Clear site data)

### 问题 3: "claimAccess is not a function"
**解决**:
- 检查 Cloud Functions 是否已部署:
  ```powershell
  firebase functions:list --project officeomr-fe542
  # 应该看到 recognize_sheet 函数
  ```
- 检查是否还有其他 claimAccess 函数

### 问题 4: 登入后页面空白
**解决**:
- F12 打开开发工具 → Console
- 寻找红色错误信息
- 检查网络请求是否失败 (Network 标签页)

### 问题 5: "CORS error" 或 "401 Unauthorized"
**解决**:
- 这通常是 Cloud Function 的问题
- 检查 Cloud Function 日志:
  ```powershell
  firebase functions:log --project officeomr-fe542
  ```

---

## 💡 高级调试技巧

### 在 Console 中查看完整的权限信息

```javascript
// 获取完整的认证状态
const user = firebase.auth().currentUser;
console.log('User:', {
  email: user.email,
  uid: user.uid,
  emailVerified: user.emailVerified
});

// 获取 Custom Claims
firebase.auth().currentUser.getIdTokenResult().then(token => {
  console.log('Full token result:', {
    claims: token.claims,
    issuedAtTime: new Date(token.issuedAtTime),
    expirationTime: new Date(token.expirationTime),
    signInProvider: token.signInProvider
  });
});

// 检查每个 Firestore 集合的权限
const checkAccess = async (collection, doc) => {
  try {
    const data = await firebase.firestore().collection(collection).doc(doc).get();
    console.log(`✅ Can read ${collection}/${doc}`);
    return data.data();
  } catch (e) {
    console.error(`❌ Cannot read ${collection}/${doc}:`, e.code);
  }
};

// 使用
await checkAccess('settings', 'global');
await checkAccess('orgs', 'chhs');
```

### 查看网络请求详情

在 DevTools 的 **Network** 标签页:
1. 点击 Google Sign-In 按钮
2. 观察 "claimAccess" 或 "functions" 请求
3. 查看 Response 标签页，应该看到:
   ```json
   { "result": { "role": "super_admin" } }
   ```
   或
   ```json
   { "error": "NOT_APPROVED" }
   ```

### 检查 Firestore Rules 是否生效

```javascript
// 尝试写入一个不应该写入的地方
firebase.firestore().collection('settings').doc('global').set({
  test: 'value'
}).catch(err => {
  console.log('Expected error:', err.code); // 应该是 PERMISSION_DENIED
});
```

---

## ✅ 完成检验后

### 如果一切都正常 ✅
```
恭喜！M6 前端基础功能已验证正常。
现在可以进行：
1. 后续功能开发（文件上传、识别等）
2. 性能优化
3. 部署到 Firebase Hosting
4. 更多测试场景覆盖
```

### 如果有问题 ❌
```
1. 查看详细的验证指南：
   📖 M6_FRONTEND_VERIFICATION_GUIDE.md
   
2. 检查 Stage A 部署状态：
   📖 M6_STAGE_A_DEPLOYMENT_COMPLETE.md
   
3. 查看 Cloud Functions 日志：
   firebase functions:log --project officeomr-fe542
```

---

## 📊 检验结果记录

```
检验日期: ___________
检验人员: ___________

登入页面:        ✅ / ❌ / ⏳
Super Admin 登入: ✅ / ❌ / ⏳
组织数据显示:    ✅ / ❌ / ⏳
教师数据显示:    ✅ / ❌ / ⏳
设置数据显示:    ✅ / ❌ / ⏳
权限拒绝测试:    ✅ / ❌ / ⏳
Console 无错:    ✅ / ❌ / ⏳

总体结果: ______________________
```

---

## 🚀 部署到 Firebase Hosting (可选)

如果本地测试都通过，可以部署到线上：

```powershell
cd D:\chhsban\OfficeOMR

# 部署
firebase deploy --only hosting --project officeomr-fe542

# 访问在线版本
# https://officeomr-fe542.web.app
```

---

## 📞 快速命令速查

```powershell
# 启动前端服务器
cd D:\chhsban\OfficeOMR\web
python -m http.server 8000

# 查看 Firestore 数据
gcloud firestore documents list --collection=settings
gcloud firestore documents list --collection=orgs

# 查看 Cloud Functions 日志
firebase functions:log --project officeomr-fe542

# 查看部署状态
firebase hosting:versions --project officeomr-fe542
```

---

**祝检验顺利！** 🎉

如有任何问题，请参考详细文档或查看浏览器 Console 的错误信息。

---

*最后更新: 2026-11-11*  
*用时: 15 分钟*

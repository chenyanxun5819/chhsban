# 🎯 M5 Phase 4 快速参考

**当前日期**: 2026-11-04  
**当前状态**: Phase 4 进行中 🚀

---

## 🔴 立即需要操作（BLOCKING）

### 1️⃣ 获取 Firebase 服务账号密钥 [需要手动]

**文档**: [GET_SERVICE_ACCOUNT_KEY.md](GET_SERVICE_ACCOUNT_KEY.md)

**概述**:
- Google Cloud Console → Service Accounts → Create Service Account
- 授予 Firebase Admin 角色
- 生成 JSON 密钥
- 保存到: `D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json`

**时间**: ~10 分钟

**完成后**: 可进行自动化 Task 2 (初始化 Firestore 数据)

---

### 2️⃣ 获取 Firebase Web 配置 [需要手动]

**步骤**:
1. Firebase Console → 项目 officeomr-fe542 → ⚙️ Settings
2. 在 "Your apps" 部分找到 Web 应用
3. 复制 `firebaseConfig` 对象

**配置项**:
```javascript
{
  apiKey: "AIzaSy...",
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.appspot.com",
  messagingSenderId: "...",
  appId: "1:...:web:..."
}
```

**存放位置**: `web/index.html` 第 196-204 行

**时间**: ~5 分钟

---

### 3️⃣ 配置 OAuth Consent Screen [需要手动]

**文档**: [M5_PHASE4_PLAN.md](M5_PHASE4_PLAN.md) 任务 5

**步骤**:
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. 选择 "External" 用户类型
3. 填写应用信息 (OfficeOMR)
4. 添加测试用户 (你的 Gmail + Wes 的 Gmail)

**时间**: ~10 分钟

---

## 🟡 可自动化执行

### Task 2: 初始化 Firestore 数据 [自动]

**前提**: 服务账号密钥已准备好

**命令**:
```powershell
cd D:\chhsban\OfficeOMR\functions
python init_data.py
```

**预期输出**:
```
✅ Firebase Admin SDK 初始化成功
✅ 创建全局配置 (settings/global)
✅ 初始化完成！
```

**时间**: ~1 分钟 (需人工确认: Y/N)

---

### Task 3: 部署 Cloud Function [自动]

**前提**: 无额外前提

**命令**:
```powershell
firebase deploy --only functions
```

**验证**:
```powershell
firebase functions:list
```

**预期输出**:
```
recognize_sheet - https://asia-southeast1-officeomr-fe542.cloudfunctions.net/recognize_sheet
```

**时间**: ~3-5 分钟

---

### Task 4 + 6: 更新 SDK 配置 + 部署前端 [自动]

**前提**: Web SDK 配置已更新到 `web/index.html`

**命令**:
```powershell
cd D:\chhsban\OfficeOMR
git add web/index.html
firebase deploy --only hosting
```

**验证**: 
```powershell
firebase projects:describe officeomr-fe542 | grep "Hosting URL"
```

**预期输出**:
```
https://officeomr-fe542.firebaseapp.com
```

**时间**: ~2 分钟

---

## 🟢 验证与测试

### Task 7: 完整流程测试 [手动测试]

**测试场景** (见 M5_PHASE4_PLAN.md 任务 7):

1. ✅ 认证测试
   - 打开前端 → Google Sign-In → 验证登录

2. ✅ 文件上传测试
   - 上传答题纸 PNG → 选择版型 → 点击"开始识别"

3. ✅ 结果显示测试
   - 验证学号、准确度、答题数显示正确

4. ✅ 错误处理测试
   - 上传无效文件 → 验证 400 错误
   - 超过配额 → 验证 429 错误

**时间**: ~15 分钟

---

### Task 8: Wes 验收测试 [Wes 测试]

**准备物**:
- 真实答题纸扫描件
- 前端 URL: https://officeomr-fe542.firebaseapp.com
- 登录账户: Wes 的 Gmail (已加入 OAuth 测试用户)

**验证内容**:
- 登录是否正常
- 识别精度是否满足要求
- 识别速度是否 <10 秒
- UI 是否直观

**时间**: ~30-60 分钟

---

## 📋 操作顺序

```
1. 获取服务账号密钥 (10 min) [手动]
   ↓
2. 获取 Web SDK 配置 (5 min) [手动]
   ↓
3. 配置 OAuth Consent Screen (10 min) [手动]
   ↓
4. 初始化 Firestore 数据 (1 min) [自动]
   ↓
5. 部署 Cloud Function (5 min) [自动]
   ↓
6. 更新 web/index.html 并部署前端 (2 min) [自动]
   ↓
7. 完整流程测试 (15 min) [手动测试]
   ↓
8. Wes 验收测试 (30-60 min) [Wes 测试]
   ↓
✅ Phase 4 完成
```

---

## 📚 参考文档

| 文档 | 用途 |
|------|------|
| [M5_PHASE4_PLAN.md](M5_PHASE4_PLAN.md) | 完整执行计划 (12 个任务) |
| [GET_SERVICE_ACCOUNT_KEY.md](GET_SERVICE_ACCOUNT_KEY.md) | 服务账号获取步骤 |
| [web/SETUP.md](../web/SETUP.md) | 前端配置与测试 |
| [docs/DECISIONS.md](DECISIONS.md) | 设计决策记录 |
| [docs/STATUS.md](STATUS.md) | 项目进度追踪 |

---

## 🆘 常见问题

**Q: 密钥文件放在哪里？**  
A: `D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json`

**Q: Web SDK 配置放在哪里？**  
A: `web/index.html` 第 196-204 行

**Q: 哪些步骤是阻塞性的？**  
A: 1️⃣ 2️⃣ 3️⃣ — 必须首先完成

**Q: 可以并行做吗？**  
A: 1️⃣ 和 2️⃣ 可以并行；3️⃣ 可以稍后做

---

## ✅ 检查清单

开始前验证:

- [ ] 已读 `GET_SERVICE_ACCOUNT_KEY.md`
- [ ] 已读 `M5_PHASE4_PLAN.md`
- [ ] Firebase CLI 已安装 (`firebase --version`)
- [ ] 有 Google Cloud Console 访问权限
- [ ] 有 Firebase Console 访问权限
- [ ] 已准备真实答题纸样本 (用于 Wes 测试)

---

**下一步**: 获取服务账号密钥 → 继续自动化部署

**文档版本**: Quick Reference v1.0  
**更新时间**: 2026-11-04

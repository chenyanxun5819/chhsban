# 🚀 M5 Phase 4 启动

**日期**: 2026-11-04  
**时间**: 22:30 UTC+8  
**里程碑**: M5 Phase 4 — 生产部署

---

## 📊 当前状态

```
✅ Phase 1: 环境准备 (2026-11-04 17:30)
✅ Phase 2: 前端开发 (2026-11-04 19:30)
✅ Phase 3: 数据安全 (2026-11-04 21:00)
🚀 Phase 4: 生产部署 (2026-11-04 22:15 开始)
```

---

## 🎯 Phase 4 目标

将 OfficeOMR 系统完全部署到生产环境，用户可以通过 Firebase Hosting URL 访问。

---

## ✨ 已完成

1. ✅ **更新 firebase.json**
   - 添加 `firestore` 和 `storage` 配置项
   - 现在支持规则部署

2. ✅ **部署 Firestore Rules**
   - `firestore.rules` (150+ 行) 已上传
   - 现在生产环境已启用访问控制

3. ✅ **创建文档**
   - `M5_PHASE4_PLAN.md` - 12 个任务完整计划
   - `GET_SERVICE_ACCOUNT_KEY.md` - 服务账号获取教程
   - `QUICK_START_PHASE4.md` - 快速参考卡片

---

## 🔴 立即行动项 (需要你手动完成)

### 步骤 1️⃣ 获取 Firebase 服务账号密钥 (~10 分钟)

**为什么需要**: 初始化 Firestore 数据库需要 Admin SDK 凭证

**位置**: [GET_SERVICE_ACCOUNT_KEY.md](GET_SERVICE_ACCOUNT_KEY.md)

**快速总结**:
```
Google Cloud Console 
  → Service Accounts 
  → Create Service Account (officeomr-firebase-init)
  → 授予 "Firebase Admin" 角色
  → 生成 JSON 密钥
  → 保存到 D:\chhsban\OfficeOMR\functions\officeomr-fe542-key.json
```

**完成后**: 可执行自动化步骤

---

### 步骤 2️⃣ 获取 Firebase Web SDK 配置 (~5 分钟)

**为什么需要**: 前端需要这些凭证来初始化 Firebase SDK

**位置**: Firebase Console → Settings → Your apps → Web

**快速总结**:
```javascript
// 从 Firebase Console 复制这个配置
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "officeomr-fe542.firebaseapp.com",
  projectId: "officeomr-fe542",
  storageBucket: "officeomr-fe542.appspot.com",
  messagingSenderId: "601814582794",
  appId: "1:...:web:..."
};

// 粘贴到 web/index.html 第 196-204 行
```

**完成后**: 前端可以部署

---

### 步骤 3️⃣ 配置 OAuth Consent Screen (~10 分钟)

**为什么需要**: Google Sign-In 必须配置同意屏幕

**位置**: Google Cloud Console → APIs & Services → OAuth consent screen

**快速总结**:
```
1. 选择 "External" 用户类型
2. 填写应用信息 (OfficeOMR)
3. 添加测试用户:
   - 你的 Gmail
   - Wes 的 Gmail (如有)
4. 保存
```

**完成后**: 用户可以登录

---

## 📋 接下来的自动化步骤

完成上面 3 个步骤后，可以按顺序执行这些自动化命令:

### 步骤 4️⃣ 初始化 Firestore 数据

```powershell
cd D:\chhsban\OfficeOMR\functions
python init_data.py
```

**预期**: 创建 `settings/global` 文档，显示 ✅ 成功

---

### 步骤 5️⃣ 部署 Cloud Function

```powershell
firebase deploy --only functions
```

**预期**: `recognize_sheet` 函数部署成功

**验证**:
```powershell
firebase functions:list
```

---

### 步骤 6️⃣ 部署前端应用

```powershell
firebase deploy --only hosting
```

**预期**: 前端部署到 https://officeomr-fe542.firebaseapp.com

---

## 🧪 测试

### 第一阶段: 完整流程测试 (你测试)

1. 打开 https://officeomr-fe542.firebaseapp.com
2. 用测试账户登录 (Google Sign-In)
3. 上传答题纸样本
4. 验证识别结果

---

### 第二阶段: Wes 验收测试 (Wes 测试)

1. Wes 登录系统
2. 用真实答题纸测试
3. 验收识别精度和速度
4. 提供反馈

---

## 📚 参考资源

| 文件 | 说明 |
|------|------|
| `M5_PHASE4_PLAN.md` | 完整的 12 个任务计划 |
| `GET_SERVICE_ACCOUNT_KEY.md` | 详细的服务账号获取步骤 |
| `QUICK_START_PHASE4.md` | 快速参考卡片 |
| `web/SETUP.md` | 前端配置与调试 |
| `STATUS.md` | 项目整体进度 |

---

## ⏱️ 时间表

| 步骤 | 时间 | 状态 |
|------|------|------|
| 1. 获取服务账号密钥 | ~10 min | ⏳ |
| 2. 获取 Web SDK 配置 | ~5 min | ⏳ |
| 3. 配置 OAuth | ~10 min | ⏳ |
| 4. 初始化 Firestore | ~1 min | ⏳ |
| 5. 部署 Function | ~5 min | ⏳ |
| 6. 部署前端 | ~2 min | ⏳ |
| 7. 完整测试 | ~15 min | ⏳ |
| 8. Wes 验收 | ~60 min | ⏳ |
| **总计** | **~108 min** | - |

---

## 📞 需要帮助?

- 服务账号密钥: 见 `GET_SERVICE_ACCOUNT_KEY.md`
- Phase 4 计划: 见 `M5_PHASE4_PLAN.md`
- 快速参考: 见 `QUICK_START_PHASE4.md`
- Firebase 问题: 见 `web/SETUP.md`

---

## ✅ 下一步

👉 **立即**: 按顺序完成步骤 1️⃣ → 2️⃣ → 3️⃣

👉 **然后**: 告诉我完成了，我会协助执行自动化步骤 4️⃣-6️⃣

👉 **最后**: 进行测试和 Wes 验收

---

**版本**: M5 Phase 4 Launch v1.0  
**更新时间**: 2026-11-04 22:30

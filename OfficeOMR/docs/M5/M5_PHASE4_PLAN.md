# M5 Phase 4 执行计划

**发起日期**: 2026-07-04  
**状态**: 🚀 进行中  

---

## 阶段目标

将 OfficeOMR 系统完整部署到生产环境，包括：
- ✅ 部署 Cloud Function
- ✅ 部署前端应用
- ✅ 配置自定义域名
- ✅ 启用 CDN
- ✅ Wes 验收测试

---

## 任务清单

### 任务 1: 部署 Firestore Rules 和 Storage Rules

**状态**: ⏳ 待开始  
**预计时间**: 10 分钟  

**步骤**:
```bash
cd D:\chhsban\OfficeOMR

# 部署规则
firebase deploy --only firestore:rules,storage
```

**验证**:
- Firebase Console 显示规则已更新
- `firebase rules:test` 通过所有测试用例

---

### 任务 2: 初始化 Firestore 数据

**状态**: ⏳ 待开始  
**预计时间**: 5 分钟  

**步骤**:
```bash
# 初始化全局配置
python functions/init_data.py

# 验证
firebase firestore:documents --project=officeomr-fe542
```

**验证内容**:
- [ ] `settings/global` 文档已创建
- [ ] `daily_limit_per_teacher` 已设为 100
- [ ] 可从 Cloud Console 读取

---

### 任务 3: 部署 Cloud Function

**状态**: ⏳ 待开始  
**预计时间**: 3-5 分钟  

**步骤**:
```bash
# 部署 Cloud Functions
firebase deploy --only functions

# 验证 (将输出函数 URL)
firebase functions:list
```

**验证**:
- [ ] `recognize_sheet` 函数已部署
- [ ] 状态显示 "OK"
- [ ] URL 为 `https://asia-southeast1-officeomr-fe542.cloudfunctions.net/recognize_sheet`

---

### 任务 4: 配置前端 Firebase SDK

**状态**: ⏳ 待开始  
**预计时间**: 10 分钟  

**步骤**:

1. 获取 Firebase Web 配置:
   ```
   Firebase Console → officeomr-fe542 → Settings (⚙️)
   → Your apps → Web → Copy firebaseConfig
   ```

2. 更新 `web/index.html` (约第 196 行):
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",              // 从 Firebase Console 复制
     authDomain: "officeomr-fe542.firebaseapp.com",
     projectId: "officeomr-fe542",
     storageBucket: "officeomr-fe542.appspot.com",
     messagingSenderId: "601814582794",
     appId: "1:601814582794:web:..."   // 从 Firebase Console 复制
   };
   ```

3. 提交并部署:
   ```bash
   git add web/index.html
   firebase deploy --only hosting
   ```

---

### 任务 5: 配置 OAuth Consent Screen

**状态**: ⏳ 待开始  
**预计时间**: 10 分钟  

**步骤**:

1. 打开 [Google Cloud Console](https://console.cloud.google.com/)
2. 选择项目 `officeomr-fe542`
3. **APIs & Services** → **OAuth consent screen**
4. 选择 **External**（用户类型）
5. 填写应用信息:
   - **App name**: OfficeOMR
   - **User support email**: your@email.com
   - **Developer contact**: your@email.com
6. 点击 **Save and Continue**
7. 跳过 "Scopes" 和 "Test users"（已是外部应用）
8. **Test users** 部分 → 添加:
   - 你的 Gmail
   - Wes 的 Gmail（如有）

---

### 任务 6: 部署前端应用

**状态**: ⏳ 待开始  
**预计时间**: 2 分钟  

**步骤**:
```bash
# 部署前端
firebase deploy --only hosting

# 获取 URL
firebase projects:describe officeomr-fe542
```

**验证**:
- [ ] 部署成功消息显示
- [ ] Hosting URL: `https://officeomr-fe542.firebaseapp.com`

---

### 任务 7: 完整流程测试

**状态**: ⏳ 待开始  
**预计时间**: 15 分钟  

**测试场景**:

#### 7.1 认证测试
- [ ] 打开前端 URL
- [ ] 点击 "Google Sign-In"
- [ ] 使用测试账户登录
- [ ] 显示用户名和邮箱
- [ ] 验证数据库中创建了 `users/{uid}` 记录

#### 7.2 文件上传测试
- [ ] 选择测试答题纸图片（使用 M3 合成样本）
- [ ] 选择版型（T100 或 T060）
- [ ] 点击"开始识别"
- [ ] 显示进度条
- [ ] 5-10 秒后显示结果

#### 7.3 结果显示测试
- [ ] 学号显示正确
- [ ] 准确度显示正确（百分比）
- [ ] 答题数显示正确
- [ ] 状态显示 "已识别"

#### 7.4 结果下载测试
- [ ] 点击"下载结果 JSON"
- [ ] 浏览器下载 JSON 文件
- [ ] 检查 JSON 内容完整

#### 7.5 错误处理测试
- [ ] 上传无效文件 → 显示 400 错误
- [ ] 超过配额 (创建 101 次任务) → 显示 429 错误
- [ ] 验证错误消息为中文

---

### 任务 8: Wes 验收测试

**状态**: ⏳ 待开始  
**预计时间**: 30-60 分钟  

**准备物**:
- [ ] 真实答题纸样本（扫描件）
- [ ] Wes 的 Gmail 账户已添加到 OAuth 测试用户
- [ ] 云端 URL 和登录说明

**测试流程**:

1. **环境验证**
   - [ ] Wes 能访问 https://officeomr-fe542.firebaseapp.com
   - [ ] Google Sign-In 正常工作
   - [ ] 能看到仪表板

2. **识别精度验证**
   - [ ] 上传真实答题纸扫描件
   - [ ] 识别学号是否正确
   - [ ] 识别答案是否与纸张一致
   - [ ] 准确度指标是否合理
   - [ ] 识别时间是否 <10 秒

3. **用户体验反馈**
   - [ ] 界面是否直观
   - [ ] 按钮是否清晰
   - [ ] 错误消息是否有帮助
   - [ ] 流程是否流畅

4. **功能验证**
   - [ ] 能否正确识别多张答题纸
   - [ ] 能否识别不同版型（T100/T060）
   - [ ] 结果是否可下载
   - [ ] 能否退出登录

---

### 任务 9: 配置自定义域名（可选）

**状态**: ⏳ 待开始  
**预计时间**: 20 分钟  

**前置要求**:
- 拥有域名（如 `omr.example.com`）

**步骤**:

1. Firebase Console → Hosting → 添加自定义域名
2. 按提示配置 DNS 记录
3. 等待 SSL 证书自动颁发

**验证**:
- [ ] 自定义域名可访问
- [ ] HTTPS 正常工作

---

### 任务 10: 启用 CDN（可选）

**状态**: ⏳ 待开始  
**预计时间**: 10 分钟  

**说明**:
Firebase Hosting 已默认启用 CDN。无需额外配置。

**验证**:
- [ ] 打开浏览器开发工具
- [ ] 查看响应头: `cache-control`
- [ ] 查看响应头: `age` (表示从 CDN 提供)

---

### 任务 11: 设置监控与告警

**状态**: ⏳ 待开始  
**预计时间**: 15 分钟  

**Firestore 监控**:
1. Cloud Console → Firestore → Monitoring
2. 查看读/写操作计数
3. 设置告警:
   - Reads > 10,000/day → 通知
   - Writes > 5,000/day → 通知
   - 存储 > 1 GB → 通知

**Cloud Storage 监控**:
1. Cloud Console → Cloud Storage → 存储空间
2. 启用成本告警
3. 设置 Storage > 100 MB → 通知

---

### 任务 12: 创建部署文档

**状态**: ⏳ 待开始  
**预计时间**: 20 分钟  

**文档内容**:
1. 系统架构图
2. 部署清单
3. 故障排查指南
4. 维护任务清单

---

## 部署前检查清单

在部署前，确保以下检查项都已完成:

- [ ] 所有代码已提交到 Git
- [ ] `functions/main.py` 已测试（本地运行）
- [ ] `web/index.html` 已测试（浏览器）
- [ ] Firestore Rules 已审查
- [ ] Storage Rules 已审查
- [ ] 环境变量已配置（如需要）
- [ ] Firebase 配额检查（是否接近免费层限制）

---

## 部署后验证清单

部署后，按以下顺序验证:

1. **基础设施**
   - [ ] Cloud Function 已部署
   - [ ] Firestore 规则已生效
   - [ ] Storage 规则已生效
   - [ ] 前端已部署

2. **功能性**
   - [ ] 可登录
   - [ ] 可上传文件
   - [ ] 可识别答题纸
   - [ ] 可下载结果

3. **性能**
   - [ ] 识别时间 <10 秒
   - [ ] 页面加载 <3 秒
   - [ ] 无 JavaScript 错误

4. **安全性**
   - [ ] 未认证用户无法访问
   - [ ] 配额限制生效
   - [ ] 错误消息不泄露敏感信息

---

## 回滚计划

如部署出现问题，可通过以下方式回滚:

```bash
# 回滚前端
firebase hosting:rollback

# 回滚 Cloud Function
firebase deploy --only functions

# 回滚 Firestore Rules
firebase deploy --only firestore:rules
```

---

## 沟通计划

### 部署前
- [ ] 通知 Wes 部署时间表
- [ ] 列出预期的维护窗口

### 部署中
- [ ] 逐步部署（先测试环境，再生产）
- [ ] 监控日志，及时发现问题

### 部署后
- [ ] 通知 Wes 部署完成
- [ ] 提供前端 URL 和使用说明
- [ ] 答疑与反馈收集

---

## 已知风险

### 高风险

1. **Firebase API 限制**
   - 免费层限制较严格
   - 可能需升级到 Blaze 计划
   - **缓解**: 部署前检查配额

2. **冷启动延迟**
   - Cloud Function 首次调用可能 5-10 秒
   - **缓解**: 定期调用保持温热

### 中风险

3. **跨域问题**
   - 前端与 Cloud Function 不同域
   - **缓解**: 已在 Function 中配置 CORS

4. **认证 Token 过期**
   - 用户长时间不活动可能 Token 过期
   - **缓解**: 前端自动重新登录

### 低风险

5. **DNS 传播延迟**
   - 自定义域名可能需要 24 小时生效
   - **缓解**: 可先使用 firebase.app.com 域名

---

## 时间表

| 任务 | 预计时间 | 实际时间 | 状态 |
|------|--------|--------|------|
| 1. 部署 Rules | 10 分钟 | - | ⏳ |
| 2. 初始化数据 | 5 分钟 | - | ⏳ |
| 3. 部署 Function | 5 分钟 | - | ⏳ |
| 4. 配置 SDK | 10 分钟 | - | ⏳ |
| 5. OAuth 配置 | 10 分钟 | - | ⏳ |
| 6. 部署前端 | 2 分钟 | - | ⏳ |
| 7. 流程测试 | 15 分钟 | - | ⏳ |
| 8. Wes 验收 | 60 分钟 | - | ⏳ |
| **合计** | **117 分钟** | - | - |

---

## 关键联系方式

| 角色 | 联系信息 | 职责 |
|------|--------|------|
| Wes | [Email/Phone] | 需求方、验收人 |
| DevOps | [Email] | 基础设施支持 |
| 技术支持 | Firebase Support | 平台问题排查 |

---

## 后续工作（M6+）

部署完成后的计划：

1. **M4 集成**: 真实答题纸扫描测试
2. **M6**: 管理后台与教师账户管理
3. **M7**: 教师工作流集成
4. **监控与优化**: 持续改进识别精度和性能

---

**文档版本**: M5 Phase 4 执行计划 v1.0  
**最后更新**: 2026-07-04  
**下一步**: 执行任务 1 — 部署 Firestore Rules

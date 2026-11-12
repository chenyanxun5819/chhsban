# M6 Stage B - 前端实现启动计划

**状态**: 待启动 (Stage A 已完成)  
**预计开始**: 2026-11-12  
**预计工期**: 2-3 周

---

## 📋 Stage B 目标

Stage B 是前端实现阶段，将构建完整的 Web UI 和用户交互层，满足以下 M6 验收标准：

1. ✅ Super Admin 能够批准/撤销教师和组织
2. ✅ Teacher 能够上传并识别答案纸
3. ✅ 系统能够处理多文件上传
4. ✅ 学生成绩能够导出为 CSV
5. ✅ 权限管理完整且及时生效
6. ✅ 支持多组织隔离
7. ✅ 操作审计日志完整
8. ✅ 界面易用且权限清晰

---

## 🎯 核心模块

### 1️⃣ 身份认证和权限 (高优先级)
**目标**: 实现 Google Sign-In + Custom Claims 流程

**需要完成的工作**:
- [ ] Firebase Google Sign-In SDK 集成
- [ ] 身份验证 UI 组件 (登录/注册/欢迎)
- [ ] Claims 刷新机制 (获取 Super Admin/Teacher 权限)
- [ ] 权限检查 Interceptor/中间件
- [ ] 单点登录流程设计
- [ ] 会话管理 (Token 刷新、退出)

**关键代码位置**:
- `functions/callables_m6.py` - `claimAccess` 函数 (权限分配)
- `web/src/auth/` - 前端认证模块

**参考文档**:
- [PLAN.md 第 9.5 节](../docs/PLAN.md) - 权限管理流程

---

### 2️⃣ Super Admin 管理面板 (高优先级)
**目标**: 实现 Super Admin 的完整管理功能

**需要完成的工作**:
- [ ] 组织管理 UI
  - 创建/编辑/删除组织
  - 配置学号格式、选项数
  - 管理开放版型
  
- [ ] 教师管理 UI
  - 教师批准/撤销
  - 教师启用/禁用
  - 教师详情查看
  
- [ ] 系统设置 UI
  - 每天识别上限
  - 学生数据保留期
  - 单份试卷大小限制
  - 上传文件大小限制
  
- [ ] 权限管理 UI
  - 角色分配
  - 组织隔离验证
  - 权限日志查看

**Firestore 集合**:
- `orgs/{orgId}` - 组织信息
- `allowedUsers/{email}` - 教师和 Super Admin 列表
- `settings/global` - 全局系统设置

**API 接口** (Cloud Functions):
```
POST /claimAccess
  → 获取用户权限

POST /approveTeacher
  → 批准教师 (需 super_admin)

POST /revokeTeacher
  → 撤销教师 (需 super_admin)

POST /setUserActive
  → 启用/禁用用户 (需 super_admin)

POST /upsertOrg
  → 创建/更新组织 (需 super_admin)

POST /updateGlobalSettings
  → 更新系统设置 (需 super_admin)
```

---

### 3️⃣ Teacher Dashboard (高优先级)
**目标**: 实现教师的核心工作流程

**需要完成的工作**:
- [ ] Dashboard 主界面
  - 今日使用统计
  - 待处理任务
  - 最近扫描结果
  
- [ ] 答案纸上传和识别
  - 文件选择和拖拽上传
  - 多文件批量上传
  - 进度条显示
  - 错误处理和重试
  
- [ ] 扫描结果查看
  - 按扫描日期分组
  - 结果详情预览
  - 识别结果统计
  - 异常情况标记
  
- [ ] 成绩导出
  - CSV 导出功能
  - 按科目/试卷分类
  - 自定义导出格式
  - 批量导出

**Firestore 集合**:
- `jobs/{jobId}` - 扫描任务
- `usage/{uid}_{yyyymmdd}` - 使用统计

**API 接口**:
```
POST /recognize_sheet
  → 上传并识别答案纸 (需 teacher + active=true)

GET /getJobs
  → 获取用户的所有任务

GET /getUsage
  → 获取使用统计
```

---

### 4️⃣ 结果管理和导出 (中优先级)
**目标**: 实现数据导出和报告生成

**需要完成的工作**:
- [ ] 结果数据结构
  - JSON 格式定义
  - 分数计算逻辑
  - 异常检测逻辑
  
- [ ] CSV 导出
  - 模板设计
  - 数据清洗
  - 编码处理 (UTF-8)
  
- [ ] 报告生成
  - 识别统计报告
  - 错误率分析
  - 性能指标

**参考**:
- [PLAN.md 第 10.3 节](../docs/PLAN.md) - 数据输出格式

---

### 5️⃣ 组织隔离验证 (中优先级)
**目标**: 确保多组织数据完全隔离

**需要完成的工作**:
- [ ] 组织边界检查
  - 教师只能访问自己组织的数据
  - 跨组织访问拦截
  
- [ ] 权限过滤
  - Firestore Rules 双重验证
  - Cloud Functions 访问控制
  
- [ ] 测试用例
  - 跨组织访问拒绝测试
  - 权限边界测试

**参考**:
- [firestore.rules](../firestore.rules) - 权限规则定义

---

### 6️⃣ 操作审计日志 (中优先级)
**目标**: 记录所有重要操作

**需要完成的工作**:
- [ ] 审计日志集合设计
- [ ] 重要操作记录
  - 用户批准/撤销
  - 权限变更
  - 大容量上传
  - 导出操作
  
- [ ] 审计日志查看 UI (仅 Super Admin)
- [ ] 审计报告生成

---

## 🏗️ 前端技术栈选择

推荐选项:

### 选项 1: React + TypeScript (推荐)
**优点**:
- 生态成熟，库丰富
- TypeScript 类型安全
- 社区活跃

**技术栈**:
```
React 18.x
├─ TypeScript
├─ React Router (路由)
├─ TanStack Query (数据获取)
├─ Firebase SDK
├─ Tailwind CSS (样式)
├─ ShadcnUI (组件库)
└─ React Hook Form (表单)
```

### 选项 2: Vue 3 + TypeScript
**优点**:
- 学习曲线平缓
- 官方工具完善
- 代码更紧凑

**技术栈**:
```
Vue 3
├─ TypeScript
├─ Vue Router
├─ Pinia (状态)
├─ Firebase SDK
├─ Tailwind CSS
└─ Vite (构建)
```

### 选项 3: SvelteKit
**优点**:
- 编写最少代码
- 性能最优
- 现代开发体验

---

## 📊 工作分解结构 (WBS)

```
M6 Stage B 前端实现
├─ Phase B1: 基础设施 (1 周)
│  ├─ 选择前端框架和工具链
│  ├─ 项目结构初始化
│  ├─ Firebase SDK 集成
│  ├─ 开发环境配置
│  └─ 构建和部署流程
│
├─ Phase B2: 认证和权限 (4-5 天)
│  ├─ Google Sign-In 集成
│  ├─ 权限检查拦截器
│  ├─ 登录/欢迎界面
│  └─ 会话管理
│
├─ Phase B3: Super Admin 面板 (1 周)
│  ├─ 组织管理 UI
│  ├─ 教师管理 UI
│  ├─ 系统设置 UI
│  └─ 权限管理 UI
│
├─ Phase B4: Teacher Dashboard (1 周)
│  ├─ Dashboard 主界面
│  ├─ 上传和识别功能
│  ├─ 结果查看界面
│  └─ 成绩导出功能
│
├─ Phase B5: 组织隔离和审计 (4-5 天)
│  ├─ 组织边界检查
│  ├─ 审计日志 UI
│  └─ 权限测试
│
└─ Phase B6: 测试和优化 (1 周)
   ├─ 单元测试
   ├─ 集成测试
   ├─ 端到端测试
   ├─ 性能优化
   └─ 安全审计
```

---

## 📚 参考资源

### Firebase 文档
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Google Sign-In for Web](https://developers.google.com/identity/protocols/oauth2)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firestore Web SDK](https://firebase.google.com/docs/firestore/quickstart)

### UI 设计参考
- [Google Material Design](https://material.io/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [ShadcnUI 组件库](https://ui.shadcn.com/)

### 相关文档
- [PLAN.md](../docs/PLAN.md) - 详细需求规格
- [firestore.rules](../firestore.rules) - 权限定义
- [callables_m6.py](../functions/callables_m6.py) - API 定义

---

## 🧪 验收标准

Stage B 完成时，需要满足以下验收标准:

1. **身份认证**
   - [ ] Super Admin 能成功登录
   - [ ] Teacher 能成功登录
   - [ ] 权限声明正确设置

2. **Super Admin 功能**
   - [ ] 能创建/编辑组织
   - [ ] 能批准/撤销教师
   - [ ] 能启用/禁用用户
   - [ ] 能更新系统设置

3. **Teacher 功能**
   - [ ] 能上传答案纸
   - [ ] 能查看识别结果
   - [ ] 能导出成绩为 CSV
   - [ ] 能查看使用统计

4. **权限控制**
   - [ ] 跨组织访问被拒绝
   - [ ] Super Admin 能访问所有组织
   - [ ] 禁用用户立即失效
   - [ ] 权限规则无绕过

5. **用户体验**
   - [ ] 界面响应时间 < 2s
   - [ ] 错误信息清晰
   - [ ] 操作可撤销或确认
   - [ ] 移动设备友好

6. **数据导出**
   - [ ] CSV 格式正确
   - [ ] 字符编码正确 (UTF-8)
   - [ ] 没有遗漏字段

---

## 📞 沟通和反馈

- **项目负责人**: Wes
- **反馈频率**: 每周一次检查
- **问题上报**: GitHub Issues
- **文档维护**: 此文档

---

**准备就绪！** 🚀

所有 Stage A 的基础设施已部署完毕。
现在可以开始 Stage B 的前端开发工作。

---

*计划制定于: 2026-11-11*  
*工程师: Copilot*

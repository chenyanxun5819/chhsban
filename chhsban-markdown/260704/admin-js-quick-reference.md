# OfficeOMR M6 Admin.js 快速参考指南

## 📚 API 参考

### AdminPage 类

```javascript
// 初始化（由 app.js 调用）
const adminPage = new AdminPage(container, authFlow, firestore);
await adminPage.render();

// 主要公开方法
adminPage.switchTab(tabName);      // 切换标签页
adminPage.handleLogout();          // 登出
```

### 内部方法架构

| 类别 | 方法 | 说明 |
|-----|------|------|
| **数据加载** | `loadOrgs()` | 加载组织列表 |
| | `loadTeachers()` | 加载教师列表 |
| | `loadSettings()` | 加载系统设置 |
| | `loadUsage()` | 加载用量统计 |
| **表单操作** | `showAddOrgModal()` | 显示新增组织对话框 |
| | `showAddTeacherModal()` | 显示新增教师对话框 |
| | `showEditTeacherModal(uid)` | 显示编辑教师对话框 |
| | `deleteTeacher(uid)` | 删除教师 |
| | `saveSettings()` | 保存系统设置 |
| **UI 工具** | `createModal(title, content)` | 创建模态框 |
| | `closeModal(modal)` | 关闭模态框 |
| | `showError(msg)` | 显示错误提示 |
| | `showSuccess(msg)` | 显示成功提示 |
| | `switchTab(name)` | 切换标签页 |
| | `handleLogout()` | 处理登出 |

---

## 🗄️ Firestore 数据结构

### 1. Organizations (orgs 集合)

```javascript
{
  id: "org123",
  name: "示例学校",
  code: "XS",
  studentIdDigits: 8,
  studentIdPrefix: "2024",
  optionCount: 4,
  allowedTemplates: ["T100", "T060"],
  status: "active" | "inactive"
}
```

### 2. Teachers (allowedUsers 集合)

```javascript
{
  id: "teacher@example.com",
  email: "teacher@example.com",
  orgId: "org123",
  role: "teacher",
  status: "active" | "inactive",
  dailyQuota: 100,
  isActive: true
}
```

### 3. Settings (settings 集合)

```javascript
{
  // 文档 ID: "global"
  defaultDailySheetsPerUser: 100,
  studentDataRetentionHours: 72,
  maxPagesPerUpload: 500,
  maxFileMB: 100,
  maxExamsPerTeacher: 50,
  maxPaperFileMB: 50
}
```

### 4. Usage (usage 集合)

```javascript
{
  // 文档 ID 格式: "{uid}_{yyyymmdd}"
  // 例如: "teacher@example.com_20261104"
  sheetsUsed: 25,
  dailyLimit: 100
}
```

---

## 🎯 常见操作代码片段

### 新增组织
```javascript
const orgData = {
  name: "清华大学",
  code: "THU",
  studentIdDigits: 10,
  studentIdPrefix: "2024",
  optionCount: 4,
  allowedTemplates: ["T100"],
  status: "active"
};
await this.firestore.collection('orgs').add(orgData);
```

### 编辑教师配额
```javascript
const uid = "teacher@example.com";
const updateData = {
  status: "active",
  dailyQuota: 150
};
await this.firestore.collection('allowedUsers').doc(uid).update(updateData);
```

### 查询今日用量
```javascript
const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const docId = `${uid}_${today}`;
const usage = await this.firestore.collection('usage').doc(docId).get();
const data = usage.data() || { sheetsUsed: 0, dailyLimit: 100 };
```

### 修改系统设置
```javascript
const updates = {
  defaultDailySheetsPerUser: 150,
  maxPagesPerUpload: 600
};
await this.firestore.collection('settings').doc('global').update(updates);
```

---

## 🧪 测试检查清单

### 功能测试
- [ ] 组织列表能否加载
- [ ] 能否创建新组织
- [ ] 教师列表能否加载
- [ ] 能否添加新教师
- [ ] 能否编辑教师信息
- [ ] 能否删除教师
- [ ] 能否修改系统设置
- [ ] 能否看到今日用量统计
- [ ] 用量百分比是否正确计算

### UI 测试
- [ ] 所有 5 个标签页能否切换
- [ ] 模态框能否正常关闭（Esc/背景/按钮）
- [ ] 表单验证能否工作
- [ ] 成功/失败消息是否显示
- [ ] 加载动画是否出现
- [ ] 布局在不同屏幕尺寸是否适配

### 网络测试
- [ ] 网络缓慢时能否显示加载状态
- [ ] 网络中断时能否显示错误提示
- [ ] 权限不足时能否提示错误
- [ ] 重复提交时能否防止

---

## 🚨 错误代码参考

| 错误 | 原因 | 解决方案 |
|-----|------|--------|
| `PERMISSION_DENIED` | 无管理员权限 | 检查 Firestore 规则或用户权限 |
| `NOT_FOUND` | 集合/文档不存在 | 检查 Firestore 数据库初始化 |
| `INVALID_ARGUMENT` | 参数格式错误 | 检查表单验证规则 |
| `UNAUTHENTICATED` | 未登录 | 刷新页面，重新登录 |
| `DEADLINE_EXCEEDED` | 请求超时 | 检查网络连接 |

---

## 🔐 安全说明

### 前端验证（已实现）
✅ 表单必填项检查  
✅ 邮箱格式验证  
✅ 代号长度和字符检查  
✅ 数字范围验证  

### 后端验证（Firestore 规则）
⚠️ 需要在 Firestore 控制台配置：
- 仅允许 admin 写入 orgs
- 仅允许 admin 写入/更新 allowedUsers
- 仅允许 admin 更新 settings/global
- 用户仅能读取自己的 usage 数据

### 敏感数据
✅ 密码存储在 Firebase Auth（不在 Firestore）  
✅ 邮箱只读显示（防止修改）  
✅ 操作日志应由后端记录

---

## 📱 响应式设计

布局使用 CSS Grid 和 Flexbox：
- **桌面** (1200px+): 3 列表格
- **平板** (768px-1199px): 2 列表格
- **手机** (<768px): 1 列表格

所有模态框都支持移动设备视口。

---

## ⚡ 性能优化建议

### 现状
- 一次加载所有组织/教师
- 用量统计仅显示今日数据

### 改进方向
1. **分页加载**: 教师列表添加分页（每页 20）
2. **虚拟滚动**: 大数据集使用虚拟滚动库
3. **缓存组织**: 减少重复查询
4. **节流刷新**: 限制 3 秒内最多一次刷新

---

## 📖 代码组织

```
admin.js (726 行)
├── 类定义 & 构造器 (15 行)
├── render() - 主 UI 渲染 (95 行)
├── 数据加载方法 (197 行)
│   ├── loadOrgs()
│   ├── loadTeachers()
│   ├── loadSettings()
│   └── loadUsage()
├── 表单操作方法 (312 行)
│   ├── showAddOrgModal()
│   ├── showAddTeacherModal()
│   ├── showEditTeacherModal()
│   ├── deleteTeacher()
│   └── saveSettings()
└── UI 工具方法 (100 行)
    ├── createModal()
    ├── closeModal()
    ├── showError()
    ├── showSuccess()
    ├── switchTab()
    └── handleLogout()
```

---

## 🔗 相关文件

| 文件 | 用途 | 依赖关系 |
|-----|------|--------|
| app.js | 路由和初始化 | 调用 AdminPage |
| auth-flow.js | 认证流程 | AdminPage 调用 logout() |
| index.html | UI 容器 | 包含 app-container div |
| teacher.js | 教师页面 | 参考实现 |
| config.js | Firebase 配置 | 全局使用 |

---

## 💬 常见问题

**Q: 如何添加新的系统设置参数？**  
A: 在 `loadSettings()` 方法的 `fields` 数组中添加新对象，然后在 Firestore settings/global 文档中添加该字段。

**Q: 如何修改模态框样式？**  
A: 编辑 `createModal()` 方法中的 CSS 样式，或在 style.css 中添加全局 .modal-* 类。

**Q: 如何添加教师批量导入？**  
A: 创建新方法 `showImportTeachersModal()`，处理 CSV 文件上传和数据插入。

**Q: 如何跟踪管理员操作？**  
A: 创建 Firestore `adminLogs` 集合，在每次 CRUD 操作后记录。

---

**最后更新**: 2026-07-04  
**版本**: 1.0.0

# 方案 C：完全 Cloudflare Worker 部署指南

## 🎯 总体架构

```
SMS API (sms.chhsban.edu.my)
    ↓
Cloudflare Worker
    ↓ (读取 Excel JSON)
KV 存储
    ↓
Web 前端 + 本地界面
```

## 📋 部署步骤

### 第 1 步：准备 Excel 数据

**问题：** Worker 中无法直接解析 Excel 文件，需要预处理

**解决方案：** 在本地运行一次性脚本，将 Excel 转换为 JSON 并上传到 KV

```python
# local_excel_to_kv.py
import json
from openpyxl import load_workbook
import requests

# 读取 Excel
wb = load_workbook('2026_hostelList.xlsx')
ws = wb['20260530_103431']

# 提取数据（列 C = studentID，列 F = Gender/Boarding）
excel_map = {}
for row in ws.iter_rows(min_row=2, max_row=2687, values_only=True):
    student_id = str(row[2])  # 列 C
    gender_boarding = row[5]  # 列 F
    if student_id and gender_boarding:
        excel_map[student_id] = gender_boarding

# 上传到 KV
url = "https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{NAMESPACE_ID}/values/excel_gender_boarding_map"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

response = requests.put(
    url,
    headers=headers,
    json=excel_map
)

print(f"✅ 已上传 {len(excel_map)} 条记录到 KV")
```

**运行：**
```bash
python local_excel_to_kv.py
```

---

### 第 2 步：在 Cloudflare 创建 Worker

**2.1 进入 Cloudflare Dashboard**
- 登录 https://dash.cloudflare.com
- 选择你的账户
- 左侧菜单 → Workers → 概览

**2.2 创建新 Worker**
- 点击 "创建应用程序"
- 选择 "创建 Worker"
- 命名：`student-sync`
- 点击部署

**2.3 复制代码**
- 回到 Worker 编辑页面
- 替换 `wrangler.toml` 中的内容（下面会给）
- 复制 `cloudflare_worker.js` 的全部代码

---

### 第 3 步：配置 wrangler.toml

创建文件：`wrangler.toml`

```toml
name = "student-sync"
type = "service"
account_id = "你的-ACCOUNT-ID"
workers_dev = true
routes = []
zones = []
compatibility_date = "2024-01-01"

# KV 命名空间绑定
[[kv_namespaces]]
binding = "STUDENT_KV"
id = "你的-NAMESPACE-ID"
preview_id = "你的-NAMESPACE-PREVIEW-ID"

# R2 绑定（用于 Excel 文件）
[[r2_buckets]]
binding = "STUDENT_R2"
bucket_name = "student-data"
preview_bucket_name = "student-data-preview"

# 环境变量
[env.production]
vars = { SMS_API = "https://sms.chhsban.edu.my" }

# Cron 触发器：每天 UTC 3:00（对应北京时间 11:00）
[[triggers.crons]]
crons = ["0 3 * * *"]
```

**获取 ACCOUNT_ID：**
- Dashboard → 账户 → 概览
- 右下角 "API"
- 找到 "Account ID"

**获取 NAMESPACE_ID：**
- 左侧 → Workers → KV
- 找到你创建的命名空间
- 复制 ID

---

### 第 4 步：上传到 Cloudflare

**使用 Wrangler CLI：**

```bash
# 1. 安装 wrangler
npm install -g @cloudflare/wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 部署 Worker
wrangler publish

# 4. 查看日志
wrangler tail

# 5. 测试 Worker
curl -X POST https://student-sync.your-subdomain.workers.dev
```

或者使用 **Cloudflare Dashboard UI：**
- Workers → student-sync → 编辑
- 粘贴 JavaScript 代码
- 保存并部署

---

### 第 5 步：配置 Cron 触发器

**在 Cloudflare Dashboard 中：**

1. Workers → student-sync → 设置 → 触发器
2. 添加 Cron 触发器
3. 设置：`0 3 * * *`（每天 UTC 3:00）
4. 保存

**时区转换：**
- UTC 3:00 = 北京时间 11:00
- 如需改变时间，修改 Cron 表达式

---

### 第 6 步：监控和调试

**查看执行日志：**
```bash
wrangler tail
```

**查看上次同步错误：**
- KV 中有 key `sync_error_log`
- 包含错误详情和时间戳

**手动测试：**
```bash
curl -X POST https://student-sync.your-subdomain.workers.dev
```

---

## 🔧 需要你提供的信息

要完成部署，我需要：

1. **SMS 系统的公网 API 地址**
   ```
   当前使用的是 sms.chhsban.edu.my 吗？
   还是需要 VPN 才能访问？
   ```

2. **Cloudflare 账户 ID**
   ```
   从 Dashboard 获取
   ```

3. **KV 命名空间 ID**
   ```
   你已经创建了，ID 是：9d870e2344c84c74a1ed2f2851c93408
   ```

4. **R2 Bucket 名称**
   ```
   打算叫什么名字？
   ```

---

## 📊 对比：本地 vs Worker

| 方面 | 本地脚本 | Worker |
|------|--------|--------|
| 设置难度 | ⭐ 简单 | ⭐⭐⭐ 中等 |
| 自动执行 | ⚠️ 需要定时任务或开机 | ✅ 完全自动 |
| 成本 | $0 | $0（免费额度） |
| 依赖 | 本地机器持续开启 | 无依赖 |
| 性能 | 较快 | 极快（分布式） |
| 可靠性 | 取决于机器运行时间 | 99.99% 可用性 |

---

## ⚠️ 已知限制

1. **Excel 处理**：Worker 无法直接解析 Excel，需预先转换为 JSON
2. **内网 SMS 访问**：如果 SMS 只在内网，需要 Cloudflare Tunnel
3. **超时限制**：Worker 执行最多 30 秒（你的流程约 2-3 分钟）

---

## 🎯 下一步

请告诉我：

1. SMS 是否可从 `sms.chhsban.edu.my` 公网访问？
2. Cloudflare Account ID 是什么？
3. 需要我在 Dashboard UI 中完成配置，还是用 CLI？

然后我可以帮你完成最后的部署！

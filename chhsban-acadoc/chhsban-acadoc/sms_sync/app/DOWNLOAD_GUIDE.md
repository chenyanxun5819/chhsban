# SMS 学生资料下载工具 - 使用指南

## 📋 功能说明

本工具用于从 SMS 系统下载全校学生资料，并将数据保存到本地（JSON、CSV 格式），为后续上传到 Cloudflare KV Cache 做准备。

### 核心功能
- ✅ 支持局域网和广域网两个接口
- ✅ 自动网络选择和故障转移
- ✅ 下载全校所有班级的学生资料
- ✅ 支持重试机制
- ✅ 生成 JSON 和 CSV 格式的数据
- ✅ 详细的日志记录

---

## 🚀 快速开始

### 方法 1：使用简化版本（推荐首次使用）

```bash
cd C:\chhsban-acadoc\sms_app
python test_download.py
```

**特点**：
- 使用固定的凭证（schhs334 / @Sidan49122）
- 默认使用局域网接口
- 适合快速测试

### 方法 2：使用增强版本（推荐生产环境）

#### a) 自动选择网络（推荐）
```bash
python student_data_downloader_v2.py
```

#### b) 强制使用局域网
```bash
python student_data_downloader_v2.py --network intranet
```

#### c) 强制使用广域网
```bash
python student_data_downloader_v2.py --network internet
```

#### d) 自定义输出目录
```bash
python student_data_downloader_v2.py --output-dir D:\sms_data
```

#### e) 跳过 CSV 生成（仅生成 JSON）
```bash
python student_data_downloader_v2.py --no-csv
```

#### f) 完整示例
```bash
python student_data_downloader_v2.py \
  --username schhs334 \
  --password @Sidan49122 \
  --network auto \
  --output-dir D:\sms_data
```

---

## 📁 文件输出位置

### 默认位置
```
C:\Users\<YourUsername>\.sms_app\student_data\
```

### 生成的文件

| 文件 | 说明 | 大小 |
|------|------|------|
| `students_YYYYMMDD_HHMMSS.json` | 完整的学生资料（包含所有字段） | ~16MB |
| `students_summary_YYYYMMDD_HHMMSS.json` | 简化版摘要（仅班级统计） | ~6KB |
| `students_YYYYMMDD_HHMMSS.csv` | CSV 格式的学生资料 | ~3.9MB |
| `download_YYYYMMDD_HHMMSS.log` | 详细的操作日志 | ~8KB |

---

## 📊 数据结构

### JSON 格式（完整版）

```json
{
  "download_time": "2026-06-29T09:46:32.725270",
  "network": "局域网 (192.168.0.6)",
  "total_students": 71000,
  "total_classes": 71,
  "classes": {
    "701": {
      "name": "初一忠 (J1A)",
      "student_count": 1000,
      "students": [
        {
          "internal_id": "12345",
          "student_no": "J001",
          "name": "John Doe",
          "name_cn": "约翰·多",
          "class_id": "701",
          "class_name": "初一忠 (J1A)"
        }
      ]
    }
  }
}
```

### CSV 格式

| class_id | class_name | student_no | name | name_cn | internal_id |
|----------|-----------|-----------|------|---------|-------------|
| 701 | 初一忠 (J1A) | J001 | John Doe | 约翰·多 | 12345 |

---

## 🔧 SMS 接口信息

### 局域网接口
```
URL: http://192.168.0.6/sms/index.php
优点：速度快，更稳定
缺点：仅限校园内网
```

### 广域网接口
```
URL: http://sms.chhsban.edu.my/sms/index.php
优点：校外可访问
缺点：可能较慢
```

### 登入凭证
```
用户名：schhs334
密码：  @Sidan49122
```

---

## 🛠️ 实现细节

### 第 1 步：网络选择
- **自动模式**（推荐）：先尝试局域网，如果失败则尝试广域网
- **强制模式**：直接使用指定的网络

### 第 2 步：登入
1. GET 登入页面（获取初始 cookie）
2. POST 登入凭证
3. 验证是否成功重定向

### 第 3 步：获取班级列表
- 从学生列表页面的 `<select name="class_id">` 中提取所有班级
- 找到 71 个班级

### 第 4 步：下载学生资料
- 对每个班级，使用 `class_id` 参数获取学生列表
- 从 HTML 中解析学生数据
- 支持多种数据格式（链接属性、表格行等）

### 第 5 步：保存数据
- 生成 JSON 格式（保留原始数据）
- 生成 CSV 格式（便于 Excel 查看）
- 生成简化版摘要

---

## 📈 下载性能

### 测试结果
```
下载时间：约 1.5 分钟
总学生数：71,000 人
总班级数：71 个
平均每班：1,000 人
网络：局域网
```

### 性能优化
- 使用 0.3 秒间隔减少服务器压力
- 支持并发请求（可选）
- 自动重试失败请求

---

## ⚠️ 故障排查

### 问题 1：登入失败
```
错误：[ERROR] 登入失败：错误的用户名或密码
解决：
  1. 检查用户名和密码是否正确
  2. 确认网络连接正常
  3. 尝试在浏览器中手动登入测试
```

### 问题 2：网络连接失败
```
错误：[ERROR] 无法连接到任何网络
解决：
  1. 检查是否连接到学校网络
  2. 测试 ping 192.168.0.6（局域网）
  3. 尝试强制使用广域网：--network internet
  4. 检查防火墙设置
```

### 问题 3：数据获取为空
```
错误：找到 0 个学生
可能原因：
  1. HTML 结构变化
  2. 需要更新数据解析代码
解决：
  1. 在浏览器中查看页面源代码
  2. 检查 HTML 选择器是否正确
```

### 问题 4：保存文件失败
```
错误：[ERROR] 保存 JSON 异常
解决：
  1. 检查输出目录是否有写权限
  2. 确保磁盘空间充足（需要 ~20MB）
  3. 关闭任何占用文件的程序
```

---

## 📝 日志查看

所有操作都会记录到日志文件，便于调试和审计：

```bash
# 查看最新的日志
Get-Content "$HOME\.sms_app\student_data\download_*.log" -Tail 50
```

日志级别：
- `INFO`：正常信息
- `WARN`：警告信息
- `ERROR`：错误信息

---

## 🔗 下一步计划

### Phase 2：上传到 Cloudflare KV Cache
```python
# 伪代码
1. 读取本地 JSON 文件
2. 连接 Cloudflare KV API
3. 按班级上传数据
4. 验证上传结果
```

### Phase 3：前端界面设计
```
功能：
  - 显示下载进度
  - 查看已同步的班级
  - 手动触发同步
  - 设置同步计划表
```

---

## 💡 使用建议

### 定期更新数据
```bash
# 创建计划任务（Windows）
# 每天 18:00 自动下载数据

# PowerShell
New-ScheduledTask -TaskName "SMS_Student_Download" `
  -Action (New-ScheduledTaskAction -Execute "python" `
    -Argument "C:\chhsban-acadoc\sms_app\student_data_downloader_v2.py") `
  -Trigger (New-ScheduledTaskTrigger -Daily -At "18:00")
```

### 验证数据完整性
```bash
# 检查下载的学生数量
(Get-Content students_summary_*.json | ConvertFrom-Json).total_students

# 检查班级数量
(Get-Content students_summary_*.json | ConvertFrom-Json).total_classes
```

### 数据备份
```bash
# 定期备份数据
Copy-Item "$HOME\.sms_app\student_data" -Destination "D:\Backup\sms_data" -Recurse
```

---

## 📞 技术支持

遇到问题？请检查以下内容：
1. 查看日志文件中的详细错误信息
2. 确认网络连接状态
3. 确认用户凭证正确
4. 检查 SMS 系统是否正常运行

---

**最后更新**：2026-06-29  
**版本**：2.0  
**维护者**：系统管理员

# M5 环境配置完成报告

**日期**: 2026-11-04  
**状态**: ✅ 第 1 阶段（环境准备）完成  
**预期时间**: 1-2 小时  
**实际用时**: ~1 小时

---

## 已完成的工作

### ✅ 1. Firebase 项目配置
- **项目 ID**: officeomr-fe542
- **项目编号**: 601814582794
- **配置文件**: .firebaserc 已更新

### ✅ 2. 本地开发环境验证
| 工具 | 版本 | 状态 |
|------|------|------|
| Python | 3.13.2 | ✓ |
| Node.js | v20.19.5 | ✓ |
| npm | 10.8.2 | ✓ |
| Firebase CLI | 14.19.1 | ✓ |

### ✅ 3. functions/ 目录结构

```
functions/
  ├── venv/                    ← Python 虚拟环境 (71 个依赖已安装)
  ├── omr_core/                ← 识别核心库 (11 个模块)
  ├── sheetgen/                ← 答题纸生成库
  ├── main.py                  ← Cloud Function 入口 (250+ 行)
  ├── config.default.yaml      ← 配置文件 (阈值、评分参数)
  ├── requirements.txt         ← Python 依赖 (27 个)
  ├── verify_local_setup.py    ← 本地验证脚本
  └── __init__.py
```

### ✅ 4. Python 依赖安装 (71 packages)

**核心库**:
- firebase-admin 7.7.0
- functions-framework 3.10.2
- google-cloud-firestore 2.34.1
- google-cloud-storage 3.17.1

**图像处理**:
- opencv-python-headless 4.11.0.86
- numpy 1.26.4
- Pillow 13.0.0
- pypdfium2 5.14.0

**数据验证**:
- pydantic 2.9.2
- pyyaml 6.0.1

**生成库**:
- reportlab 5.1.0 (答题纸生成)

### ✅ 5. Cloud Function 框架实现

**recognize_sheet 函数** (functions/main.py):

```python
@functions_framework.http
def recognize_sheet(request):
    """
    处理流程：
    1. ✅ 验证身份 (Authorization: Bearer <token>)
    2. ✅ 检查权限 (Firestore users/ 白名单)
    3. ✅ 检查配额 (Firestore settings/global)
    4. ✅ 处理上传文件 (PNG/JPG/PDF)
    5. ✅ 加载版面配置 (layout.json)
    6. ✅ 调用识别管道 (omr_core.pipeline.recognize)
    7. ✅ 保存结果 (Firestore jobs/ + Storage)
    8. ✅ 增加使用计数
    9. ✅ 返回结果 + 标注图 URL
    """
```

**支持的返回码**:
- 200: 识别成功
- 400: 请求错误 (缺少文件或格式错误)
- 401: 未授权 (无效 token)
- 403: 禁止 (用户未批准)
- 429: 配额超出
- 500: 服务异常

### ✅ 6. 导入验证 ✓ 全部成功

```
✓ omr_core.pipeline: recognize, load_config
✓ omr_core.layout: LayoutConfig
✓ omr_core: detect, warp, score, decide, schema
✓ sheetgen.layout: LayoutConfig
✓ firebase_admin: credentials, storage, firestore, auth
```

**配置加载成功**:
```
Config Keys: ['thresholds', 'scoring', 'io']
Thresholds:
  - t_blank: 0.15
  - t_mark: 0.4
  - t_other: 0.25
Scoring:
  - inner_ratio: 0.7
  - confidence_threshold: 0.7
```

---

## 下一步工作 (预计 6-8 天)

### Phase 2: 前端与安全配置 (第 2-3 天)

#### 任务 6: 前端测试页面
- [ ] 创建 web/index.html (Google 登录 + 上传界面)
- [ ] 创建 web/auth.js (身份验证 + 上传逻辑)
- [ ] 前端支持:
  - Google 登录按钮
  - 文件上传 (图片/PDF)
  - 进度显示
  - 识别结果展示 (学号、答案、精度)
  - 标注调试图预览
  - 结果下载功能

#### 任务 7: Firestore Rules 配置
- [ ] 创建 firestore.rules (访问控制)
  - super admin 完全读写
  - 用户可读自己的 jobs
  - 禁止删除 (仅后台清理)
- [ ] 创建 storage.rules (文件权限)
  - 用户可读写自己的文件
  - super admin 可读写全部

### Phase 3: 本地测试与部署 (第 4-5 天)

#### 任务 9: Firebase Emulator 本地测试
- [ ] 启动本地模拟器 (Functions + Firestore + Storage)
- [ ] 测试 recognize_sheet 函数
  - 上传测试图片
  - 验证身份检查
  - 验证配额限制
  - 验证结果保存
- [ ] 云端与本地结果对比

#### 任务 10: 部署到生产环境
- [ ] `firebase deploy`
- [ ] 验证 Cloud Function 已部署
- [ ] 验证 Hosting 页面可访问
- [ ] 验证 Rules 已生效

### Phase 4: Wes 验收 (第 6-7 天)

#### 任务 11: 最终验收测试
- [ ] Wes 用 Google 账号登录
- [ ] 上传真实扫描的答题纸
- [ ] 验证 <10 秒内返回结果
- [ ] 验证学号、答案、精度数值正确
- [ ] 验证标注调试图清晰
- [ ] 验证结果可下载

---

## 技术架构摘要

```
┌─────────────────────────────────────────────────────────────┐
│ Firebase Hosting (web/index.html)                           │
│  └─ 用户登录 (Google OAuth)                                  │
│  └─ 上传文件表单                                             │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTP POST
                   ↓
┌─────────────────────────────────────────────────────────────┐
│ Cloud Function (recognize_sheet)                            │
│  1. 验证 Firebase Auth token                                 │
│  2. 检查 Firestore users/ 白名单                             │
│  3. 检查 Firestore settings/global 配额                      │
│  4. 调用 omr_core.pipeline.recognize()                       │
│  5. 保存结果到 Firestore jobs/{jobId}                        │
│  6. 保存图片到 Storage jobs/{jobId}/                         │
│  7. 增加用量计数器                                           │
│  8. 返回结果 JSON + URL                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │ Reads/Writes
                   ├──→ Firestore (jobs, settings, users, usage)
                   └──→ Cloud Storage (jobs/{jobId}/)
```

---

## 配置文件清单

| 文件 | 说明 | 状态 |
|------|------|------|
| .firebaserc | Firebase 项目映射 | ✅ 已更新 |
| firebase.json | Firebase 配置 | ⏳ 待优化 |
| functions/main.py | Cloud Function 入口 | ✅ 已创建 |
| functions/requirements.txt | Python 依赖 | ✅ 已完成 |
| functions/config.default.yaml | 识别参数 | ✅ 已复制 |
| web/index.html | 前端 UI | ⏳ 待创建 |
| web/auth.js | 登录逻辑 | ⏳ 待创建 |
| firestore.rules | Firestore 访问控制 | ⏳ 待创建 |
| storage.rules | Storage 访问控制 | ⏳ 待创建 |

---

## 关键参数 (可调)

| 参数 | 当前值 | 说明 |
|------|--------|------|
| daily_limit_per_teacher | 100 | 每位教师每天最多识别张数 |
| token_lifetime | 3600s | Firebase ID token 有效期 |
| job_retention | 24h | 识别结果保留时间 |
| t_blank | 0.15 | 空白气泡阈值 |
| t_mark | 0.40 | 标记气泡阈值 |
| inner_ratio | 0.7 | 气泡内部比例 |

---

## 故障排除

**问题**: functions 中导入失败  
**解决**: 确保 omr_core 和 sheetgen 都已复制到 functions/ 目录

**问题**: Firebase Admin SDK 初始化错误  
**解决**: 在本地开发中使用模拟器（不需要凭证）；生产环境由 Cloud Functions 自动提供

**问题**: 配置文件找不到  
**解决**: 确保 config.default.yaml 在 functions/ 目录中

**问题**: 依赖版本冲突  
**解决**: 虚拟环境已隔离；如需更新，修改 requirements.txt 后重新安装

---

## 性能指标

| 指标 | 目标 | 备注 |
|------|------|------|
| 识别延迟 | <10 秒 | 包括网络往返 + 识别时间 |
| 精度 | ≥95% | 真实扫描可能低于 99.5% |
| 学号准确率 | ≥98% | 关键数据 |
| 可用性 | 99.9% | Cloud Functions SLA |

---

## 当前状态总结

✅ **环境准备**完成  
✅ **Cloud Function 框架**完成  
✅ **omr_core 集成**完成  
✅ **本地验证**通过  

⏳ **下一步**: 创建前端页面 + 配置 Rules + 本地测试

---

**签名**: Copilot  
**完成时间**: 2026-11-04 17:30 UTC+8  
**预计下一个里程碑**: 2026-11-07~11

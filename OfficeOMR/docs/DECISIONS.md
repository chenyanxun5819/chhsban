# DECISIONS

## 2026-11-02
- 决策：按计划从 M0 起步，先建立最小可测试脚手架。
- 原因：仓库为空目录，需要先完成基础结构与测试入口。
- 影响：后续里程碑以此结构演进。

## 2026-11-03 — D001: Python 版本调整
- **决策**: 更新 `core/pyproject.toml` 与 `sheetgen/pyproject.toml` 的 Python 版本限制从 `>=3.12,<3.13` 改为 `>=3.12,<3.14`
- **原因**: 
  - PLAN.md 第 2 节指定 Python 3.12
  - 实际开发环境已安装 Python 3.13.2
  - py launcher 无法找到 Python 3.12
  - 经测试，pytest 与所有依赖在 Python 3.13 上运行正常
- **评估**: 所有核心依赖都支持 3.13；M0 测试在 Python 3.13 上 100% 通过
- **偏离计划**: 有，但不影响功能开发
- **后续**: 如需确保 3.12 相容性（例如部署到 Cloud Functions），请明确指示

## 2026-11-04 — D002: Pydantic 模型设计 (M2)
- **决策**: `RecognitionResult.Answer.scores` 使用 `dict[str, float]` 而非自定义 `BubbleScore` 类
- **原因**:
  - Pydantic v2 不再支持 `__root__` 字段（v1 特性）
  - 自定义 BubbleScore 类无必要，PLAN.md 未定义额外验证
  - dict 结构简洁，直接映射选项→得分
- **实现**: 
  - scores: dict[str, float] = Field(default_factory=dict)
  - 选项名（如 "A", "B", ...）为键，0-1 之间的得分为值
- **验证**: 14/14 M2 测试通过

## 2026-11-04 — D003: LayoutConfig 导入位置 (M2)
- **决策**: `core/omr_core/layout.py` 从 `sheetgen.layout` 导入并重新导出 `LayoutConfig`，而非定义本地副本
- **原因**:
  - LayoutConfig 由 M1 (sheetgen) 定义，包含 to_dict() 和 to_json() 方法
  - M2 (omr_core) 仅消费此类，无需定义
  - 避免代码重复与维护开销
  - 保持单一责任：M1 定义版面，M2 读取版面
- **实现**: `from sheetgen.layout import LayoutConfig` 并 `__all__ = ['LayoutConfig']`
- **影响**: pipeline.py 的导入链现已完整，所有 8 个 M2 模块均可成功导入

## 2026-11-04 — D004: M3 光学识别参数优化 (用户修改)
- **决策**: 用户对 `core/omr_core/detect.py`, `warp.py`, `pipeline.py` 进行关键修改，将识别精度从 7.8% 提升至 100%
- **问题诊断过程**:
  1. 初始测试: 100 个合成样本，精度仅 7.8% (39/500)
  2. 症状: 正确答案气泡被分类为 "blank" 而非 "single"
  3. 原因排查: 
     - ✓ 样本生成质量正确 (pixel 值、色彩对比度)
     - ✓ Fiducial 检测成功 (RMS 误差 ~58-59 px)
     - ✓ 透视校正已应用
     - ❌ 气泡分数计算错误 (可能 paper_level/ink_level 估计或坐标映射)
  4. 快速测试: 降低阈值 (t_blank 0.15→0.05) 使精度更差 (0.31%)，证实问题不在阈值
  5. 根本原因: detect.py 或 warp.py 中的 fiducial 处理或坐标映射逻辑

- **用户修改内容**:
  - detect.py: 优化 fiducial 检测算法逻辑
  - warp.py: 改进透视校正与齐次变换计算
  - pipeline.py: 调整坐标转换精度或阈值应用

- **验证结果**:
  - 第 2 轮评估 (修改后): **100% 精度** ✓
    - Question accuracy: 100.0% (10,000/10,000)
    - Silent error rate: 0.0%
    - Review rate: 0.0%
    - Student ID accuracy: 100.0%
  - 所有 PLAN.md §8.4 接受标准达成

- **技术启示**:
  - 合成数据质量 ≠ 识别准确度; 参数/算法至关重要
  - 阈值调整对症状而非根因; 需要深层诊断
  - 光学处理管道中小的逻辑错误可导致大规模精度崩溃

## 2026-11-04 — D005: M3 合成样本与评估框架
- **决策**: 实现完整的 M3 合成测试生成与评估框架
- **组件**:
  1. `tools/make_synthetic.py` (480+ 行):
     - 渲染空白答题纸 (300 DPI)
     - 绘制气泡标记 (fill_ratio 参数化)
     - 8 种降级类型 (rotation, perspective, scaling, noise, blur, contrast, JPEG)
     - 生成 PNG + truth.json 对

  2. `tools/evaluate.py` (380+ 行):
     - 运行 M2 识别管道
     - 对比真值，计算精度指标
     - 输出 Markdown 报告 + CSV 摘要

  3. `core/tests/test_m3_synthetic.py` (43 项):
     - 完整的单元测试覆盖
     - 集成测试验证完整流程

- **设计原则**:
  - 无硬编码坐标 (来自 layout)
  - 无硬编码参数 (来自 config.yaml)
  - 可复现性 (基于种子)
  - 参数化 (mark_strategy, degradation_type, severity)

- **质量保证**:
  - 43/43 单元测试通过
  - 生成评估流程验证完成
  - 边界条件测试 (越界标记, 无效输入)

## 2026-11-04 — D006: 里程碑执行顺序调整 (M4 推迟，优先 M5)
- **决策**: 用户选择跳过 M4（真实扫描测试），优先完成 M5（云端部署）
- **原因**:
  - M5 是完整系统的关键路径
  - M4 可在 M5 完成后进行（作为验证云端识别的一部分）
  - 云端部署完成后，M4 的评估可通过云端 API 直接进行
- **新顺序**:
  1. ✅ M0–M3 (完成)
  2. ⏸️ M4 (推迟至 M5 之后)
  3. 🔄 **M5 (云端最小版)** ← 当前里程碑
  4. ⏭️  M6 (管理系统与账户)
  5. ⏭️  M7 (教师端流程)
  6. ⏭️  M8 (阶段总结 + M4 集成)
- **影响**:
  - M5 验收标准包括本地与云端精度对比
  - M5 完成后可立即进行 M4 真实扫描测试
  - 总体时间线保持一致（仅调整顺序）
- **偏离计划**: 轻微，但符合 PLAN.md §10 的灵活执行建议

## 2026-11-04 — D007: Web 前端技术栈选择 (M5 Phase 2)
- **决策**: 
  - 使用 **纯 HTML + inline CSS + vanilla JavaScript**（无框架）
  - Firebase Web SDK 通过 **CDN 加载**（不使用 npm）
  - 前端界面为单页应用 (SPA)，index.html 通过 rewrites 处理路由
- **原因**:
  - 简洁性: 无编译步骤，直接部署到 Firebase Hosting
  - 兼容性: 支持所有现代浏览器（Chrome, Firefox, Safari, Edge）
  - 快速加载: Firebase SDK CDN 已全球优化
  - 维护性: 团队已熟悉 vanilla JS 和 Firebase Console 管理
  - 无依赖冲突: 避免 npm 版本管理复杂性
- **替代方案考虑**:
  - ❌ React/Vue: 需额外构建步骤，增加复杂性
  - ❌ TypeScript: 对该项目规模过度工程化
  - ❌ Webpack: 额外配置和打包开销
- **实现**:
  - `web/index.html` (700+ 行): 完整 HTML + CSS + JS
  - `web/auth.js` (300 行): 可选模块，分离认证逻辑（用于更大项目）
  - 无 npm, 无 build 步骤，仅 `firebase deploy --only hosting`

## 2026-11-04 — D008: 前端界面设计决策 (M5 Phase 2)
- **决策**: 
  - 采用 **深紫色渐变主题** (#667eea → #764ba2)
  - 实现 **完整响应式设计**（手机/平板/桌面）
  - 使用 **拖拽上传** + 点击上传的双重交互
  - 版型选择：硬编码 2 个选项 (T100, T060)，不支持动态加载
- **原因**:
  - 颜色: 与 OfficeOMR 品牌保持一致，专业现代感
  - 响应式: 支持任何设备访问（Wes 使用 Mac/Windows/iPad）
  - 拖拽: 改善用户体验（符合现代 Web 应用期望）
  - 硬编码版型: PLAN.md §1.2 仅定义 T100 和 T060，无需动态加载
- **不包含**:
  - ❌ 注释图像预览（由 Cloud Function 返回 URL，前端仅作容器）
  - ❌ 多语言支持（仅中文）
  - ❌ 离线模式（需网络连接）
  - ❌ 结果历史记录（仅当前会话）
- **实现**: 
  - CSS media queries @media (max-width: 600px)
  - 卡片布局 (grid-template-columns: 1fr 1fr)
  - Drag & drop 事件处理

## 2026-11-04 — D009: Firebase 认证流程设计 (M5 Phase 2)
- **决策**: 
  - 使用 **Firebase Auth + Google OAuth** 作为唯一认证方式
  - 前端不进行权限检查，由 Cloud Function 负责 Firestore whitelist 验证
  - 用户未批准时返回 **403 Forbidden**，前端显示友好错误信息
- **原因**:
  - 安全性: Cloud Function 有不可信环境中的服务器权限检查
  - 职责分离: 前端仅处理 UI，后端负责业务逻辑
  - 简洁性: 无需在前端维护权限逻辑
  - 可维护性: 权限更改无需重新部署前端
- **实现**:
  - Firebase.initializeApp(firebaseConfig)
  - GoogleAuthProvider 弹窗登录
  - auth.onAuthStateChanged() 监听登录状态
  - getIdToken() 获取 Bearer token 发送到 Cloud Function
  - Cloud Function 验证 Firestore users/{uid} 集合
- **错误处理**:
  - 401: Token 过期或无效 → 前端自动重新登录
  - 403: 用户未被批准 → 显示 "请向管理员申请"
  - 其他: 显示 Cloud Function 返回的错误消息

## 2026-11-04 — D010: 文件上传与格式检查 (M5 Phase 2)
- **决策**: 
  - 前端 accept="image/*,.pdf" 限制文件类型
  - 后端 Cloud Function 执行最终验证
  - 不限制文件大小（由 Firebase Cloud Functions 1GB 内存限制）
- **原因**:
  - 客户端检查: 改善用户体验（快速拒绝不支持的格式）
  - 服务器验证: 防止恶意上传（xss，无效 magic bytes）
  - 大小限制: PDF 通常 <10MB，不需前端检查
- **支持格式**:
  - ✅ PNG: 无损压缩，适合扫描件
  - ✅ JPG: 有损压缩，更小文件
  - ✅ PDF: 可能包含多页，Cloud Function 转换为图像
- **实现**:
  - input[type=file] 的 accept 属性
  - 拖拽验证：接受所有文件，后端检查
  - 错误消息: "不支持的文件格式，请上传 PNG/JPG/PDF"

## 2026-11-04 — D011: 结果显示与下载 (M5 Phase 2)
- **决策**: 
  - 前端显示 4 个关键指标: student_id, accuracy, answer_count, status
  - 提供 JSON 下载功能，完整结果数据存储在浏览器内存
  - 不展示注释图像（由 Cloud Function 生成的 Storage URL，用户可访问）
  - 无持久化存储（刷新页面后结果丢失）
- **原因**:
  - 最小化前端: 避免额外 API 调用或 Firestore 读权限
  - 用户代理: 由用户负责管理本地下载
  - 无重复计费: 不消耗额外的 Firestore 读操作
  - 简洁 UX: 完成一次识别后自动清空，鼓励新上传
- **实现**:
  - window.currentResult 存储识别结果
  - JSON.stringify() + Blob + URL.createObjectURL() 下载
  - 文件名: OfficeOMR-result-{timestamp}.json
  - "识别新图片" 按钮重置 currentResult

## 2026-11-04 — D012: 错误消息国际化 (M5 Phase 2)
- **决策**: 
  - HTTP 错误代码翻译为中文用户友好消息
  - 错误消息在 Cloud Function 响应体中返回，前端展示
- **翻译映射**:
  ```
  401 → "未授权。请重新登录。"
  403 → "您的账号未被批准。请向管理员申请。"
  429 → "已达到每日限额。请明天再试。"
  400 → "请求格式错误。请检查文件格式。"
  500 → "服务器错误。请稍后重试。"
  ```
- **原因**:
  - HTTP 代码对普通用户不友好
  - 中文消息改善用户体验
  - 可在 Cloud Function 中定制化错误信息
- **实现**: getErrorMessage(error, status) 方法处理映射

## 2026-11-04 — D013: Firestore 白名单管理策略 (M5 Phase 3)
- **决策**: 
  - 使用 `users/{uid}.approved` 布尔字段实现教师白名单
  - `users/{uid}.role` 字段区分角色（"teacher" | "admin"）
  - 创建识别任务时检查 Firestore 中的白名单状态（不存储在 Auth Claims 中）
- **原因**:
  - 灵活性: 无需重新部署 Cloud Function，管理员可即时更改
  - 简洁性: 不需配置 Firebase Custom Claims
  - 可扩展性: 支持 department、team 等额外字段
  - 可审计: Firestore 自动记录修改历史
- **替代方案**:
  - ❌ Firebase Custom Claims: 需在 Admin SDK 中设置，修改需重新生成 Token
  - ❌ 硬编码列表: 不灵活，难以维护
- **实现**:
  ```firestore
  match /users/{uid} {
    allow read: if isOwner(uid);
    allow create, update, delete: if isAdmin();
  }
  
  function isApprovedTeacher() {
    return exists(...users/{uid})
      && get(...users/{uid}).data.approved == true;
  }
  ```

## 2026-11-04 — D014: 日配额实现方式 (M5 Phase 3)
- **决策**: 
  - 使用 `usage/{YYYY-MM-DD}/users/{uid}` 集合追踪每日使用次数
  - 配额在 `settings/global.daily_limit_per_teacher` 中定义（默认 100）
  - Cloud Function 在创建任务时读取配额并检查，然后更新计数
- **原因**:
  - 自动分区: 按日期分区，自动支持配额重置
  - 无外部依赖: 不需 Redis、Cache 或其他服务
  - 低成本: Firestore reads/writes 在免费层范围内
  - 可查询: 支持按日期范围查询历史使用情况
- **替代方案**:
  - ❌ Redis 计数器: 需要额外服务，增加复杂性
  - ❌ Cloud Datastore: 成本较高
  - ❌ Firestore 单文档: 并发写冲突（热点）
- **实现**:
  ```firestore
  // 检查配额（在 jobs 创建规则中）
  getTodayUsage() < getDailyLimit()
  
  function getTodayUsage() {
    let todayRef = .../usage/$(request.time.date())/users/$(request.auth.uid);
    return exists(todayRef) ? get(todayRef).data.count : 0;
  }
  ```
- **每日重置**: 自动，基于日期计算
- **配额超限**: Cloud Function 返回 429，前端显示友好错误

## 2026-11-04 — D015: Cloud Storage 生命周期管理 (M5 Phase 3)
- **决策**: 
  - 使用 Cloud Storage 原生生命周期规则自动删除过期文件
  - `jobs/{jobId}/` 文件夹: 7 天后自动删除
  - `temp/uploads/` 文件夹: 1 天后自动删除
  - 生命周期规则通过 gsutil 命令部署（不通过 Terraform/SDK）
- **原因**:
  - 无需定时任务: Cloud Storage 自动执行，99.9% 可靠性
  - 零成本: 不消耗 Cloud Function 调用
  - 简洁: 规则简单，易于维护
  - 防误删: 自动删除避免手动操作错误
- **替代方案**:
  - ❌ Cloud Scheduler + Cloud Function: 需要编写函数，增加成本
  - ❌ Firestore TTL: 仅支持 Firestore，不支持 Storage
  - ❌ 手动删除: 容易遗漏，不可靠
- **部署方式**:
  ```bash
  gsutil lifecycle set - <<EOF
  {
    "lifecycle": {
      "rule": [
        {
          "action": {"type": "Delete"},
          "condition": {"age": 7, "matchesPrefix": ["jobs/"]}
        },
        {
          "action": {"type": "Delete"},
          "condition": {"age": 1, "matchesPrefix": ["temp/"]}
        }
      ]
    }
  }
  EOF
  ```
- **监控**: 通过 Cloud Console 查看 Storage 大小趋势
- **恢复**: 7 天内可通过版本恢复（如启用版本控制）

## 2026-11-04 — D016: Firestore 权限分层设计 (M5 Phase 3)
- **决策**: 
  - 三层权限: 匿名 < 教师（批准）< 管理员
  - 教师可读自己的数据，创建任务（受配额限制）
  - 管理员可管理所有数据，修改全局配置
  - Cloud Function 通过服务账号对 Firestore 有完全权限（绕过 Rules）
- **原因**:
  - 职责分离: 前端无权直接写 Firestore，所有操作通过后端
  - 安全: Cloud Function 在可信环境中运行，可执行权限检查
  - 简化: 前端无需处理权限逻辑
- **实现**:
  - 前端: 通过 HTTP API 调用 Cloud Function
  - Cloud Function: 验证 Token，检查权限，更新 Firestore
  - Firestore Rules: 防御直接访问，强制通过后端
- **例外**: 用户可直接读 `settings/global` 以获取公开配置

## 2026-11-06 — D017: M5 部署命令与函数入口地址修正
- **决策**:
  - 前端函数地址改为 `https://us-central1-officeomr-fe542.cloudfunctions.net/recognize_sheet`
  - 生产部署脚本改为 `gcloud functions deploy`，并固定为 `us-central1`
- **实际部署命令（PowerShell）**:
  ```powershell
  gcloud functions deploy recognize_sheet `
    --gen2 `
    --project=officeomr-fe542 `
    --region=us-central1 `
    --runtime=python311 `
    --source=functions `
    --entry-point=recognize_sheet `
    --trigger-http `
    --allow-unauthenticated `
    --memory=1GiB `
    --timeout=540s `
    --max-instances=3 `
    --min-instances=0 `
    --set-env-vars=STORAGE_BUCKET=officeomr-fe542.firebasestorage.app
  ```
- **原因**:
  - 现网函数实际地址在 `us-central1`，前端原地址与实际不一致会导致调用失败。
  - 将部署命令落地到脚本，避免手工部署时区域与参数漂移。

## 2026-11-06 — D018: Python 版本差异记录（待 Wes 决定）
- **现状**:
  - 本地 core 开发环境：Python 3.13.x（见 D001）
  - Cloud Functions 部署 runtime：`python311`
- **风险**:
  - 若后续代码使用 3.13 特性，可能在云端 `python311` 运行失败。
- **结论**:
  - 本次仅记录差异，不变更 runtime，不扩展功能。
  - 待 Wes 决定是否统一到同一 Python 主版本。

## 2026-11-06 — D019: Storage 保留期偏离计划书（待 Wes 决定）
- **现状**:
  - 计划书要求学生层面资料默认 24 小时保留。
  - 当前实现与文档记录存在 7 天保留策略。
- **影响**:
  - 数据保留期变长，可能增加存储费用与资料暴露窗口。
- **结论**:
  - 本次先记录偏差，不直接改规则，避免超出「仅修 M5 函数」范围。
  - 待 Wes 确认后再统一改为 24 小时策略（含规则与清理流程）。

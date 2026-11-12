# OfficeOMR —— 第一阶段计划书（交给 VS Code Copilot 执行）

> 项目名称：**OfficeOMR**（办公室扫描器＋云端的答案卡识别系统）　VS Code 工作区与项目根目录文件夹名：`OfficeOMR`
> 版本：v1.8（v1.8 新增 1.4 阶段路线图；v1.7 试卷限整份 PDF、仅本人可见、未作答题回印；v1.6 项目命名为 OfficeOMR；v1.1 管理系统；v1.2 批次顺序与二/三阶段备忘；v1.3 Google 登录白名单、双版型、姓名线与回印格、可调全局设置；v1.4 每日上限改为「张数」、教师人数不设限；v1.5 学生层面资料一律 24 小时删除，永久保存的只有「试卷（题目）与标准答案」）　日期：2026-11-02　负责人：Wes　文档作者：Claude（顾问式规划，不参与实作）
> 本文件放在仓库 `docs/PLAN.md`。Copilot 开工前必须完整阅读本文件，并遵守第 11 节「工作规范」。

---

## 0. 如何使用本文件（给 Copilot）

1. 严格按「第 10 节 里程碑」的顺序做，**一次只做一个里程碑**，每个里程碑完成后更新 `docs/STATUS.md` 再停下来等 Wes 确认。
2. 遇到本文件没写清楚、或你想偏离的地方：**不要自行决定**，把问题写进 `docs/OPEN_QUESTIONS.md`，并在 `docs/DECISIONS.md` 记录你暂时采用的假设。
3. 所有命令使用 **PowerShell (pwsh)** 语法，不要给 bash / Linux 命令。
4. 第 5、6、7 节的数字（尺寸、阈值）是**初始值**：可以调整，但调整必须写入 `docs/DECISIONS.md`（原因 + 新旧值 + 评估数据）。

---

## 1. 目标与范围

### 1.1 第一阶段唯一目标
**验证「A4 自印答案纸 + 复印机扫描 + 云端识别」的识别准确度。**

### 1.2 第一阶段要做（In scope）
- 程序自动生成 A4 单面答案纸：**100 题**、学生证号数字栏（只有数字，不含姓名）。
- 识别核心：输入一张扫描图（JPG/PNG，或多页 PDF），输出每题答案 + 学生证号 + 每题状态与置信度 + 标注后的调试图。
- 准确度评估工具：合成测试 + 真实扫描测试 + 报告。
- 云端部署（Firebase / Google Cloud）：先做最小识别版本（M5）。
- **管理系统（最小版）**：只有 2 种角色（super admin、教师）；super admin 有「组织管理」「教师管理」「系统设置」页；教师可下载答案纸、上传扫描、查看并导出结果。详见第 3.2 节与 M6–M7。

### 1.3 第一阶段不做（Out of scope，禁止提前实作）
- 计分、成绩统计、班级分析报表、错题回印；「考试」实体与试卷库（→ 全部属于第二阶段，见 1.4 与第 14 节）。
- 手写识别（OCR）。
- 题目随机化、试卷封面生成。
- 付费、订阅；超过 2 种角色的权限分级；一个账号属于多个组织；教师自助注册页面。
- 批量处理几百张的队列系统。
- 手机 App。

> 但是：**架构要为以上功能预留位置**（见第 3、4 节），不要写死。

### 1.4 阶段路线图（一眼看清「现在做什么、以后做什么」）

| 阶段 | 内容 | 状态 |
|---|---|---|
| **阶段一（本计划书）** | 识别准确度验证（M0–M4，本机）→ 云端识别（M5）→ 管理系统与教师端（M6–M7）→ 总结（M8）。输出：**学号＋每题答案＋状态（单选/空白/多选/存疑）＋标注图，不计分** | 现在执行 |
| 阶段二 | ① 标准答案与**计分**；② **试卷库**（整份 PDF＋标准答案，永久保存，仅本人可见）；③ **错题回印**（只印答错题的正确答案，第 14.2 节）；④ **班级分析报表**（每题答对率、分数分布、班级平均，参考学校现用的 Laporan Item Analisis，第 14.1 节） | 已写入备忘（第 14 节），**未实作** |
| 阶段三（若有） | 试卷封面生成、按学号随机题序并对应答案、题目拆题入库等 | 仅为构想 |

阶段二的所有功能都建立在同一套 OfficeOMR 上（同一个识别核心、同一套账号与组织），**前提是系统先拿到「标准答案」**；阶段一已为此预留：答案纸的回印格与分数框、结果 JSON 的 `batch_id` / `source_page_index`、`settings` 里的试卷库上限。

---

## 2. 关键决策一览

| 项目 | 决定 | 理由 |
|---|---|---|
| 语言 | Python 3.12 | OpenCV 生态最成熟；Firebase Functions 支持 Python |
| 识别库 | `opencv-python-headless` + `numpy` | Apache-2.0，可商用，无按次收费 |
| PDF 转图 | `pypdfium2` | 宽松授权。**禁止使用 PyMuPDF（AGPL，日后商用有授权风险）** |
| 答案纸生成 | `reportlab`（BSD） | 矢量输出，坐标精确，可商用 |
| 数据结构校验 | `pydantic` v2 | layout.json 与结果 JSON 的 schema |
| 测试 | `pytest` | |
| 云端 | Firebase Hosting + Cloud Functions 2nd gen (Python) + Cloud Storage + Firestore + Auth | Wes 已熟悉 Firebase |
| 区域 | `asia-southeast1`（新加坡） | 离马来西亚近 |
| 前端 | 原生 HTML/CSS/JavaScript（ES modules）＋ Firebase Web SDK，**无构建步骤** | 简单、好维护；若 Wes 想沿用 mybazaar 的前端技术栈，请告知 |
| 识别核心位置 | **服务器端**（Cloud Functions），核心库本身**不依赖任何云端 SDK** | 防破解；也便于本地测试 |
| 付费 API | **一律不用**（见第 9.3 节黑名单） | 避免高额费用 |
| 角色 | 仅 `super_admin` 与 `teacher` 两种 | 先简单，足够第一阶段 |
| 组织 | 一个账号只属于一个组织；学号格式（位数、前置码）按组织设定 | 例：芙中＝5 位数字 |
| 登录 | Google 账号登录＋super admin 预先批准的邮箱白名单；不开放自由注册 | 教师先向 Wes 申请；不处理密码；日后可再加其他方式 |
| 新 Firebase 项目 | 建议**独立于 mybazaar** 另建项目（显示名称 `OfficeOMR`，项目 ID 建议 `officeomr-dev`；Firebase 项目 ID 需全球唯一，被占用时可加后缀，并记入 DECISIONS.md） | 额度、账单、权限互不干扰 |

---

## 3. 总体架构

```
                ┌──────────────────────────────────────────────┐
                │  本地开发 / 测试（pwsh）                       │
 layout.json ◄──┤  sheetgen  ──►  PDF 答案纸 + layout.json      │
      │         │  make_synthetic ──► 合成扫描图 + 标准答案      │
      │         │  evaluate  ◄── 识别结果 vs 标准答案            │
      ▼         └──────────────────────────────────────────────┘
┌───────────────┐        同一份代码
│  omr_core     │  ◄──────────────────────────┐
│ (纯 Python 库)│                             │
│ 检测→校正→评分→判定→输出JSON                 │
└───────────────┘                             │
                                   ┌──────────┴────────────┐
 浏览器(测试页) ─上传─► Storage ─► │ Cloud Function         │ ─► Firestore
   (Firebase Hosting)    callable  │ recognize_sheet        │    jobs/{jobId}
                                   └────────────────────────┘
```

### 3.1 三条架构铁律
1. **`layout.json` 是唯一真相来源**：答案纸生成器写它，识别器读它。任何坐标都**不得**在代码里写死。
2. **`omr_core` 与云端完全解耦**：它只吃「图片 + layout」、吐「结果 JSON」。云端函数只是薄薄一层包装。这样 Copilot 在本地就能完整测试，日后换云平台也不用重写。
3. **所有阈值放配置文件** `core/omr_core/config.default.yaml`，由评估数据决定，不得散落在代码里。

### 3.2 角色、组织与账号（管理系统 v1）

| 角色 | 谁 | 能做什么 |
|---|---|---|
| `super_admin` | Wes | 管理组织、批准/停用教师、调整全局设置、查看用量 |
| `teacher` | 各校老师 | 仅限**所属组织**：生成/下载答案纸（仅限组织开放的版型）、上传扫描、查看/导出结果、限时下载图片 |

**规则**
- 一个账号只属于一个组织（固定 `orgId`）；`super_admin` 不属于任何组织。
- **不开放自由注册**。教师先向 Wes 申请（线下沟通即可，第一阶段不做申请表单）→ Wes 在「教师管理」页输入对方的 **Google 账号邮箱**并指定组织 → 对方才能使用。
- **登录方式：Google 账号**（即浏览器里登录的 Chrome/Google 账号）。不做用户名/密码，不处理密码重设。教师页面**不显示**账号、昵称、头像；仅 super admin 的管理页需要显示邮箱（否则无法管理）。
- 登录流程：用户用 Google 登录后，前端调用 callable `claimAccess`；函数检查 `email_verified == true`，用小写邮箱到 `allowedUsers` 找记录：找到且 `active` → 绑定 uid、设置 custom claims `{role, orgId}`；找不到 → 回传 `NOT_APPROVED`，页面只显示「尚未开通，请向管理员申请」并登出。
- Firebase 会替任何 Google 账号建立 Auth 用户，这没关系：**没有 claims 的账号，rules 一律拒绝**。不使用 blocking functions（需升级 Identity Platform，徒增复杂度）。
- 角色与组织用 **Custom Claims** 表示，由 Cloud Function（Admin SDK）设置；Firestore / Storage rules 读取 claims。停用/删除教师时，函数同时清除 claims 并撤销其 refresh token。
- **教师账号数量不设上限**（教师由 super admin 逐一批准，总量天然受控）；费用的闸门是「每位教师每天可识别张数」。
- **批准、停用、改组织、改全局设置，全部只能经 Cloud Functions（callable）**，函数内先验证调用者 `role == super_admin`。客户端不得直接写 `allowedUsers`、`orgs`、`settings`。
- 第一个 super admin 用本机脚本 `tools/bootstrap_admin.py` 设置（使用服务账号密钥，密钥放在仓库之外，**不得提交 git**）。

**Firestore 数据模型（v1）**
```jsonc
settings/global: {                       // 运营参数：全部可在「系统设置」页修改，不得写死在代码里
  "defaultDailySheetsPerUser": 100,      // 每位教师每天最多识别的答案纸张数（＝学生人数；1 页＝1 张＝1 名学生）。优先级：教师个别设定 > 组织设定 > 此全局默认
  "studentDataRetentionHours": 24,       // 学生层面资料（原图、标注图、识别结果、分析）的保留小时数；到期自动删除，**不提供永久保存**
  "maxExamsPerTeacher": 200,             // 每位教师试卷库（永久保存）的份数上限
  "maxPaperFileMB": 10,                  // 每份试卷（题目文件）大小上限
  "maxPagesPerUpload": 10, "maxFileMB": 15
}
orgs/{orgId}: {
  "name": "森美蘭芙蓉中華中學", "code": "chhs", "active": true,
  "studentId": {"digits": 5, "charset": "numeric", "prefix": ""},  // digits＝要涂的位数；prefix＝固定前置码，不画气泡，结果中自动加在前面
  "optionCount": 5,                      // 4 或 5（A–D / A–E）
  "allowedTemplates": ["T100-A4-v1", "T060-A4-v1"], "defaultTemplate": "T100-A4-v1",
  "dailySheetsPerUser": null,            // null＝使用全局默认
  "createdAt": ...
}
allowedUsers/{email小写}: { "orgId": "...", "role": "teacher", "active": true, "uid": null /*首次登录后绑定*/, "dailySheetsOverride": null /*null＝沿用组织/全局*/, "createdAt": ... }
jobs/{jobId}: { "uid": "...", "orgId": "...", "templateId": "...", "status": "...", "result": {…精简结果 JSON…}, "pages": 1, "createdAt": ..., "expiresAt": ... /*= createdAt + studentDataRetentionHours，必填*/ }
usage/{uid}_{yyyymmdd}: { "sheets": 123 }
```
**Rules 要点**：`settings`——super_admin 读写，teacher 只读；`orgs`——super_admin 读写，teacher 只读自己的组织；`allowedUsers`——仅 super_admin；`jobs`——teacher 只读自己的（写入只由 Functions 完成）；`usage`——客户端不可读写。所有 rules 必须有 Emulator 单元测试（见 M6）。

`studentId.charset` 第一阶段只支持 `numeric`；其他字符集、多种学号格式留待真的有第二个组织时再处理。

### 3.3 为日后预留（现在只做接口，不做功能）
- `template_id`（如 `T100-A4-v1`）出现在 layout.json、结果 JSON、答案纸上的二维码里。未来 50 题版、5 选项版、随机版 = 新增一份 layout.json，不改核心代码。
- 结果 JSON 带 `schema_version`。
- 「试卷库」（**现在不实作**，只写进 `docs/FUTURE.md`）：永久保存的 `exams/{examId}`（题目文件＋标准答案）与 24 小时清除的 `jobs`（学生资料）**完全分开**，详见 14.3 节。

---

## 4. 仓库结构

```
OfficeOMR/                              # ＝ VS Code 工作区根目录，所有命令都从这里执行
├─ .github/copilot-instructions.md      # 见第 11 节，直接用
├─ docs/
│  ├─ PLAN.md                           # 本文件
│  ├─ STATUS.md                         # 每个里程碑结束时更新（Wes 会拿给 Claude 看）
│  ├─ DECISIONS.md                      # 决策与假设记录
│  ├─ OPEN_QUESTIONS.md                 # 需要 Wes 回答的问题
│  ├─ SCAN_GUIDE.md                     # 复印机扫描设定指南（M4 产出）
│  └─ FUTURE.md                         # 预留功能备忘
├─ core/
│  ├─ pyproject.toml
│  ├─ omr_core/
│  │  ├─ layout.py        # layout.json 的 pydantic 模型 + 读取
│  │  ├─ detect.py        # 定位标记检测、方向判断
│  │  ├─ warp.py          # 透视校正到标准画布
│  │  ├─ score.py         # 每个气泡的涂黑分数
│  │  ├─ decide.py        # 分数 → 答案/状态
│  │  ├─ pipeline.py      # recognize(image_bytes, layout, config) -> Result
│  │  ├─ pdfio.py         # PDF/图片读取（pypdfium2）
│  │  ├─ schema.py        # 结果 JSON 的 pydantic 模型
│  │  ├─ debug.py         # 生成标注图
│  │  └─ config.default.yaml
│  └─ tests/
├─ sheetgen/
│  ├─ pyproject.toml
│  └─ sheetgen/           # 生成 PDF + layout.json + 预览 PNG
├─ tools/                  # 命令行入口（python -m ...）
│  ├─ generate_sheet.py
│  ├─ recognize.py
│  ├─ make_synthetic.py
│  └─ evaluate.py
├─ eval/
│  ├─ synthetic/          # 合成数据（.gitignore 大文件）
│  ├─ real/               # 真实扫描 + truth.csv
│  └─ reports/
├─ functions/              # Firebase Functions (Python)
│  ├─ main.py
│  └─ requirements.txt
├─ web/                    # 前端：登录页、super admin 页（组织/教师管理）、教师页（M5 先是极简测试页）
├─ scripts/                # *.ps1
│  ├─ setup.ps1
│  ├─ sync_core.ps1       # 部署前把 core/omr_core 复制到 functions/omr_core
│  └─ deploy.ps1
├─ firebase.json  firestore.rules  storage.rules  .firebaserc
└─ .gitignore
```

**环境初始化（pwsh）**
```powershell
# 若激活虚拟环境被拦截，先执行一次：
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned

py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -e .\core -e .\sheetgen
pip install pytest
```

**命名约定（OfficeOMR）**
- 对外名称：**OfficeOMR**。用在网页标题与登录页、Firebase 项目显示名称、README、`docs/` 文件标题。答案纸上**不印**产品名（学校名、考试名由参数传入）。
- 仓库根目录文件夹＝`OfficeOMR`。Python 包的**发布名**用 `officeomr-core`、`officeomr-sheetgen`（写在各自的 `pyproject.toml`）；**导入名保持 `omr_core`、`sheetgen`**，不要改。
- 根目录放一份 `README.md`（中文，写明项目名称、目的、目录结构、如何在 pwsh 中建立环境与跑测试）。

---

## 5. 答案纸规格 v1（版型 `T100-A4-v1`；另有 `T060-A4-v1`）

### 5.1 基本
- A4 纵向 210 × 297 mm，**单面**，**只用黑色**（复印机黑白打印即可）。
- **两种版型**（由组织设定决定教师可用哪些，见 3.2 节；两者是同一生成器的参数预设，**不要为每种版型写两套代码**）：
  - `T100-A4-v1`：**4 栏 × 每栏 25 题 = 100 题**，题号 1–25 / 26–50 / 51–75 / 76–100。
  - `T060-A4-v1`：**3 栏 × 每栏 20 题 = 60 题**，题号 1–20 / 21–40 / 41–60；行距约 9–9.5 mm，气泡直径可放大到 4.2 mm、回印格放大到 7 × 7 mm。
  - 不再增加更多版型（Wes 明确说「不用太多种」）；但版型 id 与参数预设要集中放在一处，日后新增只需加一份预设。
- 选项：**默认 A–E（5 项）**，也可由组织设定为 A–D（4 项）；选项数是生成参数 `option_count`。
- 学生证号：**N 位数字**，N 由所属组织的设定决定（芙中＝5；最多 12；无组织时默认 10），每位 0–9 一列气泡。若组织设有固定前置码（prefix），前置码**不画气泡**，只在结果中自动加在前面。
- 含一条**姓名手写线**（参数 `--name-line`，默认开启）：仅供人眼核对和发还试卷，**不参与识别**，识别时不得依赖它。
- 含**分数框**（页头右侧约 30 × 10 mm 空白框）：第二阶段回印分数用，第一阶段留空即可。
- 每题右侧含一个**回印格**（见 5.3 硬性约束）：第二阶段把「答错题的正确答案」印在这里。**答案纸印出去后就无法修改，所以回印格必须在第一版就留好。**

### 5.2 定位标记（识别成败的关键）
- **4 个实心黑色正方形**定位点，7 × 7 mm，左上角坐标（mm）：(8, 8)、(195, 8)、(8, 282)、(195, 282)。
- **方向标记**：页面上方中央一条黑色横条 20 × 4 mm（中心 x=105，y≈9~13）。扫描时纸张若被转 180°，横条会出现在下方，程序据此自动翻转。
- 页面角落以外 **不得** 出现其他大块实心黑色图形（避免误判）。
- 所有内容距纸边 ≥ 7 mm（复印机有不可打印边）。

### 5.3 版面（初始建议，坐标原点＝左上角，单位 mm）
| 区域 | y 范围 | 内容 |
|---|---|---|
| 页头 | 15–45 | 学校名、考试名、科目（文字，由参数传入）；**姓名手写线**；**分数框**；二维码（内容：`template_id` + 版本）；「请用 2B 铅笔涂满圆圈」说明 |
| 证号区 | 20–80 | 右侧：证号手写格（可选，供人眼核对）+ N 列 × 10 行气泡（行距 5 mm，气泡直径 3.8 mm） |
| 答题区 | 86–275 | 4 栏，每栏 25 行，行距约 7.2 mm；每 5 行留稍大间隔或细分隔线，方便学生对位 |

**硬性约束**（生成器必须检查，不满足则报错）：
- 气泡直径 ≥ 3.8 mm；同一行相邻选项圆心距 ≥ 6 mm；相邻题行距 ≥ 6.8 mm。
- 气泡为**空心细线圆圈**，**圈内不印字母**（字母印在每栏顶端表头），以保证涂黑与否的对比最大化。
- 不使用灰色底纹/斑马纹（复印和阈值处理会产生干扰）。
- **回印格**：每题选项右侧一个 **5.5 × 5.5 mm** 的空白方格（细线外框，`T060` 为 7 × 7 mm），位置写入 layout.json 的 `feedback_slot`。回印格必须与相邻题行保持至少 1.2 mm 间隙，且**不得与任何气泡重叠、不得被识别流程当作气泡**。
- `T100` + A–E + 回印格的栏宽很紧（初始建议：题号区 8 mm + 5 个选项 × 6.2 mm + 回印格 5.5 mm ≈ 44.5 mm，4 栏共约 190 mm）。**M1 必须实际排出来给 Wes 看**；若太挤，由 Wes 决定缩小回印格、改为 4 个选项或其他取舍，不得自行删除回印格。

### 5.4 生成器输出
`python -m tools.generate_sheet --school "XXX" --exam "..." --subject "..." --template T100-A4-v1 --id-digits 5 --options 5 --out out\`
输出：
- `T100-A4-v1.pdf`（**打印时必须选「实际大小 / 100%」，不可「缩放至适合页面」**）
- `T100-A4-v1.layout.json`
- `T100-A4-v1.preview.png`（300 dpi）

### 5.5 `layout.json` 内容（pydantic 模型在 `core/omr_core/layout.py`）
```jsonc
{
  "template_id": "T100-A4-v1",
  "version": 1,
  "page_mm": [210, 297],
  "fiducials": [{"id":"TL","x":8,"y":8,"w":7,"h":7}, ...],
  "orientation_mark": {"x":95,"y":9,"w":20,"h":4},
  "canvas_dpi": 300,
  "questions": [
    {"q":1, "bubbles":[{"opt":"A","cx":23.0,"cy":93.0,"r":2.1}, ...],
     "feedback_slot":{"x":52.0,"y":90.2,"w":5.5,"h":5.5}}, ...
  ],
  "id_columns": [
    {"col":0, "bubbles":[{"digit":0,"cx":..,"cy":..,"r":1.9}, ...]}, ...
  ],
  "option_count": 5,
  "id_digits": 5,
  "score_box": {"x":170,"y":20,"w":30,"h":10},
  "name_line": {"x":15,"y":32,"w":80}
}
```
**M1 验收要求**：生成器必须有自检——把 PDF 用 `pypdfium2` 渲染成 300 dpi 位图，检查 layout.json 里每个气泡圆周位置确实有黑色线条（证明 json 与 PDF 一致）。

### 5.6 按组织生成答案纸（M7 实作）
- `sheetgen.build(params) -> (pdf_bytes, layout)` 必须是**纯函数、结果可重现**：相同参数（`id_digits`、`option_count`、学校名等）永远产生相同 layout。这样识别时可由参数重建 layout，不必存放每张答案纸的 json。
- 答案纸上的二维码内容：`T100-A4-v1;d=5;o=5`（模板、证号位数、选项数）。识别时优先读二维码（OpenCV `QRCodeDetector`）；读不到则用上传者所属组织的设定；两者不一致 → `needs_review` 并回报 `TEMPLATE_MISMATCH`。
- M2–M4 仍由命令行参数指定，二维码解码在 M7 才做。
- 答案纸在 Cloud Functions 里用 reportlab 即时生成（体积小、几乎不耗资源）。

---

## 6. 识别流水线（`omr_core.pipeline.recognize`）

1. **读取**：图片或 PDF（逐页转 300 dpi 灰度）。输入长边 < 1600 px 视为分辨率过低，回传错误 `LOW_RESOLUTION`。
2. **预处理**：灰度 → 轻度高斯模糊 → Otsu / 自适应阈值（仅用于找定位标记，**不用于判定涂黑**）。
3. **定位标记检测**：`findContours`，筛选「近似正方形、实心度高、面积在预期范围」的轮廓；每个图像角落取最接近者。找不到 4 个 → 错误 `FIDUCIAL_NOT_FOUND`（附上调试图）。
4. **方向**：检查方向标记位于上方还是下方，必要时旋转 180°；若图像为横向，先旋转 90°。
5. **透视校正**：用 4 个定位点的 homography 把图像映射到标准画布（`canvas_dpi` = 300，即 2480 × 3508）。这一步同时吸收复印机缩放、ADF 歪斜、纸张轻微变形。记录定位点重投影误差作为质量指标。
6. **每个气泡打分**（`score.py`）：
   - 在标准画布上，取气泡圆心、半径 × `inner_ratio`（初始 0.7）的圆形区域（**避开圆圈线条本身**）。
   - `paper_level`＝答题区灰度的第 90 百分位（纸白）；`ink_level`＝定位点实心黑块的平均灰度（墨黑，**天然的黑色校准**）。
   - `fill_score = clip((paper_level − mean_inner) / (paper_level − ink_level), 0, 1)`
   - 这样自动适应不同扫描亮度/对比度。
7. **判定**（`decide.py`），阈值全在 config：
   - 每题所有选项分数 → 状态：
     - `blank`：所有分数 < `t_blank`
     - `single`：恰有一个 ≥ `t_mark` 且其余 < `t_other`
     - `multi`：两个以上 ≥ `t_mark`
     - `ambiguous`：其他情况（如淡淡的擦痕、涂一半），**一律标记需人工复核，不得硬猜**
   - 初始值（待评估数据校正）：`t_blank=0.15, t_mark=0.40, t_other=0.25`
8. **证号**：每一列取分数最高的数字，规则同上；无法确定的位数输出 `?`。
9. **输出**：结果 JSON（第 7 节）+ 可选标注图（在校正后图像上，用绿＝单选、橙＝存疑、红＝多选、灰＝空白 画圈）。

**设计原则**：先做最简单版本、量化错误，再逐项加强。如果评估显示需要，才依序加入：
(a) 每行的局部微调对位（±3 px 搜索）；(b) 逐气泡局部背景估计；(c) 擦痕/打勾符号的特殊处理。每加一项都要用评估数据证明有改善（写入 DECISIONS.md）。

---

## 7. 结果 JSON（`schema_version: "1.0"`）

```jsonc
{
  "schema_version": "1.0",
  "template_id": "T100-A4-v1",
  "batch_id": null,                  // 第一阶段可为 null；第二阶段起用来标识同一批扫描
  "source_page_index": 0,            // 此张在上传文件（PDF）中的页序，从 0 开始；日后「回印」必须靠它还原扫描顺序
  "status": "ok",                    // ok | needs_review | failed
  "error": null,                     // 或 {"code":"FIDUCIAL_NOT_FOUND","message":"..."}
  "sheet_quality": {
    "fiducial_rms_px": 0.8, "skew_deg": 0.4, "rotated_180": false,
    "paper_level": 238, "ink_level": 22
  },
  "student_id": {"value": "2024010123", "digits": [{"col":0,"digit":"2","status":"single"}]},
  "answers": [
    {"q": 1, "choices": ["B"], "status": "single", "scores": {"A":0.02,"B":0.91,"C":0.01,"D":0.03}}
  ],
  "summary": {"single": 96, "blank": 2, "multi": 1, "ambiguous": 1},
  "timing_ms": 1840
}
```
`status = needs_review` 的条件：存在 ambiguous / 证号含 `?` / 质量指标超标。

---

## 8. 准确度评估计划（第一阶段的核心）

### 8.1 要量的指标
| 指标 | 定义 |
|---|---|
| 题级准确率 | 识别结果与标准答案完全一致的题数 / 总题数 |
| **静默错误率** ★ | **答错但没有被标记为 ambiguous/needs_review** 的题数 / 总题数（最重要，因为这会直接造成错分） |
| 复核率 | 被标记为 ambiguous/multi 需人工看的题数 / 总题数（太高会失去自动化意义） |
| 整张全对率 | 一张 100 题全部正确的比例 |
| 证号准确率 | 证号整串完全正确的比例 |
| 失败率 | 无法识别（如找不到定位点）的张数比例 |

### 8.2 合成测试（`tools/make_synthetic.py`）
- 用 `pypdfium2` 把空白答案纸渲染成位图，再依 layout.json **在已知位置画上「学生涂的痕迹」**，同时保存标准答案 `truth.json`。
- 涂法随机变化：全黑涂满 / 浅涂（淡灰）/ 涂一半 / 偏离圆心 / 超出圆圈 / 打勾 / 打叉 / 小点 / 双选 / 空白 / 擦除残影（浅灰）/ 误涂在圆圈之间的杂点。
- 再施加「扫描劣化」：旋转 ±3°、透视扭曲、缩放 97–103%（复印机缩放）、平移、高斯模糊、噪点、亮度/对比度变化、渐变阴影、JPEG 质量 50–90、分辨率 150/200/300 dpi、黑白二值化、180° 翻转。
- 数量：每一类劣化各 ≥ 50 张；总量 ≥ 500 张。
- 用固定随机种子，保证可重现。

### 8.3 真实扫描测试（M4）
- 用答案纸生成器打印 ≥ **30 张**，并按 `truth.csv`（预先随机产生的答案表，由 `tools/` 生成「填写指示表」）用不同工具涂写：2B 铅笔、HB 铅笔、蓝/黑原子笔、荧光笔/马克笔（各至少 5 张），并故意制造：涂改、双选、淡涂、半涂。
- 用 Sharp MX-M564N 扫描（见第 12 节扫描设定实验 E1）。
- 每张的标准答案记录在 `eval/real/truth.csv`。

### 8.4 初始目标（提案，请 Wes 确认）
| 场景 | 题级准确率 | 静默错误率 | 复核率 |
|---|---|---|---|
| 合成·干净标准涂法 | ≥ 99.95% | ≤ 0.01% | ≤ 0.5% |
| 合成·所有劣化 | ≥ 99.5% | ≤ 0.05% | ≤ 3% |
| 真实扫描（正常涂法） | ≥ 99.5% | ≤ 0.1% | ≤ 3% |

### 8.5 报告（`eval/reports/<日期>-<git短哈希>.md`）
- 上述所有指标；按「涂法类型」与「劣化类型」分类的表格；
- **失败案例图库**：所有静默错误与失败案例的标注图（放在 reports 子目录）；
- 每次修复一个失败案例，必须把该图加入 `core/tests/regression/`，永久成为回归测试。

---

## 9. 云端部署与成本防护

### 9.1 最小云端方案
- **Firebase Hosting**：`web/index.html`，单页：登录 → 选择图片/PDF → 上传 → 显示结果表 + 标注图。
- **Cloud Storage**：`uploads/{uid}/{jobId}.{jpg|png|pdf}`。
- **Cloud Functions 2nd gen（Python 3.12）**：callable 函数 `recognize_sheet(storagePath, templateId)`：
  从 Storage 取文件 → 调用 `omr_core.recognize` → 结果写 Firestore `jobs/{jobId}` → 回传结果。
  - `region="asia-southeast1"`, `memory=1GiB`, `timeout=120s`, `min_instances=0`, `max_instances=3`
  - 第一阶段限制：单次最多 **10 页**、单文件 ≤ **15 MB**。
- **Firestore**：M5 仅 `jobs`；M6 起增加 `orgs`、`users`、`usage`（见 3.2 节）。
- **Auth**：Google 账号登录（Firebase Auth 的 Google provider）。M5 阶段临时只允许 Wes 的 Google 账号；M6 起改为邮箱白名单＋角色/组织机制（第 3.2 节）。**禁止匿名登录。**

### 9.2 `omr_core` 如何放进 Functions
Functions 部署目录无法引用上层目录，所以：`scripts/sync_core.ps1` 在部署前把 `core\omr_core` 复制到 `functions\omr_core`；该复制目录写进 `.gitignore`，**不得手动修改**。
```powershell
# scripts/sync_core.ps1
Remove-Item -Recurse -Force .\functions\omr_core -ErrorAction SilentlyContinue
Copy-Item -Recurse .\core\omr_core .\functions\omr_core
```

### 9.3 成本防护（Copilot 必须遵守）
**绝对禁止使用（会按次/按小时收费）：**
Cloud Vision API、Document AI、Vertex AI / Gemini 等任何 AI API、GPU、Cloud SQL / Firebase SQL Connect、BigQuery、Cloud Run 的 `min_instances > 0`、VPC 连接器、Cloud NAT、负载均衡器、Memorystore、任何「常驻」资源。

**必须做：**
1. Functions：`min_instances=0`，`max_instances` ≤ 3，`timeout` ≤ 120 s，内存 ≤ 1 GiB。
2. Storage 设置**生命周期规则：仅限 `uploads/` 与 `annotated/` 前缀、1 天后自动删除**（仅作兜底，详见 9.4）。**绝不可套用到整个 bucket**（第二阶段 `papers/` 要永久保存）。
3. Firebase Functions 部署会在 Artifact Registry 留下容器镜像，需设置**清理策略**（部署时 Firebase CLI 会询问；选择自动清理，保留 1 天）。
4. `storage.rules` / `firestore.rules`：只允许已登录且白名单内的 uid 读写自己的路径；不得有 `allow read, write: if true`。
5. 日志：不要在函数里打印整张图片或大型 base64；日志只记录 jobId、耗时、状态。
6. 项目设预算提醒（由 Wes 在控制台设置，见第 12 节）。注意：**预算提醒只会发通知，不会自动停止扣费**。
7. 不使用 Firestore 实时监听大量文件；结果页只读单一 job 文档。

**粗略用量心算（供 Wes 参考，请以官方计价器为准）：**
Wes 的学校一年约 60 班 × 约 35 人 × 15 科 × 3 次考试 ≈ **9.5 万张/年**。每张识别约 2–4 秒 × 1 GiB ≈ 2–4 GB·秒。月均约 8 千张，远低于 Functions 每月免费额度的量级；但考试周会集中爆量，所以才限制 `max_instances` 并把批量处理留到后续阶段设计。图片若长期保存，9.5 万张 × 约 1–2 MB ≈ 100–200 GB/年的存储费会成为主要成本，因此学生层面资料（含图片）只保留 24 小时（9.4 节）。

### 9.4 数据保留、配额与可调设置（M7 实作，M5 先做简化版）

**原则（Wes 已确认）：学生层面的资料一律限时删除，不提供永久保存。永久保存的只有「试卷（题目）与标准答案」，它们不含学生资料。**

**学生层面资料——限时保留（默认 24 小时），必须提供下载**
- 范围：上传的原图、标注图、识别结果（学号＋每题答案＋状态）、考试分析（答对率、分数分布等）。
- 保留期由 `studentDataRetentionHours`（默认 24）控制，到期**整批删除**（Storage 文件与 Firestore `jobs` 文档一并删除）。
- 实现：
  1. **每小时执行一次的清理函数**（Cloud Scheduler 触发；Cloud Scheduler 有少量免费任务额度，Copilot 须在 DECISIONS.md 记录实际费用评估）：找出 `expiresAt` 已过的 `jobs`，删除其文件与文档。这是主要机制，因为 Firestore TTL 只保证「到期后一段时间内」删除（可能延迟约一天），Storage 生命周期规则的粒度也是「天」，都无法精确到小时。
  2. Firestore TTL（`expiresAt`）与 Storage 生命周期规则（`age = 1 天`）只作**兜底**。
  3. **生命周期规则只能套用在 `uploads/` 与 `annotated/` 前缀，不得套用到整个 bucket**；清理函数也只处理这些前缀。**必须有测试证明清理流程不会删到 `papers/`（永久保存的试卷）。**
- 教师页面必须提供：**下载结果 CSV**、**下载标注图（PDF）**、（可选）下载原图，并显示「资料将在 X 小时后自动删除」。教师不下载就会消失，这是设计如此。
- 日志与错误报告不得输出学号或答案。因为学生资料最多只留 24 小时，也不需要写入长期备份；**不得把学生资料导出到其他长期存储**。

**永久保存：试卷库（第二阶段实作，第一阶段只预留空间与规则，见 14.3）**
- 内容：每份试卷的**题目文件**（整份 PDF）、**标准答案**与少量标注（科目、年级/班级条件、备注）；归属某位教师，隔年可再次使用。
- 费用：文字（标准答案）可忽略；题目文件才占空间。1000 份 × 约 1 MB ≈ 1 GB，Cloud Storage 每月约几美分（请以官方计价器为准）。以 `maxPaperFileMB`（默认 10）与 `maxExamsPerTeacher`（默认 200）设上限，防止被滥用。
- 存放路径 `papers/{orgId}/{uid}/…`，与 24 小时清除的目录分开。

**全局设置（`settings/global`，super admin「系统设置」页可改，禁止写死）**
- `defaultDailySheetsPerUser`（默认 100 张/人/天，组织与个别教师可覆盖）、`studentDataRetentionHours`（默认 24）、`maxPagesPerUpload`（10）、`maxFileMB`（15）、`maxExamsPerTeacher`（200）、`maxPaperFileMB`（10）。
- 修改后立即对新请求生效；函数每次执行时读取（可做 60 秒内存缓存），**不得需要重新部署**。

**配额执行**
- 函数在处理**之前**用 Firestore 事务累加 `usage/{uid}_{yyyymmdd}`，超额回传明确错误 `QUOTA_EXCEEDED`（并告知今日已用/上限）。以**上传的页数（＝张数）**计，处理前先扣。这是免费推广期防止费用失控的第二道闸（第一道是 `max_instances`）。教师人数不设上限，所以理论最大日用量＝已批准教师数 × 每人上限，由 super admin 掌握。

---

## 10. 里程碑与验收标准

> 每个里程碑结束：① 所有测试通过；② 更新 `docs/STATUS.md`；③ 停止，等待 Wes 确认再进入下一个。

### M0 — 脚手架（预计半天）
- 建立第 4 节的目录、`pyproject.toml`、`.gitignore`、`scripts/setup.ps1`、`.github/copilot-instructions.md`（内容见第 11 节）。
- 在 `OfficeOMR` 根目录建立 `README.md`（见第 4 节命名约定）。
- 验收：`pytest` 能跑（即使只有一个占位测试）；`pip install -e .\core -e .\sheetgen` 成功；包发布名与导入名符合命名约定。

### M1 — 答案纸生成器
- 实现 `sheetgen`：生成 PDF + layout.json + preview.png（第 5 节），**两种版型（T100、T060）都要产出预览**。
- 验收：
  - 硬性约束检查全部通过，且有测试覆盖（故意给违规参数应报错）。
  - layout.json ↔ PDF 自检通过（第 5.5 节）。
  - Wes 实际打印一张，用尺量：定位点边距、气泡圆心误差 ≤ 0.5 mm（若打印被缩放则说明设定问题）。
  - **Wes 审阅两种版型的预览并确认版面**（A–E 加回印格是否拥挤、姓名线与分数框位置）后，才进入 M2。

### M2 — 识别核心（本地、干净输入）
- 实现 `omr_core`（第 6 节最简版本）与 `tools/recognize.py`。
- 验收：对「干净、无劣化」的合成图，题级准确率 100%，证号 100%；对 180° 翻转、±3° 旋转的图亦然。

### M3 — 合成测试与评估框架
- 实现 `make_synthetic.py`、`evaluate.py`、报告生成（第 8.2、8.5 节）。
- 迭代调参/改进，直到达到 8.4 表中「合成」两行的目标。
- 验收：产出一份完整评估报告；所有阈值已写入 config 并附评估依据。

### M4 — 真实扫描测试
- 产出 `docs/SCAN_GUIDE.md` 的实验设计，并由 Wes 提供真实扫描后跑评估（第 8.3 节）。
- 验收：达到 8.4 表中「真实扫描」目标；若未达到，报告列出前 10 类失败原因及建议（可能包括：修改答案纸版面、扫描设定、加强算法）。

### M5 — 云端最小版
- 实现 `functions/`、`web/`、rules、`sync_core.ps1`、`deploy.ps1`、Storage 生命周期。
- 验收：Wes 登录测试页，上传一张真实扫描，10 秒内看到结果；同一张图在云端与本地结果**逐位相同**；未登录/非白名单请求被拒绝。

### M6 — 管理系统：账号、角色与组织
- 登录与授权：Google 登录 → `claimAccess`（第 3.2 节流程）。教师页面不显示账号/昵称/头像；未批准者只看到「尚未开通，请向管理员申请」。
- Functions（均先验证 `role == super_admin`）：`approveTeacher(email, orgId)`、`revokeTeacher(email)`、`setUserActive`、`upsertOrg`、`updateGlobalSettings`。
- `tools/bootstrap_admin.py`：为 Wes 的账号设置 `super_admin` claim。
- Super admin 页面：
  1. **组织管理**：名称、代号、学号设定（位数/前置码）、选项数（4/5）、**可用版型（T100 / T060）与默认版型**、每人每天张数覆盖、启用。第一个组织预置：森美蘭芙蓉中華中學，学号 5 位数字、无前置码、选项 5、两种版型都开放。
  2. **教师管理**：邮箱白名单列表（新增/停用/删除/改组织，并可**单独设定某位教师的每日张数上限**）。
  3. **系统设置**：`settings/global` 的所有数值（第 9.4 节），可直接输入修改。
  4. **用量总览**：各教师今日已识别张数与上限。
- 用 Firebase Emulator Suite 为 rules 写单元测试。
- 验收：super admin 能建立组织、批准教师邮箱；已批准的 Google 账号登录后只看得到自己的组织；未批准账号登录后被拒且没有任何数据访问；教师调用管理函数被拒（`permission-denied`）；停用后立即失效；教师超过每日张数上限时被拒并显示今日用量；修改系统设置后**不重新部署**即生效；rules 测试全部通过。

### M7 — 教师端流程
- 教师页：① 选择版型（限组织开放者）、填考试名/科目 → 下载答案纸 PDF（证号位数、选项数取自所属组织；含姓名线、分数框、回印格）；② 上传扫描 → 识别 → 结果表（学号＋各题＋状态，`需复核` 高亮）＋标注图预览；③ **下载结果 CSV（UTF-8 带 BOM）与标注图 PDF，并显示「资料将在 X 小时后自动删除」**。第一阶段**不做**网页上手动更正答案，只高亮。
- 实作二维码解码（5.6 节）、配额、学生层面资料限时删除（9.4 节：每小时清理函数＋兜底机制）。
- 验收：以芙中教师账号生成的答案纸只有 5 列证号气泡且选项为 A–E；T060 版型可生成并识别；识别结果的学号为 5 位；超额时回传 `QUOTA_EXCEEDED`；图片、识别结果、分析在设定小时数后一并消失（Storage 文件与 Firestore 文档都要确认）；清理流程不影响 `papers/` 路径（以测试证明）。

### M8 — 阶段总结
- `docs/STATUS.md` 写：最终指标、已知限制、第二阶段建议（计分/统计/批量/多版型/多种学号格式等）。

> **关于顺序**：M0–M4（准确度，本机）与 M5–M7（云端与管理）互不依赖，可由 Wes 决定先后。建议先完成 M0–M3，因为识别准确度是最大风险；管理系统技术上比较熟悉。若 Wes 想先做管理系统，可在 M0 之后直接做 M6（M6 不依赖 M5 的识别函数，但 Functions 仍需 Blaze）。无论哪种顺序，仍然一次只做一个里程碑。

---

## 11. 工作规范（Copilot 必须遵守）

写入 `.github/copilot-instructions.md` 的内容（原样使用）：

```markdown
# Copilot 工作规则 —— OfficeOMR 项目

- 先读 docs/PLAN.md。一次只做一个里程碑；完成后更新 docs/STATUS.md 并停止。
- 不确定就问：写入 docs/OPEN_QUESTIONS.md，不要自行决定。偏离计划必须记录在 docs/DECISIONS.md。
- 终端命令一律使用 PowerShell (pwsh) 语法。
- layout.json 是坐标唯一来源：识别与生成代码中不得硬编码任何毫米/像素坐标。
- 所有阈值放在 core/omr_core/config.default.yaml，不得写死在代码里。
- 配额、保留期、教师人数上限等运营参数一律读取 Firestore `settings/global`，不得写死，修改后无需重新部署。
- 答案纸版面（含姓名线、分数框、回印格）一经 Wes 确认，不得擅自更动；更动须记录在 DECISIONS.md 并取得 Wes 同意。
- omr_core 不得 import firebase / google 任何云端库。
- 不得使用任何付费或按次计费的云端 API（见 PLAN.md 第 9.3 节黑名单）。
- 不得使用 PyMuPDF（AGPL）。新增依赖前先确认授权为 MIT/BSD/Apache 并记录。
- 每个函数需有单元测试；每个修复的失败案例需加入 core/tests/regression/。
- 不得把密钥、服务账号 JSON、.env 提交到 git。
- 建用户、改角色/组织、重设密码等权限操作，只能在 Cloud Functions 内用 Admin SDK 完成，并先校验调用者 role；客户端不得直接写 users/orgs。rules 不得放宽，且必须有 Emulator 测试。
- 保持简单：不要实作 PLAN.md 第 1.3 节列为「不做」的功能（目前只有 2 种角色，不要加第三种）。
- 注释与文件说明用简体中文，变量/函数名用英文。
```

**STATUS.md 固定格式**（让 Wes 能直接贴给 Claude 讨论）：
```markdown
## 当前里程碑：Mx
- 已完成：
- 评估指标（附报告文件名）：
- 已知问题 / 失败案例：
- 与计划不同之处（已记入 DECISIONS.md）：
- 需要 Wes 决定/提供：
- 下一步：
```

---

## 12. 需要 Wes 提供的支持与待决定事项

### 12.1 账号与环境（M5 之前完成即可，M0–M4 全部本地运行，不需要云端）
1. **Firebase 项目升级到 Blaze（按量付费）并绑定付款方式。** 官方说明 Cloud Functions 需要 Blaze；Cloud Storage for Firebase 也已要求 Blaze（请以控制台显示为准）。Blaze 仍保留免费额度，但需绑定信用卡。
2. 在 Google Cloud 控制台建立**预算提醒**（建议低额，例如 RM 10 / 约 US$ 3，门槛 50%、90%、100%）。再次提醒：这只会通知，不会自动停止。
3. 本机安装：Python 3.12、Node.js（Firebase CLI 需要）、`firebase-tools`、（可选）`gcloud`。
```powershell
npm install -g firebase-tools
firebase login
```

### 12.2 已确认事项（2026-11-02，Wes）

- 芙中学号＝5 位纯数字、无前置码；选项＝A–E；答案纸加「姓名」手写线（不参与识别）。
- 版型：`T100-A4-v1`（4 栏 × 25 行 = 100 题）与 `T060-A4-v1`（3 栏 × 20 行 = 60 题），由 super admin 按组织开放；版面先排出来看再最终确认。
- 答案纸预留**回印格**与**分数框**；学生回馈＝只印答错题的正确答案，**未作答视为答错并印出**（第 14.2 节）。
- 准确度目标：按 8.4 表执行。
- 登录：Google 账号＋super admin 预先批准的邮箱；不开放自由注册；不显示账号/昵称；教师自备 Google 账号。
- **教师账号数量不设上限**；限制的是**每位教师每天可识别的学生人数（张数），默认 100，后台可改**（全局、组织、个别教师三级）。
- **学生层面的资料（原图、识别结果、成绩与分析）一律只保留 24 小时，不提供永久保存，但必须提供下载。**
- **永久保存的只有「试卷（题目）与标准答案」**：题目以**整份 PDF** 保存，**仅出题教师本人可见**，供隔年同条件的班级再次使用（第 14.3 节）。

**目前没有阻碍 M0 开工的待确认事项。** 之后需要 Wes 确认的节点：M1 的版面预览（A–E 加回印格是否拥挤）、M5 前开通 Blaze、M4 的真实扫描实验。

### 12.3 需要 Wes 做的实验（M1、M4）
- **E0（M1）**：打印一张，确认复印机/打印机设定为「实际大小 100%」，并量尺寸。
- **E1（M4）扫描设定实验**：同一张已涂写的答案纸，用 Sharp MX-M564N 以不同设定扫描并比较：
  - 分辨率：200 / 300 dpi（建议 300）
  - 颜色模式：黑白 / 灰阶 / 全彩（若机器支持）
  - 影像模式：文字 / 文字+照片 / 自动
  - **关闭**「底色去除」「文字强化」类功能（可能把淡铅笔痕迹吃掉）
  - 输出：多页 PDF 或 JPEG
  - ADF（自动送纸）与平板玻璃各一次
  记录每种设定的识别结果，写入 `docs/SCAN_GUIDE.md`。
- **真实样本**：至少 30 张手涂答案纸（第 8.3 节）。

---

## 13. 附：Copilot 第一次对话建议的开场指令（Wes 可直接贴）

> 这是 OfficeOMR 项目（工作区根目录 `OfficeOMR`）。请先完整阅读 `docs/PLAN.md` 与 `.github/copilot-instructions.md`。从 M0 开始，只做 M0，完成后更新 `docs/STATUS.md` 并停下来。有任何计划中没写清楚的地方，请写进 `docs/OPEN_QUESTIONS.md`，不要自行假设。所有终端命令请用 PowerShell。

---

## 14. 第二、三阶段备忘（**第一阶段不实作**，抄入 `docs/FUTURE.md`）

### 14.1 班级分析报表（参考学校现用的 Borang IAGM600FC「Laporan Item Analisis」）
该表内容归纳：每题的班级答对率（Purata Kelas %，共 100 题）、分数分布（0–4.9%、5–9.9% … 100%，共 20 个区间的人数）、总分与班级平均。我们**不需要复制该表格式**，只需提供同样的数据：网页显示 + 导出 CSV/PDF。
前置条件：必须有「标准答案」。两种来源（第二阶段二选一或并存）：
1. **标准答案卡**：老师在一张答案纸上涂出正确答案，扫描后用同一套识别核心读取（不必另做输入界面）。
2. 网页手动输入/粘贴 100 题答案。

### 14.2 学生回馈：只印「答错的题」及其正确答案
需求（Wes）：学生拿回答案纸时，**一眼看出哪几题错了、正确答案是什么**；不需要把全部正确答案都印上去。

**设计**
- 答案纸每题已预留**回印格**，页头有**分数框**（第 5 节，M1 就要定，因为印出去后无法修改）。
- **回印 PDF**：与答案纸同尺寸（A4），**只在答错题的回印格里印出正确选项字母**（建议加粗或加框），分数框印分数，其余完全空白。
  - 答对：不印。未作答：视为答错并印出（Wes 已确认）。`ambiguous`/`multi`（需复核）的题：**不印**，并在教师页面提示先人工处理，避免印出错误信息。
- **打印方式**：把已扫描的原卷放回进纸盘，打印回印 PDF。先做实验 **E2** 测出这台复印机的进纸方向、正反面、上下翻转与 x/y 偏移，把校准值写成生成器参数 `--offset-x --offset-y --rotate`。回印格容错约 ±1.5 mm，E2 要验证能否稳定达到。
- **顺序保障**：回印 PDF 严格按 `batch_id` + `source_page_index` 排序（即扫描顺序）；每页在分数框旁印「第 n / 共 N 张」；老师翻看时用**姓名线与学号手写格**核对是否错位；打印前核对张数；扫描后到回印前纸叠不可洗牌；卡纸时整批重扫或按范围重印。
- **备用方案（完全没有对位与顺序风险）**：把学生**扫描图本身**加上同样的标注（错题旁印出正确答案），印在**新的一张纸**上交给学生。该页含学生手写姓名，天生自带身份；代价是多用一张纸和碳粉，且必须在图片保留期（≤ 24 小时，可由 super admin 调整）内生成。

两种方案共用同一份「错题清单」数据，先做哪一个，等 E2 实验结果再定。前置条件：必须有「标准答案」（14.1 节）。

### 14.3 试卷库（永久保存「题目与标准答案」；第二阶段实作）
Wes 的要求：永久保存的是**该份题目与答案**，不是学生成绩；老师隔年教到同样条件的班级时可再拿出来用。每次考试的学生结果与分析**只保留 24 小时**。

**两类资料完全分开**
| | 试卷库 `exams/{examId}` | 考试场次 `jobs`（学生层面） |
|---|---|---|
| 内容 | 题目文件、标准答案、科目、年级/班级条件、备注 | 学号、学生答案、成绩、分析、原图、标注图 |
| 保留 | **永久**（教师可删除/修改） | **24 小时**（`studentDataRetentionHours`），到期整批删除 |
| 含学生资料 | 否 | 是 |
| 存放 | Firestore `exams/` ＋ Storage `papers/{orgId}/{uid}/` | Firestore `jobs/` ＋ Storage `uploads/`、`annotated/` |

**`exams/{examId}` 数据模型（草案，第二阶段细化）**
```jsonc
{
  "ownerUid": "...", "orgId": "...",
  "title": "2026 华文 J3 上学期考试", "subject": "华文", "level": "J3", "notes": "",
  "templateId": "T100-A4-v1", "questionCount": 100, "optionCount": 5,
  "answerKey": ["A","C","B", ...],          // 长度必须等于 questionCount；每项不得超出 optionCount
  "paperFile": {"path": "papers/{orgId}/{uid}/{examId}.pdf", "mime": "application/pdf", "sizeBytes": 123456},  // 只接受 PDF
  "createdAt": ..., "updatedAt": ..., "lastUsedAt": ...
}
```
- 题目文件只接受**整份 PDF**（Wes 已确认），≤ `maxPaperFileMB`；每位教师最多 `maxExamsPerTeacher` 份。整份保存，**不拆题**。
- 每份试卷的标准答案可由「标准答案卡」扫描产生（14.1 节），也可网页输入。
- **再次使用流程**：教师在试卷库选一份试卷 →「再次使用」→ 自动带入科目/考试名生成答案纸 → 学生作答、扫描、识别 → 用该试卷的标准答案评分与分析（结果只留 24 小时，须下载）→ 隔年可「复制」试卷并修改条件标注。
- 一律经 Cloud Functions 或严格的 rules 控制：教师只能读写 `ownerUid == 自己` 的试卷（日后若要同校共享，再加 `sharedWithOrg` 栏位，现在不做）。
- **与学生资料的隔离要有测试**：清理函数不得删除 `papers/`；`exams/` 文档中不得出现学号或学生答案。

**第一阶段需要做的只有：** 设置里已预留 `maxExamsPerTeacher`、`maxPaperFileMB`；Storage 生命周期规则严格限定前缀（9.3 节）。试卷库本身第一阶段不实作。

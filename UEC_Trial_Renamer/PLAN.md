# 计划书：统考预考考卷自动命名工具（UEC_Trial_Renamer）

> 本文件是交接文件，接手者（VS Code 里的 Claude 或开发者）请先完整阅读，再看 `CLAUDE.md` 和 `markdown/` 最新一天的进度记录。
> 建立日期：2026-10-02

## 1. 目标

芙蓉中华中学（CHHS）每年统考预考的考卷与答案都是**扫描 PDF**（没有文字层）。
本工具要读取每个 PDF **第一页**的标题，自动判断「年级／科目／试卷／是否答案」，并依照固定规则产生新档名。

- 输入：一个资料夹（可含子资料夹）里的 PDF
- 输出：
  1. `rename_plan.csv`（旧名 → 新名、辨识到的栏位、信心度、警告）
  2. 使用者确认后，把档案**复制**到输出资料夹并改成新名（预设不动原档）
- 成功标准：用 `samples/2025/` 的 90 个样本测试，**自动判断正确率 ≥ 95%**，且所有判断不确定的档案都必须被标成「需人工确认」，不可以静默命名错误。

## 2. 命名规则（从 2025 年档案归纳）

```
{日期} TRIAL {年级} {科目} [{分组}] {试卷} [ANS].pdf
例：20251007 TRIAL J3 UGEO P1&P2 ANS.pdf
    20251007 TRIAL S3 ART 乙组 P2.pdf
```

| 栏位 | 值 | 说明 |
|---|---|---|
| 日期 | `YYYYMMDD` | 归档日期，不是考试日期。由参数 `--date` 指定，预设今天 |
| TRIAL | 固定 | |
| 年级 | `J3` / `S3` | 初中组 / 高中组 |
| 科目 | 见第 3 节 | |
| 分组 | `甲部` `乙部` `甲组` `乙组` `丙组` | 只有题目卷需要（J3 历史、S3 美术） |
| 试卷 | `P1` `P2` `P1&P2`；马来文用 `K1` `K2` | 一份答案涵盖两卷时用 `P1&P2` |
| ANS | 有或无 | 答案／评分标准 |

输出资料夹结构沿用 2025：`CHHS {年份} UEC J3/`、`CHHS {年份} UEC S3/`。

## 3. 科目对照表（之后放进 `config/subjects.json`，不要写死在程式里）

| 年级 | 档名代号 | 中文 | 科目代号 | 题目卷关键字 | 答案卷关键字（答案卷**没有**科目代号） |
|---|---|---|---|---|---|
| J3 | BC | 华文 | JY01 | 华文 | 华文 BC |
| J3 | BM | 马来文 | JY02 | BAHASA MALAYSIA | BAHASA MALAYSIA |
| J3 | BI | 英文 | JY03 | ENGLISH LANGUAGE | ENGLISH LANGUAGE |
| J3 | MATHS | 数学 | JC04 | 数学 | 统考数学 / UEC MATHS |
| J3 | USCI | 科学 | JC05 | 科学 | 统考科学 / UEC SCIENCE |
| J3 | UHIS | 历史 | JY06 | 历史 | 统考历史 / UHIS |
| J3 | UGEO | 地理 | JY07 | 地理 | 统考地理 / UGEO |
| J3 | ART | 美术 | JY08 | 美术 | 美术 |
| S3 | BC | 华文 | SY01 | 华文 | 华文 BC |
| S3 | BM | 马来文 | SY02 | BAHASA MALAYSIA | BAHASA MELAYU |
| S3 | BI | 英文 | SY03 | ENGLISH LANGUAGE | ENGLISH LANGUAGE |
| S3 | MATHS | 数学 | SC04 | 数学 | 统考数学 |
| S3 | ADV MATHS | 高级数学（商科班 C3A-D） | SC05 | 高级数学（无 I/II） | 统考高级数学 + 班级 C3A-D |
| S3 | ADV MATHS Ⅰ | 高级数学(I)（理科班 S3A-B） | SC06 | 高级数学(I) | 统考高级数学(I) / ADVANCED MATHS. (I) |
| S3 | ADV MATHS Ⅱ | 高级数学(II) | SC07 | 高级数学(II) | 统考高数II / ADV MATHS II |
| S3 | UBIO | 生物 | SC10 | 生物 | 统考生物 / UEC BIOLOGY |
| S3 | UCHEM | 化学 | SE11 | CHEMISTRY | 统考化学 / UEC CHEMISTRY |
| S3 | UPHY | 物理 | SE12 | PHYSICS | UEC PHYSICS |
| S3 | UBS | 商业学 | SC14 | 商业学 | 商业学 / UEC BUSINESS |
| S3 | UBK | 簿记与会计 | SE15 | BOOKKEEPING AND ACCOUNTS | 统考簿记 / UEC BOOKKEEPING |
| S3 | UECON | 经济学 | SY17 | 经济学 | 统考经济学 / UEC ECONOMICS |
| S3 | COMPUTING & IT | 电脑与资讯工艺 | SY18 | 电脑与资讯工艺 | 统考电脑与资讯 / COMPUTING & IT |
| S3 | UGEO | 地理 | SY09 | 地理 | 统考地理 / UGEO |
| S3 | UHIS | 历史 | SY08 | 历史 | 高中历史 / UEC HISTORY |
| S3 | ART | 美术 | SY19 | 美术 | 美术 |

注意：
- 科目代号前缀 `JY/JC` = 初中，`SY/SC/SE` = 高中，可直接决定年级。
- 「高级数学」有三种，必须先比对 (II)、再 (I)、最后才是无编号版；无编号版靠班级 `C3A-D` 区分。
- 罗马数字沿用 2025 档名的全形 `Ⅰ` `Ⅱ`（U+2160/U+2161），做成设定项 `roman_style`。

## 4. 第一页的版面类型（判断时要分开处理）

| 类型 | 特征 | 例子 |
|---|---|---|
| A 中文题目卷 | `初中组/高中组`、科目、`(JY07)`、`试卷一 选择题`、日期时间 | J3 UGEO P1 |
| B 英文/马来文题目卷 | `Junior/Senior Middle Level` 或 `Bahagian Menengah Rendah/Tinggi`、`(SE12)`、`PAPER 1` / `KERTAS 2` | S3 UPHY P1、BM K1 |
| C 答案卷（表格） | `考卷资料 Exam Paper Information` 表格 + `答案 SKEMA JAWAPAN MARKING SCHEME`；科目/试卷/时间/班级在表格里；**没有科目代号** | 大部分 ANS |
| D 答案卷（作答纸式） | `姓名 学号 班级 座号` + `试卷二 作答纸/答案卷`，已填入答案 | BC P2 ANS |
| E 封面写「正启本考卷答案」 | 题目卷版面，但有「答案」字样 | S3 ART P1 ANS |

## 5. 判断逻辑

1. **是否答案**：出现 `答案`、`SKEMA JAWAPAN`、`MARKING SCHEME`、`考卷答案`、`作答纸`（且有填写内容）任一 → ANS。
   注意题目卷的考生须知里不会有这些字，但要避免「答案纸」之类误判 → 只看第一页上方 40%。
2. **年级**：科目代号前缀 → `初中组/高中组` → `Junior/Senior` → `Menengah Rendah/Tinggi` → 班级 `J3A`=J3、`S3A/C3A/A3A`=S3。
3. **科目**：先找科目代号 `\((J|S)[YCE]\d{2}\)`（OCR 常把括号吃掉，也接受没有括号）；找不到才用关键字（长关键字优先）。
4. **试卷**：`试卷一/二`、`PAPER 1/2`、`KERTAS 1/2`、`1&2`、`1 & 2`、`P1&P2`。
   答案卷表格中的数字很小，OCR 可能漏掉（实测 J3 MATHS 答案卷 Paper 栏的「1」没读到）→ 后备方案：用「时间」栏（例如 `1HR 20MINS`）对照 `config/durations.json`（由 2025 题目卷建立），但这种推论只能给**低信心度**。
   答案卷的试卷栏为 `-` 或 `—` 时**意思不固定**：S3 UECON/UBS/UGEO 是一份答案涵盖两卷（`P1&P2`），但 J3 USCI 的 `-` 其实只是试卷一答案（时间 1HR 10MINS，只有选择题）。
   → 先看时间栏：出现两段时间（如 `P1: 45mins, P2: 2 hrs`、`1HR & 1HR 20MINS`）或时间等于两卷总和 → `P1&P2`；只等于某一卷 → 该卷。但有例外：S3 UGEO 答案时间写 1HR50MINS（只等于试卷二），实际却涵盖两卷，第一页同时出现「试卷一、选择题」和「试卷二、作答题」标题 → 同时出现两卷标题时以此为准。一律标 REVIEW。
5. **分组**：`甲部/乙部/甲组/乙组/丙组`，只在题目卷采用。
6. **信心度**：每个栏位各自记录来源（代号/关键字/推论），任何一栏是「推论」或缺失 → 整份标 `REVIEW`。

## 6. 技术选型（目标环境：Windows + PowerShell）

| 用途 | 套件 | 理由 |
|---|---|---|
| PDF 转图片 | `pymupdf` | pip 即可安装，不需要另外装 poppler |
| OCR | `rapidocr_onnxruntime` | pip 即可安装，中英文都准，不需要装 Tesseract；实测每页约 1 秒 |
| 其他 | 标准库 `csv` `json` `argparse` `pathlib` `re` `shutil` | |

只 OCR 第一页上方 **40%**、150 dpi。可用 `--crop` 调整。

OCR 文字前处理：全形转半形、去掉空白（OCR 常把 `UEC MATHS` 黏成 `UECMATHS`，比对时两边都去空白）、统一大写。

已验证（2026-10-02，在 Linux 测试环境）：RapidOCR 对 12 份代表性样本的标题都能正确读出，只有小字号数字偶尔遗漏。

## 7. 程式结构

```
UEC_Trial_Renamer/
├─ PLAN.md                  ← 本文件
├─ CLAUDE.md                ← 给 Claude 的工作守则
├─ requirements.txt
├─ config/
│  ├─ subjects.json         ← 第 3 节对照表
│  └─ durations.json        ← 试卷时间 → P1/P2 后备推论
├─ src/
│  ├─ ocr.py                ← PDF 第一页 → 文字（含快取 .cache/，避免重复 OCR）
│  ├─ classify.py           ← 文字 → {grade, subject, section, paper, is_answer, confidence, warnings}
│  ├─ naming.py             ← 栏位 → 档名；处理重名
│  ├─ main.py               ← CLI：scan / apply
│  └─ evaluate.py           ← 对 samples/2025/ground_truth.csv 计算正确率
├─ samples/2025/            ← 2025 原始档案（只读，不可修改）+ ground_truth.csv
├─ output/                  ← 改名后的输出
└─ markdown/YYYYMMDD/       ← 每日工作进度
```

## 8. 使用方式（CLI）

```powershell
# 1. 安装
python -m pip install -r requirements.txt

# 2. 试跑：只产生对照表，不动任何档案
python src/main.py scan "D:\统考预考2026原始档" --date 20261015 --out output\rename_plan.csv

# 3. 人工检查 rename_plan.csv（可在 Excel 直接修改 new_name 栏）

# 4. 正式执行：依 CSV 复制并改名到 output\2026\
python src/main.py apply output\rename_plan.csv --dest output\2026

# 5. 用 2025 样本测正确率
python src/evaluate.py
```

`rename_plan.csv` 栏位：`source_path, new_name, grade, subject, section, paper, is_answer, confidence(OK/REVIEW), warnings, ocr_text`
CSV 用 `utf-8-sig` 编码，Excel 打开中文才不会乱码。

`apply` 的安全规则：
- 预设**复制**，加 `--move` 才移动
- 目标档已存在 → 跳过并报告，绝不覆盖
- `confidence=REVIEW` 且使用者没改过的列 → 预设不处理，加 `--include-review` 才处理
- 两个来源算出同一个新名（例如两份都被判成 P1 ANS）→ 两份都标 REVIEW

## 9. 测试资料

`samples/2025/ground_truth.csv`：90 份样本的正确答案（档名已人工核对第一页）。
- `expected_name` 中日期以 `{DATE}` 表示
- 已修正 2025 档名的两个错误：
  - `J3 MATHS P1 ANS` ↔ `P2 ANS` 内容对调（第一页分别写着「试卷二」和「Paper 1」）
  - `S3 ADV MATS P2 ANS` 错字 → `ADV MATHS`
- `evaluate.py` 要输出：整体正确率、各栏位正确率、错误清单、被标 REVIEW 的清单（REVIEW 但答对 = 可接受；OK 但答错 = **严重**，必须为 0）。

## 10. 工作阶段（2 天内完成）

| 阶段 | 内容 | 完成条件 |
|---|---|---|
| 0 ✅ | 专案资料夹、样本、ground truth、本计划书 | 2026-10-02 已完成 |
| 1 ✅ | `requirements.txt`、`config/*.json`、`ocr.py`（含快取） | 2026-10-02 已完成 |
| 2 ✅ | `classify.py` + `naming.py` | 2026-10-02：正确率 100%（90/90），OK 但错 = 0 |
| 3 ✅ | `main.py` scan/apply + `watermark.py` + `gui.py` | 2026-10-02（Linux 测试环境验证） |
| 4 | **Windows 实测**：`pip install`、`python src\gui.py`、`evaluate.py` | 使用者在自己电脑跑通 |
| 5 | **封装 exe**：`build.ps1`（PyInstaller） | `dist\UEC_Trial_Renamer\UEC_Trial_Renamer.exe` 可开启并完成一次扫描＋执行 |
| 6 | 用 2026 新考卷实跑，依结果调整 `config/` | 使用者确认后正式改名 |

## 11. 已知风险

- 今年考卷版面若改变（例如答案卷表格改格式）→ 关键字放在 config，方便调整。
- 新科目或科目代号变动 → 认不出时标 REVIEW 并在 warnings 写出 OCR 原文，再补进 `subjects.json`。
- 扫描歪斜、模糊 → 可加 `--dpi 200` 重跑；仍失败就人工处理。
- 不要把 OCR 原文中的个人资料（学生姓名等）写入日志；第一页通常只有标题，风险低。


## 12. 追加需求与实作变更（2026-10-02）

### 12.1 水印（新需求）
- 2025 档案的水印是 Foxit 加的：校徽图（221×228 RGB），**置中、宽度 = 页宽 50%、透明度 30%、盖在扫描图上方、每一页都有**。
- 校徽已从 2025 档案取出：`assets/watermark_logo.png`。
- `src/watermark.py` 用 PyMuPDF 重现同样效果（同一张图在档案中只存一次）；会在 PDF metadata keywords 写入 `UEC_Trial_Renamer:watermark`，重复执行不会叠两层。
- 设定在 `config/settings.json` 的 `watermark`。已用去水印的 2025 档案测试，输出与原档目视一致。

### 12.2 可执行程式（新需求）
- `src/gui.py`：tkinter 视窗版（exe 的进入点）。流程：选来源资料夹 → 1. 扫描 → 表格检查（黄色 = REVIEW；点「处理」栏打勾；双击新档名修改；双击原档名开 PDF；可用 Excel 编辑对照表再重新载入）→ 2. 执行。
- `build.ps1`：建立 `.venv` → 安装套件 → PyInstaller `--onedir --windowed --collect-all rapidocr_onnxruntime` → 把 `config/`、`assets/`、`README.md` 复制到 exe 旁边 → 打包 zip。
- `src/paths.py`：打包后 `config/`、`assets/`、`.cache/` 都以 **exe 所在资料夹** 为根目录（使用者可直接改设定）。
- 已在 Linux 用 PyInstaller 打包 CLI 版验证可运作（RapidOCR 模型档有正确打包）。**Windows 版尚未实测**。

### 12.3 与原计划不同的地方
- 程式结构多了 `core.py`（CLI 与 GUI 共用）、`gui.py`、`watermark.py`、`paths.py`；`durations.json` 并入 `subjects.json` 的 `papers`（各卷考试分钟数），另加 `paper_hints`（答案卷内文关键字）。
- `apply` 不是用 `--include-review`，而是看 CSV 的 `action` 栏：`Y` 才处理（OK 预设 Y，REVIEW 预设空白）。
- 输出：`<输出资料夹>/CHHS {年} UEC {J3|S3}/<新档名>`，**一律复制**（GUI 勾「移动档案」或 CLI `--move` 才删除原档）。
- OCR 参数：RapidOCR 预设阈值会漏掉答案卷表格里单独的小数字（Paper 栏的「1」「2」），改用 `box_thresh=0.2, unclip_ratio=2.0, text_score=0.2`（`ocr.py` 的 `OCR_PARAMS`），正确率由 97.8% 提升到 100%。
- 「深度检查」：答案判为 P1 且页数 ≥ 3 时，OCR 第 2～5 页上方，若出现「试卷二／PAPER 2／甲组必答题」→ 改判 `P1&P2` 并标 REVIEW（抓到 2025 `S3 MATHS P1&P2 ANS` 这种表格写「试卷一」但其实含两卷的情况）。

### 12.4 已知限制／接手注意
- 规则是用 2025 年 90 份样本调出来的，今年版面若有变化，先看 GUI「说明」栏与 CSV 的 `ocr_text`、`sources` 栏，再调整 `config/subjects.json`。
- 今年各科考试时间若和 2025 不同，要更新 `subjects.json` 的 `papers` 分钟数（答案卷靠时间推论是哪一卷）。
- 页面有旋转（/Rotate）的扫描档，水印位置尚未测试。
- 2025 样本中这 8 份会是 REVIEW（属正常，需人工确认）：J3 ART P1 ANS、J3/S3 BC P2 ANS（作答纸式）、J3 USCI P1 ANS、S3 MATHS P1&P2 ANS、S3 UBS/UECON/UGEO P1&P2 ANS。

### 12.5 2026 实测后的修改（2026-10-02 傍晚）
- 新增 `samples/2026/`（S3 65 份 + ground_truth.csv）。evaluate：`python src\evaluate.py --samples samples\2026`。
- 会计 ACCOUNTING（SE16）沿用档名 **UBK**；`subjects.json` 支援 `codes`（多个代号）与考试时间清单。
- OCR 自动转向（横向／倒转扫描）；「试卷—」视为「试卷一」。
- 使用者决定：答案若被扫成两档（如物理 P1 表格 + P2 手写），**分开命名 P1 ANS / P2 ANS，不合并**。
- 详见 `markdown/20261002/工作进度.md`。

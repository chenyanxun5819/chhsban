# PDF Invigilation Marker 更新记录（2026-10-07）

## 本次修改目标

针对监考表 PDF 处理逻辑，调整为更适合「Excel 直接输出成 PDF」与「不同版型监考表」的做法，并修正执行档会弹出黑底 cmd 视窗的问题。

## 修改理念

这次的核心理念是：

1. **PDF 文字层优先，OCR 仅作为后备**
   - 如果 PDF 本身是由 Excel 直接输出，PDF 内通常已经带有可读取的文字层。
   - 这种情况下，不应该再优先走 OCR，因为 OCR 会引入误判。
   - 因此新版流程会先直接读取 PDF 中每个文字的内容与座标，直接定位老师代号。
   - 只有在 PDF 没有可用文字层时，才退回 OCR。

2. **老师清单去重以“人物代号”做唯一键**
   - 老师名单会更换，但代号仍然是系统中的稳定识别键。
   - 所以流程以 `老师名单.xlsx` 的 `代号 Initial` 为唯一识别基准。
   - 排班 Excel 只负责提供“这次有哪些老师出现”，不会直接把 `去重` 工作表当成最终输入来源。

3. **排班 Excel 只负责辅助推断，不直接主导输出**
   - 同资料夹若存在排班 Excel，程式会从主表逐格扫描老师代号并自动去重。
   - 但真正的标记位置，仍然以 PDF 实际位置为准。
   - 这样可以兼顾：
     - Excel 去重
     - PDF 位置判断
     - 不同版型适应能力

4. **GUI 执行体验优先**
   - 之前为了方便命令列验证，执行档被打成了 console 模式。
   - 所以双击执行时会额外跳出一个黑底 cmd 背景视窗。
   - 现在已改回 windowed 模式，双击 GUI 时不会再出现该背景视窗。

## 实际修改内容

### 0. 调整标签与星号的可调式版面参数

修改档案：
- [models.py](../../pdf_invigilation_marker/app/models.py)
- [config_store.py](../../pdf_invigilation_marker/app/config_store.py)
- [excel_importer.py](../../pdf_invigilation_marker/app/excel_importer.py)
- [main_window.py](../../pdf_invigilation_marker/app/main_window.py)
- [pdf_processor.py](../../pdf_invigilation_marker/app/pdf_processor.py)

说明：

- 将左上角标签位置拆成可独立调整的 `X / Y`
- 将标签字体大小、栏位间距做成 GUI 可见可改的设定
- 栏位间距改成动态排版，不再使用固定过宽的 Tab 效果
- `*` 标记改为以命中字框的中线为基准置中，避免离名字太远

### 1. 处理逻辑改为“文字层优先”

修改档案：
- [pdf_processor.py](../../pdf_invigilation_marker/app/pdf_processor.py)

主要调整：

- 新增 PDF 文字层直接侦测老师代号的流程
- 若命中老师代号，则直接使用 PDF 文字座标作为 `*` 标记位置
- 只有在文字层抓不到老师代号时，才进入 OCR 流程

### 2. 保留 Excel 自动去重，但不直接使用“去重”工作表

修改档案：
- [pdf_processor.py](../../pdf_invigilation_marker/app/pdf_processor.py)

主要调整：

- 从同资料夹的排班 Excel 主表逐格扫描老师代号
- 自动去重后形成“本次候选老师集合”
- 如果 PDF 本身已有可用文字层，则最终输出页数与老师集合会优先以 PDF 实际命中的老师为准

### 3. 修正 GUI 描述文案

修改档案：
- [main_window.py](../../pdf_invigilation_marker/app/main_window.py)

说明：

- 画面说明已更新为“优先读取文字层定位老师代号，必要时才回退 OCR”

### 4. 修正打包行为，取消黑底 cmd 视窗

修改档案：
- [build.py](../../pdf_invigilation_marker/build.py)

说明：

- PyInstaller 改回 `--windowed`
- 双击执行 GUI 时，不再出现额外的黑底 cmd 视窗

### 5. 更新说明文件

修改档案：
- [README.md](../../pdf_invigilation_marker/README.md)

内容同步更新为：

- 新专案路径：`D:\chhsban\pdf_invigilation_marker`
- 文字层优先 / OCR 后备
- 不直接使用 `去重` 工作表
- GUI 执行档为无主控台视窗版本
- 标签位置 / 字号 / 间距可在 GUI 中直接查看与调整

## 本次验证结果

### 验证 1：旧版型 PDF

输入：
- [监考表旧.pdf](../PDF-Invigilation-Marker/监考表旧.pdf)

结果：
- PDF 文字层可直接命中 **99 位老师**
- 程式明确记录：**优先采用文字座标定位**

输出：
- [old_direct_pdf_marked.pdf](../PDF-Invigilation-Marker/old_direct_pdf_marked.pdf)

### 验证 2：新版型 PDF

输入：
- [2809 - 2909年度统考预考监考时间表Invigilation of the UEC Trial Examination 2026.pdf](../PDF-Invigilation-Marker/2809%20-%202909年度统考预考监考时间表Invigilation%20of%20the%20UEC%20Trial%20Examination%202026.pdf)

结果：
- PDF 文字层可直接命中 **29 位老师**
- 同样走的是 **文字层优先**，不是 OCR

输出：
- [direct_pdf_marked.pdf](../PDF-Invigilation-Marker/direct_pdf_marked.pdf)

### 验证 3：执行档重新打包

执行档：
- [PDF监考名单标记工具.exe](../../pdf_invigilation_marker/dist/PDF监考名单标记工具.exe)

验证结果：
- 已重新打包
- 已可启动 GUI
- 打包时间为 2026-10-07 12:39 左右

### 验证 4：版面参数可视化与动态间距

结果：

- GUI 已新增可见设定：
  - 左上角标签 `X`
  - 左上角标签 `Y`
  - 字体大小
  - 栏位间距
- 标签现在会依文字长度动态排列：
  - `姓名`
  - `代号`
  - `座号`
- `*` 标记改成贴近代号中线显示，不再偏到左侧太远

### 6. 降低记忆体占用：OCR 延迟初始化

修改档案：
- [pdf_processor.py](../../pdf_invigilation_marker/app/pdf_processor.py)

说明：

- 之前即使 PDF 已经有可用文字层，程式仍会先建立 OCR 引擎。
- OCR 引擎会载入 ONNX / 图像处理相关模型，启动时就会占用一大块记忆体。
- 现在改成：
  - 先尝试 PDF 文字层
  - 只有真的抓不到文字层老师代号时，才初始化 OCR
- 因此：
  - 调整标签位置本身不会显著增加记忆体
  - 真正的记忆体压力主要来自 OCR 初始化与大图切块识别

### 7. 新增“仅文字层模式”

修改档案：
- [models.py](../../pdf_invigilation_marker/app/models.py)
- [config_store.py](../../pdf_invigilation_marker/app/config_store.py)
- [main_window.py](../../pdf_invigilation_marker/app/main_window.py)
- [pdf_processor.py](../../pdf_invigilation_marker/app/pdf_processor.py)

说明：

- GUI 已新增 **「仅文字层模式」** 开关
- 开启后：
  - 只读取 PDF 文字层
  - 不会回退 OCR
  - 可避免 OCR 带来的额外记忆体占用与误判

### 8. 修正标签与星号显示问题

说明：

- 左上角标签改为**透明底色**
- X / Y / 字体大小 / 栏位间距会在处理前自动套用当前 GUI 数值
- `*` 改为直接依命中字框中心绘制，避免因为文字盒限制而看不到
- 中文标签宽度改为使用 CJK 估宽，避免中文姓名与代号挤在一起
- `*` 改成放在文字左侧，放大约 3 倍，并保留约 3 单位距离

### 9. 新增标签锚点与星号 GUI 参数

说明：

- GUI 现可直接调整：
  - 标签锚点（左上角 / 左下角）
  - 标签 X / Y
  - 标签字体大小
  - 标签栏位间距
  - 星号倍率
  - 星号距离
  - 星号 Y 偏移
- 左下角锚点更适合不同 A4 / A3 版型，因为较少被上方考试标题遮挡

### 10. 修正 99 / 101 漏人问题

说明：

- 问题根因不是 OCR，而是旧逻辑只接受“老师主档中的原始代号”做精确匹配。
- 因此当排班表 / PDF 中出现：
  - `粱`（实际应对到主档 `梁`）
  - `霜`（实际应对到老师 `洪宇霜`）
 这类**别名字码 / 异体字 / 姓名尾字简称**时，就会被旧逻辑过滤掉，造成 101 人只输出 99 人。

这次修正后新增了两层机制：

1. **代号正规化**
   - 例如 `粱 -> 梁`

2. **老师别名查找**
   - 除主档原始代号外，也接受老师姓名最后一个中文字作为候选别名
   - 例如 `洪宇霜 -> 霜`

修正后：

- 旧版 PDF 输出人数已从 **99** 回到 **101**
- 对应补回的 2 人为：
  - `粱 / 梁` → 林俊梁
  - `霜 / 洪` → 洪宇霜

### 11. 新增“未知代码检查”与 `!` 标签保底输出

说明：

- 选择输入 PDF 后，GUI 会自动检查这次监考清单中哪些代码在老师名单里找不到。
- 若找不到：
  - 会先在 GUI 检查区提示操作人员
  - 即使操作人员没有修正，系统生成 PDF 时也**不会漏印该人**
  - 该人的标签会改成只显示 `!代码`
  - 表格中的代码位置仍会照常加上 `*`

这样即使资料表对不到，也不会发生“少印人”的情况。

## 目前结论

这次已经把处理方向改成更正确的架构：

- **不再把 OCR 当主流程**
- **先读 PDF 文字层**
- **Excel 负责辅助去重**
- **PDF 负责最终位置判断**
- **执行档不再弹出 cmd 背景视窗**

## 下一步建议

后续若再给新的排班表与 PDF，可继续验证：

1. 不同版型下文字层能否稳定抓到老师代号
2. 若主表与老师主名单存在代号差异，是否需要增加“代号别名字典”
3. 是否要进一步把“无座位区块的特殊地点”加入独立排序规则

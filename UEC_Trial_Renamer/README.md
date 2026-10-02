# 统考预考考卷命名工具（UEC_Trial_Renamer）

把扫描好的统考预考考卷／答案 PDF，自动读取第一页标题，改成统一档名，并加上学校水印。

```
20261015 TRIAL J3 UGEO P1.pdf
20261015 TRIAL S3 ART 乙组 P2.pdf
20261015 TRIAL S3 UPHY P1&P2 ANS.pdf
```

## 一、使用 exe（一般使用者）

1. 打开 `UEC_Trial_Renamer.exe`。
2. 「来源资料夹」选扫描好的 PDF 资料夹（可以有子资料夹）。
3. 「输出资料夹」：预设是来源旁边的 `已命名_日期`。
4. 「档名日期」：填归档日期（例如 20261015）。
5. 按 **1. 扫描**，每份约 1 秒。
6. 检查表格：
   - 白色 = 程式有把握，已打勾。
   - **黄色 = 需人工确认**，请看「说明」栏，确认无误后点「处理」栏打勾。
   - 双击「新档名」可以修改；双击「原档名」可以开启 PDF 查看。
   - 也可以按「用 Excel 开启对照表」修改，存档后按「重新载入对照表」。
7. 按 **2. 执行**：档案会**复制**到输出资料夹，依年级分成 `CHHS 2026 UEC J3`、`CHHS 2026 UEC S3`，并加上水印。原档不会被修改（除非勾选「移动档案」）。
8. 输出资料夹里会有 `rename_plan.csv`（对照表）和 `执行结果.csv`。

> 输出资料夹已经有同名档案时，程式会跳过，不会覆盖。

## 二、指令列（开发／进阶）

```powershell
python -m pip install -r requirements.txt

python src\main.py scan "D:\扫描档" --date 20261015 --out output\rename_plan.csv
python src\main.py apply output\rename_plan.csv --dest "D:\已命名"
python src\main.py watermark "D:\某档.pdf" --out "D:\某档_水印.pdf"
python src\gui.py                 # 开启视窗版
python src\evaluate.py            # 用 2025 样本测试正确率
```

## 三、设定（不用改程式）

- `config\subjects.json`：科目、科目代号、答案卷关键字、各卷考试时间（分钟）。
  **每年考试时间若有改变，请更新 `papers` 的分钟数**，程式会用它来判断答案卷是哪一卷。
- `config\settings.json`：档名格式、资料夹格式、水印大小／透明度、OCR 参数。
- `assets\watermark_logo.png`：水印图（从 2025 年档案取出的校徽）。

## 四、封装成 exe

```powershell
pwsh -ExecutionPolicy Bypass -File .\build.ps1
```

产出 `dist\UEC_Trial_Renamer\`（整个资料夹一起复制）与 `dist\UEC_Trial_Renamer.zip`。
若别台电脑打不开，可能缺 Microsoft Visual C++ Redistributable（x64），安装后再试。

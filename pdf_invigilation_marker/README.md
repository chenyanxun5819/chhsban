# PDF 监考名单标记工具

这个工具会：

1. 让使用者自行选择任意监考 PDF。
2. 读取内建设定或匯入的老师名单 Excel。
3. 如果 PDF 同资料夹内有包含 **「去重」** 工作表的 Excel，会优先用它锁定输出老师清单与页数。
4. 用 OCR 从扫描 PDF 找出老师代号位置。
5. 依座位区块排序后，为每位老师输出独立标记页。
5. 另存新的 PDF，并可再用 PyInstaller 打包成 `.exe`。

## 资料设定

- 内建设定：`data/default_config.json`
- 使用者设定：`%APPDATA%/.pdf_invigilation_marker/config.json`

若老师名单或座位区块有变动，可直接在程式内按 **「匯入老师名单 Excel」** 重新匯入，或手动修改使用者设定 JSON。

若输入 PDF 同资料夹内存在带有 **「去重」** 工作表的 Excel，程式会自动：

- 以「去重」中的老师代号作为输出页清单
- 即使某位老师 OCR 没抓到位置，也保留该老师的一页
- 左上角标签仍优先以老师名单主档中的姓名 / 代号 / 座号为准

## 启动 GUI

```powershell
d:\chhsban\chhsban-acadoc\.venv\Scripts\python.exe d:\chhsban\chhsban-acadoc\pdf_invigilation_marker\main.py
```

## 命令列处理

```powershell
d:\chhsban\chhsban-acadoc\.venv\Scripts\python.exe d:\chhsban\chhsban-acadoc\pdf_invigilation_marker\main.py `
  --input "D:\path\input.pdf" `
  --output "D:\path\output.pdf"
```

## 匯入 Excel 设定

```powershell
d:\chhsban\chhsban-acadoc\.venv\Scripts\python.exe d:\chhsban\chhsban-acadoc\pdf_invigilation_marker\main.py `
  --import-excel "D:\path\老师名单.xlsx"
```

## 打包成可执行档

```powershell
d:\chhsban\chhsban-acadoc\.venv\Scripts\python.exe d:\chhsban\chhsban-acadoc\pdf_invigilation_marker\build.py
```

输出档会在 `pdf_invigilation_marker/dist/PDF监考名单标记工具.exe`。

> 目前 exe 采用主控台模式打包，这样命令列处理与错误讯息会比较稳定；双击时仍会开启图形介面。

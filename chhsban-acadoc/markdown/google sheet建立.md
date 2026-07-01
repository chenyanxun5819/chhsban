用 pdfplumber 抓取現有文字的座標（推薦）
如果你的 PDF 上已經有文字或欄位，可以用 Python 的 pdfplumber 精確抓出每個字元的位置：
pythonimport pdfplumber

with pdfplumber.open("your.pdf") as pdf:
    page = pdf.pages[0]
    
    # 抓取所有文字的座標
    for word in page.extract_words():
        print(f"文字: {word['text']}")
        print(f"  x0={word['x0']:.1f}, y0={word['top']:.1f}")
        print(f"  x1={word['x1']:.1f}, y1={word['bottom']:.1f}")

⚠️ 注意：pdfplumber 的 top 是從頁面頂部算下來的距離，但 pdf-lib 需要從底部算。

換算公式：
pythonpage_height = float(page.height)
pdf_lib_y = page_height - word['bottom']  # pdfplumber → pdf-lib 座標轉換


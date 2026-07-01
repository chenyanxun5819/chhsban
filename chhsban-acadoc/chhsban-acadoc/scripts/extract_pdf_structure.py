import pdfplumber
import json
from collections import defaultdict

pdf_path = r"c:\chhsban-acadoc\template\校内教师培训申请表中文版.pdf"

with pdfplumber.open(pdf_path) as pdf:
    page = pdf.pages[0]
    page_height = page.height
    page_width = page.width
    
    print(f"页面尺寸: {page_width} x {page_height}")
    print(f"{'='*100}")
    
    # 提取所有文字及其位置
    words = page.extract_words()
    
    # 按 y 坐标分组（每一行）
    lines = defaultdict(list)
    for word in words:
        y_key = round(word['top'], -1)  # 四舍五入到最近的 10
        lines[y_key].append(word)
    
    # 按 y 坐标排序并打印
    print("【文字内容和位置】")
    print(f"{'序号':<5} {'Y坐标':<8} {'X范围':<20} {'文本':<30} {'类型':<10}")
    print(f"{'-'*100}")
    
    idx = 1
    for y in sorted(lines.keys()):
        row_words = sorted(lines[y], key=lambda w: w['x0'])
        
        # 合并同一行的相邻单词
        merged = []
        for word in row_words:
            if merged and word['x0'] - merged[-1]['x1'] < 5:  # 距离 < 5 则合并
                merged[-1]['text'] += word['text']
                merged[-1]['x1'] = word['x1']
            else:
                merged.append(word)
        
        for word in merged:
            x_range = f"{word['x0']:.0f}-{word['x1']:.0f}"
            # pdf-lib 坐标（从底部起算）
            y_from_bottom = page_height - word['bottom']
            print(f"{idx:<5} {y_from_bottom:<8.0f} {x_range:<20} {word['text']:<30} text")
            idx += 1
    
    print(f"\n{'='*100}")
    print("【表格结构（Rects）】")
    rects = page.rects
    
    print(f"检测到 {len(rects)} 个矩形框")
    for i, rect in enumerate(rects[:20]):  # 只显示前 20 个
        x0, top, x1, bottom = rect
        y_from_bottom = page_height - bottom
        width = x1 - x0
        height = bottom - top
        print(f"  矩形 {i}: 位置({x0:.1f}, {y_from_bottom:.1f}) 大小({width:.1f}x{height:.1f})")
    
    # 尝试提取表格
    print(f"\n{'='*100}")
    print("【检测到的表格】")
    tables = page.extract_tables()
    
    if tables:
        for t_idx, table in enumerate(tables):
            print(f"\n表格 {t_idx}:")
            for r_idx, row in enumerate(table[:3]):  # 只显示前 3 行
                print(f"  行 {r_idx}: {row}")
    else:
        print("未检测到表格结构")
    
    # 保存详细的 JSON 数据用于后续处理
    output_data = {
        "page_height": page_height,
        "page_width": page_width,
        "words": [
            {
                "text": w['text'],
                "x0": w['x0'],
                "x1": w['x1'],
                "y_top": w['top'],
                "y_bottom": w['bottom'],
                "y_from_bottom": page_height - w['bottom']
            }
            for w in words
        ],
        "tables": tables
    }
    
    with open(r"c:\chhsban-acadoc\scripts\pdf_structure_output.json", "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n详细数据已保存到: pdf_structure_output.json")

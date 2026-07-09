#!/usr/bin/env python3
"""
靜態 PDF 座標提取工具
用來分析 Template_tution.pdf 的物理結構和可能的文字填充區域
"""

import json
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("❌ 需要安裝 pypdf: pip install pypdf")
    exit(1)

def analyze_pdf_structure(pdf_path):
    """分析 PDF 的物理結構"""
    
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"❌ 檔案不存在: {pdf_path}")
        return None
    
    print(f"📄 分析 PDF: {pdf_path}\n")
    
    try:
        with open(pdf_path, 'rb') as f:
            pdf_reader = PdfReader(f)
            
            num_pages = len(pdf_reader.pages)
            print(f"✅ 頁數: {num_pages}\n")
            
            # 分析每一頁的尺寸和內容
            for page_num, page in enumerate(pdf_reader.pages, 1):
                print(f"🔍 第 {page_num} 頁:")
                
                # 頁面尺寸
                mediabox = page.mediabox
                width = float(mediabox.width)
                height = float(mediabox.height)
                print(f"   尺寸: {width:.0f} x {height:.0f} points")
                print(f"   (換算: {width/72:.1f}\" x {height/72:.1f}\")")
                
                # 提取文本位置
                text = page.extract_text()
                if text:
                    lines = text.split('\n')
                    print(f"   文字行數: {len(lines)}")
                    if len(lines) > 0:
                        print(f"   首行: {lines[0][:50]}")
                
                # 提取資源（可能的圖片或表單元素）
                if "/Resources" in page:
                    resources = page["/Resources"]
                    if "/Font" in resources:
                        print(f"   字體數: {len(resources['/Font'])}")
                
                print()
            
            return {
                "template_name": "Template_tution",
                "total_pages": num_pages,
                "page_dimensions": [
                    {
                        "page": i+1,
                        "width": float(pdf_reader.pages[i].mediabox.width),
                        "height": float(pdf_reader.pages[i].mediabox.height)
                    }
                    for i in range(num_pages)
                ]
            }
                
    except Exception as e:
        print(f"❌ 分析失敗: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    pdf_path = r"D:\chhsban\chhsban-tution\Template_tution.pdf"
    
    print("=" * 70)
    print("靜態 PDF 物理結構分析工具")
    print("=" * 70)
    print()
    
    result = analyze_pdf_structure(pdf_path)
    
    if result:
        # 保存結果
        output_path = Path("d:\\chhsban\\chhsban-markdown\\260709\\pdf_structure_analysis.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 結果已保存到: {output_path}")
        print("\n📝 下一步：")
        print("   1. 根據 PDF 視覺檢查，確認各栏位位置")
        print("   2. 提供栏位列表和座標")
        print("   3. 建立 tution-pdf-fields.json 映射表")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
PDF 欄位掃描工具
用來提取 Template_tution.pdf 的所有表單欄位及其座標
"""

import json
import sys
from pathlib import Path

try:
    import PyPDF2
except ImportError:
    print("❌ 需要安裝 PyPDF2: pip install PyPDF2")
    sys.exit(1)

def scan_pdf_fields(pdf_path):
    """掃描 PDF 的所有表單欄位"""
    
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"❌ 檔案不存在: {pdf_path}")
        return None
    
    print(f"📄 掃描 PDF: {pdf_path}")
    
    try:
        with open(pdf_path, 'rb') as f:
            pdf_reader = PyPDF2.PdfReader(f)
            
            # 獲取基本信息
            num_pages = len(pdf_reader.pages)
            print(f"✓ 頁數: {num_pages}")
            
            # 獲取表單欄位
            if "/AcroForm" in pdf_reader.trailer["/Root"]:
                fields = pdf_reader.trailer["/Root"]["/AcroForm"]["/Fields"]
                print(f"✓ 找到 {len(fields)} 個表單欄位\n")
                
                field_list = []
                for i, field_ref in enumerate(fields, 1):
                    field_obj = field_ref.get_object()
                    field_name = field_obj.get("/T")
                    field_type = field_obj.get("/FT")
                    
                    # 嘗試獲取位置信息
                    rect = field_obj.get("/Rect")
                    page_ref = field_obj.get("/P")
                    
                    if field_name:
                        field_name = field_name[1:-1] if isinstance(field_name, str) else str(field_name)
                    
                    print(f"{i}. {field_name}")
                    print(f"   類型: {field_type}")
                    if rect:
                        print(f"   位置: {rect}")
                    
                    field_list.append({
                        "field_id": field_name,
                        "pdf_field_name": field_name,
                        "field_type": str(field_type) if field_type else "unknown",
                        "rect": str(rect) if rect else None,
                    })
                    print()
                
                return {
                    "template_name": "Template_tution",
                    "total_pages": num_pages,
                    "total_fields": len(field_list),
                    "fields": field_list
                }
            else:
                print("⚠️  此 PDF 沒有表單欄位 (AcroForm)")
                return None
                
    except Exception as e:
        print(f"❌ 掃描失敗: {e}")
        return None

def main():
    pdf_path = r"D:\chhsban\chhsban-tution\Template_tution.pdf"
    
    print("=" * 60)
    print("PDF 表單欄位掃描工具")
    print("=" * 60)
    print()
    
    result = scan_pdf_fields(pdf_path)
    
    if result:
        # 保存為 JSON
        output_path = Path("d:\\chhsban\\chhsban-markdown\\260709\\pdf_fields_scan.json")
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 掃描結果已保存到: {output_path}")
    else:
        print("\n⚠️  無法掃描 PDF 欄位")

if __name__ == "__main__":
    main()

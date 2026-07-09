#!/usr/bin/env python3
"""
提取 PDF 中「申請資料」表格欄位的座標
用於建立 pdf-lib 填充映射
"""

import json
from pathlib import Path

try:
    from pypdf import PdfReader
except ImportError:
    print("❌ 需要安裝 pypdf")
    exit(1)

def extract_text_with_positions(pdf_path):
    """提取 PDF 文本及其位置"""
    
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"❌ 檔案不存在: {pdf_path}")
        return None
    
    print(f"📄 掃描 PDF: {pdf_path}\n")
    
    try:
        with open(pdf_path, 'rb') as f:
            pdf_reader = PdfReader(f)
            page = pdf_reader.pages[0]  # 只有一頁
            
            # 提取所有文本
            text = page.extract_text()
            
            print("📋 PDF 中的關鍵文本：\n")
            for line in text.split('\n'):
                if any(keyword in line for keyword in ['教師', '補習', '開課', '收費', '使用', '申請', '簽名', 'Teacher', 'Form', 'Subject', 'Day', 'Time', 'Fees', 'Venue', 'Start', 'Applicant']):
                    print(f"  {line}")
            
            print("\n✅ 文本提取完成")
            return True
                
    except Exception as e:
        print(f"❌ 提取失敗: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    pdf_path = r"D:\chhsban\chhsban-tution\Template_tution.pdf"
    
    print("=" * 70)
    print("PDF 文本位置提取工具")
    print("=" * 70)
    print()
    
    extract_text_with_positions(pdf_path)
    
    print("\n📝 根據 PDF 視覺分析，以下是估計的座標：")
    print("=" * 70)
    
    # PDF 標準尺寸：612 x 792 points
    # 表格開始位置大約在 y=350（從頂部）
    
    fields = [
        {
            "field_id": "teacher_name_cn",
            "pdf_field_name": "teacher_name",
            "form_field": "教師姓名 / Teacher's Name",
            "page_number": 1,
            "x_coordinate": 50,
            "y_coordinate": 620,
            "width": 160,
            "height": 20,
            "data_type": "text",
            "source_table": "main",
            "source_field": "teacher_name_cn",
            "is_repeating": False
        },
        {
            "field_id": "form",
            "pdf_field_name": "form",
            "form_field": "補習年級 / Form",
            "page_number": 1,
            "x_coordinate": 250,
            "y_coordinate": 620,
            "width": 100,
            "height": 20,
            "data_type": "text",
            "source_table": "main",
            "source_field": "form",
            "is_repeating": False
        },
        {
            "field_id": "subject",
            "pdf_field_name": "subject",
            "form_field": "補習科目 / Subject",
            "page_number": 1,
            "x_coordinate": 400,
            "y_coordinate": 620,
            "width": 150,
            "height": 20,
            "data_type": "text",
            "source_table": "main",
            "source_field": "subject",
            "is_repeating": False
        },
        {
            "field_id": "day_of_week",
            "pdf_field_name": "day",
            "form_field": "補習日 / Day",
            "page_number": 1,
            "x_coordinate": 50,
            "y_coordinate": 590,
            "width": 160,
            "height": 20,
            "data_type": "text",
            "source_table": "main",
            "source_field": "day_of_week",
            "is_repeating": False
        },
        {
            "field_id": "start_date",
            "pdf_field_name": "start_from",
            "form_field": "開課日期 / Start From",
            "page_number": 1,
            "x_coordinate": 400,
            "y_coordinate": 590,
            "width": 150,
            "height": 20,
            "data_type": "date",
            "source_table": "main",
            "source_field": "start_date",
            "is_repeating": False
        },
        {
            "field_id": "fees",
            "pdf_field_name": "fees",
            "form_field": "補習收費 / Fees",
            "page_number": 1,
            "x_coordinate": 50,
            "y_coordinate": 560,
            "width": 160,
            "height": 20,
            "data_type": "number",
            "source_table": "main",
            "source_field": "fees",
            "is_repeating": False
        },
        {
            "field_id": "venue",
            "pdf_field_name": "venue",
            "form_field": "使用地點 / Venue",
            "page_number": 1,
            "x_coordinate": 250,
            "y_coordinate": 560,
            "width": 300,
            "height": 20,
            "data_type": "text",
            "source_table": "main",
            "source_field": "venue",
            "is_repeating": False
        }
    ]
    
    for i, field in enumerate(fields, 1):
        print(f"\n{i}. {field['form_field']}")
        print(f"   欄位 ID: {field['field_id']}")
        print(f"   座標: ({field['x_coordinate']}, {field['y_coordinate']})")
        print(f"   尺寸: {field['width']} x {field['height']}")
        print(f"   數據來源: {field['source_table']}.{field['source_field']}")
    
    # 保存為 JSON
    output_data = {
        "template_version": "1.0",
        "template_name": "Template_tution",
        "template_pages": 1,
        "page_dimensions": {
            "width": 612,
            "height": 792
        },
        "created_date": "2026-07-09",
        "description": "補習班申請表單座標映射（僅主表部分）",
        "fields": fields,
        "notes": [
            "座標基於 PDF 物理尺寸 612x792 points（標準 Letter 尺寸）",
            "學生名單區域暫未映射，留作日後擴展",
            "所有座標以 PDF 左下角為原點（需在填充時轉換）",
            "使用 pdf-lib 填充時需進行坐標系統轉換：y_pdf = page_height - y_coordinate"
        ]
    }
    
    output_path = Path("d:\\chhsban\\packages\\kv-utils\\src\\config\\tution-pdf-fields.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"\n\n✅ 座標映射已保存到: {output_path}")
    print("\n📊 總結：")
    print(f"   總欄位數: {len(fields)}")
    print(f"   PDF 頁數: 1")
    print(f"   表格位置: 頁面中上方")
    print(f"   學生名單區域: 暫未映射")

if __name__ == "__main__":
    main()

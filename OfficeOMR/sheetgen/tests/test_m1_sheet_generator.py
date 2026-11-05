"""
M1 - 答案纸生成器测试

验收标准：
1. 硬性约束检查全部通过，且有测试覆盖（故意给违规参数应报错）
2. layout.json ↔ PDF 自检通过
3. 两种版型都能正常生成
"""

import pytest
import json
from pathlib import Path
from sheetgen.layout import TemplatePresets, LayoutConfig
from sheetgen.builder import build_sheet, generate_pdf, generate_preview_png


class TestLayoutConstraints:
    """测试硬性约束检查"""
    
    def test_bubble_diameter_constraint(self):
        """气泡直径 ≥ 3.8 mm"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        for q in layout.questions:
            for bubble in q.bubbles:
                diameter = bubble.r * 2
                assert diameter >= 3.8, f"题 {q.q} 气泡直径 {diameter:.2f} < 3.8"
    
    def test_option_spacing_constraint(self):
        """同一行相邻选项圆心距 ≥ 6 mm"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        for q in layout.questions:
            bubbles = sorted(q.bubbles, key=lambda b: b.cx)
            for i in range(len(bubbles) - 1):
                dist = bubbles[i + 1].cx - bubbles[i].cx
                assert dist >= 6.0, f"题 {q.q} {bubbles[i].opt}-{bubbles[i + 1].opt} 距离 {dist:.2f} < 6.0"
    
    def test_row_spacing_constraint(self):
        """相邻题行距 ≥ 6.8 mm"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        prev_q = None
        for q in layout.questions:
            if prev_q and q.bubbles and prev_q.bubbles:
                row_dist = q.bubbles[0].cy - prev_q.bubbles[0].cy
                if row_dist > 0:
                    assert row_dist >= 6.8, f"题 {prev_q.q}-{q.q} 行距 {row_dist:.2f} < 6.8"
            prev_q = q
    
    def test_feedback_slot_clearance(self):
        """回印格与气泡间隙 ≥ 1.2 mm"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        for q in layout.questions:
            fs = q.feedback_slot
            if q.bubbles:
                max_bubble_right = max(b.cx + b.r for b in q.bubbles)
                gap = fs["x"] - max_bubble_right
                assert gap >= 1.2, f"题 {q.q} 回印格间隙 {gap:.2f} < 1.2"


class TestTemplateVariants:
    """测试两种版型"""
    
    def test_t100_template_basic(self):
        """T100-A4-v1 基本结构"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        assert layout.template_id == "T100-A4-v1"
        assert layout.version == 1
        assert layout.page_mm == [210.0, 297.0]
        assert len(layout.questions) == 100
        assert len(layout.fiducials) == 4
        assert layout.option_count == 5
        assert layout.id_digits == 5
    
    def test_t060_template_basic(self):
        """T060-A4-v1 基本结构"""
        layout = TemplatePresets.T060_A4_v1(id_digits=5, option_count=5)
        
        assert layout.template_id == "T060-A4-v1"
        assert layout.version == 1
        assert len(layout.questions) == 60
        assert len(layout.id_columns) == 5
    
    def test_template_with_different_options(self):
        """支持 4 选项与 5 选项"""
        for opts in [4, 5]:
            layout100 = TemplatePresets.T100_A4_v1(option_count=opts)
            layout060 = TemplatePresets.T060_A4_v1(option_count=opts)
            
            assert layout100.option_count == opts
            assert layout060.option_count == opts
            assert len(layout100.questions[0].bubbles) == opts
            assert len(layout060.questions[0].bubbles) == opts
    
    def test_template_with_different_id_digits(self):
        """支持不同证号位数"""
        for digits in [3, 5, 10, 12]:
            layout = TemplatePresets.T100_A4_v1(id_digits=digits)
            assert layout.id_digits == digits
            assert len(layout.id_columns) == digits


class TestLayoutJsonGeneration:
    """测试 layout.json 生成与验证"""
    
    def test_layout_to_json(self):
        """layout 能序列化为有效的 JSON"""
        layout = TemplatePresets.T100_A4_v1()
        json_str = layout.to_json()
        
        # 应该是有效的 JSON
        data = json.loads(json_str)
        assert data["template_id"] == "T100-A4-v1"
        assert data["option_count"] == 5
        assert len(data["questions"]) == 100
    
    def test_layout_to_dict_roundtrip(self):
        """layout → dict 转换的一致性"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        data = layout.to_dict()
        
        # 检查关键字段
        assert data["template_id"] == layout.template_id
        assert data["option_count"] == layout.option_count
        assert data["id_digits"] == layout.id_digits
        assert len(data["questions"]) == len(layout.questions)
        assert len(data["fiducials"]) == 4


class TestPdfGeneration:
    """测试 PDF 生成"""
    
    def test_pdf_generation(self):
        """能生成有效的 PDF 字节"""
        layout = TemplatePresets.T100_A4_v1()
        pdf_bytes = generate_pdf(layout, school_name="Test School", exam_name="Test Exam", subject_name="Math")
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes.startswith(b"%PDF")  # PDF magic number
    
    def test_pdf_with_preview(self):
        """能生成 PDF 和预览 PNG"""
        layout = TemplatePresets.T100_A4_v1()
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        assert isinstance(pdf_bytes, bytes) and len(pdf_bytes) > 0
        assert isinstance(png_bytes, bytes) and len(png_bytes) > 0
        assert isinstance(layout_json, str) and len(layout_json) > 0
        assert pdf_bytes.startswith(b"%PDF")
        assert png_bytes.startswith(b"\x89PNG")  # PNG magic number


class TestConstraintValidation:
    """测试约束验证（应该捕获违规参数）"""
    
    def test_invalid_id_digits(self):
        """证号位数超出范围应报错"""
        with pytest.raises(ValueError):
            TemplatePresets.T100_A4_v1(id_digits=0)
        
        with pytest.raises(ValueError):
            TemplatePresets.T100_A4_v1(id_digits=13)
    
    def test_invalid_option_count(self):
        """选项数不支持应报错"""
        with pytest.raises(ValueError):
            TemplatePresets.T100_A4_v1(option_count=3)
        
        with pytest.raises(ValueError):
            TemplatePresets.T100_A4_v1(option_count=6)


class TestNameLineAndScoreBox:
    """测试可选的姓名线与分数框"""
    
    def test_name_line_included(self):
        """姓名线包含时应在 layout 中"""
        layout = TemplatePresets.T100_A4_v1(include_name_line=True)
        assert layout.name_line is not None
        assert "x" in layout.name_line
        assert "y" in layout.name_line
        assert "w" in layout.name_line
    
    def test_name_line_excluded(self):
        """姓名线不包含时应为 None"""
        layout = TemplatePresets.T100_A4_v1(include_name_line=False)
        assert layout.name_line is None
    
    def test_score_box_present(self):
        """分数框始终存在"""
        layout = TemplatePresets.T100_A4_v1()
        assert layout.score_box is not None
        assert "x" in layout.score_box
        assert "y" in layout.score_box
        assert "w" in layout.score_box
        assert "h" in layout.score_box


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

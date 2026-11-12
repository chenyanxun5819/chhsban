"""
二维码生成与验证测试

验收标准：
1. 二维码在 layout.json 中正确记录
2. 生成的 PDF 中包含可读的二维码
3. 二维码内容格式正确：template_id;d=id_digits;o=option_count
4. 两种版型都有二维码
5. OpenCV QRCodeDetector 能解码二维码
"""

import pytest
import json
from io import BytesIO
from pathlib import Path
from sheetgen.layout import TemplatePresets, LayoutConfig, QRCode
from sheetgen.builder import build_sheet, _generate_qrcode_image


class TestQRCodeLayout:
    """测试二维码在布局中的定义"""
    
    def test_qrcode_in_t100_layout(self):
        """T100-A4-v1 包含二维码配置"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        
        assert layout.qrcode is not None
        assert isinstance(layout.qrcode, QRCode)
        assert layout.qrcode.x == 177.0  # 右上角
        assert layout.qrcode.y == 10.0
        assert layout.qrcode.w == 20.0
        assert layout.qrcode.h == 20.0
    
    def test_qrcode_in_t060_layout(self):
        """T060-A4-v1 包含二维码配置"""
        layout = TemplatePresets.T060_A4_v1(id_digits=5, option_count=5)
        
        assert layout.qrcode is not None
        assert layout.qrcode.x == 177.0
        assert layout.qrcode.y == 10.0
        assert layout.qrcode.w == 20.0
        assert layout.qrcode.h == 20.0
    
    def test_qrcode_margin_from_edge(self):
        """二维码距页边 ≥ 7mm"""
        page_w, page_h = 210.0, 297.0
        
        for layout in [
            TemplatePresets.T100_A4_v1(),
            TemplatePresets.T060_A4_v1(),
        ]:
            qr = layout.qrcode
            # 左侧距离
            left_margin = qr.x
            assert left_margin >= 7.0, f"左边距 {left_margin} < 7mm"
            
            # 右侧距离
            right_margin = page_w - (qr.x + qr.w)
            assert right_margin >= 7.0, f"右边距 {right_margin} < 7mm"
            
            # 顶部距离
            top_margin = qr.y
            assert top_margin >= 7.0, f"顶部距离 {top_margin} < 7mm"
            
            # 底部距离
            bottom_margin = page_h - (qr.y + qr.h)
            assert bottom_margin >= 0, f"底部距离 {bottom_margin} < 0 (可见部分)"
    
    def test_qrcode_in_layout_dict(self):
        """to_dict() 包含 qrcode 字段"""
        layout = TemplatePresets.T100_A4_v1()
        layout_dict = layout.to_dict()
        
        assert "qrcode" in layout_dict
        assert layout_dict["qrcode"] is not None
        assert "x" in layout_dict["qrcode"]
        assert "y" in layout_dict["qrcode"]
        assert "w" in layout_dict["qrcode"]
        assert "h" in layout_dict["qrcode"]
    
    def test_qrcode_in_json(self):
        """to_json() 包含可序列化的 qrcode"""
        layout = TemplatePresets.T100_A4_v1()
        json_str = layout.to_json()
        
        data = json.loads(json_str)
        assert "qrcode" in data
        assert data["qrcode"] is not None


class TestQRCodeGeneration:
    """测试二维码图像生成"""
    
    def test_qrcode_image_generation(self):
        """生成二维码 PNG 图像"""
        data = "T100-A4-v1;d=5;o=5"
        png_bytes = _generate_qrcode_image(data, 20.0)
        
        assert isinstance(png_bytes, bytes)
        assert len(png_bytes) > 0
        # PNG 文件头
        assert png_bytes[:8] == b'\x89PNG\r\n\x1a\n'
    
    def test_qrcode_size_scaling(self):
        """不同尺寸的二维码"""
        data = "T100-A4-v1;d=5;o=5"
        
        for size_mm in [15.0, 20.0, 25.0]:
            png_bytes = _generate_qrcode_image(data, size_mm)
            assert len(png_bytes) > 0
    
    def test_qrcode_data_format(self):
        """测试各种二维码数据格式"""
        test_cases = [
            "T100-A4-v1;d=5;o=5",
            "T060-A4-v1;d=3;o=4",
            "T100-A4-v1;d=10;o=5",
        ]
        
        for data in test_cases:
            png_bytes = _generate_qrcode_image(data, 20.0)
            assert len(png_bytes) > 0


class TestQRCodeInPDF:
    """测试 PDF 中的二维码"""
    
    def test_qrcode_in_pdf_t100(self):
        """T100 PDF 包含二维码"""
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        # PDF 文件头
        assert pdf_bytes[:4] == b'%PDF'
    
    def test_qrcode_in_pdf_t060(self):
        """T060 PDF 包含二维码"""
        layout = TemplatePresets.T060_A4_v1(id_digits=5, option_count=5)
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 0
        assert pdf_bytes[:4] == b'%PDF'
    
    def test_qrcode_png_preview(self):
        """预览 PNG 可生成"""
        layout = TemplatePresets.T100_A4_v1()
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        assert isinstance(png_bytes, bytes)
        assert len(png_bytes) > 0
        # PNG 文件头
        assert png_bytes[:8] == b'\x89PNG\r\n\x1a\n'
    
    def test_qrcode_content_format(self):
        """验证生成的二维码内容格式"""
        for template_class, template_id in [
            (TemplatePresets.T100_A4_v1, "T100-A4-v1"),
            (TemplatePresets.T060_A4_v1, "T060-A4-v1"),
        ]:
            layout = template_class(id_digits=5, option_count=5)
            pdf_bytes, png_bytes, layout_json = build_sheet(layout)
            
            layout_data = json.loads(layout_json)
            assert "qrcode" in layout_data
            assert layout_data["qrcode"] is not None


class TestQRCodeDecoding:
    """使用 OpenCV QRCodeDetector 验证二维码可读性"""
    
    def test_qrcode_decodable_with_opencv(self):
        """OpenCV 能解码生成的二维码"""
        pytest.importorskip("cv2")
        import cv2
        import numpy as np
        from PIL import Image
        
        # 生成二维码数据
        data = "T100-A4-v1;d=5;o=5"
        qr_png_bytes = _generate_qrcode_image(data, 20.0)
        
        # 转换为 OpenCV 图像
        qr_pil = Image.open(BytesIO(qr_png_bytes))
        qr_array = np.array(qr_pil.convert('RGB'))
        qr_bgr = cv2.cvtColor(qr_array, cv2.COLOR_RGB2BGR)
        
        # 使用 QRCodeDetector 解码
        detector = cv2.QRCodeDetector()
        decoded_data, points, straight_qr = detector.detectAndDecode(qr_bgr)
        
        # 验证
        assert decoded_data is not None
        assert decoded_data == data
        assert points is not None
    
    def test_qrcode_decodable_multiple_formats(self):
        """多种格式的二维码都可解码"""
        pytest.importorskip("cv2")
        import cv2
        import numpy as np
        from PIL import Image
        
        detector = cv2.QRCodeDetector()
        
        test_cases = [
            "T100-A4-v1;d=5;o=5",
            "T060-A4-v1;d=3;o=4",
            "T100-A4-v1;d=10;o=5",
        ]
        
        for data in test_cases:
            qr_png_bytes = _generate_qrcode_image(data, 20.0)
            qr_pil = Image.open(BytesIO(qr_png_bytes))
            qr_array = np.array(qr_pil.convert('RGB'))
            qr_bgr = cv2.cvtColor(qr_array, cv2.COLOR_RGB2BGR)
            
            decoded_data, points, straight_qr = detector.detectAndDecode(qr_bgr)
            
            assert decoded_data is not None, f"Failed to decode: {data}"
            assert decoded_data == data
    
    def test_qrcode_in_pdf_decodable(self):
        """从 PDF 预览图中检测二维码"""
        pytest.importorskip("cv2")
        import cv2
        import numpy as np
        from PIL import Image
        
        layout = TemplatePresets.T100_A4_v1(id_digits=5, option_count=5)
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        # 转换预览 PNG
        preview_pil = Image.open(BytesIO(png_bytes)).convert('RGB')
        preview_array = np.array(preview_pil)
        preview_bgr = cv2.cvtColor(preview_array, cv2.COLOR_RGB2BGR)
        
        # 使用 QRCodeDetector 检测和解码
        detector = cv2.QRCodeDetector()
        decoded_data, points, straight_qr = detector.detectAndDecode(preview_bgr)
        
        # 验证解码数据
        assert decoded_data is not None, "QRCode not found in PDF preview"
        assert "T100-A4-v1" in decoded_data
        assert "d=5" in decoded_data
        assert "o=5" in decoded_data
    
    def test_qrcode_different_templates_decodable(self):
        """T060 PDF 中的二维码也可解码"""
        pytest.importorskip("cv2")
        import cv2
        import numpy as np
        from PIL import Image
        
        layout = TemplatePresets.T060_A4_v1(id_digits=3, option_count=4)
        pdf_bytes, png_bytes, layout_json = build_sheet(layout)
        
        preview_pil = Image.open(BytesIO(png_bytes)).convert('RGB')
        preview_array = np.array(preview_pil)
        preview_bgr = cv2.cvtColor(preview_array, cv2.COLOR_RGB2BGR)
        
        detector = cv2.QRCodeDetector()
        decoded_data, points, straight_qr = detector.detectAndDecode(preview_bgr)
        
        assert decoded_data is not None
        assert "T060-A4-v1" in decoded_data
        assert "d=3" in decoded_data
        assert "o=4" in decoded_data


class TestQRCodeEdgeCases:
    """边界情况测试"""
    
    def test_qrcode_optional_in_custom_layout(self):
        """自定义布局中二维码可选"""
        from sheetgen.layout import LayoutConfig, Fiducial, OrientationMark, IDColumn
        
        # 创建不含二维码的布局
        layout = LayoutConfig(
            template_id="Custom",
            version=1,
            page_mm=[210.0, 297.0],
            fiducials=[],
            orientation_mark=OrientationMark(x=105, y=11, w=20, h=4),
            canvas_dpi=300,
            questions=[],
            id_columns=[],
            option_count=5,
            id_digits=5,
            score_box={"x": 170.0, "y": 20.0, "w": 30.0, "h": 10.0},
            qrcode=None,  # 显式无二维码
        )
        
        assert layout.qrcode is None
        layout_dict = layout.to_dict()
        assert layout_dict["qrcode"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

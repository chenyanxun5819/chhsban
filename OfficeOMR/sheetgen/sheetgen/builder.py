"""
答案纸 PDF 生成与预览

使用 reportlab 生成精确坐标的 PDF。
所有坐标、尺寸单位为 mm（毫米）。
"""

from io import BytesIO
from typing import Tuple, Optional
import tempfile
import os
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from reportlab.lib.colors import black
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

from .layout import LayoutConfig


def _generate_qrcode_image(data: str, size_mm: float) -> bytes:
    """
    生成二维码 PNG 图像
    
    参数：
    - data: 二维码内容字符串
    - size_mm: 二维码尺寸（毫米）
    
    返回：PNG 二进制内容
    """
    try:
        import qrcode
    except ImportError:
        raise ImportError("qrcode library is required for QR code generation. Install with: pip install qrcode[pil]")
    
    # 转换尺寸：mm -> pixels（300 DPI）
    size_pixels = int(size_mm * 300 / 25.4)  # 25.4 mm/inch
    
    # 生成二维码
    qr = qrcode.QRCode(
        version=1,  # 自动调整版本
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=1,
        border=2,  # 标准 4 个像素边距（scale 后自动调整）
    )
    qr.add_data(data)
    qr.make(fit=True)
    
    # 转换为 PIL Image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # 重新调整到目标尺寸
    img = img.resize((size_pixels, size_pixels))
    
    # 保存为 PNG
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()



# 中文字体候选（按顺序尝试；.ttc 需指定 subfontIndex）
_CJK_FONT_CANDIDATES = [
    ("c:\\windows\\fonts\\simsun.ttc", 0),
    ("c:\\windows\\fonts\\msyh.ttc", 0),
    ("c:\\windows\\fonts\\simhei.ttf", None),
    ("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc", 0),
    ("/System/Library/Fonts/PingFang.ttc", 0),
]
_CJK_FONT_NAME = "CJK"


def _register_fonts() -> str:
    """注册中文字体，返回可用于页头的字体名；找不到则退回 Helvetica。"""
    if _CJK_FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return _CJK_FONT_NAME
    for path, idx in _CJK_FONT_CANDIDATES:
        try:
            if idx is None:
                font = TTFont(_CJK_FONT_NAME, path)
            else:
                font = TTFont(_CJK_FONT_NAME, path, subfontIndex=idx)
            pdfmetrics.registerFont(font)
            return _CJK_FONT_NAME
        except Exception:
            continue
    return "Helvetica"


def generate_pdf(
    layout: LayoutConfig,
    school_name: str = "Nama Sekolah",
    exam_name: str = "Nama Peperiksaan",
    subject_name: str = "Mata Pelajaran",
) -> bytes:
    """
    生成答案纸 PDF 内容（二进制）
    
    参数：
    - layout: LayoutConfig 对象
    - school_name: 学校名称
    - exam_name: 考试名称
    - subject_name: 科目名称
    
    返回：PDF 二进制内容
    """
    header_font = _register_fonts()
    
    buffer = BytesIO()
    page_w_mm, page_h_mm = layout.page_mm[0], layout.page_mm[1]
    
    # reportlab 中 A4 尺寸为 210 × 297 mm
    c = canvas.Canvas(buffer, pagesize=(page_w_mm * mm, page_h_mm * mm))
    c.setLineWidth(0.5)  # 细线
    
    # ==================== 页头 ====================
    # 学校名、考试名、科目
    c.setFont(header_font, 12)
    c.drawString(15 * mm, (page_h_mm - 20) * mm, f"{school_name} / {exam_name} / {subject_name}")
    
    # 分数框
    score_box = layout.score_box
    c.rect(
        score_box["x"] * mm,
        (page_h_mm - score_box["y"] - score_box["h"]) * mm,
        score_box["w"] * mm,
        score_box["h"] * mm,
        stroke=1,
        fill=0,
    )
    c.setFont("Helvetica", 8)
    c.drawString(
        (score_box["x"] + 2) * mm,
        (page_h_mm - score_box["y"] - 3) * mm,
        "Markah",
    )
    
    # 手写栏位：姓名 / 班级 / 学号（标签 + 横线）
    def _field(label: str, spec) -> None:
        if not spec:
            return
        c.setFont("Helvetica", 8)
        c.drawString(spec["x"] * mm, (page_h_mm - spec["y"]) * mm, label)
        lw = pdfmetrics.stringWidth(label, "Helvetica", 8) / mm + 1.5
        c.line(
            (spec["x"] + lw) * mm,
            (page_h_mm - spec["y"]) * mm,
            (spec["x"] + spec["w"]) * mm,
            (page_h_mm - spec["y"]) * mm,
        )
    
    _field("Nama:", layout.name_line)
    _field("Kelas:", layout.class_line)
    _field("No. ID:", layout.id_line)
    
    # 方向标记（顶部中央）
    om = layout.orientation_mark
    c.rect(
        (om.x - om.w / 2) * mm,
        (page_h_mm - om.y - om.h / 2) * mm,
        om.w * mm,
        om.h * mm,
        stroke=0,
        fill=1,
    )
    
    # ==================== 定位标记 ====================
    for fid in layout.fiducials:
        c.rect(
            fid.x * mm,
            (page_h_mm - fid.y - fid.h) * mm,
            fid.w * mm,
            fid.h * mm,
            stroke=0,
            fill=1,
        )
    
    # ==================== 二维码 ====================
    if layout.qrcode:
        qr_data = f"{layout.template_id};d={layout.id_digits};o={layout.option_count}"
        qr_png = _generate_qrcode_image(qr_data, layout.qrcode.w)
        
        # 使用临时文件，因为 reportlab drawImage 需要文件路径
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp.write(qr_png)
            tmp_path = tmp.name
        
        try:
            c.drawImage(
                tmp_path,
                layout.qrcode.x * mm,
                (page_h_mm - layout.qrcode.y - layout.qrcode.h) * mm,
                width=layout.qrcode.w * mm,
                height=layout.qrcode.h * mm,
            )
        finally:
            # 清理临时文件
            try:
                os.unlink(tmp_path)
            except Exception:
                pass
    
    # ==================== 选项表头 ====================
    # 在每个栏顶部显示选项字母（A, B, C, D, [E]）
    c.setFont("Helvetica", 9)
    opt_letters = "ABCDE"[:layout.option_count]
    
    # 每栏第一题（以 A 圈 x 坐标去重得到各栏）
    seen_cols = set()
    for q in layout.questions:
        if not q.bubbles:
            continue
        key = round(q.bubbles[0].cx, 3)
        if key in seen_cols:
            continue
        seen_cols.add(key)
        for bubble in q.bubbles:
            c.drawString(
                (bubble.cx - 1) * mm,
                (page_h_mm - 82) * mm,
                bubble.opt,
            )
    
    # ==================== 题目区域 ====================
    for q in layout.questions:
        # 题号
        # 题号右对齐，右端落在 A 圈左缘再往左 1.5mm，避免与 A 圈重叠
        first = q.bubbles[0]
        q_right_x = first.cx - (first.w or 2 * first.r) / 2 - 1.5
        
        c.setFont("Helvetica", 7)
        c.drawRightString(q_right_x * mm, (page_h_mm - first.cy - 1) * mm, str(q.q))
        
        # 气泡（空心圆圈）
        for bubble in q.bubbles:
            bw = bubble.w or 2 * bubble.r
            bh = bubble.h or 2 * bubble.r
            c.rect(
                (bubble.cx - bw / 2) * mm,
                (page_h_mm - bubble.cy - bh / 2) * mm,
                bw * mm,
                bh * mm,
                stroke=1,
                fill=0,
            )
        
        # 回印格（细线圆圈；x/y/w/h 为外接正方形）
        fs = q.feedback_slot
        c.circle(
            (fs["x"] + fs["w"] / 2) * mm,
            (page_h_mm - fs["y"] - fs["h"] / 2) * mm,
            (fs["w"] / 2) * mm,
            stroke=1,
            fill=0,
        )
    
    # ==================== 证号区域（横排，左上方） ====================
    # 每一行 = 一位数字（col=0 为第 1 位，在最上面），每行 0-9 共 10 个圈，由左到右
    c.setFont(header_font, 8)
    c.drawString(15 * mm, (page_h_mm - 43) * mm, "Hitamkan nombor ID Pelajar:")
    
    for id_col in layout.id_columns:
        if not id_col.bubbles:
            continue
        row_y = id_col.bubbles[0].cy
        c.setFont("Helvetica", 6)
        c.drawRightString(
            (id_col.bubbles[0].cx - (id_col.bubbles[0].w or 2 * id_col.bubbles[0].r) / 2 - 2.0) * mm,
            (page_h_mm - row_y - 0.8) * mm,
            str(id_col.col + 1),
        )
        for bubble in id_col.bubbles:
            bw = bubble.w or 2 * bubble.r
            bh = bubble.h or 2 * bubble.r
            c.rect(
                (bubble.cx - bw / 2) * mm,
                (page_h_mm - bubble.cy - bh / 2) * mm,
                bw * mm,
                bh * mm,
                stroke=1,
                fill=0,
            )
            c.setFont("Helvetica", 6)
            c.drawCentredString(
                bubble.cx * mm,
                (page_h_mm - bubble.cy - 0.8) * mm,
                str(bubble.digit),
            )
    
    # ==================== 说明文字 ====================
    c.setFont("Helvetica", 8)
    c.drawString(18 * mm, 10 * mm, "Sila gunakan pensel 2B untuk menghitamkan bulatan sepenuhnya.")
    
    c.save()
    return buffer.getvalue()


def generate_preview_png(
    pdf_bytes: bytes,
    dpi: int = 300,
) -> bytes:
    """
    从 PDF 生成预览 PNG（300 dpi）
    
    需要系统安装 pypdfium2 用于 PDF 渲染。
    
    参数：
    - pdf_bytes: PDF 二进制内容
    - dpi: 输出分辨率（默认 300）
    
    返回：PNG 二进制内容
    """
    try:
        import pypdfium2 as pdfium
        from PIL import Image
        import numpy as np
    except ImportError as e:
        raise ImportError(
            "pypdfium2 and pillow are required for PNG preview generation"
        ) from e
    
    # 打开 PDF
    pdf = pdfium.PdfDocument(pdf_bytes)
    
    if len(pdf) == 0:
        raise ValueError("PDF has no pages")
    
    page = pdf[0]
    
    # 计算输出分辨率（DPI 转换为 scale factor）
    scale = dpi / 72.0  # PDF 默认 72 DPI
    
    # 渲染为 PIL Image
    image = page.render(scale=scale).to_pil()
    
    # 保存为 PNG
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def build_sheet(
    layout: LayoutConfig,
    school_name: str = "Nama Sekolah",
    exam_name: str = "Nama Peperiksaan",
    subject_name: str = "Mata Pelajaran",
) -> Tuple[bytes, bytes, str]:
    """
    生成完整的答案纸
    
    参数：
    - layout: LayoutConfig 对象
    - school_name: 学校名称
    - exam_name: 考试名称
    - subject_name: 科目名称
    
    返回：
    - (pdf_bytes, png_bytes, layout_json_str)
    """
    # 生成 PDF
    pdf_bytes = generate_pdf(layout, school_name, exam_name, subject_name)
    
    # 生成预览 PNG
    png_bytes = generate_preview_png(pdf_bytes, dpi=300)
    
    # 生成 layout JSON
    layout_json = layout.to_json()
    
    return pdf_bytes, png_bytes, layout_json
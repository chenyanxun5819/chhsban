"""OfficeOMR 答案纸生成器 (Sheet Generator)
生成 A4 答案纸 PDF + 坐标布局 JSON + 预览 PNG
"""

__version__ = "0.1.0"

from .builder import build_sheet
from .layout import LayoutConfig, TemplatePresets

__all__ = ["build_sheet", "LayoutConfig", "TemplatePresets"]

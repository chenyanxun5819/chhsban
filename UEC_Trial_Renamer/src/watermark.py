"""Add the school-crest watermark to every page of a PDF.

Matches the 2025 files (made with Foxit): crest image centred on the page,
width = 50% of page width, 30% opacity, drawn on top of the scan.
"""
from pathlib import Path

import pymupdf

MARKER = "UEC_Trial_Renamer:watermark"


def _load_logo(image_path: Path, opacity: float) -> pymupdf.Pixmap:
    pix = pymupdf.Pixmap(str(image_path))
    if pix.alpha:
        pix = pymupdf.Pixmap(pix, 0)          # drop existing alpha
    if pix.colorspace and pix.colorspace.n != 3:
        pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
    pix = pymupdf.Pixmap(pix, 1)              # add alpha channel
    a = max(0, min(255, round(255 * opacity)))
    pix.set_alpha(bytes([a]) * (pix.width * pix.height))
    return pix


def has_watermark(doc: pymupdf.Document) -> bool:
    return MARKER in (doc.metadata or {}).get("keywords", "")


def add_watermark(src, dst, image_path, width_ratio=0.5, opacity=0.3, on_top=True) -> str:
    """Write a watermarked copy of `src` to `dst`. Returns a short status string."""
    src, dst = Path(src), Path(dst)
    logo = _load_logo(Path(image_path), opacity)
    aspect = logo.height / logo.width
    with pymupdf.open(src) as doc:
        if has_watermark(doc):
            doc.save(dst, garbage=3, deflate=True)
            return "已有水印，未重复加"
        xref = 0
        for page in doc:
            r = page.rect
            w = r.width * width_ratio
            h = w * aspect
            if h > r.height * 0.9:              # very wide pages (landscape)
                h = r.height * 0.9
                w = h / aspect
            cx, cy = r.x0 + r.width / 2, r.y0 + r.height / 2
            rect = pymupdf.Rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)
            if xref:
                page.insert_image(rect, xref=xref, overlay=on_top)
            else:
                xref = page.insert_image(rect, pixmap=logo, overlay=on_top)
        meta = doc.metadata or {}
        kw = meta.get("keywords", "")
        meta["keywords"] = (kw + " " + MARKER).strip()
        doc.set_metadata(meta)
        doc.save(dst, garbage=3, deflate=True)
    return "已加水印"

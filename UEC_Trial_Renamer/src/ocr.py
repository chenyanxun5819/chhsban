"""PDF page -> OCR text lines (with on-disk cache).

Each OCR item is returned as {"text": str, "box": [x0, y0, x1, y1]} where the box
is in PDF points of the page (so it can be used to re-render a region).
"""
import hashlib
import json
from pathlib import Path

import pymupdf

from paths import CACHE_DIR

_engine = None
CACHE_VERSION = 5
# Lower thresholds than RapidOCR defaults: lets single small digits in the
# answer-key table (e.g. the Paper cell "1") be detected.
OCR_PARAMS = {"box_thresh": 0.2, "unclip_ratio": 2.0, "text_score": 0.2}


def _get_engine():
    global _engine
    if _engine is None:
        from rapidocr_onnxruntime import RapidOCR
        _engine = RapidOCR()
    return _engine


def file_hash(path: Path) -> str:
    h = hashlib.sha1()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _ocr_png(png: bytes, clip: pymupdf.Rect, dpi: int) -> list:
    result, _ = _get_engine()(png, **OCR_PARAMS)
    scale = 72.0 / dpi
    items = []
    for box, text, _score in result or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        items.append({
            "text": text,
            "box": [round(clip.x0 + min(xs) * scale, 1), round(clip.y0 + min(ys) * scale, 1),
                    round(clip.x0 + max(xs) * scale, 1), round(clip.y0 + max(ys) * scale, 1)],
        })
    return items


def ocr_region(doc: pymupdf.Document, page_no: int, rect: pymupdf.Rect, dpi: int) -> list:
    page = doc[page_no]
    pix = page.get_pixmap(dpi=dpi, clip=rect, colorspace=pymupdf.csGRAY)
    return _ocr_png(pix.tobytes("png"), rect, dpi)


ANCHORS = ("考卷资料", "EXAMPAPERINFORMATION", "SKEMAJAWAPAN", "MARKINGSCHEME", "须知",
           "INSTRUCTIONS", "ARAHAN", "日期", "DATE", "TARIKH", "试卷", "PAPER", "KERTAS",
           "高中组", "初中组", "统一考试", "UNIFIEDTRIAL", "PEPERIKSAAN")


def _score(items) -> int:
    """How much the OCR result looks like an exam title area."""
    import re
    t = re.sub(r"\s+", "", "|".join(i["text"] for i in items)).upper()
    return sum(1 for a in ANCHORS if a in t)


def _ocr_rotated(page, rot: int, crop: float, dpi: int) -> list:
    """OCR the top `crop` of the page after rotating it by `rot` degrees.
    Boxes are in the rotated image's coordinates (only text is used)."""
    import numpy as np
    z = dpi / 72.0
    pix = page.get_pixmap(matrix=pymupdf.Matrix(z, z).prerotate(rot), colorspace=pymupdf.csGRAY)
    arr = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width)
    arr = arr[: int(pix.height * crop), :]
    rgb = np.ascontiguousarray(np.stack([arr] * 3, axis=-1))
    result, _ = _get_engine()(rgb, **OCR_PARAMS)
    scale = 72.0 / dpi
    out = []
    for box, text, _s in result or []:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        out.append({"text": text, "box": [round(min(xs) * scale, 1), round(min(ys) * scale, 1),
                                          round(max(xs) * scale, 1), round(max(ys) * scale, 1)]})
    return out


class PdfProbe:
    """Lazy OCR access to one PDF, cached by file hash."""

    def __init__(self, path, crop=0.40, dpi=150, use_cache=True):
        self.path = Path(path)
        self.crop, self.dpi, self.use_cache = crop, dpi, use_cache
        self._doc = None
        self._hash = None
        self._cache = None
        self.rotation = 0

    # -- internals -----------------------------------------------------
    @property
    def doc(self):
        if self._doc is None:
            self._doc = pymupdf.open(self.path)
        return self._doc

    @property
    def page_count(self) -> int:
        return len(self.doc)

    def _cache_file(self) -> Path:
        if self._hash is None:
            self._hash = file_hash(self.path)
        return CACHE_DIR / f"{self._hash}.json"

    def _load(self):
        if self._cache is None:
            f = self._cache_file()
            self._cache = {}
            if self.use_cache and f.exists():
                data = json.loads(f.read_text(encoding="utf-8"))
                if data.get("v") == CACHE_VERSION:
                    self._cache = data["items"]
        return self._cache

    def _save(self):
        if self.use_cache:
            CACHE_DIR.mkdir(parents=True, exist_ok=True)
            self._cache_file().write_text(
                json.dumps({"v": CACHE_VERSION, "file": self.path.name, "items": self._cache}, ensure_ascii=False),
                encoding="utf-8")

    def _cached(self, key, fn):
        cache = self._load()
        if key not in cache:
            cache[key] = fn()
            self._save()
        return cache[key]

    # -- public ----------------------------------------------------------
    def first_page(self) -> list:
        """OCR items of the top part of page 1.

        If the scan is sideways / upside-down (e.g. a landscape answer sheet fed
        the wrong way), the normal top strip contains no title words; then the
        page is rendered at 90/180/270 degrees and the best orientation is used.
        """
        def run():
            r = self.doc[0].rect
            items = ocr_region(self.doc, 0, pymupdf.Rect(0, 0, r.width, r.height * self.crop), self.dpi)
            base = _score(items)
            best, best_score, rot_used = items, base, 0
            if base >= 5:
                return {"rotation": 0, "items": items}
            for rot in (270, 90, 180):
                cand = _ocr_rotated(self.doc[0], rot, self.crop, self.dpi)
                sc = _score(cand)
                if sc >= base + 2 and sc > best_score:
                    best, best_score, rot_used = cand, sc, rot
            return {"rotation": rot_used, "items": best}
        data = self._cached(f"p0r_{self.crop}_{self.dpi}", run)
        self.rotation = data["rotation"]
        return data["items"]

    def page_top(self, page_no: int, crop: float = 0.25, dpi: int = 100) -> list:
        def run():
            r = self.doc[page_no].rect
            return ocr_region(self.doc, page_no, pymupdf.Rect(0, 0, r.width, r.height * crop), dpi)
        return self._cached(f"top{page_no}_{crop}_{dpi}", run)

    def zoom(self, rect, dpi: int = 300) -> list:
        """High-resolution OCR of a small region of page 1 (rect in PDF points)."""
        rect = pymupdf.Rect(rect) & self.doc[0].rect
        key = "zoom_" + "_".join(str(round(v)) for v in rect) + f"_{dpi}"
        return self._cached(key, lambda: ocr_region(self.doc, 0, rect, dpi))

    def close(self):
        if self._doc is not None:
            self._doc.close()
            self._doc = None

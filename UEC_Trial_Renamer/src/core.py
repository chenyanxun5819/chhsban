"""Shared logic for the CLI (main.py) and the GUI (gui.py).

scan_folder()  : PDFs -> rows (one per file) with proposed new names
write_plan()   : rows -> rename_plan.csv (Excel-friendly, utf-8-sig)
read_plan()    : rename_plan.csv -> rows (user may have edited new_name / action)
apply_plan()   : copy (or move) + watermark to destination folders
"""
import csv
import shutil
from pathlib import Path

from classify import Classifier
from naming import build_folder, build_name, load_config, mark_collisions
from ocr import PdfProbe
from paths import ROOT
from watermark import add_watermark

PLAN_FIELDS = ["action", "source_path", "new_name", "confidence", "grade", "subject", "section",
               "paper", "is_answer", "pages", "warnings", "sources", "ocr_text"]


def list_pdfs(folder) -> list:
    folder = Path(folder)
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() == ".pdf" and p.is_file())


def scan_folder(folder, date: str, progress=None, stop=None) -> list:
    """progress(i, n, path) is called before each file; stop() -> True aborts."""
    subjects, settings = load_config()
    clf = Classifier(subjects, settings.get("deep_check_pages", 4))
    files = list_pdfs(folder)
    rows = []
    for i, path in enumerate(files):
        if stop and stop():
            break
        if progress:
            progress(i, len(files), path)
        probe = PdfProbe(path, **settings.get("ocr", {}))
        try:
            r = clf.classify(probe)
            pages = probe.page_count
        except Exception as e:  # unreadable PDF etc.
            from classify import Result
            r = Result()
            r.warn(f"读取失败：{e}")
            pages = 0
        finally:
            probe.close()
        rows.append({"source_path": str(path), "result": r, "pages": pages,
                     "new_name": build_name(r, date, settings)})
    if progress:
        progress(len(files), len(files), None)
    mark_collisions(rows)
    for row in rows:
        r = row["result"]
        row.update({
            "action": "Y" if (r.confidence == "OK" and row["new_name"]) else "",
            "confidence": r.confidence,
            "grade": r.grade, "subject": r.subject, "section": r.section, "paper": r.paper,
            "is_answer": "Y" if r.is_answer else "N",
            "warnings": "；".join(r.warnings),
            "sources": "；".join(f"{k}={v}" for k, v in r.sources.items()),
            "ocr_text": r.text[:500],
        })
    return rows


def write_plan(rows, csv_path):
    csv_path = Path(csv_path)
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as fh:
        w = csv.DictWriter(fh, fieldnames=PLAN_FIELDS, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow(row)
    return csv_path


def read_plan(csv_path) -> list:
    with open(csv_path, encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _grade_of(name: str) -> str:
    parts = name.split()
    return parts[2] if len(parts) > 2 and parts[1] == "TRIAL" else ""


def apply_plan(rows, dest, move=False, watermark=True, progress=None) -> list:
    """Process rows whose action is Y. Returns a list of (source, target, status)."""
    _, settings = load_config()
    wm = settings.get("watermark", {})
    wm_image = ROOT / wm.get("image", "assets/watermark_logo.png")
    dest = Path(dest)
    todo = [r for r in rows if str(r.get("action", "")).strip().upper() in ("Y", "YES", "是")]
    report = []
    seen = set()
    for i, row in enumerate(todo):
        if progress:
            progress(i, len(todo), row["source_path"])
        src = Path(row["source_path"])
        name = (row.get("new_name") or "").strip()
        if not name:
            report.append((str(src), "", "跳过：没有新档名"))
            continue
        if not name.lower().endswith(".pdf"):
            name += ".pdf"
        grade = row.get("grade") or _grade_of(name)
        year = name[:4] if name[:4].isdigit() else ""
        sub = build_folder(grade, year, settings) if grade else ""
        target = dest / sub / name if sub else dest / name
        if target in seen or target.exists():
            report.append((str(src), str(target), "跳过：目标档案已存在"))
            continue
        if not src.exists():
            report.append((str(src), str(target), "跳过：来源档案不存在"))
            continue
        seen.add(target)
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            if watermark and wm.get("enabled", True):
                status = add_watermark(src, target, wm_image, wm.get("width_ratio", 0.5),
                                       wm.get("opacity", 0.3), wm.get("on_top", True))
            else:
                shutil.copy2(src, target)
                status = "已复制"
            if move:
                src.unlink()
                status += "（原档已移除）"
            report.append((str(src), str(target), status))
        except Exception as e:
            report.append((str(src), str(target), f"失败：{e}"))
    if progress:
        progress(len(todo), len(todo), None)
    return report

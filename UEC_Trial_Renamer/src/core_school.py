"""Scan/apply pipeline for 校内考试（非UEC）. Mirrors core.py's shape, but:

  - subject comes from OCR-reading the cover's 科目 cell (free text matched
    against config/subjects_school.json), not a printed code table;
  - grade comes from which J1/J2/J3/S1/S2/S3 subfolder a file sits in, not
    from OCR — the same class-stream code (e.g. "U1A") is reused across
    different grades at this school, so grade can't be read off the cover
    reliably (see markdown/20261003/工作进度.md);
  - 试卷 is read directly off the cover of every file (these are all real
    question papers, not answer sheets), so no duration-based guessing.
"""
import csv
import json
import re
import shutil
from collections import Counter
from pathlib import Path

from classify_school import SchoolClassifier, SchoolResult
from classroom import ClassRoster, load_roster
from ocr import PdfProbe
from paths import CONFIG_DIR, ROOT
from watermark import add_watermark

GRADE_RE = re.compile(r"^[JS][123]$", re.IGNORECASE)

PLAN_FIELDS = ["action", "source_path", "new_name", "confidence", "grade", "class_range",
               "subject", "paper", "warnings", "sources", "ocr_text"]


def load_subjects() -> list:
    return json.loads((CONFIG_DIR / "subjects_school.json").read_text(encoding="utf-8"))["subjects"]


def grade_of_path(path: Path, root: Path) -> str:
    """Grade = the J1/J2/J3/S1/S2/S3 folder the file is filed under, relative to `root`
    — or `root` itself, if the user pointed "来源资料夹" straight at one grade's folder."""
    for part in path.relative_to(root).parts[:-1]:
        if GRADE_RE.match(part):
            return part.upper()
    if GRADE_RE.match(root.name):
        return root.name.upper()
    return ""


SKIP_DIR_NAMES = {"removedwatermark", "addwatermark"}  # processing-artifact copies, not source files


def list_pdfs(folder) -> list:
    folder = Path(folder)
    return sorted(p for p in folder.rglob("*") if p.suffix.lower() == ".pdf" and p.is_file()
                  and not any(part.lower() in SKIP_DIR_NAMES for part in p.relative_to(folder).parts))


def build_name(r: SchoolResult, period: str) -> str:
    if not r.complete:
        return ""
    paper = f" {r.paper}" if r.paper else ""
    return f"{period} {r.class_range} {r.subject}{paper}.pdf"


def mark_collisions(rows: list):
    counts = Counter(row["new_name"] for row in rows if row["new_name"])
    for row in rows:
        if row["new_name"] and counts[row["new_name"]] > 1:
            row["confidence"] = "REVIEW"
            msg = f"有 {counts[row['new_name']]} 个档案得到同一个新档名"
            row["warnings"] = f"{row['warnings']}；{msg}" if row["warnings"] else msg


def scan_folder(folder, period: str, progress=None) -> list:
    """progress(i, n, path) is called before each file."""
    folder = Path(folder)
    roster, stream_hints = load_roster()
    clf = SchoolClassifier(load_subjects(), ClassRoster(roster, stream_hints))
    files = list_pdfs(folder)
    rows = []
    for i, path in enumerate(files):
        if progress:
            progress(i, len(files), path)
        grade = grade_of_path(path, folder)
        probe = PdfProbe(path)
        try:
            r = clf.classify(probe, grade)
        except Exception as e:  # unreadable PDF etc.
            r = SchoolResult()
            r.warn(f"读取失败：{e}")
        finally:
            probe.close()
        if not grade:
            r.warn("档案不在 J1/J2/J3/S1/S2/S3 资料夹底下，无法判断年级")
        rows.append({
            "source_path": str(path), "new_name": build_name(r, period) if grade else "",
            "action": "", "confidence": r.confidence if grade else "REVIEW",
            "grade": grade, "class_range": r.class_range, "subject": r.subject, "paper": r.paper,
            "warnings": "；".join(r.warnings),
            "sources": "；".join(f"{k}={v}" for k, v in r.sources.items()),
            "ocr_text": r.text[:500],
        })
    if progress:
        progress(len(files), len(files), None)
    mark_collisions(rows)
    for row in rows:
        row["action"] = "Y" if (row["confidence"] == "OK" and row["new_name"]) else ""
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


def apply_plan(rows, dest, move=False, watermark=True, progress=None) -> list:
    """Process rows whose action is Y. Returns a list of (source, target, status).
    Output layout: <dest>/<grade>/<new_name> — mirrors the J1/J2/J3/S1/S2/S3 source layout."""
    settings = json.loads((CONFIG_DIR / "settings.json").read_text(encoding="utf-8"))
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
        grade = row.get("grade") or ""
        target = dest / grade / name if grade else dest / name
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
        except Exception as e:  # noqa: BLE001
            report.append((str(src), str(target), f"失败：{e}"))
    if progress:
        progress(len(todo), len(todo), None)
    return report

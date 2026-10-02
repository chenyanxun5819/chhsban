"""Config loading and file-name building."""
import json
from collections import Counter

from paths import CONFIG_DIR


def load_config():
    subjects = json.loads((CONFIG_DIR / "subjects.json").read_text(encoding="utf-8"))["subjects"]
    settings = json.loads((CONFIG_DIR / "settings.json").read_text(encoding="utf-8"))
    return subjects, settings


def build_name(r, date: str, settings: dict) -> str:
    """Result -> file name (with .pdf). Empty string if fields are missing."""
    if not r.complete:
        return ""
    tpl = settings.get("name_template", "{date} TRIAL {grade} {subject}{section} {paper}{ans}")
    name = tpl.format(
        date=date,
        grade=r.grade,
        subject=r.subject,
        section=f" {r.section}" if (r.section and not r.is_answer) else "",
        paper=r.paper,
        ans=" ANS" if r.is_answer else "",
    )
    return name + ".pdf"


def build_folder(grade: str, year: str, settings: dict) -> str:
    tpl = settings.get("folder_template", "CHHS {year} UEC {grade}")
    return tpl.format(year=year, grade=grade)


def mark_collisions(rows: list):
    """rows: list of dicts with 'new_name' and a Result under 'result'.
    Two sources producing the same new name -> all of them REVIEW."""
    counts = Counter(r["new_name"] for r in rows if r["new_name"])
    for row in rows:
        if row["new_name"] and counts[row["new_name"]] > 1:
            row["result"].warn(f"有 {counts[row['new_name']]} 个档案得到同一个新档名")

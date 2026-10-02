"""Command-line interface.

    # 1. 扫描：只产生对照表，不动任何档案
    python src/main.py scan "D:\\扫描档" --date 20261015 --out output\\rename_plan.csv

    # 2. 用 Excel 检查 rename_plan.csv：
    #    action 栏写 Y 的才会处理（OK 的预设已是 Y；REVIEW 的请确认后自己填 Y）
    #    new_name 可以直接修改

    # 3. 执行：复制 + 加水印到输出资料夹（依年级分 CHHS 2026 UEC J3 / S3）
    python src/main.py apply output\\rename_plan.csv --dest output\\2026

    # 只加水印、不改名：
    python src/main.py watermark "D:\\某档案.pdf" --out "D:\\某档案_水印.pdf"
"""
import argparse
import sys
from datetime import date as _date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core import apply_plan, read_plan, scan_folder, write_plan  # noqa: E402
from naming import load_config  # noqa: E402
from paths import ROOT  # noqa: E402
from watermark import add_watermark  # noqa: E402


def _progress(i, n, path):
    if path:
        print(f"[{i + 1}/{n}] {Path(path).name}", flush=True)


def cmd_scan(a):
    rows = scan_folder(a.input, a.date, progress=_progress)
    out = write_plan(rows, a.out)
    ok = sum(r["confidence"] == "OK" for r in rows)
    print(f"\n共 {len(rows)} 个 PDF：OK {ok}，需人工确认 {len(rows) - ok}")
    for r in rows:
        if r["confidence"] != "OK":
            print(f"  [REVIEW] {Path(r['source_path']).name} → {r['new_name'] or '(无法命名)'}  {r['warnings']}")
    print(f"\n对照表：{out}")


def cmd_apply(a):
    rows = read_plan(a.plan)
    report = apply_plan(rows, a.dest, move=a.move, watermark=not a.no_watermark, progress=_progress)
    for src, dst, status in report:
        print(f"{status}：{Path(src).name} → {dst}")
    done = sum(1 for _, _, s in report if not s.startswith(("跳过", "失败")))
    print(f"\n完成 {done} 个，跳过/失败 {len(report) - done} 个。")


def cmd_watermark(a):
    _, settings = load_config()
    wm = settings["watermark"]
    out = a.out or str(Path(a.pdf).with_name(Path(a.pdf).stem + "_wm.pdf"))
    print(add_watermark(a.pdf, out, ROOT / wm["image"], wm["width_ratio"], wm["opacity"], wm["on_top"]), out)


def main():
    ap = argparse.ArgumentParser(description="统考预考考卷自动命名工具")
    sub = ap.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("scan", help="扫描资料夹，产生对照表 CSV")
    s.add_argument("input")
    s.add_argument("--date", default=_date.today().strftime("%Y%m%d"), help="档名日期 YYYYMMDD，预设今天")
    s.add_argument("--out", default=str(ROOT / "output" / "rename_plan.csv"))
    s.set_defaults(func=cmd_scan)

    p = sub.add_parser("apply", help="依对照表复制、改名、加水印")
    p.add_argument("plan")
    p.add_argument("--dest", required=True)
    p.add_argument("--move", action="store_true", help="移动而不是复制（会删除原档）")
    p.add_argument("--no-watermark", action="store_true")
    p.set_defaults(func=cmd_apply)

    w = sub.add_parser("watermark", help="只替单一 PDF 加水印")
    w.add_argument("pdf")
    w.add_argument("--out")
    w.set_defaults(func=cmd_watermark)

    a = ap.parse_args()
    a.func(a)


if __name__ == "__main__":
    main()

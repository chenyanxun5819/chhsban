"""Measure accuracy against samples/2025/ground_truth.csv.

    python src/evaluate.py                       # uses samples/2025
    python src/evaluate.py --samples D:\\other    # other sample folder with ground_truth.csv

Prints overall accuracy, "OK but wrong" (must be 0) and the error list.
"""
import argparse
import csv
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from classify import Classifier          # noqa: E402
from naming import build_name, load_config, mark_collisions  # noqa: E402
from ocr import PdfProbe                  # noqa: E402
from paths import ROOT                    # noqa: E402


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--samples", default=str(ROOT / "samples" / "2025"))
    ap.add_argument("--only", help="只测档名包含此字串的样本")
    args = ap.parse_args()

    samples = Path(args.samples)
    subjects, settings = load_config()
    clf = Classifier(subjects, settings.get("deep_check_pages", 4))
    gt = list(csv.DictReader(open(samples / "ground_truth.csv", encoding="utf-8-sig")))
    if args.only:
        gt = [g for g in gt if args.only in g["sample_path"]]

    rows = []
    t0 = time.time()
    for g in gt:
        probe = PdfProbe(samples / g["sample_path"], **settings["ocr"])
        r = clf.classify(probe)
        probe.close()
        rows.append({"gt": g, "result": r, "new_name": build_name(r, "{DATE}", settings)})
    mark_collisions(rows)

    ok_right = ok_wrong = rev_right = rev_wrong = 0
    print()
    for row in rows:
        r, g = row["result"], row["gt"]
        right = row["new_name"] == g["expected_name"]
        conf = r.confidence
        if conf == "OK":
            ok_right += right
            ok_wrong += not right
        else:
            rev_right += right
            rev_wrong += not right
        if not right or conf != "OK":
            flag = "✗" if not right else "?"
            sev = "  <<< 严重：OK 但错误" if (conf == "OK" and not right) else ""
            print(f"{flag} [{conf}] {g['sample_path']}{sev}")
            print(f"      预期: {g['expected_name']}")
            print(f"      结果: {row['new_name'] or '(无法命名)'}")
            for w in r.warnings:
                print(f"      - {w}")
            print(f"      来源: {r.sources}")
    n = len(rows)
    right = ok_right + rev_right
    print("\n================ 结果 ================")
    print(f"样本数            : {n}")
    print(f"正确率            : {right}/{n} = {right / n:.1%}")
    print(f"OK 且正确         : {ok_right}")
    print(f"OK 但错误(须为0)  : {ok_wrong}")
    print(f"REVIEW 且正确     : {rev_right}")
    print(f"REVIEW 且错误     : {rev_wrong}")
    print(f"耗时              : {time.time() - t0:.0f} 秒")
    return 1 if ok_wrong else 0


if __name__ == "__main__":
    sys.exit(main())

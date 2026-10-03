"""OCR text of a school internal-exam cover page -> naming fields.

Same physical cover template as the UEC trial's "table" kind (考卷资料 /
EXAM PAPER INFORMATION), but used here for an actual question paper, not an
answer sheet: every file has an explicit 科目(Subject) / 试卷(Paper) /
班级(Class) cell, so unlike classify.py there is no need to guess the paper
number from exam duration or body content.

Grade is NOT inferred from OCR. At this school the same class-stream code
(e.g. "U1A", "C3A") is reused across different grades, so the caller must
pass in the grade that the source folder (J1/J2/J3/S1/S2/S3) implies.
"""
import re
import unicodedata
from dataclasses import dataclass, field

from classify import CODE_PAREN_RE, STOP_TOKENS, Classifier, norm
from classroom import ClassRoster

PAPER_CN_NUM = {"一": "1", "二": "2", "三": "3", "四": "4"}
# NOTE: "=" was tried as an alias for "二" (OCR sometimes misreads it that way) but it is just
# as often a misread of "-" (no paper) instead — too ambiguous to auto-resolve, left as REVIEW.

LABEL_WORDS = ("SUBJECT", "科目", "PAPER", "试卷", "TIME", "时间", "CLASS", "班级",
               "ADM", "ADM.NO", "学号", "MARK", "得分")


@dataclass
class SchoolResult:
    class_range: str = ""
    subject: str = ""
    paper: str = ""            # "P1" / "P2" / "" (no paper split)
    review: bool = False
    warnings: list = field(default_factory=list)
    sources: dict = field(default_factory=dict)
    text: str = ""

    @property
    def confidence(self) -> str:
        return "REVIEW" if (self.review or not self.complete) else "OK"

    @property
    def complete(self) -> bool:
        return bool(self.class_range and self.subject)

    def warn(self, msg, review=True):
        self.warnings.append(msg)
        if review:
            self.review = True


class SchoolClassifier:
    def __init__(self, subjects: list, roster: ClassRoster):
        self.subjects = subjects
        self.roster = roster
        # longest alias first, so "UEC ADV MATHS II" isn't shadowed by a shorter "MATHS"-ish alias
        self._by_alias = sorted(
            ((norm(a).replace(".", ""), s) for s in subjects for a in s["aliases"]),
            key=lambda t: -len(t[0]))

    # ---- table reading -----------------------------------------------
    @staticmethod
    def _label_index(lines, words, start=0):
        for i in range(start, len(lines)):
            stripped = lines[i]
            for w in words:
                stripped = stripped.replace(w, "")
            if stripped == "" and lines[i]:
                return i
        return None

    def info_table(self, lines):
        si = self._label_index(lines, ["科目", "SUBJECT"])
        pi = self._label_index(lines, ["试卷", "PAPER"], (si or 0))
        ti = self._label_index(lines, ["时间", "TIME"], (pi or 0))
        ci = self._label_index(lines, ["班级", "CLASS"], (ti or 0))
        ei = self._label_index(lines, ["学号", "ADM", "得分", "MARK"], (ci or 0))

        def is_label_noise(ln):
            """A line is pure label noise if stripping every label word empties it
            (covers both '班级' / 'CLASS' on their own line and merged '班级CLASS')."""
            s = ln
            for w in LABEL_WORDS:
                s = s.replace(w, "")
            return s == ""

        def collect(a, b):
            if a is None:
                return ""
            b = b if b is not None else min(len(lines), a + 6)
            vals = [ln for ln in lines[a + 1:b] if ln and ln not in STOP_TOKENS and not is_label_noise(ln)]
            return "|".join(vals)
        return {"subject": collect(si, pi), "paper": collect(pi, ti),
                "time": collect(ti, ci), "class": collect(ci, ei)}

    # ---- field normalizers ---------------------------------------------
    def match_subject(self, raw):
        t = norm(raw).replace("|", "").replace(".", "")
        for alias, subj in self._by_alias:
            if alias and alias in t:
                return subj
        return None

    @staticmethod
    def _tidy_class_text(raw):
        """Separator/spacing cleanup before roster lookup (OCR may use '~' for a range,
        and split 科目/班级 across multiple lines joined here with '|')."""
        s = unicodedata.normalize("NFKC", raw.replace("|", ", "))
        s = re.sub(r"\s*~\s*", "-", s)
        s = re.sub(r"\s*-\s*", "-", s)
        s = re.sub(r"\s*,\s*", ", ", s)
        s = re.sub(r"\s+", " ", s).strip(" ,")
        # a class code's middle character is always a grade digit — OCR sometimes
        # reads grade "1" as the letter "I" there (e.g. "ACIA" meaning "AC1A")
        return re.sub(r"\b([A-Z]{1,2})I([A-Z])\b", r"\g<1>1\g<2>", s)

    @staticmethod
    def paper_label(raw):
        t = norm(raw)
        if not t or t in ("-", "–", "—", "/", "、", "，", "NIL", "NA"):
            return ""
        if t in PAPER_CN_NUM:
            return f"P{PAPER_CN_NUM[t]}"
        m = re.search(r"([1-9])", t)  # BC/BM/BI at S3 can split into up to P1-P4
        return f"P{m.group(1)}" if m else ""

    # ---- main -------------------------------------------------------------
    def classify(self, probe, expected_grade: str) -> SchoolResult:
        items = probe.first_page()
        lines = [norm(i["text"]) for i in items]
        lines = [ln for ln in lines if ln]
        r = SchoolResult(text=" | ".join(i["text"] for i in items))
        if getattr(probe, "rotation", 0):
            r.warn(f"第一页内容是转了 {probe.rotation}° 扫描的（已自动转正辨识）")

        text = "|".join(lines)
        if Classifier.detect_kind(text) == "title" and CODE_PAREN_RE.search(text):
            r.warn("封面是「统考预考」格式（有科目代号，如 JY08），不是本校期考的表格封面。"
                   "J3/S3 的 UEC 科目期考似乎直接沿用统考预考试卷 —— 这份请改用"
                   "统考预考（UEC_Trial_Renamer 原本的辨识）流程处理，不要套用本校内考试命名。")
            return r

        tbl = self.info_table(lines)

        if tbl["class"]:
            tidy = self._tidy_class_text(tbl["class"])
            r.class_range, unknown = self.roster.normalize(tidy)
            r.sources["class"] = f"封面班级栏「{tbl['class']}」"
            streams = sorted({h for c in r.class_range.split(", ")
                               if (h := self.roster.stream_of(c.split("-")[0]))})
            if streams:
                r.sources["class_streams"] = "、".join(streams)
            if unknown:
                r.warn(f"班级代号 {', '.join(unknown)} 不在目前的班级名单里"
                       "（可能是旧代号、OCR 读错，或是 config/classes.json 要更新）")
        else:
            r.warn("封面读不到班级栏")

        if tbl["subject"]:
            subj = self.match_subject(tbl["subject"])
            if subj:
                r.subject = subj["name"]
                r.sources["subject"] = f"封面科目栏「{tbl['subject']}」"
                if expected_grade and expected_grade not in subj["grades"]:
                    r.warn(f"{subj['name']} 字典里通常不是 {expected_grade} 的科目"
                           f"（来源资料夹判断年级为 {expected_grade}）")
            else:
                r.warn(f"科目栏「{tbl['subject']}」不在字典里，请加进 config/subjects_school.json")
        else:
            r.warn("封面读不到科目栏")

        r.paper = self.paper_label(tbl["paper"])
        if tbl["paper"] and not r.paper and norm(tbl["paper"]) not in ("-", ""):
            r.warn(f"试卷栏「{tbl['paper']}」看不出是第几卷")

        return r

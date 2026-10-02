"""OCR text of an exam PDF's first page -> naming fields.

Main entry: classify(probe, subjects, deep_check_pages) -> Result

Confidence policy: a field is "explicit" when it was read directly from the
page (subject code, 试卷二, PAPER 1, 1&2 ...). Anything inferred (from exam
duration, body content, collisions) makes the whole result REVIEW, so that a
wrong guess is never silently accepted.
"""
import re
import unicodedata
from dataclasses import dataclass, field

# ---------------------------------------------------------------- helpers

CN_NUM = {"一": "1", "二": "2", "1": "1", "2": "2", "I": "1", "L": "1"}

STOP_TOKENS = ["SKEMAJAWAPAN", "MARKINGSCHEME", "SKEMA", "JAWAPAN", "MARKING", "SCHEME",
               "答案", "学生资料", "STUDENT'SINFORMATION", "考卷资料", "EXAMPAPERINFORMATION"]

INSTRUCTION_WORDS = ["须知", "INSTRUCTIONS", "ARAHAN"]
DATE_WORDS = ["日期", "DATE", "TARIKH"]
SECTION_RE = re.compile(r"(甲部|乙部|丙部|甲组|乙组|丙组)")
ANSWER_LIST_RE = re.compile(r"^\d{1,2}[\.\)、]?[A-D]$")
CODE_PAREN_RE = re.compile(r"\(([JS][YCE])([0-9OIL]{2})\)")
CODE_BARE_RE = re.compile(r"^\(?([JS][YCE])([0-9OIL]{2})\)?$")


def norm(s: str) -> str:
    """NFKC (full-width -> half-width, Ⅱ -> II), upper-case, no whitespace.
    A dash right after 试卷 is the OCR's reading of 一 (试卷— -> 试卷一)."""
    s = unicodedata.normalize("NFKC", s).upper()
    s = re.sub(r"\s+", "", s)
    return re.sub(r"(试[卷券])[—–\-‐－_]", r"\1一", s)


def _fix_code_digits(d: str) -> str:
    return d.replace("O", "0").replace("I", "1").replace("L", "1")


def parse_minutes(s: str):
    """'1HR45MINS' -> 105, '1小时20分钟' -> 80, '2HRS' -> 120. None if nothing found."""
    hours = re.findall(r"(\d+(?:\.\d+)?)(?:HOURS?|HRS?|小时|H(?![A-Z]))", s)
    mins = re.findall(r"(\d+)(?:MINUTES?|MINS?|分钟|分)", s)
    if not hours and not mins:
        return None
    return round(sum(float(h) for h in hours) * 60 + sum(int(m) for m in mins))


def is_multi_duration(s: str) -> bool:
    """'P1:45MINS,P2:2HRS', '1HR&1HR20MINS', '40MINS+2HRS' -> True"""
    if re.search(r"P1.*P2", s):
        return True
    parts = re.split(r"[&+,，/]", s)
    return sum(1 for p in parts if parse_minutes(p)) >= 2


@dataclass
class Result:
    kind: str = ""                 # title / table / sheet / unknown
    grade: str = ""
    subject: str = ""
    section: str = ""
    paper: str = ""
    is_answer: bool = False
    review: bool = False
    warnings: list = field(default_factory=list)
    sources: dict = field(default_factory=dict)
    text: str = ""

    @property
    def confidence(self) -> str:
        return "REVIEW" if (self.review or not self.complete) else "OK"

    @property
    def complete(self) -> bool:
        return bool(self.grade and self.subject and self.paper)

    def warn(self, msg, review=True):
        self.warnings.append(msg)
        if review:
            self.review = True


# ---------------------------------------------------------------- classifier

class Classifier:
    def __init__(self, subjects: list, deep_check_pages: int = 4):
        self.subjects = subjects
        self.by_code = {}
        for s in subjects:
            for code in [s["code"]] + s.get("codes", []):
                self.by_code[code] = s
        self.deep_check_pages = deep_check_pages

    # ---- small detectors -------------------------------------------------
    def find_code(self, lines):
        for ln in lines:
            m = CODE_PAREN_RE.search(ln) or CODE_BARE_RE.match(ln)
            if m:
                return m.group(1) + _fix_code_digits(m.group(2))
        return None

    @staticmethod
    def detect_kind(text):
        if any(k in text for k in ("SKEMAJAWAPAN", "MARKINGSCHEME", "考卷资料", "EXAMPAPERINFORMATION")):
            return "table"
        if "姓名" in text and any(k in text for k in ("作答纸", "答案卷", "答题纸")):
            return "sheet"
        return "title"

    @staticmethod
    def detect_grade(text):
        j = any(k in text for k in ("初中组", "初中", "初三", "JUNIOR", "JUEC", "MENENGAHRENDAH"))
        s = any(k in text for k in ("高中组", "高中", "高三", "SENIOR", "SUEC", "MENENGAHTINGGI"))
        j = j or bool(re.search(r"J3[A-J]", text))
        s = s or bool(re.search(r"(S3[AB]|C3[A-F]|A3A|C3选修|C3\()", text))
        if j and not s:
            return "J3"
        if s and not j:
            return "S3"
        return "BOTH" if (j and s) else ""

    def match_subject(self, text, grade):
        pool = [s for s in self.subjects if not grade or s["grade"] == grade]
        for s in pool:
            for kw in s.get("answer_keywords", []):
                if norm(kw) in text:
                    return s
        return None

    @staticmethod
    def paper_from_value(v, subj):
        """Parse a paper value like '试卷二', 'PAPER1', 'KERTAS2', '1&2', '2'."""
        if not v:
            return None
        if (re.search(r"1\s*[&+,，、]\s*2", v) or "P1&P2" in v
                or (re.search(r"试[卷券]\(?[一1]", v) and re.search(r"试[卷券]\(?[二2]", v))):
            return "P1&P2"
        m = (re.search(r"试[卷券]\(?([一二12])\)?", v)
             or re.search(r"(?:PAPER|KERTAS)\(?([12])", v)
             or re.fullmatch(r"P?([12])", v))
        if not m:
            return None
        n = CN_NUM[m.group(1)]
        return _paper_label(n, subj)

    # ---- table helpers -----------------------------------------------------
    @staticmethod
    def _label_index(lines, words, start=0):
        for i in range(start, len(lines)):
            ln = lines[i]
            stripped = ln
            for w in words:
                stripped = stripped.replace(w, "")
            if stripped == "" and ln:
                return i
        return None

    def table_values(self, lines):
        """Return (paper_value, time_value, paper_label_index)."""
        pi = self._label_index(lines, ["试卷", "PAPER"])
        if pi is not None and lines[pi] == "试卷" and pi + 1 < len(lines) and lines[pi + 1] == "PAPER":
            pi += 1
        ti = self._label_index(lines, ["时间", "TIME"], (pi or 0))
        ci = self._label_index(lines, ["班级", "CLASS"], (ti or 0))

        def collect(a, b):
            if a is None:
                return ""
            b = b if b is not None else min(len(lines), a + 6)
            vals = [ln for ln in lines[a + 1:b] if ln not in STOP_TOKENS and ln not in ("TIME", "时间", "PAPER")]
            return "|".join(vals)
        return collect(pi, ti), collect(ti, ci), pi, ci

    # ---- main ----------------------------------------------------------------
    def classify(self, probe) -> Result:
        items = probe.first_page()
        lines = [norm(i["text"]) for i in items]
        lines = [ln for ln in lines if ln]
        text = "|".join(lines)
        r = Result(text=" | ".join(i["text"] for i in items))
        r.kind = self.detect_kind(text)
        if getattr(probe, "rotation", 0):
            r.warn(f"第一页内容是转了 {probe.rotation}° 扫描的（已自动转正辨识）")

        code = self.find_code(lines)
        subj = None
        if code:
            subj = self.by_code.get(code)
            if subj:
                r.grade, r.subject = subj["grade"], subj["name"]
                r.sources["subject"] = f"代号 {code}"
            else:
                r.warn(f"未知科目代号 {code}（请加进 config/subjects.json）")

        if not r.grade:
            g = self.detect_grade(text)
            if g in ("J3", "S3"):
                r.grade = g
                r.sources["grade"] = "关键字/班级"
            elif g == "BOTH":
                r.warn("同时出现初中与高中关键字")
        if not subj:
            subj = self.match_subject(text, r.grade if r.grade in ("J3", "S3") else "")
            if subj:
                r.subject = subj["name"]
                r.sources["subject"] = "关键字"
                if not r.grade:
                    r.grade = subj["grade"]
                    r.warn("年级由科目推论")
            else:
                r.warn("认不出科目")

        if r.kind == "title":
            self._title(lines, text, subj, r)
        elif r.kind == "sheet":
            r.is_answer = True
            r.warn("作答纸式页面：请确认是已填答案，不是空白答题纸")
            m = re.search(r"试[卷券]([一二])", text)
            if m:
                r.paper = _paper_label(CN_NUM[m.group(1)], subj)
                r.sources["paper"] = "作答纸标题"
        else:
            r.is_answer = True
            self._table(lines, text, subj, r, probe)

        if r.is_answer and subj and r.paper in ("P1", "K1"):
            self._deep_check(probe, r)
        if r.is_answer and r.paper == "P1&P2" and probe.page_count == 1:
            r.warn("标示两卷答案，但档案只有 1 页：可能只含试卷一，试卷二答案另成一档")
        if subj and r.paper and r.paper not in subj["papers"] and r.paper != "P1&P2":
            r.warn(f"{r.subject} 在设定中没有 {r.paper}")
        if not r.paper:
            r.warn("认不出是哪一卷")
        return r

    # ---- page kinds ----------------------------------------------------------
    def _title(self, lines, text, subj, r):
        head = []
        for ln in lines:
            if any(w in ln for w in DATE_WORDS):
                break
            head.append(ln)
        headtxt = "|".join(head)
        for ln in head:
            p = self.paper_from_value(ln, subj)
            if p:
                r.paper, r.sources["paper"] = p, "封面"
                break
        m = SECTION_RE.search(headtxt)
        if m:
            r.section = m.group(1)
        # answer detection on a title-style cover
        if "答案" in text:
            r.is_answer = True
            r.sources["answer"] = "封面写着答案"
        elif (not any(w in text for w in INSTRUCTION_WORDS)
              and any(ANSWER_LIST_RE.match(ln) for ln in lines)):
            r.is_answer = True
            r.warn("封面没有考生须知、却列出答案 → 判断为答案")
        if not r.paper and subj and len(subj["papers"]) == 1:
            r.paper = next(iter(subj["papers"]))
            r.sources["paper"] = "该科只有一卷"

    def _table(self, lines, text, subj, r, probe):
        pval, tval, pi, ci = self.table_values(lines)
        paper = None
        for tok in [pval] + pval.split("|"):
            paper = self.paper_from_value(tok, subj)
            if paper:
                break
        if paper:
            r.paper, r.sources["paper"] = paper, f"表格「{pval}」"
            return
        # zoom into the paper cell: small digits are often lost at 150 dpi
        if pi is not None and not getattr(probe, "rotation", 0):
            zp = self._zoom_paper(probe, pi, subj)
            if zp:
                r.paper, r.sources["paper"] = zp, "表格(放大重读)"
                return
        if not subj:
            return
        papers = subj["papers"]
        if len(papers) == 1:
            r.paper, r.sources["paper"] = next(iter(papers)), "该科只有一卷"
            return

        body = lines[(ci + 1) if ci is not None else 0:]
        bodytxt = "|".join(body)
        # 1) duration
        dur_p = None
        if tval and is_multi_duration(tval):
            dur_p = "P1&P2"
        elif tval:
            mins = parse_minutes(tval)
            if mins:
                opts = {p: (d if isinstance(d, list) else [d]) for p, d in papers.items()}
                hits = [p for p, ds in opts.items() if mins in ds]
                if len(opts) == 2 and not hits:
                    a, b = opts.values()
                    if mins in {x + y for x in a for y in b}:
                        hits = ["P1&P2"]
                if len(hits) == 1:
                    dur_p = hits[0]
        # 2) content
        has1 = bool(re.search(r"试[卷券]\(?[一1]", bodytxt))
        has2 = bool(re.search(r"试[卷券]\(?[二2]", bodytxt))
        content_p = None
        if has1 and has2:
            content_p = "P1&P2"
        elif has1 or has2:
            content_p = _paper_label("1" if has1 else "2", subj)
        else:
            for p, kws in subj.get("paper_hints", {}).items():
                if any(norm(k) in bodytxt for k in kws):
                    content_p = p
                    break
            if not content_p and "P1" in papers:
                mcq = "选择题" in bodytxt or sum(bool(ANSWER_LIST_RE.match(ln)) for ln in body) >= 3
                essay = any(k in bodytxt for k in ("必答题", "作答题", "问答题", "COMPULSORY"))
                if mcq and not essay:
                    content_p = "P1"
                elif essay and not mcq:
                    content_p = "P2"
        if dur_p == "P1&P2" or content_p == "P1&P2":
            paper = "P1&P2"
        else:
            paper = content_p or dur_p
        if paper:
            r.paper = paper
            r.sources["paper"] = f"推论(时间={tval or '-'}; 内容={content_p or '-'})"
            r.warn("试卷编号是推论出来的")
            if dur_p and content_p and dur_p != content_p:
                r.warn(f"时间推论({dur_p})与内容推论({content_p})不一致")

    def _zoom_paper(self, probe, pi, subj):
        items = probe.first_page()
        # locate the OCR item of the label line
        label = None
        for it in items:
            t = norm(it["text"])
            if t and t.replace("试卷", "").replace("PAPER", "") == "" and "PAPER" in t:
                label = it
                break
        if not label:
            return None
        x0, y0, x1, y1 = label["box"]
        page_w = probe.doc[0].rect.width
        rect = (x1 + 2, y0 - 4, min(x1 + page_w * 0.30, page_w * 0.62), y1 + 4)
        for it in probe.zoom(rect, dpi=300):
            p = self.paper_from_value(norm(it["text"]), subj)
            if p:
                return p
        return None

    def _deep_check(self, probe, r):
        n = probe.page_count
        if n < 3 or self.deep_check_pages <= 0:
            return
        for pg in range(1, min(n, 1 + self.deep_check_pages)):
            t = "|".join(norm(i["text"]) for i in probe.page_top(pg))
            if re.search(r"试[卷券]\(?二|PAPER2|甲组必答题", t):
                r.paper = "P1&P2"
                r.warn(f"第 {pg + 1} 页出现试卷二的内容 → 判断为 P1&P2")
                return


def _paper_label(n: str, subj) -> str:
    if subj and any(p.startswith("K") for p in subj["papers"]):
        return f"K{n}"
    return f"P{n}"

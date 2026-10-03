"""Normalize a school-exam cover's raw 班级(Class) text against the current class roster.

Format-only cleanup (separators/spacing) can't catch OCR noise like
"C3A-A3A" (not a real range — different prefixes jammed together by a stray
dash) or tell "C1A-F" apart from a typo. Checking each token against the
roster (config/classes.json) lets us: expand "C1A-F" style ranges, put
multi-class lists in a stable reading order, and flag whatever doesn't match
anything in the current class list instead of silently keeping it.

The roster changes every academic year (e.g. the UEC-only stream used to be
named "A3A" at S3, it is now "U1A"/"U2A" at S1/S2 with no S3 equivalent — S3's
"A3A" is now the arts stream), so this never invents or renames a class; it
only reorders/validates against config/classes.json.
"""
import json
import re

from paths import CONFIG_DIR

RANGE_TOKEN_RE = re.compile(r"^([A-Z]{1,2}\d)([A-Z])$")


def load_roster():
    data = json.loads((CONFIG_DIR / "classes.json").read_text(encoding="utf-8"))
    return data["roster"], data.get("stream_hints", {})


class ClassRoster:
    def __init__(self, roster: list, stream_hints: dict | None = None):
        self.roster = roster
        self.index = {c: i for i, c in enumerate(roster)}
        self.stream_hints = stream_hints or {}
        # first roster position for each stream prefix (e.g. "C1" -> index of C1A),
        # used to order/validate classes a year's roster no longer lists individually
        # (a stream's letter *count* drifts year to year; the stream itself doesn't).
        self.prefix_rank = {}
        for i, c in enumerate(roster):
            m = RANGE_TOKEN_RE.match(c)
            if m and m.group(1) not in self.prefix_rank:
                self.prefix_rank[m.group(1)] = i

    def stream_of(self, class_code: str) -> str:
        m = re.match(r"^([A-Z]{1,2})\d", class_code)
        return self.stream_hints.get(m.group(1), "") if m else ""

    def _expand_range(self, a: str, b: str):
        """'C1A'+'F' or 'C1A'+'C1F' -> ['C1A',...,'C1F'].

        Only requires the stream+grade ('C1') to exist somewhere on the current
        roster, not that every individual letter in the range still does — the
        exact class count for a stream changes every year (e.g. J1 used to run
        to J1K, now stops at J1I), so a historical file's wider range is still
        trusted and reformatted, just not validated letter-by-letter."""
        m = RANGE_TOKEN_RE.match(a)
        if not m:
            return None
        prefix, start = m.groups()
        if re.fullmatch(r"[A-Z]", b):
            end = b
        else:
            m2 = RANGE_TOKEN_RE.match(b)
            if not m2 or m2.group(1) != prefix:
                return None
            end = m2.group(2)
        if ord(end) < ord(start) or prefix not in self.prefix_rank:
            return None
        return [f"{prefix}{chr(c)}" for c in range(ord(start), ord(end) + 1)]

    def _tokenize(self, raw: str) -> list:
        """-> [(token, trusted)]. 'trusted' means either it's literally on the roster,
        or it came from expanding a range whose stream+grade is (the exact letter
        count for that stream drifts year to year, see _expand_range)."""
        tokens = []
        for piece in re.split(r"[,，]", raw):
            piece = piece.strip(" +")
            if not piece:
                continue
            if "-" in piece:
                a, b = piece.split("-", 1)
                expanded = self._expand_range(a.strip(), b.strip())
                if expanded:
                    tokens.extend((t, True) for t in expanded)
                    continue
            tokens.append((piece, piece in self.index))
        return tokens

    def _sort_key(self, token):
        m = RANGE_TOKEN_RE.match(token)
        if m and m.group(1) in self.prefix_rank:
            return (self.prefix_rank[m.group(1)], m.group(2))
        return (len(self.roster), token)  # unrecognized prefix -> sort last

    def normalize(self, raw: str):
        """-> (display_string, unknown_tokens). Trusted classes come back in roster
        order and collapsed into ranges again; unrecognized tokens are appended as-is."""
        tokens = self._tokenize(raw)
        known, unknown, seen = [], [], set()
        for t, trusted in tokens:
            if trusted and t not in seen:
                known.append(t)
                seen.add(t)
            elif not trusted:
                unknown.append(t)
        known.sort(key=self._sort_key)

        parts = []
        i = 0
        while i < len(known):
            j = i
            while (j + 1 < len(known) and known[j + 1][:-1] == known[j][:-1]
                   and ord(known[j + 1][-1]) == ord(known[j][-1]) + 1):
                j += 1
            parts.append(known[i] if i == j else f"{known[i]}-{known[j][-1]}")
            i = j + 1
        display = ", ".join(parts + unknown)
        return display, unknown

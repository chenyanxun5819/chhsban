"""
把從 tution-portal 搬來的 CSS 加上作用域前綴，避免影響管理站其他頁面。
用法：python scripts/scope-css.py <輸入.css> <輸出.css> <作用域class> [<作用域class> ...]
- 一般選擇器 X          → .scope X
- *                     → .scope, .scope *
- :root / html / body / #root → .scope（變數與字型、背景掛在作用域容器上）
- @media 內的規則同樣處理；@keyframes 保持原樣
只在搬移時執行一次，產出的檔案直接提交；之後改樣式請直接改產出的檔案。
"""
import re
import sys


def scope_selector(sel, scopes):
    sel = sel.strip()
    if not sel:
        return []
    if sel in (":root", "html", "body", "#root"):
        return list(scopes)
    if sel == "*":
        return [x for s in scopes for x in (s, f"{s} *")]
    return [f"{s} {sel}" for s in scopes]


def process(css, scopes):
    out = []
    i = 0
    n = len(css)
    while i < n:
        # 註解原樣保留
        if css.startswith("/*", i):
            j = css.index("*/", i) + 2
            out.append(css[i:j])
            i = j
            continue
        if css[i].isspace():
            out.append(css[i])
            i += 1
            continue
        brace = css.index("{", i)
        head = css[i:brace]
        # 找到對應的右大括號
        depth = 0
        j = brace
        while True:
            if css.startswith("/*", j):
                j = css.index("*/", j) + 2
                continue
            if css[j] == "{":
                depth += 1
            elif css[j] == "}":
                depth -= 1
                if depth == 0:
                    break
            j += 1
        body = css[brace + 1 : j]
        h = head.strip()
        if h.startswith("@keyframes") or h.startswith("@font-face"):
            out.append(css[i : j + 1])
        elif h.startswith("@media") or h.startswith("@supports"):
            out.append(head + "{" + process(body, scopes) + "}")
        else:
            # 選擇器前的註解保留
            comment = ""
            m = re.match(r"^(\s*(?:/\*.*?\*/\s*)*)(.*)$", head, re.S)
            if m:
                comment, head_sel = m.group(1), m.group(2)
            else:
                head_sel = head
            sels = list(dict.fromkeys(x for s in head_sel.split(",") for x in scope_selector(s, scopes)))
            out.append(comment + ",\n".join(sels) + " {" + body + "}")
        i = j + 1
    return "".join(out)


if __name__ == "__main__":
    src, dst, *scopes = sys.argv[1:]
    css = open(src, encoding="utf-8").read()
    header = f"/* 由 tution-portal 搬入並加上作用域（{', '.join(scopes)}），只影響該作用域內的頁面 */\n\n"
    open(dst, "w", encoding="utf-8").write(header + process(css, scopes))

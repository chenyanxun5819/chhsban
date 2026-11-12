# -*- coding: utf-8 -*-
"""
收据标注工具 (Receipt Labeler)

功能：
  1. 读取得奖名单 Excel（序 / 名字 / NAME / 学号 / 班级）
  2. 读取收据资料夹（png / jpg / jpeg / pdf ...），档名开头的数字 = Excel 的「序」
  3. 在每张收据下方加上一条信息栏（序号、姓名、学号、班级），字体大小依图片宽度自动调整
  4. 结果输出到收据资料夹内的子资料夹「已标注」，不会改动原档案

依赖：pip install openpyxl pillow pymupdf
"""

import os
import re
import sys
import queue
import threading
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

try:
    import pymupdf as fitz          # 新版 PyMuPDF
except ImportError:                 # 旧版
    import fitz

APP_TITLE = "收据标注工具"
OUTPUT_DIRNAME = "已标注"
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}
PDF_EXTS = {".pdf"}
HEADERS = ["序", "名字", "NAME", "学号", "班级"]

# 常见中文字体（依序尝试）
FONT_CANDIDATES = [
    # Windows
    r"C:\Windows\Fonts\msyhbd.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\msjhbd.ttc",
    r"C:\Windows\Fonts\msjh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\simsun.ttc",
    # macOS
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
]


# --------------------------------------------------------------------------
# 核心逻辑（与界面分离，方便测试）
# --------------------------------------------------------------------------
def find_font_path():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None


def load_font(path, size):
    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def create_template(save_path):
    """产生与名单相同格式的 xlsx 范本。"""
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "KMC reward receipt"
    ws.append(HEADERS)
    ws.append([1, "王小明", "WONG SIAO MING", 26001, "J1A"])
    ws.append([2, "李小华", "LEE SIAO HUA", 25002, "J2B"])
    head_fill = PatternFill("solid", fgColor="D9E1F2")
    for c in ws[1]:
        c.font = Font(bold=True)
        c.fill = head_fill
        c.alignment = Alignment(horizontal="center")
    for col, w in zip("ABCDE", (8, 14, 28, 12, 10)):
        ws.column_dimensions[col].width = w
    wb.save(save_path)


def _clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def read_roster(xlsx_path):
    """回传 {序号(int): dict(名字, NAME, 学号, 班级)}。"""
    wb = openpyxl.load_workbook(xlsx_path, data_only=True, read_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        raise ValueError("Excel 是空的")

    header = [_clean(c) for c in rows[0]]
    idx = {}
    for name in HEADERS:
        for i, h in enumerate(header):
            if h.upper() == name.upper():
                idx[name] = i
                break
    # 找不到表头时，退回「固定前 5 栏」的顺序
    if len(idx) < len(HEADERS):
        idx = {name: i for i, name in enumerate(HEADERS)}

    roster = {}
    for r in rows[1:]:
        if r is None or all(c is None or _clean(c) == "" for c in r):
            continue
        try:
            no = int(float(_clean(r[idx["序"]])))
        except (ValueError, IndexError):
            continue
        get = lambda k: _clean(r[idx[k]]) if idx[k] < len(r) else ""
        roster[no] = {
            "名字": get("名字"),
            "NAME": get("NAME"),
            "学号": get("学号"),
            "班级": get("班级"),
        }
    return roster


def leading_number(filename):
    m = re.match(r"\s*(\d+)", filename)
    return int(m.group(1)) if m else None


def render_pdf(path, target_width=1100):
    """把 PDF 的所有页面渲染成一张垂直拼接的图。"""
    doc = fitz.open(path)
    pages = []
    try:
        for page in doc:
            zoom = max(1.5, target_width / max(page.rect.width, 1))
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            pages.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    finally:
        doc.close()
    if not pages:
        raise ValueError("PDF 没有页面")
    if len(pages) == 1:
        return pages[0]
    w = max(p.width for p in pages)
    h = sum(p.height for p in pages)
    canvas = Image.new("RGB", (w, h), "white")
    y = 0
    for p in pages:
        canvas.paste(p, (0, y))
        y += p.height
    return canvas


def load_image(path):
    img = Image.open(path)
    img = ImageOps.exif_transpose(img)         # 手机照片方向校正
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
        bg = Image.new("RGB", img.size, "white")
        bg.paste(img, mask=img.split()[-1])
        return bg
    return img.convert("RGB")


def build_lines(no, info):
    """信息栏文字：序号. 中文姓名 学号 班级（一行，以空格分隔）"""
    parts = [f"{no}.", info["名字"], info["学号"], info["班级"]]
    return [" ".join(p for p in parts if p)]


def build_filename(no, info):
    """档名：序号 中文姓名 学号 班级.jpg"""
    parts = [str(no), info["名字"], info["学号"], info["班级"]]
    name = " ".join(p for p in parts if p)
    name = re.sub(r'[\\/:*?"<>|]', "_", name)      # 去掉档名不允许的字元
    return name


def add_label(img, lines, font_path):
    """在图片下方加信息栏；字体大小依图宽自动调整，并保证文字不超出宽度。"""
    w, h = img.size
    pad = max(10, int(w * 0.025))
    size = max(18, min(int(w * 0.05), 90))
    avail = w - 2 * pad

    measure = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    while size > 12:
        font = load_font(font_path, size)
        widest = max(measure.textlength(t, font=font) for t in lines)
        if widest <= avail:
            break
        size -= 2
    font = load_font(font_path, size)

    line_h = int(size * 1.4)
    band_h = pad * 2 + line_h * len(lines)
    out = Image.new("RGB", (w, h + band_h), "white")
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    d.rectangle([0, h, w, h + band_h], fill=(255, 250, 225))      # 浅黄底
    d.rectangle([0, h, w, h + max(2, size // 12)], fill=(200, 30, 30))  # 红色分隔线
    y = h + pad
    for t in lines:
        d.text((pad, y), t, font=font, fill=(0, 0, 0))
        y += line_h
    return out


def process_folder(excel_path, folder, log=print, progress=lambda i, n: None):
    """主流程。回传 (成功数, 失败数)。"""
    roster = read_roster(excel_path)
    log(f"读取名单：共 {len(roster)} 人")

    folder = Path(folder)
    out_dir = folder / OUTPUT_DIRNAME
    out_dir.mkdir(exist_ok=True)

    font_path = find_font_path()
    if font_path:
        log(f"使用字体：{font_path}")
    else:
        log("⚠ 找不到中文字体，中文可能显示成方块")

    files = []
    for f in folder.iterdir():
        if not f.is_file():
            continue
        ext = f.suffix.lower()
        if ext not in IMAGE_EXTS and ext not in PDF_EXTS:
            continue
        no = leading_number(f.name)
        if no is None:
            log(f"略过（档名没有开头数字）：{f.name}")
            continue
        files.append((no, f))
    files.sort(key=lambda t: (t[0], t[1].name))

    ok = fail = 0
    seen = set()
    used = set()
    total = len(files)
    for i, (no, f) in enumerate(files, 1):
        progress(i - 1, total)
        info = roster.get(no)
        if info is None:
            log(f"✗ {f.name}：Excel 中找不到序号 {no}")
            fail += 1
            continue
        try:
            img = render_pdf(f) if f.suffix.lower() in PDF_EXTS else load_image(f)
            result = add_label(img, build_lines(no, info), font_path)
            base = build_filename(no, info)
            out_path = out_dir / f"{base}.jpg"
            n = 2
            while out_path in used:            # 同一序号有多份收据时避免覆盖
                out_path = out_dir / f"{base} ({n}).jpg"
                n += 1
            used.add(out_path)
            result.save(out_path, "JPEG", quality=92, optimize=True)
            log(f"✓ {f.name} → {OUTPUT_DIRNAME}/{out_path.name}")
            ok += 1
            seen.add(no)
        except Exception as e:
            log(f"✗ {f.name}：{e}")
            fail += 1
    progress(total, total)

    missing = sorted(set(roster) - seen)
    if missing:
        log("尚未收到收据的序号：" + ", ".join(
            f"{n}({roster[n]['名字']})" for n in missing))
    log(f"完成：成功 {ok}，失败 {fail}。输出位置：{out_dir}")
    return ok, fail


# --------------------------------------------------------------------------
# 图形界面
# --------------------------------------------------------------------------
def run_gui():
    import tkinter as tk
    from tkinter import ttk, filedialog, messagebox, scrolledtext

    root = tk.Tk()
    root.title(APP_TITLE)
    root.geometry("760x560")

    excel_var = tk.StringVar()
    folder_var = tk.StringVar()
    q = queue.Queue()

    frm = ttk.Frame(root, padding=12)
    frm.pack(fill="both", expand=True)
    frm.columnconfigure(1, weight=1)

    def pick_excel():
        p = filedialog.askopenfilename(
            title="选择得奖名单 Excel",
            filetypes=[("Excel", "*.xlsx *.xlsm"), ("All", "*.*")])
        if p:
            excel_var.set(p)

    def pick_folder():
        p = filedialog.askdirectory(title="选择收据资料夹")
        if p:
            folder_var.set(p)

    def download_template():
        p = filedialog.asksaveasfilename(
            title="另存范本", defaultextension=".xlsx",
            initialfile="得奖名单范本.xlsx", filetypes=[("Excel", "*.xlsx")])
        if p:
            try:
                create_template(p)
                messagebox.showinfo(APP_TITLE, f"范本已储存：\n{p}")
            except Exception as e:
                messagebox.showerror(APP_TITLE, str(e))

    ttk.Label(frm, text="① 得奖名单 Excel：").grid(row=0, column=0, sticky="w", pady=6)
    ttk.Entry(frm, textvariable=excel_var).grid(row=0, column=1, sticky="ew", padx=6)
    ttk.Button(frm, text="选择…", command=pick_excel).grid(row=0, column=2)
    ttk.Button(frm, text="下载范本", command=download_template).grid(row=0, column=3, padx=(6, 0))

    ttk.Label(frm, text="② 收据资料夹：").grid(row=1, column=0, sticky="w", pady=6)
    ttk.Entry(frm, textvariable=folder_var).grid(row=1, column=1, sticky="ew", padx=6)
    ttk.Button(frm, text="选择…", command=pick_folder).grid(row=1, column=2)

    run_btn = ttk.Button(frm, text="▶ 执行")
    run_btn.grid(row=2, column=0, columnspan=4, pady=10, sticky="ew")

    bar = ttk.Progressbar(frm, mode="determinate")
    bar.grid(row=3, column=0, columnspan=4, sticky="ew")

    logbox = scrolledtext.ScrolledText(frm, height=20, state="disabled")
    logbox.grid(row=4, column=0, columnspan=4, sticky="nsew", pady=(10, 0))
    frm.rowconfigure(4, weight=1)

    def append(msg):
        logbox.configure(state="normal")
        logbox.insert("end", msg + "\n")
        logbox.see("end")
        logbox.configure(state="disabled")

    def poll():
        try:
            while True:
                kind, val = q.get_nowait()
                if kind == "log":
                    append(val)
                elif kind == "prog":
                    bar["maximum"] = max(val[1], 1)
                    bar["value"] = val[0]
                elif kind == "done":
                    run_btn.configure(state="normal")
        except queue.Empty:
            pass
        root.after(100, poll)

    def worker(xlsx, folder):
        try:
            process_folder(
                xlsx, folder,
                log=lambda m: q.put(("log", m)),
                progress=lambda i, n: q.put(("prog", (i, n))))
        except Exception as e:
            q.put(("log", f"错误：{e}"))
        finally:
            q.put(("done", None))

    def on_run():
        xlsx, folder = excel_var.get().strip(), folder_var.get().strip()
        if not os.path.isfile(xlsx):
            messagebox.showwarning(APP_TITLE, "请先选择 Excel 名单")
            return
        if not os.path.isdir(folder):
            messagebox.showwarning(APP_TITLE, "请先选择收据资料夹")
            return
        run_btn.configure(state="disabled")
        logbox.configure(state="normal")
        logbox.delete("1.0", "end")
        logbox.configure(state="disabled")
        threading.Thread(target=worker, args=(xlsx, folder), daemon=True).start()

    run_btn.configure(command=on_run)
    poll()
    root.mainloop()


if __name__ == "__main__":
    run_gui()
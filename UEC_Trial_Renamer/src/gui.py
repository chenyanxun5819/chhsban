"""Desktop GUI (tkinter) — this is the entry point of the packaged .exe.

Flow: choose source folder → 1. 扫描 → check / edit the table → 2. 执行
"""
import csv
import os
import queue
import subprocess
import sys
import threading
import tkinter as tk
from datetime import date as _date
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

sys.path.insert(0, str(Path(__file__).resolve().parent))

from core import apply_plan, read_plan, scan_folder, write_plan  # noqa: E402

APP_TITLE = "统考预考考卷命名工具"


def open_path(p):
    p = str(p)
    if sys.platform.startswith("win"):
        os.startfile(p)  # noqa: S606
    elif sys.platform == "darwin":
        subprocess.Popen(["open", p])
    else:
        subprocess.Popen(["xdg-open", p])


class App(tk.Tk):
    COLS = ("action", "old", "new", "conf", "warn")

    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1150x680")
        self.minsize(900, 500)
        self.rows = []
        self.q = queue.Queue()
        self.busy = False
        self._stop = False

        self.var_src = tk.StringVar()
        self.var_dst = tk.StringVar()
        self.var_date = tk.StringVar(value=_date.today().strftime("%Y%m%d"))
        self.var_wm = tk.BooleanVar(value=True)
        self.var_move = tk.BooleanVar(value=False)
        self.var_status = tk.StringVar(value="请选择来源资料夹，然后按「1. 扫描」。")

        self._build()
        self.after(100, self._poll)

    # ------------------------------------------------------------------ UI
    def _build(self):
        pad = {"padx": 6, "pady": 4}
        top = ttk.Frame(self)
        top.pack(fill="x", **pad)

        ttk.Label(top, text="来源资料夹（扫描好的 PDF）").grid(row=0, column=0, sticky="w")
        ttk.Entry(top, textvariable=self.var_src).grid(row=0, column=1, sticky="ew", padx=4)
        ttk.Button(top, text="浏览…", command=self._pick_src).grid(row=0, column=2)

        ttk.Label(top, text="输出资料夹").grid(row=1, column=0, sticky="w")
        ttk.Entry(top, textvariable=self.var_dst).grid(row=1, column=1, sticky="ew", padx=4)
        ttk.Button(top, text="浏览…", command=self._pick_dst).grid(row=1, column=2)

        opt = ttk.Frame(top)
        opt.grid(row=2, column=0, columnspan=3, sticky="w", pady=(4, 0))
        ttk.Label(opt, text="档名日期 (YYYYMMDD)").pack(side="left")
        ttk.Entry(opt, textvariable=self.var_date, width=10).pack(side="left", padx=(4, 16))
        ttk.Checkbutton(opt, text="加学校水印", variable=self.var_wm).pack(side="left", padx=8)
        ttk.Checkbutton(opt, text="移动档案（删除原档）", variable=self.var_move).pack(side="left", padx=8)
        top.columnconfigure(1, weight=1)

        btns = ttk.Frame(self)
        btns.pack(fill="x", **pad)
        self.btn_scan = ttk.Button(btns, text="1. 扫描", command=self.scan)
        self.btn_scan.pack(side="left")
        ttk.Button(btns, text="全选 OK", command=lambda: self._set_all("OK")).pack(side="left", padx=(12, 2))
        ttk.Button(btns, text="全部取消", command=lambda: self._set_all(None)).pack(side="left", padx=2)
        ttk.Button(btns, text="用 Excel 开启对照表", command=self._open_csv).pack(side="left", padx=(12, 2))
        ttk.Button(btns, text="重新载入对照表", command=self._reload_csv).pack(side="left", padx=2)
        self.btn_apply = ttk.Button(btns, text="2. 执行（复制并改名）", command=self.apply)
        self.btn_apply.pack(side="right")
        ttk.Button(btns, text="开启输出资料夹", command=self._open_dst).pack(side="right", padx=6)

        frm = ttk.Frame(self)
        frm.pack(fill="both", expand=True, **pad)
        self.tree = ttk.Treeview(frm, columns=self.COLS, show="headings", selectmode="browse")
        heads = {"action": ("处理", 50), "old": ("原档名", 260), "new": ("新档名（双击修改）", 380),
                 "conf": ("信心度", 70), "warn": ("说明", 380)}
        for c, (t, w) in heads.items():
            self.tree.heading(c, text=t)
            self.tree.column(c, width=w, anchor="center" if c in ("action", "conf") else "w",
                             stretch=c in ("new", "warn"))
        self.tree.tag_configure("REVIEW", background="#fff1c2")
        self.tree.tag_configure("FAIL", background="#ffd6d6")
        ys = ttk.Scrollbar(frm, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=ys.set)
        self.tree.pack(side="left", fill="both", expand=True)
        ys.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", self._on_double)
        self.tree.bind("<Button-1>", self._on_click)
        self.tree.bind("<space>", lambda e: self._toggle(self.tree.focus()))

        bottom = ttk.Frame(self)
        bottom.pack(fill="x", **pad)
        self.pb = ttk.Progressbar(bottom, mode="determinate")
        self.pb.pack(fill="x")
        ttk.Label(bottom, textvariable=self.var_status).pack(anchor="w")
        ttk.Label(bottom, foreground="#666",
                  text="黄色 = 需人工确认（程式不确定）。确认无误后，点「处理」栏打勾才会执行；双击新档名可修改，双击原档名可开启 PDF。").pack(anchor="w")

    # ------------------------------------------------------------- helpers
    def _pick_src(self):
        d = filedialog.askdirectory(title="选择扫描好的 PDF 资料夹")
        if d:
            self.var_src.set(d)
            if not self.var_dst.get():
                self.var_dst.set(str(Path(d).parent / f"已命名_{self.var_date.get()}"))

    def _pick_dst(self):
        d = filedialog.askdirectory(title="选择输出资料夹")
        if d:
            self.var_dst.set(d)

    def _plan_path(self) -> Path:
        return Path(self.var_dst.get()) / "rename_plan.csv"

    def _refresh(self):
        self.tree.delete(*self.tree.get_children())
        for i, r in enumerate(self.rows):
            tag = "FAIL" if not r.get("new_name") else ("REVIEW" if r.get("confidence") != "OK" else "")
            self.tree.insert("", "end", iid=str(i), tags=(tag,), values=(
                "✔" if str(r.get("action", "")).upper() == "Y" else "",
                Path(r["source_path"]).name, r.get("new_name", ""), r.get("confidence", ""),
                r.get("warnings", "")))
        n = len(self.rows)
        ok = sum(r.get("confidence") == "OK" for r in self.rows)
        sel = sum(str(r.get("action", "")).upper() == "Y" for r in self.rows)
        self.var_status.set(f"共 {n} 个档案：OK {ok}、需确认 {n - ok}；已勾选 {sel} 个。")

    def _save_plan(self):
        if self.rows and self.var_dst.get():
            write_plan(self.rows, self._plan_path())

    def _toggle(self, iid):
        if not iid:
            return
        r = self.rows[int(iid)]
        if not r.get("new_name"):
            messagebox.showinfo(APP_TITLE, "这个档案没有新档名，请先双击「新档名」输入。")
            return
        r["action"] = "" if str(r.get("action", "")).upper() == "Y" else "Y"
        self._refresh()
        self._save_plan()

    def _set_all(self, mode):
        for r in self.rows:
            r["action"] = "Y" if (mode == "OK" and r.get("confidence") == "OK" and r.get("new_name")) else ""
        self._refresh()
        self._save_plan()

    def _on_click(self, event):
        if self.tree.identify_region(event.x, event.y) == "cell" and self.tree.identify_column(event.x) == "#1":
            self._toggle(self.tree.identify_row(event.y))
            return "break"

    def _on_double(self, event):
        iid = self.tree.identify_row(event.y)
        col = self.tree.identify_column(event.x)
        if not iid:
            return
        if col == "#1":
            return
        r = self.rows[int(iid)]
        if col in ("#2",):
            open_path(r["source_path"])
            return
        new = simpledialog.askstring(APP_TITLE, f"原档：{Path(r['source_path']).name}\n\n新档名：",
                                     initialvalue=r.get("new_name", ""), parent=self)
        if new is not None:
            new = new.strip()
            if new and not new.lower().endswith(".pdf"):
                new += ".pdf"
            r["new_name"] = new
            parts = new.split()
            if len(parts) > 2 and parts[1] == "TRIAL":
                r["grade"] = parts[2]
            r["action"] = "Y" if new else ""
            r["confidence"] = "已手动修改" if new else r.get("confidence", "")
            self._refresh()
            self._save_plan()

    def _open_csv(self):
        if not self.rows:
            return
        self._save_plan()
        open_path(self._plan_path())

    def _reload_csv(self):
        p = self._plan_path()
        if not p.exists():
            messagebox.showwarning(APP_TITLE, f"找不到 {p}")
            return
        try:
            self.rows = read_plan(p)
        except PermissionError:
            messagebox.showwarning(APP_TITLE, "请先关闭 Excel 里的对照表，再重新载入。")
            return
        self._refresh()

    def _open_dst(self):
        d = self.var_dst.get()
        if d and Path(d).exists():
            open_path(d)

    def _set_busy(self, b):
        self.busy = b
        st = "disabled" if b else "normal"
        self.btn_scan.config(state=st)
        self.btn_apply.config(state=st)

    # ------------------------------------------------------------ actions
    def scan(self):
        src, dst, d = self.var_src.get(), self.var_dst.get(), self.var_date.get().strip()
        if not src or not Path(src).is_dir():
            messagebox.showwarning(APP_TITLE, "请先选择来源资料夹。")
            return
        if not (len(d) == 8 and d.isdigit()):
            messagebox.showwarning(APP_TITLE, "档名日期要是 8 位数字，例如 20261015。")
            return
        if not dst:
            self.var_dst.set(str(Path(src).parent / f"已命名_{d}"))
        self._set_busy(True)
        self.var_status.set("载入文字辨识模型中…（第一次较慢）")

        def work():
            try:
                rows = scan_folder(src, d, progress=lambda i, n, p: self.q.put(("prog", i, n, p)))
                self.q.put(("scan_done", rows))
            except Exception as e:  # noqa: BLE001
                self.q.put(("error", f"扫描失败：{e}"))
        threading.Thread(target=work, daemon=True).start()

    def apply(self):
        if not self.rows:
            messagebox.showinfo(APP_TITLE, "请先扫描。")
            return
        todo = [r for r in self.rows if str(r.get("action", "")).upper() == "Y"]
        if not todo:
            messagebox.showinfo(APP_TITLE, "没有勾选任何档案。")
            return
        dst = self.var_dst.get()
        msg = f"将处理 {len(todo)} 个档案到：\n{dst}\n\n" + ("（会加水印）\n" if self.var_wm.get() else "") + \
              ("注意：原档会被删除！\n" if self.var_move.get() else "原档不会被修改。\n") + "\n确定执行？"
        if not messagebox.askyesno(APP_TITLE, msg):
            return
        self._save_plan()
        self._set_busy(True)
        rows, move, wm = list(self.rows), self.var_move.get(), self.var_wm.get()

        def work():
            try:
                rep = apply_plan(rows, dst, move=move, watermark=wm,
                                 progress=lambda i, n, p: self.q.put(("prog", i, n, p)))
                self.q.put(("apply_done", rep))
            except Exception as e:  # noqa: BLE001
                self.q.put(("error", f"执行失败：{e}"))
        threading.Thread(target=work, daemon=True).start()

    # ----------------------------------------------------------- events
    def _poll(self):
        try:
            while True:
                msg = self.q.get_nowait()
                kind = msg[0]
                if kind == "prog":
                    _, i, n, p = msg
                    self.pb["maximum"] = max(n, 1)
                    self.pb["value"] = i
                    if p:
                        self.var_status.set(f"处理中 {i + 1}/{n}：{Path(p).name}")
                elif kind == "scan_done":
                    self.rows = msg[1]
                    self._set_busy(False)
                    self._refresh()
                    self._save_plan()
                elif kind == "apply_done":
                    self._set_busy(False)
                    rep = msg[1]
                    rp = Path(self.var_dst.get()) / "执行结果.csv"
                    with open(rp, "w", newline="", encoding="utf-8-sig") as fh:
                        w = csv.writer(fh)
                        w.writerow(["来源", "目标", "结果"])
                        w.writerows(rep)
                    bad = [x for x in rep if x[2].startswith(("跳过", "失败"))]
                    text = f"完成 {len(rep) - len(bad)} 个。"
                    if bad:
                        text += f"\n跳过/失败 {len(bad)} 个：\n" + "\n".join(
                            f"• {Path(s).name}：{st}" for s, _, st in bad[:15])
                    text += f"\n\n结果记录：{rp}"
                    self.var_status.set(text.splitlines()[0])
                    messagebox.showinfo(APP_TITLE, text)
                elif kind == "error":
                    self._set_busy(False)
                    messagebox.showerror(APP_TITLE, msg[1])
        except queue.Empty:
            pass
        self.after(100, self._poll)


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()

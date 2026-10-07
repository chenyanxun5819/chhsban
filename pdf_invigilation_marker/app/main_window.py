from __future__ import annotations

import os
import threading
import tkinter as tk
from pathlib import Path
from queue import Empty, Queue
from tkinter import filedialog, messagebox, ttk

from .config_store import (
    ensure_user_config,
    get_user_data_dir,
    import_excel_to_user_config,
    load_config,
    restore_default_config,
)


class MainWindow:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("PDF 监考名单标记工具")
        self.root.geometry("920x700")

        self.message_queue: Queue[tuple] = Queue()
        self.worker_thread: threading.Thread | None = None

        self.input_var = tk.StringVar()
        self.output_var = tk.StringVar()
        self.config_status_var = tk.StringVar()

        self._build_ui()
        self._refresh_config_status()
        self.root.after(150, self._poll_queue)

    def run(self):
        self.root.mainloop()

    def _build_ui(self):
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(4, weight=1)

        title = ttk.Label(self.root, text="PDF 监考名单标记工具", font=("Segoe UI", 16, "bold"))
        title.grid(row=0, column=0, sticky="w", padx=14, pady=(14, 4))

        description = ttk.Label(
            self.root,
            text="载入扫描 PDF，依老师代号自动识别、排序、标记，并输出新的 PDF。",
        )
        description.grid(row=1, column=0, sticky="w", padx=14, pady=(0, 10))

        config_frame = ttk.LabelFrame(self.root, text="设定资料")
        config_frame.grid(row=2, column=0, sticky="ew", padx=14, pady=(0, 10))
        config_frame.columnconfigure(0, weight=1)

        status_label = ttk.Label(
            config_frame,
            textvariable=self.config_status_var,
            justify="left",
        )
        status_label.grid(row=0, column=0, sticky="w", padx=10, pady=(10, 8))

        button_row = ttk.Frame(config_frame)
        button_row.grid(row=1, column=0, sticky="w", padx=10, pady=(0, 10))
        ttk.Button(button_row, text="匯入老师名单 Excel", command=self._import_excel_config).pack(side="left", padx=(0, 8))
        ttk.Button(button_row, text="开启设定资料夹", command=self._open_config_folder).pack(side="left", padx=(0, 8))
        ttk.Button(button_row, text="还原内建设定", command=self._restore_default_config).pack(side="left")

        file_frame = ttk.LabelFrame(self.root, text="PDF 处理")
        file_frame.grid(row=3, column=0, sticky="ew", padx=14, pady=(0, 10))
        file_frame.columnconfigure(1, weight=1)

        ttk.Label(file_frame, text="输入 PDF").grid(row=0, column=0, sticky="w", padx=10, pady=(10, 6))
        ttk.Entry(file_frame, textvariable=self.input_var).grid(row=0, column=1, sticky="ew", padx=(0, 8), pady=(10, 6))
        ttk.Button(file_frame, text="选择 PDF", command=self._choose_input_pdf).grid(row=0, column=2, sticky="ew", padx=(0, 10), pady=(10, 6))

        ttk.Label(file_frame, text="输出 PDF").grid(row=1, column=0, sticky="w", padx=10, pady=(0, 10))
        ttk.Entry(file_frame, textvariable=self.output_var).grid(row=1, column=1, sticky="ew", padx=(0, 8), pady=(0, 10))
        ttk.Button(file_frame, text="另存为", command=self._choose_output_pdf).grid(row=1, column=2, sticky="ew", padx=(0, 10), pady=(0, 10))

        self.progress_bar = ttk.Progressbar(self.root, mode="determinate", maximum=100)
        self.progress_bar.grid(row=4, column=0, sticky="ew", padx=14, pady=(0, 8))

        log_frame = ttk.LabelFrame(self.root, text="处理日志")
        log_frame.grid(row=5, column=0, sticky="nsew", padx=14, pady=(0, 10))
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        self.log_text = tk.Text(log_frame, wrap="word", height=18)
        self.log_text.grid(row=0, column=0, sticky="nsew", padx=10, pady=10)
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.grid(row=0, column=1, sticky="ns", pady=10)
        self.log_text.configure(yscrollcommand=scrollbar.set, state="disabled")

        action_row = ttk.Frame(self.root)
        action_row.grid(row=6, column=0, sticky="e", padx=14, pady=(0, 14))
        self.run_button = ttk.Button(action_row, text="开始处理", command=self._start_processing)
        self.run_button.pack(side="right")

    def _choose_input_pdf(self):
        file_path = filedialog.askopenfilename(
            title="选择监考 PDF",
            filetypes=[("PDF Files", "*.pdf")],
        )
        if not file_path:
            return
        self.input_var.set(file_path)
        if not self.output_var.get().strip():
            input_path = Path(file_path)
            self.output_var.set(str(input_path.with_name(f"{input_path.stem}_marked.pdf")))

    def _choose_output_pdf(self):
        initial_path = self.output_var.get().strip() or self.input_var.get().strip()
        file_path = filedialog.asksaveasfilename(
            title="选择输出 PDF",
            initialfile=Path(initial_path).name if initial_path else "output_marked.pdf",
            defaultextension=".pdf",
            filetypes=[("PDF Files", "*.pdf")],
        )
        if file_path:
            self.output_var.set(file_path)

    def _import_excel_config(self):
        file_path = filedialog.askopenfilename(
            title="选择老师名单 Excel",
            filetypes=[("Excel Files", "*.xlsx *.xlsm")],
        )
        if not file_path:
            return
        try:
            target_path = import_excel_to_user_config(Path(file_path))
            self._refresh_config_status()
            self._append_log(f"已匯入设定：{target_path}")
        except Exception as exc:
            messagebox.showerror("匯入失败", str(exc))

    def _open_config_folder(self):
        config_dir = get_user_data_dir()
        config_dir.mkdir(parents=True, exist_ok=True)
        os.startfile(str(config_dir))

    def _restore_default_config(self):
        try:
            target_path = restore_default_config()
            self._refresh_config_status()
            self._append_log(f"已还原内建设定：{target_path}")
        except Exception as exc:
            messagebox.showerror("还原失败", str(exc))

    def _start_processing(self):
        input_path = Path(self.input_var.get().strip())
        output_path = Path(self.output_var.get().strip())

        if not input_path.exists():
            messagebox.showwarning("资料不足", "请先选择有效的输入 PDF。")
            return
        if output_path.suffix.lower() != ".pdf":
            messagebox.showwarning("资料不足", "输出档案必须是 .pdf。")
            return

        try:
            ensure_user_config()
            load_config()
        except Exception as exc:
            messagebox.showerror("设定错误", str(exc))
            return

        self.progress_bar["value"] = 5
        self._set_log_text("")
        self.run_button.state(["disabled"])

        def worker():
            try:
                from .pdf_processor import process_pdf

                config = load_config()
                self.message_queue.put(("progress", 10))
                result = process_pdf(
                    input_path,
                    output_path,
                    config,
                    progress_callback=lambda message: self.message_queue.put(("log", message)),
                )
                summary_lines = [
                    f"完成：{result.output_path}",
                    f"共输出 {len(result.matched_teachers)} 位老师。",
                ]
                if result.warnings:
                    summary_lines.append("警告：")
                    summary_lines.extend(f"- {item}" for item in result.warnings)
                self.message_queue.put(("finished", True, "\n".join(summary_lines)))
            except Exception as exc:
                self.message_queue.put(("finished", False, str(exc)))

        self.worker_thread = threading.Thread(target=worker, daemon=True)
        self.worker_thread.start()

    def _refresh_config_status(self):
        try:
            config_path = ensure_user_config()
            config = load_config(config_path)
            self.config_status_var.set(
                "目前设定：\n"
                f"- 路径：{config_path}\n"
                f"- 老师数：{len(config.teachers)}\n"
                f"- 座位区块数：{len(config.seat_blocks)}\n"
                f"- 排序顺序：{' > '.join(config.group_order)}"
            )
        except Exception as exc:
            self.config_status_var.set(
                "目前没有可用设定。\n"
                "请先匯入 Excel，或将 default_config.json 放到 data 目录。\n"
                f"错误：{exc}"
            )

    def _append_log(self, message: str):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def _set_log_text(self, text: str):
        self.log_text.configure(state="normal")
        self.log_text.delete("1.0", "end")
        if text:
            self.log_text.insert("1.0", text)
        self.log_text.configure(state="disabled")

    def _poll_queue(self):
        try:
            while True:
                event = self.message_queue.get_nowait()
                event_type = event[0]
                if event_type == "log":
                    self._append_log(event[1])
                elif event_type == "progress":
                    self.progress_bar["value"] = event[1]
                elif event_type == "finished":
                    success = event[1]
                    message = event[2]
                    self.run_button.state(["!disabled"])
                    self.progress_bar["value"] = 100 if success else 0
                    self._append_log(message)
                    if success:
                        messagebox.showinfo("处理完成", message)
                    else:
                        messagebox.showerror("处理失败", message)
        except Empty:
            pass
        finally:
            self.root.after(150, self._poll_queue)

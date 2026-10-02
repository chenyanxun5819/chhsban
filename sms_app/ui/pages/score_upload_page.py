#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
成绩上传页面 - 批量上传学生成绩
"""

from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QFileDialog, QGroupBox, QTableWidget, QTableWidgetItem, QProgressBar,
    QComboBox, QMessageBox
)
from PyQt6.QtGui import QFont
from PyQt6.QtCore import Qt, QThread, pyqtSignal
from pathlib import Path
from datetime import date, datetime
from openpyxl import load_workbook
import time

from core.config_manager import ConfigManager
from core.cache_manager import ProjectCacheManager
from ui.pages.settings_page import ProjectUpdateThread


def read_sheet_date(ws) -> str:
    """读取 B1 的日期，返回 YYYY-MM-DD；没填或格式认不出来则返回空字符串"""
    date_val = ws.cell(row=1, column=2).value
    if isinstance(date_val, (datetime, date)):
        return date_val.strftime('%Y-%m-%d')
    if isinstance(date_val, str):
        for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y/%m/%d']:
            try:
                return datetime.strptime(date_val.strip(), fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
    return ''


def check_sheet(ws) -> str:
    """
    上传前核对一张 sheet，返回问题说明（没有问题则返回空字符串）
    - Sheet 名称与 B2 必须是同一个项目编号
    - B1 必须有读得出来的日期
    """
    sheet_code = ws.title.strip()
    b2_value = ws.cell(row=2, column=2).value
    b2_code = str(b2_value).strip() if b2_value is not None else ''
    if not b2_code:
        return f"B2 没有填写项目编号（应与 sheet 名称相同：{sheet_code}）"
    if b2_code != sheet_code:
        return f"B2 写的项目编号是「{b2_code}」，与 sheet 名称不一致"
    if not read_sheet_date(ws):
        b1_value = ws.cell(row=1, column=2).value
        if b1_value is None or str(b1_value).strip() == '':
            return "B1 没有填写日期"
        return f"B1 的日期「{b1_value}」无法识别（请写成 2026-05-26 或 26/5/2026）"
    return ''


class UploadThread(QThread):
    """后台线程执行上传（支持自动重新登入）"""
    progress_updated = pyqtSignal(int)
    upload_finished = pyqtSignal(bool, str)
    log_message = pyqtSignal(str, str)

    def __init__(self, excel_path: str, sheet_name: str, username: str, password: str, session=None):
        super().__init__()
        self.excel_path = excel_path
        self.sheet_name = sheet_name  # sheet 名称即项目编号
        self.username = username
        self.password = password
        self.session = session  # 从启动时保存的 session
    
    def run(self):
        """
        执行上传流程：
        1. 读取 Excel 数据
        2. 调用 SMS 处理器上传（会自动处理登入失败/cookie过期）
        """
        try:
            def emit_log(level: str, message: str):
                self.log_message.emit(level, message)

            self.progress_updated.emit(10)
            
            # 第1步：读取 Excel 文件
            emit_log('info', f"[上传线程] 读取 Excel 文件: {self.excel_path}")
            from openpyxl import load_workbook
            
            wb = load_workbook(self.excel_path, data_only=True)
            if self.sheet_name not in wb.sheetnames:
                wb.close()
                self.upload_finished.emit(False, f"❌ Excel 中找不到 sheet「{self.sheet_name}」，已取消上传")
                return
            ws = wb[self.sheet_name]

            # 项目编号以 sheet 名称为准，B2 必须写着同一个编号、B1 必须有日期才上传
            # （文件可能在选好之后又被修改，所以上传前再核对一次）
            problem = check_sheet(ws)
            if problem:
                wb.close()
                self.upload_finished.emit(False, f"❌ sheet「{self.sheet_name}」{problem}，已取消上传")
                return
            activity_code = ws.title.strip()
            date_str = read_sheet_date(ws)  # B1
            emit_log('info', f"[上传线程] 项目编号: {activity_code}")

            # 读取学期（从 B3，新增）
            semester_val = ws.cell(row=3, column=2).value  # B3
            semester = None  # None表示使用表单默认值
            if semester_val:
                try:
                    semester_int = int(semester_val)
                    if semester_int in [1, 2]:
                        semester = str(semester_int)
                        emit_log('info', f"[上传线程] 读取到学期: {semester}")
                    else:
                        emit_log('warning', f"[上传线程] B3 学期值无效 ({semester_val})，使用表单默认值")
                except:
                    emit_log('warning', f"[上传线程] B3 学期格式错误，使用表单默认值")
            else:
                emit_log('info', "[上传线程] B3 未填写学期，使用表单默认值")
            
            # 读取数据（从第5行开始）
            scores_data = []
            for row_num in range(5, ws.max_row + 1):
                raw_student_id = ws.cell(row=row_num, column=3).value
                if raw_student_id is None or str(raw_student_id).strip() == "":
                    student_id = ""
                elif isinstance(raw_student_id, (int, float)):
                    student_id = str(int(raw_student_id))
                else:
                    student_id = str(raw_student_id).strip()

                cell_values = {
                    'name': ws.cell(row=row_num, column=1).value,      # Column 1: 姓名
                    'class': ws.cell(row=row_num, column=2).value,     # Column 2: 班级
                    'student_id': student_id,                          # Column 3: 学号
                    'category': ws.cell(row=row_num, column=4).value,  # Column 4: 类别
                    'remarks': ws.cell(row=row_num, column=5).value,   # Column 5: 奖项/备注
                    'english_name': ws.cell(row=row_num, column=6).value, # Column 6: 英文名
                }
                
                # 如果至少有学号和班级，则视为有效行
                if cell_values['student_id'] and cell_values['class']:
                    scores_data.append(cell_values)
            
            wb.close()
            
            emit_log('info', f"[上传线程] 读取到 {len(scores_data)} 条有效数据")
            emit_log('info', f"[上传线程] 日期: {date_str}, 活动代码: {activity_code}")
            
            if len(scores_data) == 0:
                self.upload_finished.emit(False, "❌ 未找到有效的学生数据")
                return
            
            self.progress_updated.emit(20)
            
            # 第2步：创建 SMS 处理器并上传
            emit_log('info', "[上传线程] 创建 SMS 处理器...")
            from core.sms_handler import SMSHandler
            
            handler = SMSHandler()
            
            self.progress_updated.emit(30)
            
            emit_log('info', "[上传线程] 开始上传数据（带自动重新登入机制）...")
            
            # 调用上传方法，传入 session（如果存在）
            result = handler.upload_student_scores(
                username=self.username,
                password=self.password,
                scores_data=scores_data,
                date=date_str,
                activity_code=activity_code,
                session=self.session,  # 传入启动时保存的 session
                max_retries=3,  # 最多重试3次
                retry_delay=2,  # 每次重试延迟2秒
                log_callback=emit_log,
            )
            
            # 根据结果更新进度
            if result['success']:
                self.progress_updated.emit(90)
                time.sleep(0.5)
                self.progress_updated.emit(100)
                
                message = f"✅ 上传成功！({result['uploaded']}/{result['total']} 条)"
                emit_log('success', f"[上传线程] {message}")
                self.upload_finished.emit(True, message)
            else:
                # 部分成功或完全失败
                self.progress_updated.emit(100)
                
                if result['uploaded'] > 0:
                    message = (f"⚠️  部分上传成功\n"
                             f"成功: {result['uploaded']}, 失败: {result['failed']}\n"
                             f"详情: {result['message']}")
                    if result.get('errors'):
                        message += f"\n未找到: {', '.join(result['errors'])}"
                else:
                    message = f"❌ {result['message']}"
                    if result.get('errors'):
                        message += f"\n未找到: {', '.join(result['errors'])}"
                
                emit_log('error' if result['uploaded'] == 0 else 'warning', f"[上传线程] {message}")
                self.upload_finished.emit(result['uploaded'] > 0, message)
            
        except Exception as e:
            self.log_message.emit('error', f"[上传线程] 异常: {e}")
            import traceback
            traceback.print_exc()
            self.upload_finished.emit(False, f"❌ 上传异常: {str(e)}")


class ScoreUploadPage:
    def __init__(self, console, get_session_callback=None):
        self.console = console
        self.widget = None
        self.selected_file = None
        self.config = ConfigManager()
        self.upload_thread = None
        self.refresh_thread = None
        self.get_session_callback = get_session_callback  # 获取 session 的回调函数
        self._create_ui()
    
    def _create_ui(self):
        """创建 UI"""
        self.widget = QWidget()
        layout = QVBoxLayout()
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(10)
        
        # 标题
        title = QLabel("成绩上传")
        title.setFont(QFont("Segoe UI", 12, QFont.Weight.Bold))
        layout.addWidget(title)
        
        # 文件选择区
        file_group = QGroupBox("选择文件")
        file_layout = QVBoxLayout()
        file_layout.setSpacing(10)
        
        file_btn_layout = QHBoxLayout()
        
        self.file_label = QLabel("未选择文件")
        self.file_label.setStyleSheet("background-color: #3c3c3c; padding: 10px; border: 1px solid #3e3e42;")
        
        select_btn = QPushButton("📂 选择 Excel 文件")
        select_btn.setMaximumWidth(150)
        select_btn.clicked.connect(self.select_file)
        
        download_btn = QPushButton("⬇️  下载模板")
        download_btn.setMaximumWidth(150)
        download_btn.clicked.connect(self.download_template)
        
        file_btn_layout.addWidget(self.file_label, 1)
        file_btn_layout.addWidget(select_btn)
        file_btn_layout.addWidget(download_btn)
        
        file_layout.addLayout(file_btn_layout)

        # 项目选择：只列出所选 Excel 中 sheet 名称对得上项目清单的项目
        project_layout = QHBoxLayout()

        project_label = QLabel("项目:")
        project_label.setMinimumWidth(40)

        self.project_combo = QComboBox()
        self.project_combo.setPlaceholderText("请先选择 Excel 文件")
        self.project_combo.currentIndexChanged.connect(self._on_project_selected)

        self.refresh_btn = QPushButton("🔄 刷新项目")
        self.refresh_btn.setMaximumWidth(150)
        self.refresh_btn.clicked.connect(self.refresh_projects)

        project_layout.addWidget(project_label)
        project_layout.addWidget(self.project_combo, 1)
        project_layout.addWidget(self.refresh_btn)

        file_layout.addLayout(project_layout)
        file_group.setLayout(file_layout)
        layout.addWidget(file_group)
        
        # 预览表格
        preview_label = QLabel("📋 成绩数据预览")
        preview_label.setFont(QFont("Segoe UI", 10, QFont.Weight.Bold))
        layout.addWidget(preview_label)
        
        self.preview_table = QTableWidget()
        self.preview_table.setColumnCount(6)
        self.preview_table.setHorizontalHeaderLabels(["班级", "学号", "姓名", "类别", "备注", "英文名"])
        self.preview_table.setMaximumHeight(150)
        layout.addWidget(self.preview_table)
        
        # 进度条
        progress_label = QLabel("上传进度")
        progress_label.setFont(QFont("Segoe UI", 9, QFont.Weight.Bold))
        layout.addWidget(progress_label)
        
        self.progress_bar = QProgressBar()
        self.progress_bar.setValue(0)
        self.progress_bar.setMaximumHeight(20)
        layout.addWidget(self.progress_bar)
        
        # 上传按钮
        btn_layout = QHBoxLayout()
        upload_btn = QPushButton("📤 开始上传")
        upload_btn.setMinimumWidth(120)
        upload_btn.clicked.connect(self.start_upload)
        
        btn_layout.addWidget(upload_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)
        
        layout.addStretch()
        
        self.widget.setLayout(layout)
    
    def get_input_widget(self):
        """返回输入区 widget"""
        return self.widget
    
    def select_file(self):
        """选择文件"""
        # 尝试读取上次打开的目录
        from pathlib import Path
        import json
        
        config_dir = Path.home() / '.sms_app'
        config_file = config_dir / 'last_folder.json'
        initial_dir = ""
        
        try:
            if config_file.exists():
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    initial_dir = config.get('score_upload_folder', '')
        except Exception:
            pass
        
        file_path, _ = QFileDialog.getOpenFileName(
            None,
            "选择 Excel 文件",
            initial_dir,
            "Excel Files (*.xlsx);;All Files (*)"
        )
        
        if file_path:
            self.selected_file = file_path
            self.file_label.setText(f"✓ {file_path}")
            self.console.log_success(f"已选择文件: {file_path}")
            self._load_projects_from_file()
            
            # 保存这次打开的目录
            try:
                folder_path = str(Path(file_path).parent)
                config_dir.mkdir(parents=True, exist_ok=True)
                
                existing_config = {}
                if config_file.exists():
                    with open(config_file, 'r', encoding='utf-8') as f:
                        existing_config = json.load(f)
                
                existing_config['score_upload_folder'] = folder_path
                
                with open(config_file, 'w', encoding='utf-8') as f:
                    json.dump(existing_config, f, ensure_ascii=False, indent=2)
            except Exception as e:
                # 保存失败不影响功能
                print(f"无法保存文件夹路径: {e}")
    
    def _inspect_file(self, file_path: str) -> tuple:
        """
        核对 Excel 中每张 sheet 的项目编号

        Returns:
            (可上传的项目 [(sheet 名称, 项目名称), ...], 有问题的 sheet 说明 [str, ...])
        """
        projects, _ = ProjectCacheManager().load_cache()
        name_by_code = {
            str(project.get('项目代码', '')).strip(): str(project.get('项目名称', ''))
            for project in (projects or [])
        }

        valid, problems = [], []
        wb = load_workbook(file_path, data_only=True)
        try:
            for ws in wb.worksheets:
                sheet_code = ws.title.strip()
                # 名称以 _ 开头的是说明、总表这类非项目的 sheet，不核对也不列入选单
                if sheet_code.startswith('_'):
                    continue
                if sheet_code not in name_by_code:
                    problems.append(f"「{ws.title}」项目清单中查无此项目编号")
                    continue
                problem = check_sheet(ws)
                if problem:
                    problems.append(f"「{ws.title}」{problem}")
                    continue
                valid.append((ws.title, name_by_code[sheet_code]))
        finally:
            wb.close()
        return valid, problems

    def _warn_sheet_problems(self, problems: list):
        """弹出警告窗，请操作者检查写错的项目编号或日期"""
        for problem in problems:
            self.console.log_warning(f"[项目核对] {problem}")
        QMessageBox.warning(
            self.widget,
            "有 sheet 无法上传",
            "以下 sheet 无法上传，请检查项目编号和日期是否写错：\n\n"
            + "\n".join(f"• {problem}" for problem in problems)
            + "\n\nSheet 名称和 B2 都必须是 SMS 上的项目编号，B1 必须填写日期。"
            "\n若是刚在 SMS 新增的项目，请先按「刷新项目」。"
            "\n说明、总表这类非项目的 sheet，名称请以 _ 开头。"
        )

    def _load_projects_from_file(self):
        """读取所选 Excel 的 sheet，把对得上项目清单的项目放进下拉选单"""
        previous_sheet = self.project_combo.currentData()

        self.project_combo.blockSignals(True)
        self.project_combo.clear()
        self.project_combo.blockSignals(False)
        self.preview_table.setRowCount(0)

        try:
            valid, problems = self._inspect_file(self.selected_file)
        except Exception as e:
            self.console.log_error(f"加载文件失败: {str(e)}")
            return

        self.project_combo.blockSignals(True)
        for sheet_name, project_name in valid:
            self.project_combo.addItem(f"{sheet_name.strip()}    {project_name}", sheet_name)
        self.project_combo.setCurrentIndex(-1)
        self.project_combo.blockSignals(False)
        self.project_combo.setPlaceholderText("选择要上传的项目" if valid else "此文件没有可上传的项目")

        self.console.log_info(f"此文件有 {len(valid)} 个可上传的项目", "#4ec9b0")
        if problems:
            self._warn_sheet_problems(problems)

        # 只有一个项目时直接选上；刷新后尽量保留原本选的项目
        index = self.project_combo.findData(previous_sheet) if previous_sheet else -1
        if index < 0 and len(valid) == 1:
            index = 0
        if index >= 0:
            self.project_combo.setCurrentIndex(index)

    def _on_project_selected(self, index: int):
        """切换项目时，预览对应的 sheet"""
        if index < 0 or not self.selected_file:
            return
        self.console.log_info(f"已选择项目: {self.project_combo.currentText()}", "#4ec9b0")
        self._load_preview(self.selected_file, self.project_combo.currentData())

    def refresh_projects(self):
        """重新从 SMS 下载项目清单，完成后重新核对所选的 Excel"""
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return

        self.console.log_info("[刷新项目] 正在更新项目清单...", "#dcdcaa")
        self.refresh_btn.setEnabled(False)
        self.refresh_btn.setText("🔄 刷新中...")

        self.refresh_thread = ProjectUpdateThread(username, password)
        self.refresh_thread.update_message.connect(lambda message: self.console.log_info(message, "#8abaff"))
        self.refresh_thread.update_finished.connect(self._on_refresh_finished)
        self.refresh_thread.start()

    def _on_refresh_finished(self, success: bool, result: dict):
        """项目清单更新完成"""
        self.refresh_btn.setEnabled(True)
        self.refresh_btn.setText("🔄 刷新项目")

        if success and result.get('checked'):
            self.console.log_success(f"[刷新项目] ✅ {result.get('message', '项目清单已更新')}")
        else:
            self.console.log_error(f"[刷新项目] ❌ {result.get('message', '更新失败')}")

        if self.selected_file:
            self._load_projects_from_file()

    def _load_preview(self, file_path: str, sheet_name: str):
        """加载 Excel 预览"""
        try:
            wb = load_workbook(file_path, data_only=True)
            ws = wb[sheet_name]

            # 清空表格
            self.preview_table.setRowCount(0)

            # 读取第4行作为标题（如果存在）
            headers = []
            for col in range(1, 7):
                cell_value = ws.cell(row=4, column=col).value
                if cell_value:
                    headers.append(str(cell_value))

            if headers:
                self.preview_table.setColumnCount(len(headers))
                self.preview_table.setHorizontalHeaderLabels(headers)

            # 读取数据行（从第5行开始）
            row_idx = 0
            for excel_row in range(5, min(ws.max_row + 1, 25)):  # 最多显示20行
                col_idx = 0
                row_data = []
                for col in range(1, 7):
                    cell = ws.cell(row=excel_row, column=col)
                    row_data.append(str(cell.value) if cell.value else "")

                if any(row_data):  # 如果该行不为空
                    self.preview_table.insertRow(row_idx)
                    for i, data in enumerate(row_data):
                        self.preview_table.setItem(row_idx, i, QTableWidgetItem(data))
                    row_idx += 1
            
            wb.close()
            self.console.log_info(f"已加载 {row_idx} 行数据", "#4ec9b0")
        except Exception as e:
            self.console.log_error(f"加载文件失败: {str(e)}")
    
    def download_template(self):
        """下载模板"""
        try:
            import sys
            # 改用動態產生範本，避免二進位檔需要管理
            save_path, _ = QFileDialog.getSaveFileName(
                None,
                "保存模板",
                "template.xlsx",
                "Excel Files (*.xlsx)"
            )

            if save_path:
                try:
                    from openpyxl import Workbook

                    wb = Workbook()
                    ws = wb.active

                    # sheet 名稱與 B2 都要改成 SMS 上的項目編號；範本不放真實編號，
                    # 沒改就上傳會被擋下，不會寫進別的項目
                    ws.title = '项目编号'

                    # 第1、2 行保留給日期與活動代碼（對應現有上傳程式）
                    ws.cell(row=1, column=1, value='date')
                    ws.cell(row=1, column=2, value='YYYY-MM-DD')
                    ws.cell(row=2, column=1, value='activity_code')
                    ws.cell(row=2, column=2, value='项目编号')

                    # 第4行為表頭：name, class, studentId, category, award, english_name
                    headers = ['name', 'class', 'studentId', 'category', 'award', 'english_name']
                    for i, h in enumerate(headers, start=1):
                        ws.cell(row=4, column=i, value=h)

                    # 寫入範例一列（空白為可編輯）
                    ws.cell(row=5, column=1, value='張三')
                    ws.cell(row=5, column=2, value='J1A')
                    ws.cell(row=5, column=3, value='26001')
                    ws.cell(row=5, column=4, value='校外学艺')
                    ws.cell(row=5, column=5, value='優異')
                    ws.cell(row=5, column=6, value='ZHANG SAN')

                    wb.save(save_path)
                    wb.close()

                    self.console.log_success(f"[下载模板] 模板已生成并保存到: {save_path}")
                except Exception as e:
                    self.console.log_error(f"[下载模板] 生成模板失败: {str(e)}")
        except Exception as e:
            self.console.log_error(f"[下载模板] 异常: {str(e)}")
    
    def start_upload(self):
        """开始上传"""
        if not self.selected_file:
            self.console.log_warning("请先选择 Excel 文件")
            return
        
        # 获取保存的凭证
        username, password = self.config.get_credentials()
        if not username or not password:
            self.console.log_warning("未找到保存的凭证，请先在【设定】页面保存凭证")
            return
        
        sheet_name = self.project_combo.currentData()
        if not sheet_name:
            self.console.log_warning("请先选择要上传的项目")
            return

        # 文件可能在选好之后又被修改，上传前重新核对一次
        try:
            valid, problems = self._inspect_file(self.selected_file)
        except Exception as e:
            self.console.log_error(f"加载文件失败: {str(e)}")
            return
        if sheet_name not in [name for name, _ in valid]:
            self._warn_sheet_problems(
                [p for p in problems if p.startswith(f"「{sheet_name}」")]
                or [f"「{sheet_name}」在文件中已找不到，请重新选择文件"]
            )
            return

        self.console.log_info(
            f"开始上传: {self.project_combo.currentText()} ({self.selected_file})", "#dcdcaa"
        )
        self.progress_bar.setValue(0)
        
        # 获取现有的 session（如果有）
        session = None
        if self.get_session_callback:
            try:
                session = self.get_session_callback()
            except:
                pass
        
        # 启动后台线程
        self.upload_thread = UploadThread(self.selected_file, sheet_name, username, password, session=session)
        self.upload_thread.progress_updated.connect(self._update_progress)
        self.upload_thread.log_message.connect(self._on_upload_log)
        self.upload_thread.upload_finished.connect(self._on_upload_finished)
        self.upload_thread.start()
    
    def _update_progress(self, value: int):
        """更新进度条"""
        self.progress_bar.setValue(value)

    def _on_upload_log(self, level: str, message: str):
        """将后台线程日志写入 UI 控制台与日志文件"""
        if level == 'success':
            self.console.log_success(message)
        elif level == 'warning':
            self.console.log_warning(message)
        elif level == 'error':
            self.console.log_error(message)
        else:
            self.console.log_info(message)
    
    def _on_upload_finished(self, success: bool, message: str):
        """上传完成"""
        if success:
            self.console.log_success(message)
        else:
            self.console.log_error(message)

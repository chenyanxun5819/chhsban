"""
答案纸布局配置与版型预设

所有坐标、尺寸单位为 mm（毫米）。
"""

from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any
import json


@dataclass
class Fiducial:
    """定位标记"""
    id: str  # "TL", "TR", "BL", "BR"
    x: float  # 左上角 x (mm)
    y: float  # 左上角 y (mm)
    w: float = 7.0  # 宽度 (mm)
    h: float = 7.0  # 高度 (mm)


@dataclass
class OrientationMark:
    """方向标记（顶部中央横条，用于检测 180° 旋转）"""
    x: float  # 中心 x (mm)
    y: float  # 中心 y (mm)
    w: float  # 宽度 (mm)
    h: float  # 高度 (mm)


@dataclass
class Bubble:
    """单个气泡"""
    opt: str  # 选项字母 A-E
    cx: float  # 中心 x (mm)
    cy: float  # 中心 y (mm)
    r: float  # 等面积半径 (mm)，仅为兼容旧代码；长方形请用 w/h
    w: float = 0.0  # 长方形宽 (mm)
    h: float = 0.0  # 长方形高 (mm)


@dataclass
class IDBubble:
    """证号气泡"""
    digit: int  # 0-9
    cx: float  # 中心 x (mm)
    cy: float  # 中心 y (mm)
    r: float  # 等面积半径 (mm)，仅为兼容旧代码；长方形请用 w/h
    w: float = 0.0  # 长方形宽 (mm)
    h: float = 0.0  # 长方形高 (mm)


@dataclass
class Question:
    """单题及其气泡"""
    q: int  # 题号 1-100
    bubbles: List[Bubble]  # 选项气泡
    feedback_slot: Dict[str, float]  # 回印格 {x, y, w, h}


@dataclass
class IDColumn:
    """证号列"""
    col: int  # 列序 0-N-1
    bubbles: List[IDBubble]  # 0-9 的气泡


@dataclass
class LayoutConfig:
    """完整的答案纸布局"""
    template_id: str
    version: int
    page_mm: List[float]  # [210, 297]
    fiducials: List[Fiducial]
    orientation_mark: OrientationMark
    canvas_dpi: int  # 应为 300
    questions: List[Question]
    id_columns: List[IDColumn]
    option_count: int  # 4 或 5
    id_digits: int  # N 位数字
    score_box: Dict[str, float]  # {x, y, w, h}
    name_line: Optional[Dict[str, float]] = None  # {x, y, w}  y=文字基线距页顶 (mm)
    class_line: Optional[Dict[str, float]] = None  # 班级手写线 {x, y, w}
    id_line: Optional[Dict[str, float]] = None  # 学号手写线 {x, y, w}（仅供人看，不参与识别）

    def to_dict(self) -> Dict[str, Any]:
        """转换为可序列化的字典"""
        return {
            "template_id": self.template_id,
            "version": self.version,
            "page_mm": self.page_mm,
            "fiducials": [asdict(f) for f in self.fiducials],
            "orientation_mark": asdict(self.orientation_mark),
            "canvas_dpi": self.canvas_dpi,
            "questions": [
                {
                    "q": q.q,
                    "bubbles": [asdict(b) for b in q.bubbles],
                    "feedback_slot": q.feedback_slot,
                }
                for q in self.questions
            ],
            "id_columns": [
                {
                    "col": c.col,
                    "bubbles": [asdict(b) for b in c.bubbles],
                }
                for c in self.id_columns
            ],
            "option_count": self.option_count,
            "id_digits": self.id_digits,
            "feedback_slot_shape": "circle",  # feedback_slot 的 x/y/w/h 是圆的外接正方形，圆心=(x+w/2, y+h/2)，直径=w
            "id_layout": "rows",  # 每个 id_columns 元素是一行：col=第几位(从上到下)，digit 0-9 由左到右
            "score_box": self.score_box,
            "name_line": self.name_line,
            "class_line": self.class_line,
            "id_line": self.id_line,
        }

    def to_json(self) -> str:
        """转换为 JSON 字符串"""
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "LayoutConfig":
        """从字典反序列化为 LayoutConfig 实例
        
        Args:
            data: 包含 layout.json 结构的字典
        
        Returns:
            LayoutConfig 实例
        
        Raises:
            ValueError: 如果数据格式不正确或缺少必需字段
        """
        try:
            # 重构 Fiducial 列表
            fiducials = [Fiducial(**f) for f in data.get('fiducials', [])]
            
            # 重构 OrientationMark
            om_data = data.get('orientation_mark', {})
            orientation_mark = OrientationMark(**om_data)
            
            # 重构 Question 和 Bubble 列表
            questions = []
            for q_data in data.get('questions', []):
                bubbles = [Bubble(**b) for b in q_data.get('bubbles', [])]
                questions.append(Question(
                    q=q_data['q'],
                    bubbles=bubbles,
                    feedback_slot=q_data.get('feedback_slot', {})
                ))
            
            # 重构 IDColumn 和 IDBubble 列表
            id_columns = []
            for c_data in data.get('id_columns', []):
                bubbles = [IDBubble(**b) for b in c_data.get('bubbles', [])]
                id_columns.append(IDColumn(
                    col=c_data['col'],
                    bubbles=bubbles
                ))
            
            # 构造 LayoutConfig
            return cls(
                template_id=data['template_id'],
                version=data['version'],
                page_mm=data['page_mm'],
                fiducials=fiducials,
                orientation_mark=orientation_mark,
                canvas_dpi=data['canvas_dpi'],
                questions=questions,
                id_columns=id_columns,
                option_count=data['option_count'],
                id_digits=data['id_digits'],
                score_box=data['score_box'],
                name_line=data.get('name_line'),
                class_line=data.get('class_line'),
                id_line=data.get('id_line'),
            )
        except KeyError as e:
            raise ValueError(f'Missing required field in layout data: {e}')
        except TypeError as e:
            raise ValueError(f'Invalid field type in layout data: {e}')


# 证号区几何（mm）：每位数字一行，每行 0-9 由左到右
ID_X_START = 30.0     # 数字 0 的圆心 x
ID_COL_SPACING = 7.0  # 相邻数字圆心间距（≥ 6mm）
ID_Y_START = 48.0     # 第 1 位那一行的圆心 y
ID_ROW_SPACING = 6.0  # 相邻两位（行）的圆心间距
ID_BUBBLE_W = 4.6  # 证号长方形：宽 (mm)
ID_BUBBLE_H = 3.2  # 证号长方形：高 (mm)
ID_BUBBLE_R = (ID_BUBBLE_W * ID_BUBBLE_H / 3.141592653589793) ** 0.5


def _build_id_rows(id_digits: int) -> "List[IDColumn]":
    """生成横排证号：col=第几位(0 起，最上面一行为第 1 位)，bubbles 为 0-9 由左到右。"""
    rows = []
    for pos in range(id_digits):
        cy = ID_Y_START + pos * ID_ROW_SPACING
        bubbles = [
            IDBubble(digit=d, cx=ID_X_START + d * ID_COL_SPACING, cy=cy, r=round(ID_BUBBLE_R, 3), w=ID_BUBBLE_W, h=ID_BUBBLE_H)
            for d in range(10)
        ]
        rows.append(IDColumn(col=pos, bubbles=bubbles))
    return rows


# 定位标记（正方形）：外缘距页边 FID_MARGIN mm
FID_W = 7.0
FID_H = 7.0
FID_MARGIN = 8.0


def _build_fiducials(page_w: float, page_h: float) -> "List[Fiducial]":
    """四角定位标记：x/y 为左上角。"""
    right_x = page_w - FID_MARGIN - FID_W
    bottom_y = page_h - FID_MARGIN - FID_H
    return [
        Fiducial("TL", x=FID_MARGIN, y=FID_MARGIN, w=FID_W, h=FID_H),
        Fiducial("TR", x=right_x, y=FID_MARGIN, w=FID_W, h=FID_H),
        Fiducial("BL", x=FID_MARGIN, y=bottom_y, w=FID_W, h=FID_H),
        Fiducial("BR", x=right_x, y=bottom_y, w=FID_W, h=FID_H),
    ]


class TemplatePresets:
    """版型预设集合"""

    @staticmethod
    def T100_A4_v1(
        id_digits: int = 5,
        option_count: int = 5,
        include_name_line: bool = True,
    ) -> LayoutConfig:
        """
        T100-A4-v1：4 栏 × 25 题 = 100 题
        
        参数：
        - id_digits: 证号位数（默认 5）
        - option_count: 选项数 4 或 5（默认 5）
        - include_name_line: 是否包含姓名/班级/学号手写线（默认 True）
        """
        if id_digits < 1 or id_digits > 12:
            raise ValueError(f"id_digits must be 1-12, got {id_digits}")
        if option_count not in (4, 5):
            raise ValueError(f"option_count must be 4 or 5, got {option_count}")

        # 页面参数
        page_w, page_h = 210.0, 297.0
        fiducial_r = 3.5  # 定位标记半径
        orientation_y = 11.0

        # 布局常量
        cols = 4
        rows_per_col = 25
        col_y_start = 86.0
        col_y_end = 275.0
        col_height = col_y_end - col_y_start
        row_spacing = col_height / rows_per_col  # 约 7.56 mm

        # 定位标记（四个角）
        fiducials = _build_fiducials(page_w, page_h)

        # 方向标记（顶部中央）
        orientation_mark = OrientationMark(x=105, y=orientation_y, w=20, h=4)

        # 构建题目列表
        questions = []
        bubble_r = 1.9  # 仅用于回印格定位的偏移（mm）
        bubble_w, bubble_h = 4.6, 2.8  # 答题长方形 宽×高（mm）
        opt_letters = "ABCDE"[:option_count]
        
        # 选项间距计算：确保满足 ≥ 6mm 约束
        # 可用宽度（去掉两侧 10mm 边距）
        available_width = page_w - 20.0
        col_width = available_width / cols  # 约 47.5 mm
        
        # 每栏的选项分配：题号 + 选项气泡 + 回印格
        # 题号：约 5mm，选项：option_count × 6.5mm，回印格：5.5mm
        # 总计约 5 + 5*6.5 + 5.5 = 44 mm（5选项时）
        opt_spacing_between = 6.5  # 选项圆心之间的间距 (mm)
        
        for col_idx in range(cols):
            col_x_start = 10.0 + col_idx * col_width
            q_start = col_idx * rows_per_col + 1
            
            for row_idx in range(rows_per_col):
                q_num = q_start + row_idx
                q_y = col_y_start + row_idx * row_spacing
                
                # 选项气泡
                bubbles = []
                # 选项 x 坐标：从栏的左侧开始，每个选项间距 opt_spacing_between
                opt_x_base = col_x_start + 6.0  # 栏内左边距 6mm
                
                for opt_idx, opt in enumerate(opt_letters):
                    opt_cx = opt_x_base + opt_idx * opt_spacing_between
                    bubbles.append(Bubble(opt=opt, cx=opt_cx, cy=q_y,
                                          r=round((bubble_w * bubble_h / 3.141592653589793) ** 0.5, 3),
                                          w=bubble_w, h=bubble_h))
                
                # 回印格（选项右侧）
                if bubbles:
                    feedback_x = bubbles[-1].cx + bubble_r + 2.0  # 气泡右侧 + 2mm 间隙
                else:
                    feedback_x = col_x_start + col_width - 6.0
                
                feedback_slot = {
                    "x": feedback_x,
                    "y": q_y - 2.75,
                    "w": 5.5,
                    "h": 5.5,
                }
                
                questions.append(Question(q=q_num, bubbles=bubbles, feedback_slot=feedback_slot))

        # 证号（横排，左上方）
        id_columns = _build_id_rows(id_digits)

        # 分数框（页头右侧）
        score_box = {"x": 170.0, "y": 20.0, "w": 30.0, "h": 10.0}

        # 姓名手写线（可选）
        name_line = class_line = id_line = None
        if include_name_line:
            name_line = {"x": 15.0, "y": 28.0, "w": 85.0}
            class_line = {"x": 105.0, "y": 28.0, "w": 55.0}
            id_line = {"x": 15.0, "y": 35.0, "w": 85.0}

        return LayoutConfig(
            template_id="T100-A4-v1",
            version=1,
            page_mm=[page_w, page_h],
            fiducials=fiducials,
            orientation_mark=orientation_mark,
            canvas_dpi=300,
            questions=questions,
            id_columns=id_columns,
            option_count=option_count,
            id_digits=id_digits,
            score_box=score_box,
            name_line=name_line,
            class_line=class_line,
            id_line=id_line,
        )

    @staticmethod
    def T060_A4_v1(
        id_digits: int = 5,
        option_count: int = 5,
        include_name_line: bool = True,
    ) -> LayoutConfig:
        """
        T060-A4-v1：3 栏 × 20 题 = 60 题
        行距约 9-9.5 mm，气泡直径可放大到 4.2 mm，回印格放大到 7 × 7 mm
        """
        if id_digits < 1 or id_digits > 12:
            raise ValueError(f"id_digits must be 1-12, got {id_digits}")
        if option_count not in (4, 5):
            raise ValueError(f"option_count must be 4 or 5, got {option_count}")

        # 页面参数
        page_w, page_h = 210.0, 297.0
        orientation_y = 11.0

        # 布局常量
        cols = 3
        rows_per_col = 20
        col_y_start = 86.0
        col_y_end = 275.0
        col_height = col_y_end - col_y_start
        row_spacing = col_height / rows_per_col  # 约 9.45 mm

        # 定位标记
        fiducials = _build_fiducials(page_w, page_h)

        # 方向标记
        orientation_mark = OrientationMark(x=105, y=orientation_y, w=20, h=4)

        # 构建题目列表（气泡更大）
        questions = []
        bubble_r = 2.1  # 仅用于回印格定位的偏移（mm）
        bubble_w, bubble_h = 5.0, 3.0  # T060 答题长方形 宽×高（mm）
        opt_letters = "ABCDE"[:option_count]
        
        # 可用宽度（去掉两侧 10mm 边距）
        available_width = page_w - 20.0
        col_width = available_width / cols  # 约 63.3 mm
        
        # 选项间距（与 T100 相同约束）
        opt_spacing_between = 6.5  # 选项圆心之间的间距 (mm)
        
        for col_idx in range(cols):
            col_x_start = 10.0 + col_idx * col_width
            q_start = col_idx * rows_per_col + 1
            
            for row_idx in range(rows_per_col):
                q_num = q_start + row_idx
                q_y = col_y_start + row_idx * row_spacing
                
                # 选项气泡
                bubbles = []
                opt_x_base = col_x_start + 8.0  # 栏内左边距 8mm
                
                for opt_idx, opt in enumerate(opt_letters):
                    opt_cx = opt_x_base + opt_idx * opt_spacing_between
                    bubbles.append(Bubble(opt=opt, cx=opt_cx, cy=q_y,
                                          r=round((bubble_w * bubble_h / 3.141592653589793) ** 0.5, 3),
                                          w=bubble_w, h=bubble_h))
                
                # 回印格（7 × 7 mm）
                if bubbles:
                    feedback_x = bubbles[-1].cx + bubble_r + 2.0
                else:
                    feedback_x = col_x_start + col_width - 8.0
                
                feedback_slot = {
                    "x": feedback_x,
                    "y": q_y - 3.5,
                    "w": 7.0,
                    "h": 7.0,
                }
                
                questions.append(Question(q=q_num, bubbles=bubbles, feedback_slot=feedback_slot))

        # 证号（横排，左上方）
        id_columns = _build_id_rows(id_digits)

        # 分数框
        score_box = {"x": 170.0, "y": 20.0, "w": 30.0, "h": 10.0}

        # 姓名手写线
        name_line = class_line = id_line = None
        if include_name_line:
            name_line = {"x": 15.0, "y": 28.0, "w": 85.0}
            class_line = {"x": 105.0, "y": 28.0, "w": 55.0}
            id_line = {"x": 15.0, "y": 35.0, "w": 85.0}

        return LayoutConfig(
            template_id="T060-A4-v1",
            version=1,
            page_mm=[page_w, page_h],
            fiducials=fiducials,
            orientation_mark=orientation_mark,
            canvas_dpi=300,
            questions=questions,
            id_columns=id_columns,
            option_count=option_count,
            id_digits=id_digits,
            score_box=score_box,
            name_line=name_line,
            class_line=class_line,
            id_line=id_line,
        )
from __future__ import annotations

import re
from collections import defaultdict
from functools import lru_cache
from pathlib import Path

import numpy as np
import pymupdf
from openpyxl import load_workbook
from rapidocr_onnxruntime import RapidOCR

from .models import AppConfig, MatchOccurrence, ProcessResult, TeacherMatch, TeacherRecord
from .utils import normalize_seat_no

COMMON_FONT_CANDIDATES = (
    r"C:\Windows\Fonts\msjh.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\mingliu.ttc",
    r"C:\Windows\Fonts\simsun.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
)
TILE_ROWS = 4
TILE_COLS = 4
TILE_OVERLAP = 40
TILE_ZOOM_MULTIPLIER = 2.75


def process_pdf(
    input_pdf: Path,
    output_pdf: Path,
    config: AppConfig,
    progress_callback=None,
) -> ProcessResult:
    if not input_pdf.exists():
        raise FileNotFoundError(f"找不到 PDF：{input_pdf}")

    teacher_map = {normalize_initial(item.initial): item for item in config.teachers}
    output_teachers = resolve_output_teachers(input_pdf.parent, config.teachers, progress_callback)
    output_teacher_codes = tuple(normalize_initial(item.initial) for item in output_teachers)
    seat_map = {normalize_seat_no(item.seat_no): item.block for item in config.seat_blocks}
    font_path = resolve_font_path(config.label_font_path)
    ocr_engine = RapidOCR()
    occurrences_by_teacher: dict[str, list[MatchOccurrence]] = defaultdict(list)
    warnings: list[str] = []

    with pymupdf.open(input_pdf) as source_doc:
        total_pages = source_doc.page_count
        for page_index in range(total_pages):
            if progress_callback:
                progress_callback(f"识别第 {page_index + 1}/{total_pages} 页...")
            page = source_doc[page_index]
            matches = detect_page_matches(page, ocr_engine, config, teacher_map, output_teacher_codes)
            for teacher_code, item in matches.items():
                occurrences_by_teacher[teacher_code].extend(item)

        matched_items = build_teacher_matches(
            output_teachers,
            occurrences_by_teacher,
            seat_map,
            config,
            warnings,
        )
        if not matched_items:
            raise ValueError("没有从 PDF 中识别到任何可匹配的老师代号。请检查 PDF 清晰度或调整设定档。")

        output_pdf.parent.mkdir(parents=True, exist_ok=True)
        with pymupdf.open() as output_doc:
            for teacher_match in matched_items:
                if progress_callback:
                    progress_callback(
                        f"输出 {teacher_match.teacher.initial} {teacher_match.teacher.name}，"
                        f"共 {len(resolve_target_page_indexes(teacher_match, source_doc.page_count))} 页..."
                    )
                append_teacher_pages(output_doc, source_doc, teacher_match, config, font_path)

            output_doc.save(output_pdf, garbage=4, deflate=True)

    unmatched_codes = tuple(
        item.initial for item in output_teachers if normalize_initial(item.initial) not in occurrences_by_teacher
    )
    return ProcessResult(
        output_path=output_pdf,
        matched_teachers=tuple(matched_items),
        unmatched_teacher_codes=unmatched_codes,
        warnings=tuple(warnings),
    )


def resolve_output_teachers(folder: Path, teachers: tuple[TeacherRecord, ...], progress_callback=None) -> tuple[TeacherRecord, ...]:
    schedule_codes = load_schedule_teacher_codes(folder, teachers)
    if not schedule_codes:
        return teachers

    teacher_map = {normalize_initial(item.initial): item for item in teachers}
    resolved: list[TeacherRecord] = []
    for code in schedule_codes:
        teacher = teacher_map.get(code)
        if teacher is not None:
            resolved.append(teacher)
    if progress_callback:
        progress_callback(f"已从排班 Excel 自动去重，共 {len(resolved)} 位老师，将依此输出页数。")
    return tuple(resolved)


def load_schedule_teacher_codes(folder: Path, teachers: tuple[TeacherRecord, ...]) -> tuple[str, ...]:
    valid_codes = {normalize_initial(item.initial) for item in teachers}
    found_codes: list[str] = []
    seen_codes: set[str] = set()

    for workbook_path in sorted(folder.glob("*.xlsx")):
        if workbook_path.name.startswith("~$"):
            continue
        workbook = load_workbook(workbook_path, data_only=True)
        if "座位区块" in workbook.sheetnames:
            continue
        for sheet_name in workbook.sheetnames:
            if sheet_name == "去重":
                continue
            worksheet = workbook[sheet_name]
            for row in worksheet.iter_rows(values_only=True):
                for cell_value in row:
                    code = normalize_initial(cell_value)
                    if code in valid_codes and code not in seen_codes:
                        found_codes.append(code)
                        seen_codes.add(code)
    return tuple(found_codes)


def detect_page_matches(
    page,
    ocr_engine: RapidOCR,
    config: AppConfig,
    teacher_map: dict[str, TeacherRecord],
    allowed_teacher_codes: tuple[str, ...] | None = None,
):
    matches: dict[str, list[MatchOccurrence]] = defaultdict(list)
    if allowed_teacher_codes:
        teacher_map = {code: teacher_map[code] for code in allowed_teacher_codes if code in teacher_map}
    segment_codes = build_segmentation_codes(teacher_map)
    detections = run_ocr_detections(page, ocr_engine, config)

    for rect, recognized_text, confidence in detections:
        if confidence < config.confidence_threshold:
            continue

        segments = segment_teacher_text(recognized_text, segment_codes)
        if not segments:
            continue

        for teacher_code, segment_rect in split_detection_rect(rect, segments):
            if teacher_code not in teacher_map:
                continue
            matches[teacher_code].append(
                MatchOccurrence(
                    page_index=page.number,
                    rect=segment_rect,
                    recognized_text=str(recognized_text).strip(),
                    confidence=confidence,
                )
            )
    return matches


def run_ocr_detections(page, ocr_engine: RapidOCR, config: AppConfig) -> list[tuple[tuple[float, float, float, float], str, float]]:
    detections: list[tuple[tuple[float, float, float, float], str, float]] = []
    detections.extend(run_ocr_on_rect(page, page.rect, max(config.ocr_zoom, 1.0), ocr_engine))

    tile_zoom = max(config.ocr_zoom * TILE_ZOOM_MULTIPLIER, 4.5)
    for tile_rect in iter_page_tiles(page.rect):
        detections.extend(run_ocr_on_rect(page, tile_rect, tile_zoom, ocr_engine))
    return detections


def run_ocr_on_rect(page, clip_rect, zoom: float, ocr_engine: RapidOCR) -> list[tuple[tuple[float, float, float, float], str, float]]:
    pixmap = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip_rect, alpha=False)
    image = np.frombuffer(pixmap.samples, dtype=np.uint8).reshape(pixmap.height, pixmap.width, pixmap.n)
    result, _ = ocr_engine(image)
    if not result:
        return []

    x_scale = clip_rect.width / pixmap.width
    y_scale = clip_rect.height / pixmap.height
    detections: list[tuple[tuple[float, float, float, float], str, float]] = []
    for box, recognized_text, confidence_text in result:
        x_values = [point[0] for point in box]
        y_values = [point[1] for point in box]
        rect = (
            min(x_values) * x_scale + clip_rect.x0,
            min(y_values) * y_scale + clip_rect.y0,
            max(x_values) * x_scale + clip_rect.x0,
            max(y_values) * y_scale + clip_rect.y0,
        )
        detections.append((rect, str(recognized_text).strip(), float(confidence_text)))
    return detections


def iter_page_tiles(page_rect):
    tile_width = page_rect.width / TILE_COLS
    tile_height = page_rect.height / TILE_ROWS
    for row in range(TILE_ROWS):
        for column in range(TILE_COLS):
            x0 = max(page_rect.x0, page_rect.x0 + tile_width * column - TILE_OVERLAP)
            x1 = min(page_rect.x1, page_rect.x0 + tile_width * (column + 1) + TILE_OVERLAP)
            y0 = max(page_rect.y0, page_rect.y0 + tile_height * row - TILE_OVERLAP)
            y1 = min(page_rect.y1, page_rect.y0 + tile_height * (row + 1) + TILE_OVERLAP)
            yield pymupdf.Rect(x0, y0, x1, y1)


def build_segmentation_codes(teacher_map: dict[str, TeacherRecord]) -> tuple[str, ...]:
    return tuple(sorted(teacher_map.keys(), key=lambda item: (-len(item), item)))


def segment_teacher_text(text: str, ordered_codes: tuple[str, ...]) -> tuple[str, ...]:
    normalized_text = normalize_initial(text)
    if not normalized_text:
        return ()

    code_set = frozenset(ordered_codes)
    max_code_length = max(len(item) for item in ordered_codes)

    @lru_cache(maxsize=None)
    def split(index: int) -> tuple[str, ...] | None:
        if index == len(normalized_text):
            return ()
        for end in range(min(len(normalized_text), index + max_code_length), index, -1):
            piece = normalized_text[index:end]
            if piece not in code_set:
                continue
            tail = split(end)
            if tail is not None:
                return (piece,) + tail
        return None

    segments = split(0)
    return segments or ()


def split_detection_rect(rect: tuple[float, float, float, float], segments: tuple[str, ...]):
    if not segments:
        return ()
    if len(segments) == 1:
        return ((segments[0], rect),)

    total_length = sum(len(item) for item in segments)
    x0, y0, x1, y1 = rect
    width = x1 - x0
    height = y1 - y0
    horizontal = width >= height

    segment_rects = []
    cursor = x0 if horizontal else y0
    axis_length = width if horizontal else height
    for index, token in enumerate(segments):
        ratio = len(token) / total_length
        next_cursor = cursor + axis_length * ratio
        if index == len(segments) - 1:
            next_cursor = x1 if horizontal else y1
        if horizontal:
            token_rect = (cursor, y0, next_cursor, y1)
        else:
            token_rect = (x0, cursor, x1, next_cursor)
        segment_rects.append((token, token_rect))
        cursor = next_cursor
    return tuple(segment_rects)


def build_teacher_matches(
    output_teachers: tuple[TeacherRecord, ...],
    occurrences_by_teacher: dict[str, list[MatchOccurrence]],
    seat_map: dict[str, str],
    config: AppConfig,
    warnings: list[str],
) -> list[TeacherMatch]:
    matches: list[TeacherMatch] = []
    for teacher in output_teachers:
        teacher_code = normalize_initial(teacher.initial)
        occurrences = occurrences_by_teacher.get(teacher_code, [])
        seat_no = normalize_seat_no(teacher.seat_no)
        block = seat_map.get(seat_no, "")
        if teacher.seat_no and not block:
            warnings.append(f"老师 {teacher.initial} {teacher.name} 的座号 {teacher.seat_no} 找不到对应区块。")
        if not occurrences:
            warnings.append(f"老师 {teacher.initial} {teacher.name} 没有在 PDF 中识别到可标记位置。")
        deduped_occurrences = tuple(
            sorted(
                deduplicate_occurrences(occurrences),
                key=lambda item: (item.page_index, item.rect[1], item.rect[0]),
            )
        )
        matches.append(
            TeacherMatch(
                teacher=teacher,
                seat_block=block,
                occurrences=deduped_occurrences,
            )
        )

    return sorted(
        matches,
        key=lambda item: build_teacher_sort_key(item, config.group_order),
    )


def deduplicate_occurrences(occurrences: list[MatchOccurrence]) -> list[MatchOccurrence]:
    unique: list[MatchOccurrence] = []
    for item in sorted(occurrences, key=lambda value: (value.page_index, value.rect[1], value.rect[0])):
        if any(is_same_occurrence(item, existing) for existing in unique):
            continue
        unique.append(item)
    return unique


def is_same_occurrence(left: MatchOccurrence, right: MatchOccurrence) -> bool:
    if left.page_index != right.page_index:
        return False
    if normalize_initial(left.recognized_text) != normalize_initial(right.recognized_text):
        return False
    return (
        abs(left.rect[0] - right.rect[0]) < 4
        and abs(left.rect[1] - right.rect[1]) < 4
        and abs(left.rect[2] - right.rect[2]) < 4
        and abs(left.rect[3] - right.rect[3]) < 4
    )


def append_teacher_pages(output_doc, source_doc, teacher_match: TeacherMatch, config: AppConfig, font_path: str):
    occurrences_by_page: dict[int, list[MatchOccurrence]] = defaultdict(list)
    for occurrence in teacher_match.occurrences:
        occurrences_by_page[occurrence.page_index].append(occurrence)

    for page_index in resolve_target_page_indexes(teacher_match, source_doc.page_count):
        output_doc.insert_pdf(source_doc, from_page=page_index, to_page=page_index)
        page = output_doc[-1]
        register_font(page, font_path)
        add_teacher_label(page, teacher_match, config, font_path)
        for occurrence in occurrences_by_page.get(page_index, []):
            add_star_marker(page, occurrence)


def resolve_target_page_indexes(teacher_match: TeacherMatch, source_page_count: int) -> tuple[int, ...]:
    if teacher_match.page_indexes:
        if source_page_count == 1:
            return (0,)
        return teacher_match.page_indexes
    if source_page_count >= 1:
        return (0,)
    return ()


def register_font(page, font_path: str):
    if font_path:
        page.insert_font(fontname="marker_font", fontfile=font_path)


def add_teacher_label(page, teacher_match: TeacherMatch, config: AppConfig, font_path: str):
    margin = config.label_margin
    label_height = config.label_height
    columns = config.label_columns
    page_width = page.rect.width
    box_width = min(max(columns[-1] + 80, 320), max(page_width - margin * 2, 160))
    label_rect = pymupdf.Rect(margin, margin, margin + box_width, margin + label_height)
    page.draw_rect(label_rect, color=(1, 1, 1), fill=(1, 1, 1), fill_opacity=0.9, overlay=True)

    base_x = label_rect.x0
    baseline_y = label_rect.y0 + config.label_font_size + 4
    label_values = (
        teacher_match.teacher.name,
        teacher_match.teacher.initial,
        teacher_match.teacher.seat_no,
    )
    for offset, text in zip(columns, label_values):
        page.insert_text(
            pymupdf.Point(base_x + offset, baseline_y),
            text,
            fontsize=config.label_font_size,
            fontname="marker_font" if font_path else "helv",
            color=(0, 0, 0),
            overlay=True,
        )


def add_star_marker(page, occurrence: MatchOccurrence):
    rect = pymupdf.Rect(*occurrence.rect)
    marker_size = max(rect.height * 2.0, 12)
    marker_point = pymupdf.Point(
        rect.x0 - marker_size * 0.45,
        rect.y1 - marker_size * 0.2,
    )
    page.insert_text(
        marker_point,
        "*",
        fontsize=marker_size,
        fontname="helv",
        color=(0.85, 0.0, 0.0),
        overlay=True,
    )


def build_teacher_sort_key(teacher_match: TeacherMatch, group_order: tuple[str, ...]):
    block = teacher_match.seat_block.upper()
    seat_no = normalize_seat_no(teacher_match.teacher.seat_no)
    if not block:
        return (99, 99, 99, seat_no, teacher_match.teacher.initial)

    match = re.fullmatch(r"(CL|CR|L|R)(\d+)", block)
    if not match:
        return (98, 98, 98, block, seat_no, teacher_match.teacher.initial)

    prefix, numeric_text = match.groups()
    index = int(numeric_text)
    family_name = "C" if prefix in {"CL", "CR"} else prefix
    family_position = {name.upper(): idx for idx, name in enumerate(group_order)}.get(family_name, 97)
    center_position = 0
    if prefix == "CR":
        center_position = 1
    return (family_position, index, center_position, seat_no, teacher_match.teacher.initial)


def normalize_initial(text: object) -> str:
    return str(text or "").strip().upper().replace(" ", "")


def resolve_font_path(configured_path: str) -> str:
    if configured_path:
        path = Path(configured_path)
        if not path.exists():
            raise FileNotFoundError(f"设定的字型档不存在：{configured_path}")
        return str(path)

    for item in COMMON_FONT_CANDIDATES:
        if Path(item).exists():
            return item
    return ""

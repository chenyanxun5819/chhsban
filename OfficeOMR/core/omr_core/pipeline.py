"""Recognition pipeline entrypoint."""

import time
import logging
import yaml
from pathlib import Path
from typing import Optional

import numpy as np
import cv2

from . import pdfio, detect, warp, score, decide, debug, schema
from .layout import LayoutConfig

logger = logging.getLogger(__name__)


def load_config(config_path: str | Path = None) -> dict:
    """
    Load configuration from YAML.
    
    Args:
        config_path: Path to config file (default: core/omr_core/config.default.yaml)
        
    Returns:
        Config dictionary with 'thresholds', 'scoring', 'io' keys
    """
    if config_path is None:
        config_path = Path(__file__).parent / 'config.default.yaml'
    
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    return config


def recognize(image_bytes: bytes,
             layout: LayoutConfig,
             config: dict = None,
             template_id: str = None,
             page_index: int = 0,
             save_debug_image: str | Path = None) -> schema.RecognitionResult:
    """
    Recognize a single sheet image or PDF page.
    
    Main pipeline (PLAN.md § 6):
    1. Read image (grayscale, 300 DPI)
    2. Preprocess (blur, threshold)
    3. Detect fiducials (4 corner markers)
    4. Detect orientation and rotation
    5. Perspective correction (homography warp)
    6. Score all bubbles
    7. Decide status (single/blank/multi/ambiguous)
    8. Extract student ID
    9. Output result JSON
    
    Args:
        image_bytes: Image or PDF file bytes
        layout: LayoutConfig object with sheet geometry
        config: Config dict (if None, loads default)
        template_id: Template ID for result (if None, uses layout.template_id)
        page_index: Page index in PDF (0 for single images)
        save_debug_image: If set, save annotated image to this path
        
    Returns:
        RecognitionResult object
    """
    start_time = time.time()
    
    if config is None:
        config = load_config()
    
    template_id = template_id or layout.template_id
    
    try:
        # Step 1: Read image
        images = list(pdfio.read_bytes(image_bytes, filename=f"page-{page_index}.jpg"))
        if page_index >= len(images):
            return schema.RecognitionResult(
                template_id=template_id,
                status="failed",
                error=schema.RecognitionError(
                    code="PAGE_NOT_FOUND",
                    message=f"Page {page_index} not found in input"
                ),
                timing_ms=int((time.time() - start_time) * 1000)
            )
        
        gray = images[page_index]
        
        # Validate resolution
        long_side = max(gray.shape)
        min_long_side = config['io'].get('min_long_side_px', 1600)
        if long_side < min_long_side:
            return schema.RecognitionResult(
                template_id=template_id,
                status="failed",
                error=schema.RecognitionError(
                    code="LOW_RESOLUTION",
                    message=f"Image resolution {long_side}px < {min_long_side}px minimum"
                ),
                timing_ms=int((time.time() - start_time) * 1000)
            )
        
        # Step 2: Preprocess
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Step 3: Detect fiducials
        try:
            fiducials = detect.detect_fiducials(blurred, layout.fiducials)
        except ValueError as e:
            return schema.RecognitionResult(
                template_id=template_id,
                status="failed",
                error=schema.RecognitionError(
                    code="FIDUCIAL_NOT_FOUND",
                    message=str(e)
                ),
                timing_ms=int((time.time() - start_time) * 1000)
            )
        
        # Step 4: Detect orientation
        rotated_180, skew_deg = detect.detect_orientation_and_rotation(
            blurred, layout.orientation_mark)
        
        if rotated_180:
            gray = cv2.rotate(gray, cv2.ROTATE_180)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            # Redetect fiducials after rotation
            try:
                fiducials = detect.detect_fiducials(blurred, layout.fiducials)
            except ValueError as e:
                return schema.RecognitionResult(
                    template_id=template_id,
                    status="failed",
                    error=schema.RecognitionError(
                        code="FIDUCIAL_NOT_FOUND",
                        message=str(e)
                    ),
                    timing_ms=int((time.time() - start_time) * 1000)
                )
        
        # Step 5: Perspective correction
        # Convert A4 mm dimensions to pixels at 300 DPI: 300/25.4 ≈ 11.811
        mm_to_px = 300 / 25.4
        canvas_size = (int(layout.page_mm[0] * mm_to_px),
                      int(layout.page_mm[1] * mm_to_px))
        try:
            warp_result = warp.warp_to_canvas(blurred, fiducials, layout.fiducials, canvas_size)
        except ValueError as e:
            return schema.RecognitionResult(
                template_id=template_id,
                status="failed",
                error=schema.RecognitionError(
                    code="WARP_FAILED",
                    message=str(e)
                ),
                timing_ms=int((time.time() - start_time) * 1000)
            )
        
        warped = warp_result.warped
        
        # Step 6: Estimate paper/ink levels and score bubbles
        paper_level, ink_level = score.estimate_paper_and_ink_levels(warped, layout)
        
        bubble_scores = score.score_bubbles(
            warped,
            layout.questions,
            layout,
            inner_ratio=config['scoring'].get('inner_ratio', 0.7),
            paper_level=paper_level,
            ink_level=ink_level
        )
        
        # Step 7: Decide question status
        t_blank = config['thresholds'].get('t_blank', 0.15)
        t_mark = config['thresholds'].get('t_mark', 0.40)
        t_other = config['thresholds'].get('t_other', 0.25)
        
        answers = []
        ambiguous_count = 0
        multi_count = 0
        
        for bubble_score in bubble_scores:
            status, choices = decide.decide_question_status(
                bubble_score.scores, t_blank, t_mark, t_other
            )
            answer = decide.build_answer_object(
                bubble_score.q, status, choices, bubble_score.scores
            )
            answers.append(answer)
            if status == 'ambiguous':
                ambiguous_count += 1
            elif status == 'multi':
                multi_count += 1
        
        # Step 8: Extract student ID
        id_scores = score_student_id(warped, layout, paper_level, ink_level)
        student_id_value, id_digits = decide.decide_student_id_digits(
            id_scores, t_blank, t_mark
        )
        
        # Step 9: Build result
        summary = schema.AnswerSummary(
            single=sum(1 for a in answers if a.status == 'single'),
            blank=sum(1 for a in answers if a.status == 'blank'),
            multi=multi_count,
            ambiguous=ambiguous_count
        )
        
        # Determine overall status
        needs_review = ambiguous_count > 0 or multi_count > 0 or '?' in (student_id_value or '')
        status = 'needs_review' if needs_review else 'ok'
        
        result = schema.RecognitionResult(
            template_id=template_id,
            batch_id=None,
            source_page_index=page_index,
            status=status,
            error=None,
            sheet_quality=schema.SheetQuality(
                fiducial_rms_px=warp_result.fiducial_rms_px,
                skew_deg=skew_deg,
                rotated_180=rotated_180,
                paper_level=paper_level,
                ink_level=ink_level
            ),
            student_id=schema.StudentId(
                value=student_id_value,
                digits=id_digits
            ),
            answers=answers,
            summary=summary,
            timing_ms=int((time.time() - start_time) * 1000)
        )
        
        # Save debug image if requested
        if save_debug_image:
            annotated = debug.draw_annotated_image(
                warped, answers, id_digits, layout.to_dict()
            )
            debug.save_annotated_png(annotated, save_debug_image)
        
        return result
    
    except Exception as e:
        logger.exception(f"Unexpected error in recognition: {e}")
        return schema.RecognitionResult(
            template_id=template_id,
            status="failed",
            error=schema.RecognitionError(
                code="INTERNAL_ERROR",
                message=f"Internal error: {str(e)}"
            ),
            timing_ms=int((time.time() - start_time) * 1000)
        )


def score_student_id(warped: np.ndarray,
                    layout: LayoutConfig,
                    paper_level: int,
                    ink_level: int) -> list[dict[str, float]]:
    """
    Score all digits of student ID.
    
    Returns list of dicts, one per digit column.
    """
    mm_to_px = 300 / 25.4
    inner_ratio = 0.7
    id_scores = []
    
    for col_layout in layout.id_columns:
        col_scores = {}
        for digit_bubble in col_layout.bubbles:
            digit = str(digit_bubble.digit)
            cx_mm = digit_bubble.cx
            cy_mm = digit_bubble.cy
            r_mm = digit_bubble.r
            
            cx_px = cx_mm * mm_to_px
            cy_px = cy_mm * mm_to_px
            r_px = r_mm * mm_to_px
            inner_r_px = r_px * inner_ratio
            
            cx_int = int(round(cx_px))
            cy_int = int(round(cy_px))
            inner_r_int = int(round(inner_r_px))
            
            y, x = np.ogrid[-inner_r_int:inner_r_int+1, -inner_r_int:inner_r_int+1]
            mask = x**2 + y**2 <= inner_r_int**2
            
            y_start = max(0, cy_int - inner_r_int)
            y_end = min(warped.shape[0], cy_int + inner_r_int + 1)
            x_start = max(0, cx_int - inner_r_int)
            x_end = min(warped.shape[1], cx_int + inner_r_int + 1)
            
            roi = warped[y_start:y_end, x_start:x_end]
            
            if roi.size == 0:
                fill_score = 0.0
            else:
                if roi.shape[0] < mask.shape[0] or roi.shape[1] < mask.shape[1]:
                    mask_trimmed = mask[:roi.shape[0], :roi.shape[1]]
                else:
                    mask_trimmed = mask
                
                masked_pixels = roi[mask_trimmed]
                if masked_pixels.size == 0:
                    fill_score = 0.0
                else:
                    mean_inner = float(np.mean(masked_pixels))
                    denominator = paper_level - ink_level
                    if denominator <= 0:
                        fill_score = 0.0
                    else:
                        fill_score = (paper_level - mean_inner) / denominator
                        fill_score = max(0.0, min(1.0, fill_score))
            
            col_scores[digit] = fill_score
        
        id_scores.append(col_scores)
    
    return id_scores


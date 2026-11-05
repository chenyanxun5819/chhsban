"""Debug image annotation helpers."""

import numpy as np
import cv2
from pathlib import Path


def draw_annotated_image(warped: np.ndarray,
                        answers: list,
                        id_digits: list,
                        layout: dict) -> np.ndarray:
    """
    Draw annotations on corrected image:
    - green circle: single-choice
    - orange circle: ambiguous
    - red circle: multi-choice
    - gray circle: blank
    
    Args:
        warped: Perspective-corrected grayscale image
        answers: List of Answer objects
        id_digits: List of StudentIdDigit objects
        layout: Layout dict with coordinate info
        
    Returns:
        BGR image with annotations
    """
    # Convert grayscale to BGR for colored overlays
    annotated = cv2.cvtColor(warped, cv2.COLOR_GRAY2BGR)
    
    mm_to_px = 300 / 25.4
    
    # Color mapping
    colors = {
        'single': (0, 255, 0),        # Green
        'blank': (128, 128, 128),     # Gray
        'multi': (0, 0, 255),         # Red
        'ambiguous': (0, 165, 255)    # Orange
    }
    
    # Draw question bubbles
    for answer in answers:
        q_layout = layout['questions'][answer.q - 1]
        for bubble_layout in q_layout.get('bubbles', []):
            cx_mm = bubble_layout.get('cx')
            cy_mm = bubble_layout.get('cy')
            r_mm = bubble_layout.get('r')
            
            cx_px = int(cx_mm * mm_to_px)
            cy_px = int(cy_mm * mm_to_px)
            r_px = int(r_mm * mm_to_px)
            
            color = colors.get(answer.status, (128, 128, 128))
            cv2.circle(annotated, (cx_px, cy_px), r_px + 2, color, 2)
    
    # Draw ID digits
    for digit_info in id_digits:
        col_layout = layout['id_columns'][digit_info.col]
        bubbles = col_layout.get('bubbles', [])
        for bubble_layout in bubbles:
            if str(bubble_layout.get('digit')) == digit_info.digit:
                cx_mm = bubble_layout.get('cx')
                cy_mm = bubble_layout.get('cy')
                r_mm = bubble_layout.get('r')
                
                cx_px = int(cx_mm * mm_to_px)
                cy_px = int(cy_mm * mm_to_px)
                r_px = int(r_mm * mm_to_px)
                
                color = colors.get(digit_info.status, (128, 128, 128))
                cv2.circle(annotated, (cx_px, cy_px), r_px + 2, color, 2)
                break
    
    return annotated


def save_annotated_png(annotated_bgr: np.ndarray, output_path: str | Path) -> None:
    """
    Save annotated image as PNG.
    
    Args:
        annotated_bgr: BGR image
        output_path: Output file path
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(output_path), annotated_bgr)

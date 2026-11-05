"""Bubble scoring logic."""

import logging
import numpy as np
import cv2
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class BubbleScores:
    """Scores for all choices of a single question."""
    q: int
    scores: dict[str, float]  # e.g. {"A": 0.85, "B": 0.02, "C": 0.01, "D": 0.12}
    paper_level: int
    ink_level: int


def estimate_paper_and_ink_levels(warped: np.ndarray, layout) -> tuple[int, int]:
    """
    Estimate white (paper) and black (ink) levels in the image.
    
    Uses histogram analysis:
    - paper_level: 90th percentile of pixel intensity (bright area)
    - ink_level: mean of very dark pixels in detected fiducials
    
    Args:
        warped: Corrected grayscale image
        layout: Layout object with fiducial info
        
    Returns:
        (paper_level, ink_level): Estimated gray levels for white and black
    """
    # Paper level: high percentile (assume most of image is white paper)
    hist = cv2.calcHist([warped], [0], None, [256], [0, 256])
    cumsum = np.cumsum(hist.flatten())
    cumsum_norm = cumsum / cumsum[-1]
    paper_level_idx = np.argmax(cumsum_norm >= 0.9)
    paper_level = min(int(paper_level_idx), 255)
    
    # Ink level: estimate from dark pixels in fiducial regions
    # At 300 DPI, A4 canvas is 2480×3508 pixels
    # Fiducials at mm position (8, 8), (195, 8), etc.
    # Convert to pixels: 8 mm * 300 / 25.4 ≈ 94.5 px
    mm_to_px = 300 / 25.4
    fid_size_mm = 7.0
    fid_size_px = int(fid_size_mm * mm_to_px)
    
    dark_pixels = []
    
    # Sample from known fiducial positions (TL corner)
    fid_x = int(8 * mm_to_px)
    fid_y = int(8 * mm_to_px)
    
    if fid_x + fid_size_px < warped.shape[1] and fid_y + fid_size_px < warped.shape[0]:
        roi = warped[fid_y:fid_y + fid_size_px, fid_x:fid_x + fid_size_px]
        dark_pixels.extend(roi[roi < 100].flatten().tolist())  # Dark pixels only
    
    if dark_pixels:
        ink_level = int(np.mean(dark_pixels))
    else:
        ink_level = 20  # Fallback
    
    ink_level = max(int(ink_level), 0)
    paper_level = min(int(paper_level), 255)
    
    return paper_level, ink_level


def score_bubbles(warped: np.ndarray,
                  questions: list,
                  layout,
                  inner_ratio: float = 0.7,
                  paper_level: int = 238,
                  ink_level: int = 22) -> list[BubbleScores]:
    """
    Score all bubbles in warped image.
    
    For each question, for each choice, compute the fill_score as:
        fill_score = (paper_level - mean_inner) / (paper_level - ink_level)
    
    Where mean_inner is the average gray level in the inner circle region.
    
    Args:
        warped: Perspective-corrected image
        questions: List of question layouts from layout.json
        layout: Layout object
        inner_ratio: Radius ratio for inner circle (default 0.7 of bubble radius)
        paper_level: Estimated white level (0-255)
        ink_level: Estimated black level (0-255)
        
    Returns:
        List of BubbleScores objects
    """
    mm_to_px = 300 / 25.4
    results = []
    
    for q_idx, q_layout in enumerate(questions, start=1):
        question_scores = {}
        
        for bubble_layout in q_layout.bubbles:
            opt_letter = bubble_layout.opt
            cx_mm = bubble_layout.cx
            cy_mm = bubble_layout.cy
            r_mm = bubble_layout.r
            
            # Convert to pixels
            cx_px = cx_mm * mm_to_px
            cy_px = cy_mm * mm_to_px
            r_px = r_mm * mm_to_px
            inner_r_px = r_px * inner_ratio
            
            # Extract circular region
            cx_int = int(round(cx_px))
            cy_int = int(round(cy_px))
            inner_r_int = int(round(inner_r_px))
            
            # Create circular mask
            y, x = np.ogrid[-inner_r_int:inner_r_int+1, -inner_r_int:inner_r_int+1]
            mask = x**2 + y**2 <= inner_r_int**2
            
            # Extract region from warped image
            y_start = max(0, cy_int - inner_r_int)
            y_end = min(warped.shape[0], cy_int + inner_r_int + 1)
            x_start = max(0, cx_int - inner_r_int)
            x_end = min(warped.shape[1], cx_int + inner_r_int + 1)
            
            roi = warped[y_start:y_end, x_start:x_end]
            
            if roi.size == 0:
                fill_score = 0.0
            else:
                # Apply mask if ROI is smaller than expected (edge cases)
                if roi.shape[0] < mask.shape[0] or roi.shape[1] < mask.shape[1]:
                    mask_trimmed = mask[
                        :roi.shape[0],
                        :roi.shape[1]
                    ]
                else:
                    mask_trimmed = mask
                
                masked_pixels = roi[mask_trimmed]
                if masked_pixels.size == 0:
                    fill_score = 0.0
                else:
                    mean_inner = float(np.mean(masked_pixels))
                    
                    # Compute fill score with bounds checking
                    denominator = paper_level - ink_level
                    if denominator <= 0:
                        fill_score = 0.0
                    else:
                        fill_score = (paper_level - mean_inner) / denominator
                        fill_score = max(0.0, min(1.0, fill_score))  # Clamp to [0, 1]
            
            question_scores[opt_letter] = fill_score
        
        results.append(BubbleScores(
            q=q_idx,
            scores=question_scores,
            paper_level=paper_level,
            ink_level=ink_level
        ))
    
    return results

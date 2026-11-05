"""Fiducial and orientation mark detection."""

import logging
import numpy as np
import cv2
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class FiducialPoint:
    """Detected fiducial (position marker) point."""
    x: float  # pixel coordinate
    y: float
    id: str   # "TL", "TR", "BL", "BR" (Top-Left, etc.)
    rms_error: float = 0.0


def detect_fiducials(gray: np.ndarray, layout_fiducials: list) -> list[FiducialPoint]:
    """
    Detect 4 fiducial points (7×7 mm black squares) in the image.
    
    Algorithm:
    1. Apply Otsu threshold to create binary image
    2. Find contours and filter by shape (near-square) and size
    3. Look for points near the expected positions from layout.json
    
    Args:
        gray: Input grayscale image (should be ~300 DPI)
        layout_fiducials: List of expected fiducial positions from layout.json
        
    Returns:
        List of 4 detected FiducialPoint objects, or fewer if some couldn't be found
        
    Raises:
        ValueError: If fewer than 3 fiducials are found
    """
    # Apply Otsu threshold
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Find contours
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    detected = []
    
    # 7 mm at 300 DPI = 7 * 300 / 25.4 ≈ 83 pixels
    fiducial_size_px = 83
    tolerance_px = 15  # Allow ±15% size variation
    
    for contour in contours:
        area = cv2.contourArea(contour)
        expected_area = fiducial_size_px ** 2
        
        # Filter by area
        if area < expected_area * 0.7 or area > expected_area * 1.3:
            continue
        
        # Check if near-square (aspect ratio)
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = max(w, h) / min(w, h)
        if aspect_ratio > 1.15:  # Allow slightly oblong shapes
            continue
        
        # Check solidity (fill ratio)
        hull = cv2.convexHull(contour)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        if solidity < 0.85:
            continue
        
        detected.append({
            'center': (x + w / 2, y + h / 2),
            'contour': contour,
            'area': area
        })
    
    if len(detected) < 3:
        raise ValueError(f"FIDUCIAL_NOT_FOUND: only {len(detected)} fiducials detected (need ≥ 3)")
    
    # Match detected fiducials to expected positions (from layout.json)
    # Expected positions in mm are converted to pixels at 300 DPI
    expected_pts = []
    for fid in layout_fiducials:
        mm_to_px = 300 / 25.4
        px = ((fid.x + fid.w / 2) * mm_to_px, (fid.y + fid.h / 2) * mm_to_px)
        expected_pts.append({'id': fid.id, 'pos': px})
    
    # Simple nearest-neighbor matching
    matched = []
    used_detected = set()
    
    for expected in expected_pts:
        best_idx = None
        best_dist = float('inf')
        
        for det_idx, det in enumerate(detected):
            if det_idx in used_detected:
                continue
            
            dist = ((det['center'][0] - expected['pos'][0]) ** 2 + 
                    (det['center'][1] - expected['pos'][1]) ** 2) ** 0.5
            if dist < best_dist:
                best_dist = dist
                best_idx = det_idx
        
        if best_idx is not None and best_dist < 200:  # Allow up to 200 px deviation
            used_detected.add(best_idx)
            matched.append(FiducialPoint(
                x=detected[best_idx]['center'][0],
                y=detected[best_idx]['center'][1],
                id=expected['id'],
                rms_error=best_dist
            ))
    
    if len(matched) < 4:
        logger.warning(f"Only {len(matched)}/4 fiducials matched to expected positions")
    
    return matched


def detect_orientation_and_rotation(gray: np.ndarray, layout_orientation_mark) -> tuple[bool, float]:
    """
    Detect page orientation (normal vs 180° rotated) and skew angle.
    
    Looks for the orientation mark (20×4 mm horizontal bar near top-center).
    If found at bottom, page is 180° rotated.
    
    Args:
        gray: Input grayscale image
        layout_orientation_mark: OrientationMark object with x, y, w, h properties
        
    Returns:
        (rotated_180, skew_deg): Whether image needs 180° rotation, and skew angle in degrees
    """
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Expected orientation mark: 20×4 mm at 300 DPI ≈ 236×47 pixels
    mark_w_px = layout_orientation_mark.w * 300 / 25.4
    mark_h_px = layout_orientation_mark.h * 300 / 25.4
    mark_x_px = layout_orientation_mark.x * 300 / 25.4
    mark_y_px = layout_orientation_mark.y * 300 / 25.4
    
    # Search region around expected position (±50% size)
    search_w = mark_w_px * 1.5
    search_h = mark_h_px * 3.0  # Taller search region to detect top vs bottom
    
    # Search for horizontal bars in top and bottom regions
    top_region = binary[max(0, int(mark_y_px - search_h))
                        :min(binary.shape[0], int(mark_y_px + search_h*0.5)),
                        max(0, int(mark_x_px - search_w*0.5))
                        :min(binary.shape[1], int(mark_x_px + search_w*0.5))]
    
    bottom_region = binary[max(0, int(binary.shape[0] - mark_y_px - search_h*0.5))
                           :min(binary.shape[0], int(binary.shape[0] - mark_y_px + search_h*0.5)),
                           max(0, int(mark_x_px - search_w*0.5))
                           :min(binary.shape[1], int(mark_x_px + search_w*0.5))]
    
    top_energy = cv2.countNonZero(top_region)
    bottom_energy = cv2.countNonZero(bottom_region)
    
    rotated_180 = bottom_energy > top_energy
    
    # Estimate skew angle using Hough line detection
    lines = cv2.HoughLines(binary, 1, np.pi / 180, threshold=100)
    skew_deg = 0.0
    
    if lines is not None:
        # Filter near-horizontal lines
        horizontal_angles = []
        for line in lines:
            rho, theta = line[0]
            angle_deg = (theta * 180 / np.pi) - 90  # Convert to ±90 range
            if abs(angle_deg) < 45:  # Near horizontal
                horizontal_angles.append(angle_deg)
        
        if horizontal_angles:
            skew_deg = float(np.median(horizontal_angles))
    
    return rotated_180, skew_deg

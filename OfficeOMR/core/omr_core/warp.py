"""Perspective warp helpers."""

import logging
import numpy as np
import cv2
from dataclasses import dataclass
from .detect import FiducialPoint

logger = logging.getLogger(__name__)


@dataclass
class WarpResult:
    """Result of perspective correction."""
    warped: np.ndarray  # Corrected image
    transform_matrix: np.ndarray  # Homography H (3×3)
    fiducial_rms_px: float  # RMS reprojection error of fiducials

def warp_to_canvas(gray: np.ndarray,
                   fiducials: list[FiducialPoint],
                   layout_fiducials: list,
                   canvas_size_px: tuple[int, int]) -> WarpResult:
    """
    Apply perspective correction using fiducial points.

    Maps detected fiducial centers to their expected centers in layout.json
    (layout x/y is the top-left corner, so center = x + w/2, y + h/2).
    """
    if len(fiducials) < 3:
        raise ValueError(f"Need at least 3 fiducials, got {len(fiducials)}")

    mm_to_px = 300 / 25.4
    dst_by_id = {
        f.id: ((f.x + f.w / 2) * mm_to_px, (f.y + f.h / 2) * mm_to_px)
        for f in layout_fiducials
    }

    src_pts, dst_pts = [], []
    for fid in fiducials:
        if fid.id in dst_by_id:
            src_pts.append((fid.x, fid.y))
            dst_pts.append(dst_by_id[fid.id])

    if len(src_pts) < 3:
        raise ValueError("Not enough matched fiducials for homography")

    src_pts = np.float32(src_pts)
    dst_pts = np.float32(dst_pts)

    if len(src_pts) == 3:
        H_affine = cv2.getAffineTransform(src_pts[:3], dst_pts[:3])
        H = np.vstack([H_affine, [0, 0, 1]])
    else:
        H, _ = cv2.findHomography(src_pts, dst_pts)
        if H is None:
            raise ValueError("Homography estimation failed")

    warped = cv2.warpPerspective(gray, H, canvas_size_px, borderValue=255)

    if len(src_pts) == 4:
        projected = cv2.perspectiveTransform(src_pts.reshape(-1, 1, 2), H)
        errors = np.sqrt(((projected.reshape(-1, 2) - dst_pts) ** 2).sum(axis=1))
        rms_error = float(np.sqrt((errors ** 2).mean()))
    else:
        rms_error = 0.0

    return WarpResult(
        warped=warped,
        transform_matrix=H,
        fiducial_rms_px=rms_error,
    )
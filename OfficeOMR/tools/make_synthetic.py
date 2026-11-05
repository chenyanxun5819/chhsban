"""M3 — Synthetic test sample generation for M2 evaluation.

Generates synthetic answer sheets with known correct answers by:
1. Rendering blank answer sheet to image (300 DPI, grayscale)
2. Drawing marks at specified bubble locations based on layout
3. Applying degradation (rotation, noise, scaling, etc.)
4. Saving pair: (image, truth.json with correct answers)

Usage:
    python -m tools.make_synthetic --template T100-A4-v1 --output eval/synthetic \
        --count 100 --seed 42 --degradation all

Output:
    eval/synthetic/
    ├── 001.png          (synthetic image)
    ├── 001_truth.json   (correct answers)
    ├── 002.png
    ├── 002_truth.json
    └── index.csv        (summary of all samples)
"""

import os
import json
import csv
import logging
import argparse
import random
import numpy as np
import cv2
from pathlib import Path
from typing import Tuple, Dict, Any, List

from omr_core import pipeline
from sheetgen.layout import TemplatePresets, LayoutConfig
from sheetgen.builder import generate_pdf
import pypdfium2 as pdfium

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def render_blank_sheet(layout: LayoutConfig, dpi: int = 300) -> np.ndarray:
    """
    Render blank answer sheet to grayscale image.
    
    Args:
        layout: LayoutConfig for the sheet
        dpi: Target DPI (default 300)
        
    Returns:
        Grayscale numpy array
    """
    # Generate blank PDF
    pdf_bytes = generate_pdf(
        layout=layout,
        school_name="Test School",
        exam_name="Test Exam",
        subject_name="Test Subject"
    )
    
    # Render first page
    doc = pdfium.PdfDocument(pdf_bytes)
    page = doc[0]
    
    scale_factor = dpi / 72.0
    bitmap = page.render(scale=scale_factor, rotation=0)
    
    # Convert bitmap to PIL image, then to numpy array
    pil_image = bitmap.to_pil()
    image = np.asarray(pil_image)
    
    # Convert RGB to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    else:
        gray = image
    
    return gray


def draw_mark(image: np.ndarray, cx_mm: float, cy_mm: float, radius_mm: float,
              fill_ratio: float = 1.0, mark_type: str = 'fill',
              dpi: int = 300) -> np.ndarray:
    """
    Draw a mark (bubble fill) at specified location.
    
    Args:
        image: Grayscale image (modified in-place)
        cx_mm, cy_mm: Center position in mm (relative to A4 top-left)
        radius_mm: Bubble radius in mm
        fill_ratio: Fill amount [0, 1]
            - 1.0: completely filled (black)
            - 0.5: half filled (gray)
            - 0.1: light fill (light gray)
        mark_type: 'fill' (normal), 'cross', 'check', 'dot', 'erase'
        dpi: DPI conversion
        
    Returns:
        Modified image
    """
    # Convert mm to pixels
    mm_to_px = dpi / 25.4
    cx_px = int(cx_mm * mm_to_px)
    cy_px = int(cy_mm * mm_to_px)
    r_px = int(radius_mm * mm_to_px)
    
    # Clamp to image bounds
    h, w = image.shape
    if cx_px < 0 or cx_px >= w or cy_px < 0 or cy_px >= h:
        logger.warning(f"Mark at ({cx_mm:.1f}, {cy_mm:.1f}) outside image bounds")
        return image
    
    if mark_type == 'fill':
        # Draw filled circle with varying intensity
        intensity = int(255 * (1.0 - fill_ratio))  # 0=black (filled), 255=white (empty)
        cv2.circle(image, (cx_px, cy_px), r_px, intensity, -1)
    
    elif mark_type == 'cross':
        # Draw X mark
        intensity = int(255 * 0.3)
        line_thickness = max(2, r_px // 4)
        cv2.line(image, (cx_px - r_px, cy_px - r_px), (cx_px + r_px, cy_px + r_px),
                intensity, line_thickness)
        cv2.line(image, (cx_px - r_px, cy_px + r_px), (cx_px + r_px, cy_px - r_px),
                intensity, line_thickness)
    
    elif mark_type == 'check':
        # Draw checkmark
        intensity = int(255 * 0.3)
        line_thickness = max(2, r_px // 4)
        cv2.polylines(image, [np.array([
            (cx_px - r_px // 2, cy_px),
            (cx_px - r_px // 6, cy_px + r_px // 3),
            (cx_px + r_px // 2, cy_px - r_px // 3)
        ])], False, intensity, line_thickness)
    
    elif mark_type == 'dot':
        # Small dot in center
        intensity = int(255 * 0.2)
        cv2.circle(image, (cx_px, cy_px), max(2, r_px // 8), intensity, -1)
    
    elif mark_type == 'erase':
        # Eraser residue: light gray smudge
        intensity = int(255 * 0.7)
        cv2.circle(image, (cx_px, cy_px), r_px, intensity, -1)
    
    return image


def generate_truth_answers(layout: LayoutConfig, seed: int = None) -> Dict[str, Any]:
    """
    Generate random correct answers for all questions.
    
    Args:
        layout: LayoutConfig
        seed: Random seed for reproducibility
        
    Returns:
        Dictionary with 'student_id' and 'answers' list
    """
    if seed is not None:
        random.seed(seed)
        np.random.seed(seed)
    
    # Random 5-digit student ID (matching layout)
    student_id = ''.join(str(random.randint(0, 9)) for _ in range(layout.id_digits))
    
    # Random answers
    options = [chr(ord('A') + i) for i in range(layout.option_count)]
    answers = []
    
    for q_idx, question in enumerate(layout.questions):
        answer = random.choice(options)
        answers.append({
            'q': q_idx + 1,
            'answer': answer
        })
    
    return {
        'student_id': student_id,
        'answers': answers
    }


def apply_degradation(image: np.ndarray, degradation_type: str = 'none',
                      severity: float = 0.5) -> np.ndarray:
    """
    Apply scan degradation to image.
    
    Args:
        image: Grayscale image
        degradation_type: 'none', 'rotate', 'perspective', 'scale', 'noise', 'blur', 'contrast'
        severity: Severity level [0, 1]
        
    Returns:
        Degraded image
    """
    h, w = image.shape
    
    if degradation_type == 'none':
        return image.copy()
    
    elif degradation_type == 'rotate':
        # Rotate ±3° based on severity
        angle = int(3 * severity * random.choice([-1, 1]))
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(image, matrix, (w, h), borderValue=255)
        return rotated
    
    elif degradation_type == 'perspective':
        # Apply perspective distortion
        corners = np.array([
            [0, 0],
            [w, 0],
            [w, h],
            [0, h]
        ], dtype=np.float32)
        
        offset = int(20 * severity)
        displaced = corners + np.array([
            [random.randint(-offset, offset) for _ in range(2)]
            for _ in range(4)
        ], dtype=np.float32)
        
        matrix = cv2.getPerspectiveTransform(corners, displaced)
        warped = cv2.warpPerspective(image, matrix, (w, h), borderValue=255)
        return warped
    
    elif degradation_type == 'scale':
        # Scale ±3% based on severity
        scale = 1.0 + (0.03 * severity * random.choice([-1, 1]))
        new_w, new_h = int(w * scale), int(h * scale)
        scaled = cv2.resize(image, (new_w, new_h))
        
        # Pad/crop to original size
        if new_h > h or new_w > w:
            scaled = scaled[:h, :w]
        else:
            padded = np.full((h, w), 255, dtype=np.uint8)
            padded[:new_h, :new_w] = scaled
            scaled = padded
        
        return scaled
    
    elif degradation_type == 'noise':
        # Add Gaussian noise
        noise = np.random.normal(0, int(20 * severity), image.shape)
        noisy = np.clip(image.astype(np.float32) + noise, 0, 255).astype(np.uint8)
        return noisy
    
    elif degradation_type == 'blur':
        # Add blur
        kernel_size = int(2 * severity + 1)
        if kernel_size % 2 == 0:
            kernel_size += 1
        blurred = cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)
        return blurred
    
    elif degradation_type == 'contrast':
        # Adjust contrast
        alpha = 1.0 - (0.3 * severity)  # [0.7, 1.0]
        adjusted = cv2.convertScaleAbs(image, alpha=alpha, beta=0)
        return adjusted
    
    elif degradation_type == 'jpeg':
        # Simulate JPEG compression
        quality = int(90 - 40 * severity)  # [50, 90]
        encode_ok, jpeg_data = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, quality])
        if encode_ok:
            decoded = cv2.imdecode(jpeg_data, cv2.IMREAD_GRAYSCALE)
            return decoded
        return image
    
    return image.copy()


def generate_synthetic_sample(
    layout: LayoutConfig,
    output_dir: Path,
    sample_id: int,
    seed: int = None,
    mark_strategy: str = 'standard',
    degradation_type: str = 'none',
    degradation_severity: float = 0.5
) -> Tuple[bool, str]:
    """
    Generate one synthetic sample.
    
    Args:
        layout: LayoutConfig
        output_dir: Output directory
        sample_id: Sample index (001, 002, ...)
        seed: Random seed
        mark_strategy: 'standard' (full fill), 'light' (30% fill), 'partial' (50%), 'varied'
        degradation_type: Type of degradation
        degradation_severity: Severity [0, 1]
        
    Returns:
        (success, message)
    """
    try:
        # Render blank sheet
        blank = render_blank_sheet(layout, dpi=300)
        
        # Generate truth answers
        truth = generate_truth_answers(layout, seed=seed)
        
        # Draw marks for each answer
        image = blank.copy()
        
        for answer_info in truth['answers']:
            q_idx = answer_info['q'] - 1
            answer_char = answer_info['answer']
            
            if q_idx >= len(layout.questions):
                continue
            
            question = layout.questions[q_idx]
            opt_idx = ord(answer_char) - ord('A')
            
            if opt_idx >= len(question.bubbles):
                continue
            
            bubble = question.bubbles[opt_idx]
            
            # Determine fill ratio based on strategy
            if mark_strategy == 'standard':
                fill_ratio = 1.0
            elif mark_strategy == 'light':
                fill_ratio = 0.3
            elif mark_strategy == 'partial':
                fill_ratio = 0.5
            elif mark_strategy == 'varied':
                fill_ratio = random.uniform(0.2, 1.0)
            else:
                fill_ratio = 1.0
            
            # Draw the mark
            draw_mark(image, bubble.cx, bubble.cy, bubble.r, fill_ratio=fill_ratio)
        
        # Draw student ID marks
        for digit_idx, digit_char in enumerate(truth['student_id']):
            digit_val = int(digit_char)
            
            if digit_idx >= len(layout.id_columns):
                continue
            
            id_column = layout.id_columns[digit_idx]
            
            if digit_val >= len(id_column.bubbles):
                continue
            
            bubble = id_column.bubbles[digit_val]
            draw_mark(image, bubble.cx, bubble.cy, bubble.r, fill_ratio=1.0)
        
        # Apply degradation
        if degradation_type != 'none':
            image = apply_degradation(image, degradation_type, degradation_severity)
        
        # Save image
        sample_num = f"{sample_id:03d}"
        image_path = output_dir / f"{sample_num}.png"
        cv2.imwrite(str(image_path), image)
        
        # Save truth JSON
        truth_path = output_dir / f"{sample_num}_truth.json"
        with open(truth_path, 'w', encoding='utf-8') as f:
            json.dump(truth, f, indent=2)
        
        return True, f"Generated sample {sample_num}"
    
    except Exception as e:
        return False, f"Error: {e}"


def main():
    """Main entry point for make_synthetic.py"""
    parser = argparse.ArgumentParser(
        description="Generate synthetic test samples with known correct answers"
    )
    parser.add_argument('--template', default='T100-A4-v1',
                       choices=['T100-A4-v1', 'T060-A4-v1'],
                       help='Answer sheet template')
    parser.add_argument('--output', type=Path, default=Path('eval/synthetic'),
                       help='Output directory')
    parser.add_argument('--count', type=int, default=100,
                       help='Number of samples to generate')
    parser.add_argument('--seed', type=int, default=42,
                       help='Random seed for reproducibility')
    parser.add_argument('--mark-strategy', default='standard',
                       choices=['standard', 'light', 'partial', 'varied'],
                       help='How to fill bubbles')
    parser.add_argument('--degradation', default='all',
                       help='Degradation types: all, none, rotate, noise, blur, etc.')
    
    args = parser.parse_args()
    
    # Load layout
    if args.template == 'T100-A4-v1':
        layout = TemplatePresets.T100_A4_v1()
    else:
        layout = TemplatePresets.T060_A4_v1()
    
    # Create output directory
    args.output.mkdir(parents=True, exist_ok=True)
    
    # Generate samples
    logger.info(f"Generating {args.count} synthetic samples ({args.template})")
    logger.info(f"Template: {layout.option_count} options, {len(layout.questions)} questions")
    logger.info(f"Output: {args.output}")
    
    index_data = []
    success_count = 0
    
    # Degradation scenarios
    degradation_scenarios = []
    if args.degradation == 'all':
        # Distribute samples across degradation types
        scenarios_per_type = args.count // 8
        for deg_type in ['none', 'rotate', 'perspective', 'scale', 'noise', 'blur', 'contrast', 'jpeg']:
            for severity in [0.3, 0.6]:
                degradation_scenarios.extend([
                    (deg_type, severity) for _ in range(scenarios_per_type // 2)
                ])
    else:
        # Single degradation type
        deg_types = args.degradation.split(',')
        for i in range(args.count):
            deg_type = random.choice(deg_types)
            severity = random.uniform(0.2, 0.8)
            degradation_scenarios.append((deg_type, severity))
    
    # Pad to count
    while len(degradation_scenarios) < args.count:
        degradation_scenarios.append(('none', 0.0))
    degradation_scenarios = degradation_scenarios[:args.count]
    
    for i in range(args.count):
        sample_seed = args.seed + i
        deg_type, deg_severity = degradation_scenarios[i]
        
        success, msg = generate_synthetic_sample(
            layout,
            args.output,
            i + 1,
            seed=sample_seed,
            mark_strategy=args.mark_strategy,
            degradation_type=deg_type,
            degradation_severity=deg_severity
        )
        
        if success:
            success_count += 1
            logger.info(f"  {msg} (degradation: {deg_type} {deg_severity:.1f})")
            index_data.append({
                'sample_id': f"{i+1:03d}",
                'template': args.template,
                'mark_strategy': args.mark_strategy,
                'degradation_type': deg_type,
                'degradation_severity': deg_severity
            })
        else:
            logger.error(f"  {msg}")
    
    # Write index CSV
    index_path = args.output / 'index.csv'
    if index_data:
        with open(index_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=index_data[0].keys())
            writer.writeheader()
            writer.writerows(index_data)
    
    logger.info(f"✓ Generated {success_count}/{args.count} samples")
    logger.info(f"Index saved to {index_path}")


if __name__ == '__main__':
    main()

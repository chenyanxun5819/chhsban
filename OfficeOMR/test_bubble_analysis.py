from pathlib import Path
from omr_core import pdfio, detect, warp, score, pipeline
from sheetgen.layout import TemplatePresets
import cv2
import numpy as np

config = pipeline.load_config()
layout = TemplatePresets.T100_A4_v1()

image_path = Path('eval/synthetic/001.png')
with open(image_path, 'rb') as f:
    image_bytes = f.read()

# Read and preprocess
gray = list(pdfio.read_bytes(image_bytes, filename='001.png'))[0]
blurred = cv2.GaussianBlur(gray, (5, 5), 1.0)

# Detect fiducials and orientation
fiducials = detect.detect_fiducials(blurred, layout.fiducials)
orientation = detect.detect_orientation_and_rotation(blurred, layout.orientation_mark)
mm_to_px = 300 / 25.4
canvas_size = (int(layout.page_mm[0] * mm_to_px), int(layout.page_mm[1] * mm_to_px))
warp_result = warp.warp_to_canvas(blurred, fiducials, canvas_size)

# Calculate paper and ink levels
paper_level, ink_level = score.estimate_paper_and_ink_levels(warp_result.warped)
print(f'Paper level: {paper_level:.1f}')
print(f'Ink level: {ink_level:.1f}')
print(f'Inner ratio (from config): {config.get("inner_ratio", 0.7)}')

# Calculate thresholds
t_blank = config.get('t_blank', 0.15)
t_mark = config.get('t_mark', 0.40)
print(f'\nThresholds:')
print(f'  t_blank: {t_blank}')
print(f'  t_mark: {t_mark}')

# Get scores for first question bubbles
q1_scores = score.score_bubbles(
    warped=warp_result.warped,
    questions=[layout.questions[0]],
    paper_level=paper_level,
    ink_level=ink_level,
    inner_ratio=config.get('inner_ratio', 0.7)
)

print(f'\nQ1 bubble scores:')
for opt, s in q1_scores[0].items():
    status = 'MARK' if s > t_mark else ('BLANK' if s < t_blank else 'AMBIG')
    print(f'  {opt}: {s:.3f} ({status})')

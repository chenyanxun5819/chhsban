import json
from pathlib import Path
from PIL import Image
import numpy as np
from omr_core import pipeline
from sheetgen.layout import TemplatePresets

config = pipeline.load_config()
layout = TemplatePresets.T100_A4_v1()

image_path = Path('eval/synthetic/001.png')
truth_path = Path('eval/synthetic/001_truth.json')

with open(truth_path) as f:
    truth = json.load(f)

with open(image_path, 'rb') as f:
    result = pipeline.recognize(
        image_bytes=f.read(),
        layout=layout,
        config=config,
        template_id='T100-A4-v1',
        page_index=0
    )

# 获取第一个问题的真实答案
q1_truth = truth['answers'][0]
print(f'Q1 Truth: question={q1_truth["q"]}, correct_answer={q1_truth["answer"]}')

# 获取识别结果
q1_rec = result.answers[0] if len(result.answers) > 0 else None
if q1_rec:
    print(f'Q1 Recognized:')
    print(f'  Status: {q1_rec.status}')
    print(f'  Choices: {q1_rec.choices}')
    print(f'  Scores:')
    for opt, score in q1_rec.scores.items():
        print(f'    {opt}: {score:.3f}')
else:
    print('Q1: No recognition result')

# 检查图像中该气泡的像素值
img = Image.open(image_path)
img_array = np.asarray(img)

mm_to_px = 300 / 25.4
bubble_b = layout.questions[0].bubbles[1]  # Index 1 = option B
cx_px = int(bubble_b.cx * mm_to_px)
cy_px = int(bubble_b.cy * mm_to_px)
r_px = int(bubble_b.r * mm_to_px)

print(f'\nBubble B pixel analysis:')
print(f'  Center: ({cx_px}, {cy_px}), radius: {r_px}px')

# 提取气泡区域
y_start = max(0, cy_px - r_px)
y_end = min(img_array.shape[0], cy_px + r_px + 1)
x_start = max(0, cx_px - r_px)
x_end = min(img_array.shape[1], cx_px + r_px + 1)

region = img_array[y_start:y_end, x_start:x_end]
print(f'  Region: shape={region.shape}, min={region.min()}, max={region.max()}, mean={region.mean():.1f}')

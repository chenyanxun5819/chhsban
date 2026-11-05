import traceback
import json
from pathlib import Path

from omr_core import pipeline
from sheetgen.layout import TemplatePresets

# 加载配置
config = pipeline.load_config()
layout = TemplatePresets.T100_A4_v1()

# 读取第一个样本
image_path = Path('eval/synthetic/001.png')
truth_path = Path('eval/synthetic/001_truth.json')

# 加载真值
with open(truth_path) as f:
    truth = json.load(f)
print(f'Truth: student_id={truth["student_id"]}, answers={len(truth["answers"])} questions')

# 尝试识别
with open(image_path, 'rb') as f:
    image_bytes = f.read()

print(f'Image size: {len(image_bytes)} bytes')

try:
    result = pipeline.recognize(
        image_bytes=image_bytes,
        layout=layout,
        config=config,
        template_id='T100-A4-v1',
        page_index=0
    )
    print(f'✓ Recognition succeeded!')
    print(f'  Status: {result.status}')
    print(f'  Student ID: {result.student_id}')
    print(f'  Answers recognized: {len(result.answers)}')
    print(f'  First 5 answers: {[a.status for a in result.answers[:5]]}')
except Exception as e:
    print(f'✗ Recognition failed:')
    traceback.print_exc()

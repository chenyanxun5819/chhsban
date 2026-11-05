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
    if result.student_id:
        print(f'    Value: {result.student_id.value}')
    print(f'  Answers recognized: {len(result.answers)}')
    single_count = sum(1 for a in result.answers if a.status == 'single')
    blank_count = sum(1 for a in result.answers if a.status == 'blank')
    multi_count = sum(1 for a in result.answers if a.status == 'multi')
    ambig_count = sum(1 for a in result.answers if a.status == 'ambiguous')
    print(f'    Single: {single_count}, Blank: {blank_count}, Multi: {multi_count}, Ambiguous: {ambig_count}')
except Exception as e:
    print(f'✗ Error during recognition:')
    traceback.print_exc()

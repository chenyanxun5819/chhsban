import json
from pathlib import Path
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

print(f'Status: {result.status}')

# 计算准确率
correct = 0
for idx, ans_info in enumerate(truth['answers']):
    if idx < len(result.answers):
        rec_ans = result.answers[idx]
        if rec_ans.status == 'single' and len(rec_ans.choices) == 1:
            if rec_ans.choices[0] == ans_info['answer']:
                correct += 1

accuracy = correct / len(truth['answers'])
print(f'Accuracy: {correct}/{len(truth["answers"])} = {accuracy:.1%}')

# 计算单个应答的状态分布
single = sum(1 for a in result.answers if a.status == 'single')
blank = sum(1 for a in result.answers if a.status == 'blank')
multi = sum(1 for a in result.answers if a.status == 'multi')
ambig = sum(1 for a in result.answers if a.status == 'ambiguous')
print(f'Status: single={single}, blank={blank}, multi={multi}, ambiguous={ambig}')

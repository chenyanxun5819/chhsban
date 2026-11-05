import traceback
import logging
logging.basicConfig(level=logging.DEBUG)

from pathlib import Path
from sheetgen.layout import TemplatePresets
from tools.make_synthetic import generate_synthetic_sample, render_blank_sheet

layout = TemplatePresets.T100_A4_v1()

try:
    # Test render
    print('Testing render_blank_sheet...')
    image = render_blank_sheet(layout, dpi=300)
    print(f'Rendered image shape: {image.shape}')
    
    # Test full generation
    print('Testing generate_synthetic_sample...')
    output_dir = Path('eval/synthetic_debug')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    result = generate_synthetic_sample(
        layout=layout,
        output_dir=output_dir,
        sample_id=1,
        seed=42,
        mark_strategy='standard',
        degradation_type='none'
    )
    print(f'Generation result: {result}')
    
except Exception as e:
    traceback.print_exc()

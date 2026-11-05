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
    result = render_blank_sheet(layout, dpi=300)
    print(f'Rendered result type: {type(result)}')
    print(f'Rendered result: {result}')
    if hasattr(result, 'shape'):
        print(f'Rendered image shape: {result.shape}')
    
except Exception as e:
    traceback.print_exc()

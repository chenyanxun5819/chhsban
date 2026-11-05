import sys
sys.path.insert(0, '.')
from omr_core.pipeline import recognize, load_config
from omr_core.layout import LayoutConfig
from omr_core import detect, warp, score, decide, schema
print('✓ All omr_core imports successful')
config = load_config()
print(f'✓ Config loaded successfully')
print(f'✓ Config type: {type(config).__name__}')
print(f'✓ Config keys: {list(config.keys())}')
print(f'✓ Thresholds: t_blank={config.get("thresholds", {}).get("t_blank")}, t_mark={config.get("thresholds", {}).get("t_mark")}')

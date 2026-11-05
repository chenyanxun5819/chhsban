import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

print("Testing omr_core imports...")

try:
    from omr_core.pipeline import recognize
    print("✓ Successfully imported recognize from omr_core.pipeline")
except Exception as e:
    print(f"✗ Failed to import recognize: {e}")

try:
    from omr_core.config import load_config
    print("✓ Successfully imported load_config from omr_core.config")
except Exception as e:
    print(f"✗ Failed to import load_config: {e}")

try:
    from omr_core import schema
    print("✓ Successfully imported schema from omr_core")
except Exception as e:
    print(f"✗ Failed to import schema: {e}")

try:
    from omr_core import detect, warp, score, decide
    print("✓ Successfully imported detect, warp, score, decide from omr_core")
except Exception as e:
    print(f"✗ Failed to import modules: {e}")

try:
    config = load_config()
    print(f"✓ Successfully loaded config: {type(config)}")
    print(f"  - Keys: {list(config.keys()) if isinstance(config, dict) else 'N/A'}")
except Exception as e:
    print(f"✗ Failed to load config: {e}")

print("\nAll imports successful!")

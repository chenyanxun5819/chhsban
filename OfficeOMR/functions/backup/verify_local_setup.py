"""
Local test script for recognize_sheet function.
Tests the recognition pipeline locally before deployment.
"""

import sys
import os
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, os.path.dirname(__file__))

import cv2
import numpy as np
from omr_core.pipeline import recognize, load_config
from omr_core.layout import LayoutConfig


def test_recognize_with_synthetic_image():
    """Test recognition with a synthetic image."""
    print("\n" + "=" * 70)
    print("Testing recognition pipeline with synthetic image")
    print("=" * 70)
    
    try:
        # Load config
        config = load_config()
        print("✓ Config loaded successfully")
        
        # Create a simple test image (100x100 grayscale)
        test_image = np.ones((100, 100), dtype=np.uint8) * 200  # White background
        
        # Create a simple layout (T100 minimal)
        layout_data = {
            "template_id": "T100-A4-v1",
            "paper_size": {"width_mm": 210, "height_mm": 297},
            "dpi": 300,
            "fiducials": [
                {"x_mm": 5, "y_mm": 5, "radius_mm": 2},
                {"x_mm": 205, "y_mm": 5, "radius_mm": 2},
                {"x_mm": 5, "y_mm": 292, "radius_mm": 2},
                {"x_mm": 205, "y_mm": 292, "radius_mm": 2}
            ],
            "answer_grid": {
                "start_x_mm": 10,
                "start_y_mm": 20,
                "bubble_radius_mm": 3,
                "bubble_spacing_x_mm": 8,
                "bubble_spacing_y_mm": 6,
                "columns": 4,
                "rows": 25,
                "options": ["A", "B", "C", "D", "E"]
            },
            "student_id": {
                "columns": 5,
                "x_mm": 180,
                "y_mm": 20,
                "bubble_radius_mm": 2,
                "bubble_spacing_mm": 4
            }
        }
        
        layout = LayoutConfig(**layout_data)
        print("✓ Layout created successfully")
        
        # Convert image to bytes (PNG format)
        _, image_bytes = cv2.imencode('.png', test_image)
        print("✓ Test image created (100x100 PNG)")
        
        # Try to recognize
        print("\nAttempting recognition...")
        try:
            result = recognize(image_bytes.tobytes(), layout, config)
            print("✓ Recognition completed")
            
            if result:
                print(f"\nRecognition result:")
                print(f"  - Template: {result.template_id}")
                print(f"  - Student ID: {result.student_id}")
                print(f"  - Answers: {len(result.answers)} items")
                print(f"  - Status: {result.status}")
                if result.summary:
                    print(f"  - Accuracy: {result.summary.overall_accuracy:.1f}%")
                return True
            else:
                print("✗ Recognition returned empty result")
                return False
                
        except Exception as e:
            print(f"✗ Recognition failed: {e}")
            import traceback
            traceback.print_exc()
            return False
            
    except Exception as e:
        print(f"✗ Test setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_config_loading():
    """Test configuration loading."""
    print("\n" + "=" * 70)
    print("Testing configuration loading")
    print("=" * 70)
    
    try:
        config = load_config()
        print("✓ Config loaded successfully")
        print(f"  - Type: {type(config).__name__}")
        print(f"  - Keys: {list(config.keys())}")
        
        thresholds = config.get('thresholds', {})
        scoring = config.get('scoring', {})
        io = config.get('io', {})
        
        print(f"\nThresholds:")
        for key, value in thresholds.items():
            print(f"  - {key}: {value}")
        
        print(f"\nScoring:")
        for key, value in scoring.items():
            print(f"  - {key}: {value}")
            
        print(f"\nI/O:")
        for key, value in io.items():
            print(f"  - {key}: {value}")
        
        return True
        
    except Exception as e:
        print(f"✗ Config loading failed: {e}")
        return False


def test_imports():
    """Test all required imports."""
    print("\n" + "=" * 70)
    print("Testing imports")
    print("=" * 70)
    
    imports_to_test = [
        ("omr_core.pipeline", ["recognize", "load_config"]),
        ("omr_core.layout", ["LayoutConfig"]),
        ("omr_core", ["detect", "warp", "score", "decide", "schema"]),
        ("sheetgen.layout", ["LayoutConfig"]),
    ]
    
    all_ok = True
    for module, items in imports_to_test:
        try:
            exec(f"from {module} import {', '.join(items)}")
            print(f"✓ {module}: {', '.join(items)}")
        except Exception as e:
            print(f"✗ {module}: {e}")
            all_ok = False
    
    return all_ok


if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("OfficeOMR Functions - Local Verification")
    print("=" * 70)
    
    # Test imports
    imports_ok = test_imports()
    
    # Test config loading
    config_ok = test_config_loading()
    
    # Test recognition
    recognition_ok = test_recognize_with_synthetic_image()
    
    # Summary
    print("\n" + "=" * 70)
    print("TEST SUMMARY")
    print("=" * 70)
    print(f"Imports: {'✓ OK' if imports_ok else '✗ FAILED'}")
    print(f"Config Loading: {'✓ OK' if config_ok else '✗ FAILED'}")
    print(f"Recognition: {'✓ OK' if recognition_ok else '✗ FAILED (expected for minimal test image)'}")
    print("=" * 70)
    
    if imports_ok and config_ok:
        print("\n✅ Functions environment ready for deployment!")
    else:
        print("\n❌ Some tests failed. Check above for details.")
        sys.exit(1)

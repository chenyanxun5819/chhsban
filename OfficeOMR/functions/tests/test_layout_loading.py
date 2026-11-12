"""Unit tests for layout loading in main.py."""

import os
import sys
import json
import pytest
import tempfile
from pathlib import Path

# Add functions directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from main import load_layout_from_file, ALLOWED_TEMPLATES, _layout_cache
from sheetgen.layout import LayoutConfig


class TestLayoutLoading:
    """Test suite for layout file loading and caching."""
    
    def setup_method(self):
        """Clear cache before each test."""
        _layout_cache.clear()
    
    def test_load_t100_template(self):
        """Test loading T100-A4-v1 template from file."""
        layout = load_layout_from_file('T100-A4-v1')
        assert layout is not None
        assert isinstance(layout, LayoutConfig)
        assert layout.template_id == 'T100-A4-v1'
        assert layout.page_mm == [210.0, 297.0]  # A4 dimensions
    
    def test_load_t060_template(self):
        """Test loading T060-A4-v1 template from file."""
        layout = load_layout_from_file('T060-A4-v1')
        assert layout is not None
        assert isinstance(layout, LayoutConfig)
        assert layout.template_id == 'T060-A4-v1'
        assert layout.page_mm == [210.0, 297.0]  # A4 dimensions
    
    def test_invalid_template_raises_error(self):
        """Test that unknown template name raises ValueError (400 in handler)."""
        with pytest.raises(ValueError) as exc_info:
            load_layout_from_file('T999-INVALID')
        
        assert 'Unsupported template' in str(exc_info.value)
        assert 'T999-INVALID' in str(exc_info.value)
    
    def test_caching_works(self):
        """Test that layouts are cached after first load."""
        # Load T100
        layout1 = load_layout_from_file('T100-A4-v1')
        
        # Cache should now have T100
        assert 'T100-A4-v1' in _layout_cache
        cached_layout = _layout_cache['T100-A4-v1']
        
        # Load T100 again - should return same object from cache
        layout2 = load_layout_from_file('T100-A4-v1')
        assert layout2 is cached_layout  # Same object reference
        assert layout2 is layout1  # Also same as first load
    
    def test_both_templates_cached_independently(self):
        """Test that multiple templates are cached independently."""
        layout_t100 = load_layout_from_file('T100-A4-v1')
        layout_t060 = load_layout_from_file('T060-A4-v1')
        
        assert layout_t100 is not layout_t060
        assert len(_layout_cache) == 2
        assert _layout_cache['T100-A4-v1'] is layout_t100
        assert _layout_cache['T060-A4-v1'] is layout_t060
    
    def test_layout_has_bubbles_and_id_columns(self):
        """Test that loaded layout contains expected attributes."""
        layout = load_layout_from_file('T100-A4-v1')
        
        # Check core attributes exist
        assert hasattr(layout, 'questions')
        assert hasattr(layout, 'id_columns')
        assert hasattr(layout, 'fiducials')
        
        # Check they're not empty
        assert len(layout.questions) > 0
        assert len(layout.id_columns) > 0
        assert len(layout.fiducials) > 0
        
        # Check questions have bubbles
        for q in layout.questions:
            assert len(q.bubbles) > 0
    
    def test_layout_properties_t100(self):
        """Test T100 template has correct structure."""
        layout = load_layout_from_file('T100-A4-v1')
        assert layout.option_count == 5
        assert layout.id_digits == 5
        assert len(layout.questions) == 100
        assert layout.canvas_dpi == 300
    
    def test_layout_properties_t060(self):
        """Test T060 template has correct structure."""
        layout = load_layout_from_file('T060-A4-v1')
        assert layout.option_count == 5
        assert layout.id_digits == 5
        assert len(layout.questions) == 60
        assert layout.canvas_dpi == 300


class TestAllowedTemplates:
    """Test allowed template constant."""
    
    def test_allowed_templates_set(self):
        """Verify ALLOWED_TEMPLATES contains expected templates."""
        assert 'T100-A4-v1' in ALLOWED_TEMPLATES
        assert 'T060-A4-v1' in ALLOWED_TEMPLATES
        assert len(ALLOWED_TEMPLATES) == 2


class TestLayoutConfigRoundtrip:
    """Test LayoutConfig serialization/deserialization roundtrip."""
    
    def test_from_dict_works(self):
        """Test that from_dict() can deserialize layout data."""
        import json
        from pathlib import Path
        
        # Load raw JSON
        layout_path = Path(__file__).parent.parent / 'layouts' / 'T100-A4-v1.layout.json'
        with open(layout_path, 'r', encoding='utf-8') as f:
            layout_data = json.load(f)
        
        # Deserialize
        layout = LayoutConfig.from_dict(layout_data)
        
        # Verify
        assert layout.template_id == 'T100-A4-v1'
        assert len(layout.questions) == 100
    
    def test_from_dict_to_dict_consistency(self):
        """Test from_dict -> to_dict preserves structure."""
        import json
        from pathlib import Path
        
        # Load and deserialize
        layout_path = Path(__file__).parent.parent / 'layouts' / 'T100-A4-v1.layout.json'
        with open(layout_path, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
        
        layout = LayoutConfig.from_dict(original_data)
        serialized_data = layout.to_dict()
        
        # Check key fields match
        assert serialized_data['template_id'] == original_data['template_id']
        assert serialized_data['version'] == original_data['version']
        assert len(serialized_data['questions']) == len(original_data['questions'])
        assert len(serialized_data['id_columns']) == len(original_data['id_columns'])


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

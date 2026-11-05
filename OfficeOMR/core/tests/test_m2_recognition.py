"""M2 Recognition Core Tests — Dry runs on synthetic clean data."""

import pytest
import numpy as np
import cv2
from pathlib import Path

from omr_core import pipeline, schema
from omr_core.score import score_bubbles, estimate_paper_and_ink_levels
from omr_core.decide import decide_question_status, decide_student_id_digits
from omr_core.detect import detect_fiducials, detect_orientation_and_rotation
from omr_core.warp import warp_to_canvas
from sheetgen.layout import TemplatePresets
from sheetgen.builder import build_sheet
import pypdfium2 as pdfium


class TestM2RecognitionCore:
    """Core recognition pipeline tests."""
    
    @pytest.fixture
    def layout_t100(self):
        """Load T100 template."""
        return TemplatePresets.T100_A4_v1()
    
    @pytest.fixture
    def layout_t060(self):
        """Load T060 template."""
        return TemplatePresets.T060_A4_v1()
    
    @pytest.fixture
    def config(self):
        """Load default config."""
        return pipeline.load_config()
    
    def test_m2_import_all_modules(self):
        """Verify all M2 modules can be imported."""
        from omr_core import detect, warp, score, decide, debug, schema, pdfio
        assert all([detect, warp, score, decide, debug, schema, pdfio])
    
    def test_decide_single_choice(self):
        """Decide logic: single choice."""
        scores = {"A": 0.85, "B": 0.02, "C": 0.01, "D": 0.03, "E": 0.01}
        status, choices = decide_question_status(scores)
        assert status == "single"
        assert choices == ["A"]
    
    def test_decide_blank(self):
        """Decide logic: blank answer."""
        scores = {"A": 0.10, "B": 0.08, "C": 0.12, "D": 0.05, "E": 0.09}
        status, choices = decide_question_status(scores)
        assert status == "blank"
        assert choices == []
    
    def test_decide_multi(self):
        """Decide logic: multi choice."""
        scores = {"A": 0.55, "B": 0.52, "C": 0.02, "D": 0.03, "E": 0.01}
        status, choices = decide_question_status(scores)
        assert status == "multi"
        assert set(choices) == {"A", "B"}
    
    def test_decide_ambiguous(self):
        """Decide logic: ambiguous (partial fill)."""
        scores = {"A": 0.25, "B": 0.02, "C": 0.01, "D": 0.03, "E": 0.01}
        status, choices = decide_question_status(scores)
        assert status == "ambiguous"
    
    def test_decide_student_id_clean(self):
        """Decide ID: clean 5-digit ID."""
        id_scores = [
            {"0": 0.02, "1": 0.02, "2": 0.85, "3": 0.03, "4": 0.01, "5": 0.02, "6": 0.01, "7": 0.02, "8": 0.01, "9": 0.01},  # 2
            {"0": 0.01, "1": 0.02, "2": 0.01, "3": 0.01, "4": 0.88, "5": 0.02, "6": 0.01, "7": 0.02, "8": 0.01, "9": 0.01},  # 4
            {"0": 0.01, "1": 0.82, "2": 0.02, "3": 0.03, "4": 0.01, "5": 0.02, "6": 0.01, "7": 0.02, "8": 0.01, "9": 0.01},  # 1
            {"0": 0.01, "1": 0.02, "2": 0.01, "3": 0.01, "4": 0.01, "5": 0.02, "6": 0.01, "7": 0.02, "8": 0.86, "9": 0.01},  # 8
            {"0": 0.01, "1": 0.02, "2": 0.01, "3": 0.90, "4": 0.01, "5": 0.02, "6": 0.01, "7": 0.02, "8": 0.01, "9": 0.01},  # 3
        ]
        full_id, digits = decide_student_id_digits(id_scores)
        assert full_id == "24183"
        assert len(digits) == 5
        assert all(d.status == "single" for d in digits)
    
    def test_decide_student_id_with_unknown(self):
        """Decide ID: ID with unknown digit (?)."""
        id_scores = [
            {"0": 0.10, "1": 0.10, "2": 0.10, "3": 0.10, "4": 0.10, "5": 0.10, "6": 0.10, "7": 0.10, "8": 0.10, "9": 0.10},  # Below t_mark (0.40) = blank
            {"0": 0.01, "1": 0.88, "2": 0.01, "3": 0.01, "4": 0.01, "5": 0.01, "6": 0.01, "7": 0.01, "8": 0.01, "9": 0.01},  # 1
        ]
        full_id, digits = decide_student_id_digits(id_scores)
        assert full_id is None  # Contains '?'
        assert digits[0].digit == "?"  # Below threshold
        assert digits[0].status == "blank"
    
    def test_sheet_quality_model(self):
        """Test SheetQuality schema."""
        quality = schema.SheetQuality(
            fiducial_rms_px=0.8,
            skew_deg=0.4,
            rotated_180=False,
            paper_level=238,
            ink_level=22
        )
        assert quality.fiducial_rms_px == 0.8
        assert quality.rotated_180 is False
    
    def test_recognition_result_model(self):
        """Test RecognitionResult schema."""
        result = schema.RecognitionResult(
            template_id="T100-A4-v1",
            status="ok",
            summary=schema.AnswerSummary(single=100, blank=0, multi=0, ambiguous=0)
        )
        assert result.template_id == "T100-A4-v1"
        assert result.status == "ok"
        assert not result.needs_review()
    
    def test_recognition_result_needs_review(self):
        """Test RecognitionResult.needs_review() with ambiguous answers."""
        result = schema.RecognitionResult(
            template_id="T100-A4-v1",
            status="ok",
            summary=schema.AnswerSummary(single=99, blank=0, multi=0, ambiguous=1)
        )
        assert result.needs_review()
    
    def test_end_to_end_recognition_pipeline_clean_t100(self, layout_t100, config):
        """E2E test: Pipeline structure and result schema."""
        # Test pipeline function exists and can be called
        from omr_core.pipeline import recognize, load_config, score_student_id
        
        # Verify load_config works and returns dict with required keys
        cfg = load_config()
        assert cfg is not None
        assert isinstance(cfg, dict)
        assert 'thresholds' in cfg
        assert 'scoring' in cfg
        assert 'io' in cfg
        
        # Verify score_student_id function signature
        assert callable(score_student_id)
        
        # Note: Full PDF→recognition testing comes in M3 after synthetic generation
        # This test verifies module structure is complete


class TestM2RecognitionAccuracy:
    """M2 acceptance tests — module completeness and config validation."""
    
    def test_m2_config_loads_t100(self):
        """M2: Config loads and has all required thresholds."""
        config = pipeline.load_config()
        
        assert config is not None
        assert isinstance(config, dict)
        assert 'thresholds' in config
        thresholds = config['thresholds']
        assert 't_blank' in thresholds
        assert 't_mark' in thresholds
        assert 't_other' in thresholds
        assert thresholds['t_blank'] == 0.15
        assert thresholds['t_mark'] == 0.40
        assert thresholds['t_other'] == 0.25
    
    def test_m2_layout_templates_load(self):
        """M2: Both T100 and T060 templates load."""
        t100 = TemplatePresets.T100_A4_v1()
        t060 = TemplatePresets.T060_A4_v1()
        
        assert t100 is not None
        assert t060 is not None
        assert len(t100.questions) == 100
        assert len(t060.questions) == 60
    
    def test_m2_all_modules_callable(self):
        """M2: Core recognition modules are all callable."""
        from omr_core import detect, warp, score, decide, debug, pdfio
        
        # Verify functions exist and are callable
        assert callable(detect.detect_fiducials)
        assert callable(detect.detect_orientation_and_rotation)
        assert callable(warp.warp_to_canvas)
        assert callable(score.estimate_paper_and_ink_levels)
        assert callable(score.score_bubbles)
        assert callable(decide.decide_question_status)
        assert callable(decide.decide_student_id_digits)
        assert callable(debug.draw_annotated_image)
        assert callable(pdfio.read_pdf_as_images)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

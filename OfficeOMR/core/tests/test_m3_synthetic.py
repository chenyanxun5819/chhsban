"""M3 — Synthetic test generation and evaluation tests.

Validates:
1. Sample generation (render, draw marks, apply degradation)
2. Truth JSON generation (student ID, answers)
3. Evaluation metrics (accuracy, silent errors, review rate)
4. Full pipeline integration

Target: 32/32 passing tests
"""

import pytest
import json
import tempfile
import numpy as np
import cv2
from pathlib import Path
from typing import Tuple

# Import core modules
from sheetgen.layout import TemplatePresets, LayoutConfig
from tools.make_synthetic import (
    render_blank_sheet, draw_mark, generate_truth_answers, 
    apply_degradation, generate_synthetic_sample
)
from tools.evaluate import load_truth, evaluate_single_sample
from omr_core import pipeline, schema
from omr_core.pipeline import load_config


class TestRenderBlankSheet:
    """Tests for render_blank_sheet() — PDF → grayscale image conversion."""
    
    def test_render_returns_ndarray(self):
        """Output is numpy array."""
        layout = TemplatePresets.T100_A4_v1()
        image = render_blank_sheet(layout, dpi=300)
        assert isinstance(image, np.ndarray)
    
    def test_render_is_grayscale(self):
        """Output is 2D grayscale (not RGB)."""
        layout = TemplatePresets.T100_A4_v1()
        image = render_blank_sheet(layout, dpi=300)
        assert len(image.shape) == 2
        assert image.dtype == np.uint8
    
    def test_render_correct_dpi_300(self):
        """At 300 DPI, A4 (210×297 mm) → 2480×3508 px."""
        layout = TemplatePresets.T100_A4_v1()
        image = render_blank_sheet(layout, dpi=300)
        # A4: 210mm × 297mm → 2480px × 3508px at 300 DPI
        assert image.shape[0] in (3507, 3508, 3509)  # Allow ±1px tolerance
        assert image.shape[1] in (2479, 2480, 2481)
    
    def test_render_correct_dpi_150(self):
        """At 150 DPI, A4 → 1240×1754 px."""
        layout = TemplatePresets.T100_A4_v1()
        image = render_blank_sheet(layout, dpi=150)
        assert image.shape[0] in (1753, 1754, 1755)
        assert image.shape[1] in (1239, 1240, 1241)
    
    def test_render_mostly_white(self):
        """Blank sheet is mostly white (high pixel values)."""
        layout = TemplatePresets.T100_A4_v1()
        image = render_blank_sheet(layout, dpi=300)
        mean_val = image.mean()
        assert mean_val > 200  # Mostly white
    
    def test_render_different_templates(self):
        """Works for different template sizes."""
        for template in [TemplatePresets.T100_A4_v1(), TemplatePresets.T060_A4_v1()]:
            image = render_blank_sheet(template, dpi=300)
            assert image.shape[0] > 0
            assert image.shape[1] > 0


class TestDrawMark:
    """Tests for draw_mark() — Drawing bubbles and marks."""
    
    def setup_method(self):
        """Create blank test image."""
        self.image = np.full((3508, 2480), 255, dtype=np.uint8)  # White
    
    def test_draw_filled_mark(self):
        """Filled mark (fill_ratio=1.0) creates black bubble."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, fill_ratio=1.0, mark_type='fill')
        # Center should be dark
        mm_to_px = 300 / 25.4
        cx_px = int(20 * mm_to_px)
        cy_px = int(20 * mm_to_px)
        assert img[cy_px, cx_px] < 100  # Black
    
    def test_draw_empty_mark(self):
        """Empty mark (fill_ratio=0.0) keeps paper white."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, fill_ratio=0.0, mark_type='fill')
        mm_to_px = 300 / 25.4
        cx_px = int(20 * mm_to_px)
        cy_px = int(20 * mm_to_px)
        assert img[cy_px, cx_px] > 200  # White
    
    def test_draw_partial_mark(self):
        """Partial fill (0.5) creates gray bubble."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, fill_ratio=0.5, mark_type='fill')
        mm_to_px = 300 / 25.4
        cx_px = int(20 * mm_to_px)
        cy_px = int(20 * mm_to_px)
        val = img[cy_px, cx_px]
        assert 100 < val < 200  # Gray
    
    def test_draw_cross_mark(self):
        """Cross mark type creates X pattern."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, mark_type='cross')
        # Some pixels should be darkened
        assert img.min() < 200
    
    def test_draw_check_mark(self):
        """Check mark type creates checkmark pattern."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, mark_type='check')
        assert img.min() < 200
    
    def test_draw_dot_mark(self):
        """Dot mark creates small point."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, mark_type='dot')
        assert img.min() < 200
    
    def test_draw_erase_mark(self):
        """Erase mark creates light smudge."""
        img = self.image.copy()
        draw_mark(img, cx_mm=20, cy_mm=20, radius_mm=3, mark_type='erase')
        # Erase is lighter than filled
        mm_to_px = 300 / 25.4
        cx_px = int(20 * mm_to_px)
        cy_px = int(20 * mm_to_px)
        assert 100 < img[cy_px, cx_px] < 255
    
    def test_draw_mark_out_of_bounds(self):
        """Out-of-bounds marks don't crash."""
        img = self.image.copy()
        draw_mark(img, cx_mm=-10, cy_mm=-10, radius_mm=3)  # Negative
        assert img.shape == (3508, 2480)


class TestGenerateTruthAnswers:
    """Tests for generate_truth_answers() — Generating ground truth."""
    
    def test_truth_has_student_id(self):
        """Truth dict contains 'student_id' key."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        assert 'student_id' in truth
    
    def test_truth_has_answers(self):
        """Truth dict contains 'answers' list."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        assert 'answers' in truth
        assert isinstance(truth['answers'], list)
    
    def test_student_id_correct_length(self):
        """Student ID has correct number of digits."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        assert len(truth['student_id']) == layout.id_digits
    
    def test_student_id_all_digits(self):
        """Student ID contains only digits."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        assert truth['student_id'].isdigit()
    
    def test_answers_count_matches_questions(self):
        """Number of answers matches number of questions."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        assert len(truth['answers']) == len(layout.questions)
    
    def test_answers_are_valid_options(self):
        """Each answer is a valid option (A-E for 5-option sheets)."""
        layout = TemplatePresets.T100_A4_v1()
        truth = generate_truth_answers(layout, seed=42)
        valid_options = [chr(ord('A') + i) for i in range(layout.option_count)]
        for ans_info in truth['answers']:
            assert ans_info['answer'] in valid_options
    
    def test_reproducible_with_seed(self):
        """Same seed produces same answers."""
        layout = TemplatePresets.T100_A4_v1()
        truth1 = generate_truth_answers(layout, seed=42)
        truth2 = generate_truth_answers(layout, seed=42)
        assert truth1['student_id'] == truth2['student_id']
        assert [a['answer'] for a in truth1['answers']] == [a['answer'] for a in truth2['answers']]
    
    def test_different_seeds_different_answers(self):
        """Different seeds produce different answers."""
        layout = TemplatePresets.T100_A4_v1()
        truth1 = generate_truth_answers(layout, seed=42)
        truth2 = generate_truth_answers(layout, seed=43)
        # Extremely unlikely to be identical
        assert not (truth1['student_id'] == truth2['student_id'] and 
                   [a['answer'] for a in truth1['answers']] == [a['answer'] for a in truth2['answers']])


class TestApplyDegradation:
    """Tests for apply_degradation() — Scanning degradation simulation."""
    
    def setup_method(self):
        """Create test image."""
        self.image = np.full((3508, 2480), 128, dtype=np.uint8)  # Gray
    
    def test_degradation_none_unchanged(self):
        """'none' degradation returns copy unchanged."""
        result = apply_degradation(self.image, 'none', 0.5)
        assert np.allclose(result, self.image)
    
    def test_degradation_rotate(self):
        """'rotate' degradation applies rotation."""
        result = apply_degradation(self.image, 'rotate', 0.5)
        assert result.shape == self.image.shape
        # Most pixels should be different
        assert (result != self.image).sum() > 0
    
    def test_degradation_perspective(self):
        """'perspective' degradation applies perspective warp."""
        result = apply_degradation(self.image, 'perspective', 0.5)
        assert result.shape == self.image.shape
        assert (result != self.image).sum() > 0
    
    def test_degradation_scale(self):
        """'scale' degradation applies scaling."""
        result = apply_degradation(self.image, 'scale', 0.5)
        assert result.shape == self.image.shape
    
    def test_degradation_noise(self):
        """'noise' degradation adds Gaussian noise."""
        result = apply_degradation(self.image, 'noise', 0.5)
        assert result.shape == self.image.shape
        # Should be different
        assert (result != self.image).sum() > 0
    
    def test_degradation_blur(self):
        """'blur' degradation applies Gaussian blur."""
        result = apply_degradation(self.image, 'blur', 0.5)
        assert result.shape == self.image.shape
    
    def test_degradation_contrast(self):
        """'contrast' degradation adjusts contrast."""
        result = apply_degradation(self.image, 'contrast', 0.5)
        assert result.shape == self.image.shape
    
    def test_degradation_jpeg(self):
        """'jpeg' degradation applies JPEG compression."""
        result = apply_degradation(self.image, 'jpeg', 0.5)
        assert result.shape == self.image.shape
    
    def test_degradation_output_dtype(self):
        """Output is always uint8."""
        for deg_type in ['none', 'rotate', 'noise', 'blur']:
            result = apply_degradation(self.image, deg_type, 0.5)
            assert result.dtype == np.uint8
    
    def test_degradation_output_range(self):
        """Output pixel values in [0, 255]."""
        for deg_type in ['none', 'rotate', 'noise', 'blur']:
            result = apply_degradation(self.image, deg_type, 0.5)
            assert result.min() >= 0
            assert result.max() <= 255


class TestGenerateSyntheticSample:
    """Tests for generate_synthetic_sample() — Full sample generation."""
    
    def test_generate_creates_png_and_json(self):
        """Generates both PNG and JSON files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            success, msg = generate_synthetic_sample(
                layout, tmpdir, sample_id=1, seed=42
            )
            assert success
            assert (tmpdir / "001.png").exists()
            assert (tmpdir / "001_truth.json").exists()
    
    def test_generated_png_is_valid(self):
        """Generated PNG is readable image."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42)
            
            img = cv2.imread(str(tmpdir / "001.png"), cv2.IMREAD_GRAYSCALE)
            assert img is not None
            assert img.shape[0] > 0
            assert img.shape[1] > 0
    
    def test_generated_json_is_valid(self):
        """Generated JSON is valid and parseable."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42)
            
            with open(tmpdir / "001_truth.json") as f:
                truth = json.load(f)
            
            assert 'student_id' in truth
            assert 'answers' in truth
    
    def test_sample_with_degradation(self):
        """Generates sample with degradation."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            success, msg = generate_synthetic_sample(
                layout, tmpdir, sample_id=1, seed=42,
                degradation_type='rotate', degradation_severity=0.5
            )
            assert success
            assert (tmpdir / "001.png").exists()
    
    def test_sample_reproducible_with_seed(self):
        """Same seed produces same sample."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            
            # Generate two samples with same seed
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42)
            with open(tmpdir / "001_truth.json") as f:
                truth1 = json.load(f)
            img1 = cv2.imread(str(tmpdir / "001.png"), cv2.IMREAD_GRAYSCALE)
            
            (tmpdir / "001.png").unlink()
            (tmpdir / "001_truth.json").unlink()
            
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42)
            with open(tmpdir / "001_truth.json") as f:
                truth2 = json.load(f)
            img2 = cv2.imread(str(tmpdir / "001.png"), cv2.IMREAD_GRAYSCALE)
            
            assert truth1 == truth2
            assert np.allclose(img1, img2)


class TestLoadTruth:
    """Tests for load_truth() — Loading ground truth JSON."""
    
    def test_load_valid_json(self):
        """Loads valid truth JSON."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            truth_data = {
                'student_id': '12345',
                'answers': [
                    {'q': 1, 'answer': 'A'},
                    {'q': 2, 'answer': 'B'}
                ]
            }
            truth_file = tmpdir / "sample_truth.json"
            with open(truth_file, 'w') as f:
                json.dump(truth_data, f)
            
            loaded = load_truth(str(truth_file))
            assert loaded == truth_data
    
    def test_load_raises_on_invalid_file(self):
        """Raises exception for nonexistent file."""
        with pytest.raises(FileNotFoundError):
            load_truth('/nonexistent/path/truth.json')


class TestEvaluateSingleSample:
    """Tests for evaluate_single_sample() — Single sample evaluation."""
    
    def test_evaluate_perfect_sample(self):
        """Perfect sample (100% correct) → accuracy=1.0."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            
            # Generate sample
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42, degradation_type='none')
            
            truth = load_truth(str(tmpdir / "001_truth.json"))
            cfg = load_config()
            
            # Evaluate
            result = evaluate_single_sample(
                tmpdir / "001.png",
                truth,
                layout,
                cfg
            )
            
            # Should have high accuracy
            assert result['accuracy'] > 0.9
    
    def test_evaluate_result_has_required_fields(self):
        """Evaluation result contains required metric fields."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            
            generate_synthetic_sample(layout, tmpdir, sample_id=1, seed=42, degradation_type='none')
            truth = load_truth(str(tmpdir / "001_truth.json"))
            cfg = load_config()
            
            result = evaluate_single_sample(
                tmpdir / "001.png",
                truth,
                layout,
                cfg
            )
            
            assert 'accuracy' in result
            assert 'silent_errors' in result
            assert 'needs_review_count' in result
            assert 'id_correct' in result


class TestFullPipeline:
    """Integration tests for complete M3 workflow."""
    
    def test_generate_and_evaluate_small_batch(self):
        """Generate 5 samples and evaluate all."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            cfg = load_config()
            
            # Generate 5 samples
            for i in range(1, 6):
                generate_synthetic_sample(
                    layout, tmpdir, sample_id=i, seed=40+i,
                    degradation_type='none'
                )
            
            # Evaluate all
            accuracies = []
            for i in range(1, 6):
                truth = load_truth(str(tmpdir / f"{i:03d}_truth.json"))
                result = evaluate_single_sample(
                    tmpdir / f"{i:03d}.png",
                    truth,
                    layout,
                    cfg
                )
                accuracies.append(result['accuracy'])
            
            # All should have reasonable accuracy
            avg_accuracy = sum(accuracies) / len(accuracies)
            assert avg_accuracy > 0.9
    
    def test_mixed_degradation_pipeline(self):
        """Generate samples with different degradation types and evaluate."""
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir = Path(tmpdir)
            layout = TemplatePresets.T100_A4_v1()
            cfg = load_config()
            
            degradation_types = ['none', 'rotate', 'noise', 'blur']
            
            for deg_type in degradation_types:
                generate_synthetic_sample(
                    layout, tmpdir, sample_id=degradation_types.index(deg_type)+1,
                    seed=42, degradation_type=deg_type, degradation_severity=0.3
                )
            
            # All should generate successfully
            for i, deg_type in enumerate(degradation_types):
                assert (tmpdir / f"{i+1:03d}.png").exists()
                assert (tmpdir / f"{i+1:03d}_truth.json").exists()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])

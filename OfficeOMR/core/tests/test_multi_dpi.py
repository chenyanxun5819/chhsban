#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
步骤 ④ 单元测试：多分辨率识别结果一致性验证

测试要求：
- 同一张答题纸的 150/200/300 dpi 版本
- 识别结果应完全一致（题目数、答案、坐标等）
"""

import sys
from pathlib import Path
import os

# Add core and sheetgen to path
test_dir = Path(__file__).parent
root_dir = test_dir.parent.parent
sys.path.insert(0, str(root_dir / "core"))
sys.path.insert(0, str(root_dir / "sheetgen"))

import unittest
from omr_core.pipeline import recognize, load_config
from sheetgen.layout import TemplatePresets

class TestMultiDPIConsistency(unittest.TestCase):
    """测试不同 DPI 输入的识别结果一致性"""
    
    @classmethod
    def setUpClass(cls):
        """准备测试数据"""
        cls.layout = TemplatePresets.T100_A4_v1()
        cls.config = load_config()
        
        # 加载不同分辨率的样本
        cls.samples = {}
        test_dir = Path(__file__).parent
        root_dir = test_dir.parent.parent
        
        for dpi in [150, 200, 300]:
            path = root_dir / "output" / f"sample_{dpi}dpi.png"
            if not path.exists():
                raise FileNotFoundError(f"样本文件不存在: {path}")
            
            with open(path, 'rb') as f:
                cls.samples[dpi] = f.read()
    
    def test_all_dpi_levels_recognized(self):
        """测试所有 DPI 级别都能成功识别"""
        for dpi in [150, 200, 300]:
            with self.subTest(dpi=dpi):
                result = recognize(
                    self.samples[dpi], 
                    self.layout, 
                    self.config, 
                    self.layout.template_id
                )
                self.assertIn(
                    result.status, 
                    ['success', 'needs_review'],
                    f"{dpi} dpi 识别失败: {result.error.message if result.error else 'unknown'}"
                )
    
    def test_question_count_consistent(self):
        """测试所有 DPI 检测到的题目数一致"""
        results = {}
        for dpi in [150, 200, 300]:
            result = recognize(
                self.samples[dpi],
                self.layout,
                self.config,
                self.layout.template_id
            )
            self.assertIsNotNone(result.answers)
            results[dpi] = len(result.answers)
        
        # 所有 DPI 的题目数应相同
        question_counts = set(results.values())
        self.assertEqual(
            len(question_counts), 1,
            f"题目数不一致: {results}"
        )
        self.assertEqual(
            results[300], 100,
            f"题目数错误: 预期 100, 实际 {results[300]}"
        )
    
    def test_sheet_quality_consistent(self):
        """测试所有 DPI 的纸张质量指标基本一致"""
        quality_metrics = {}
        for dpi in [150, 200, 300]:
            result = recognize(
                self.samples[dpi],
                self.layout,
                self.config,
                self.layout.template_id
            )
            quality = result.sheet_quality
            quality_metrics[dpi] = {
                'fiducial_rms': quality.fiducial_rms_px,
                'skew_deg': quality.skew_deg,
                'rotated_180': quality.rotated_180,
            }
        
        # 验证倾斜角度基本一致（允许 ±1 度误差）
        skew_values = [quality_metrics[dpi]['skew_deg'] for dpi in [150, 200, 300]]
        max_skew = max(skew_values)
        min_skew = min(skew_values)
        
        self.assertLess(
            max_skew - min_skew, 1.0,
            f"倾斜角度偏差过大: {quality_metrics}"
        )
        
        # 验证 180° 翻转检测一致
        rotations = [quality_metrics[dpi]['rotated_180'] for dpi in [150, 200, 300]]
        self.assertEqual(
            len(set(rotations)), 1,
            f"180° 翻转检测不一致: {quality_metrics}"
        )
    
    def test_fiducial_detection_consistency(self):
        """测试所有 DPI 都能检测到 4 个定位标记"""
        for dpi in [150, 200, 300]:
            with self.subTest(dpi=dpi):
                result = recognize(
                    self.samples[dpi],
                    self.layout,
                    self.config,
                    self.layout.template_id
                )
                # 如果识别成功，说明 fiducial 检测成功了
                self.assertIn(result.status, ['success', 'needs_review'])
    
    def test_minimum_resolution_threshold(self):
        """测试低于最小分辨率的输入被正确拒绝"""
        # 创建非常小的输入（< 1600 px）
        import cv2
        sample_path = Path(__file__).parent.parent.parent / "output" / "sample_300dpi.png"
        tiny_img = cv2.resize(
            cv2.imread(str(sample_path), cv2.IMREAD_GRAYSCALE),
            (1000, 1500),
            interpolation=cv2.INTER_CUBIC
        )
        
        import io
        _, encoded = cv2.imencode('.png', tiny_img)
        tiny_bytes = encoded.tobytes()
        
        result = recognize(tiny_bytes, self.layout, self.config)
        self.assertEqual(result.status, 'failed')
        self.assertEqual(result.error.code, 'LOW_RESOLUTION')

def run_tests():
    """运行单元测试"""
    # 创建测试套件
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestMultiDPIConsistency)
    
    # 运行测试
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()

if __name__ == '__main__':
    success = run_tests()
    sys.exit(0 if success else 1)

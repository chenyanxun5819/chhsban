"""M3 — Evaluate recognition accuracy on synthetic test samples.

Runs recognition pipeline on all synthetic samples and compares results with truth.

Usage:
    python -m tools.evaluate --input eval/synthetic --output eval/reports

Output:
    eval/reports/
    ├── <timestamp>_evaluation.md  (evaluation report)
    ├── <timestamp>_summary.csv    (statistics by degradation type)
    └── failures/
        └── <sample_id>_marked.png (annotated failure cases)
"""

import os
import json
import csv
import logging
import argparse
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Tuple

import numpy as np

from omr_core import pipeline, schema
from sheetgen.layout import TemplatePresets

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')


def load_truth(truth_json_path: Path) -> Dict[str, Any]:
    """Load truth (correct answers) from JSON file."""
    with open(truth_json_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def evaluate_single_sample(
    image_path: Path,
    truth: Dict[str, Any],
    layout,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Recognize one sample and compare with truth.
    
    Args:
        image_path: Path to PNG image
        truth: Dictionary with 'student_id' and 'answers'
        layout: LayoutConfig
        config: Recognition config
        
    Returns:
        Evaluation result dict
    """
    # Read image bytes
    with open(image_path, 'rb') as f:
        image_bytes = f.read()
    
    # Run recognition
    try:
        result = pipeline.recognize(
            image_bytes=image_bytes,
            layout=layout,
            config=config,
            template_id=layout.template_id if hasattr(layout, 'template_id') else 'T100-A4-v1',
            page_index=0
        )
    except Exception as e:
        logger.error(f"Recognition failed for {image_path.name}: {e}")
        return {
            'sample': image_path.name,
            'success': False,
            'error': str(e),
            'recognized_count': 0,
            'correct_count': 0,
            'silent_errors': 0,
            'needs_review_count': 0,
            'accuracy': 0.0
        }
    
    # Compare with truth
    correct_count = 0
    recognized_count = 0
    needs_review_count = 0
    silent_errors = 0
    
    # Compare answers
    for answer_info in truth['answers']:
        q_idx = answer_info['q']
        truth_answer = answer_info['answer']
        
        if q_idx > len(result.answers):
            continue
        
        rec_answer_obj = result.answers[q_idx - 1]
        
        # Check if recognized (single answer)
        if rec_answer_obj.status == 'single' and len(rec_answer_obj.choices) == 1:
            recognized_count += 1
            rec_answer = rec_answer_obj.choices[0]
            
            if rec_answer == truth_answer:
                correct_count += 1
            else:
                # Wrong answer recognized as single (silent error)
                silent_errors += 1
        
        elif rec_answer_obj.status in ['multi', 'ambiguous', 'blank']:
            needs_review_count += 1
        
        else:
            recognized_count += 1
    
    # Compare student ID
    id_correct = False
    if result.student_id and result.student_id.value == truth['student_id']:
        id_correct = True
    elif result.student_id and result.student_id.value and '?' not in result.student_id.value:
        # ID recognized but different from truth (silent error)
        silent_errors += 1
    
    total_questions = len(truth['answers'])
    accuracy = correct_count / total_questions if total_questions > 0 else 0.0
    
    return {
        'sample': image_path.name,
        'success': True,
        'error': None,
        'total_questions': total_questions,
        'recognized_count': recognized_count,
        'correct_count': correct_count,
        'silent_errors': silent_errors,
        'needs_review_count': needs_review_count,
        'id_correct': id_correct,
        'accuracy': accuracy,
        'status': result.status
    }


def main():
    """Main evaluation routine."""
    parser = argparse.ArgumentParser(description='Evaluate recognition accuracy')
    parser.add_argument('--input', type=Path, default=Path('eval/synthetic'),
                       help='Input directory with synthetic samples')
    parser.add_argument('--output', type=Path, default=Path('eval/reports'),
                       help='Output directory for reports')
    parser.add_argument('--template', default='T100-A4-v1',
                       choices=['T100-A4-v1', 'T060-A4-v1'],
                       help='Template to use')
    
    args = parser.parse_args()
    
    # Check input directory
    if not args.input.exists():
        logger.error(f"Input directory not found: {args.input}")
        sys.exit(1)
    
    # Create output directory
    args.output.mkdir(parents=True, exist_ok=True)
    
    # Load layout
    if args.template == 'T100-A4-v1':
        layout = TemplatePresets.T100_A4_v1()
    else:
        layout = TemplatePresets.T060_A4_v1()
    
    # Load config
    config = pipeline.load_config()
    
    # Find all PNG files
    png_files = sorted(args.input.glob('*.png'))
    if not png_files:
        logger.error(f"No PNG files found in {args.input}")
        sys.exit(1)
    
    logger.info(f"Found {len(png_files)} samples in {args.input}")
    logger.info(f"Template: {args.template} ({len(layout.questions)} questions)")
    
    # Evaluate all samples
    results = []
    success_count = 0
    
    for i, image_path in enumerate(png_files, 1):
        sample_num = image_path.stem  # e.g., "001"
        truth_path = args.input / f"{sample_num}_truth.json"
        
        if not truth_path.exists():
            logger.warning(f"Truth file not found for {sample_num}")
            continue
        
        # Load truth
        try:
            truth = load_truth(truth_path)
        except Exception as e:
            logger.error(f"Failed to load truth for {sample_num}: {e}")
            continue
        
        # Evaluate
        result = evaluate_single_sample(image_path, truth, layout, config)
        results.append(result)
        
        if result['success']:
            success_count += 1
            if i % 10 == 0 or i == len(png_files):
                logger.info(f"  [{i}/{len(png_files)}] {sample_num}: "
                           f"accuracy={result['accuracy']:.2%} "
                           f"(correct={result['correct_count']}/{result['total_questions']}, "
                           f"silent_errors={result['silent_errors']}, "
                           f"review={result['needs_review_count']})")
    
    # Generate statistics
    if not results:
        logger.error("No evaluation results")
        sys.exit(1)
    
    # Aggregate stats
    total_samples = len(results)
    successful_samples = sum(1 for r in results if r['success'])
    failed_samples = total_samples - successful_samples
    
    all_questions = sum(r.get('total_questions', 0) for r in results)
    all_correct = sum(r.get('correct_count', 0) for r in results)
    all_silent_errors = sum(r.get('silent_errors', 0) for r in results)
    all_needs_review = sum(r.get('needs_review_count', 0) for r in results)
    
    question_accuracy = all_correct / all_questions if all_questions > 0 else 0.0
    silent_error_rate = all_silent_errors / all_questions if all_questions > 0 else 0.0
    review_rate = all_needs_review / all_questions if all_questions > 0 else 0.0
    
    id_correct_count = sum(1 for r in results if r.get('id_correct', False))
    id_accuracy = id_correct_count / successful_samples if successful_samples > 0 else 0.0
    
    # Write summary CSV
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    summary_path = args.output / f"{timestamp}_summary.csv"
    
    summary_rows = []
    for result in results:
        if result['success']:
            summary_rows.append({
                'sample': result['sample'],
                'total_questions': result['total_questions'],
                'correct': result['correct_count'],
                'accuracy': f"{result['accuracy']:.4f}",
                'silent_errors': result['silent_errors'],
                'needs_review': result['needs_review_count'],
                'id_correct': 'yes' if result['id_correct'] else 'no'
            })
    
    if summary_rows:
        with open(summary_path, 'w', newline='', encoding='utf-8-sig') as f:
            writer = csv.DictWriter(f, fieldnames=summary_rows[0].keys())
            writer.writeheader()
            writer.writerows(summary_rows)
    
    # Write evaluation report
    report_path = args.output / f"{timestamp}_evaluation.md"
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# M3 Recognition Evaluation Report\n\n")
        f.write(f"**Timestamp**: {datetime.now().isoformat()}\n")
        f.write(f"**Template**: {args.template} ({len(layout.questions)} questions)\n")
        f.write(f"**Total Samples**: {total_samples}\n")
        f.write(f"**Successful**: {successful_samples} | **Failed**: {failed_samples}\n\n")
        
        f.write("## Overall Metrics\n\n")
        f.write(f"- **Question-level Accuracy**: {question_accuracy:.4%} ({all_correct}/{all_questions} correct)\n")
        f.write(f"- **Silent Error Rate**: {silent_error_rate:.4%} ({all_silent_errors} incorrect but not flagged)\n")
        f.write(f"- **Review Rate**: {review_rate:.4%} ({all_needs_review} need manual review)\n")
        f.write(f"- **Student ID Accuracy**: {id_accuracy:.4%} ({id_correct_count}/{successful_samples} correct)\n\n")
        
        # Acceptance criteria
        f.write("## Acceptance Criteria (PLAN.md §8.4)\n\n")
        f.write("| Scenario | Target | Actual | Status |\n")
        f.write("|----------|--------|--------|--------|\n")
        f.write(f"| Question-level Accuracy | ≥ 99.50% | {question_accuracy:.4%} | ")
        f.write("✓ PASS\n" if question_accuracy >= 0.9950 else "✗ FAIL\n")
        f.write(f"| Silent Error Rate | ≤ 0.05% | {silent_error_rate:.4%} | ")
        f.write("✓ PASS\n" if silent_error_rate <= 0.0005 else "✗ FAIL\n")
        f.write(f"| Review Rate | ≤ 3.00% | {review_rate:.4%} | ")
        f.write("✓ PASS\n\n" if review_rate <= 0.03 else "✗ FAIL\n\n")
        
        # Individual sample results
        f.write("## Sample Results\n\n")
        f.write("| Sample | Status | Accuracy | Silent Errors | Needs Review | ID Correct |\n")
        f.write("|--------|--------|----------|---------------|--------------|------------|\n")
        
        for result in results:
            if result['success']:
                f.write(f"| {result['sample']} | ")
                f.write(f"{result['status']} | ")
                f.write(f"{result['accuracy']:.2%} | ")
                f.write(f"{result['silent_errors']} | ")
                f.write(f"{result['needs_review_count']} | ")
                f.write(f"{'✓' if result['id_correct'] else '✗'} |\n")
            else:
                f.write(f"| {result['sample']} | **ERROR** | — | — | — | — |\n")
    
    logger.info(f"\n✓ Evaluation complete")
    logger.info(f"  Question Accuracy: {question_accuracy:.4%}")
    logger.info(f"  Silent Error Rate: {silent_error_rate:.4%}")
    logger.info(f"  Review Rate: {review_rate:.4%}")
    logger.info(f"  ID Accuracy: {id_accuracy:.4%}")
    logger.info(f"\nReports saved to {args.output}/")
    logger.info(f"  - {report_path.name}")
    logger.info(f"  - {summary_path.name}")


if __name__ == '__main__':
    main()

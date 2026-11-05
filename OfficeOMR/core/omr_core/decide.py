"""Score to answer-state decision logic."""

import logging
from dataclasses import dataclass
from .schema import Answer, StudentIdDigit

logger = logging.getLogger(__name__)


def decide_question_status(scores: dict[str, float],
                          t_blank: float = 0.15,
                          t_mark: float = 0.40,
                          t_other: float = 0.25) -> tuple[str, list[str]]:
    """
    Determine question status based on bubble fill scores.
    
    Decision rules (PLAN.md § 6):
    - blank: all scores < t_blank
    - single: exactly one ≥ t_mark AND rest < t_other
    - multi: two or more ≥ t_mark
    - ambiguous: doesn't fit above (e.g., erasure marks, half-fill, marks between bubbles)
    
    Args:
        scores: Mapping of option letter -> fill score (0.0 to 1.0)
        t_blank: Threshold for blank (default 0.15)
        t_mark: Threshold for marked (default 0.40)
        t_other: Threshold for "other marks" (default 0.25)
        
    Returns:
        (status, choices): Status code and list of selected choice letters
    """
    # Count marks by score category
    blanks = [opt for opt, score in scores.items() if score < t_blank]
    marked = [opt for opt, score in scores.items() if score >= t_mark]
    other = [opt for opt, score in scores.items() if t_blank <= score < t_mark]
    
    # Decision tree
    if len(blanks) == len(scores):
        # All blank
        return "blank", []
    
    if len(marked) == 1 and all(scores[opt] < t_other for opt in scores if opt != marked[0]):
        # Exactly one mark, others below t_other
        return "single", [marked[0]]
    
    if len(marked) >= 2:
        # Multiple marks
        return "multi", sorted(marked)
    
    # Ambiguous case: marks below t_mark but above t_blank, or other edge cases
    return "ambiguous", sorted(marked) if marked else []


def decide_student_id_digits(id_scores: list[dict[str, float]],
                             t_blank: float = 0.15,
                             t_mark: float = 0.40) -> tuple[str, list]:
    """
    Determine student ID by finding highest-scoring digit in each column.
    
    For each digit column, find the digit (0-9) with the highest score:
    - If max score ≥ t_mark: that digit is recognized
    - If max score < t_mark: digit is '?'
    - If scores are very ambiguous (multiple nearly equal high scores): '?'
    
    Args:
        id_scores: List of dicts, one per digit column, mapping "0"-"9" to scores
        t_blank: Threshold for blank (unused here, for consistency)
        t_mark: Threshold for mark (default 0.40)
        
    Returns:
        (recognized_id, digits_list): Full ID string (or None if contains '?'), list of StudentIdDigit
    """
    digits_list = []
    id_parts = []
    
    for col_idx, col_scores in enumerate(id_scores):
        if not col_scores:
            digits_list.append(StudentIdDigit(col=col_idx, digit='?', status='blank'))
            id_parts.append('?')
            continue
        
        # Find max score
        max_digit = max(col_scores.items(), key=lambda x: x[1])
        max_score = max_digit[1]
        max_digit_char = max_digit[0]
        
        # Check if confident enough
        if max_score < t_mark:
            digits_list.append(StudentIdDigit(col=col_idx, digit='?', status='blank'))
            id_parts.append('?')
        else:
            # Check for ambiguity: if 2nd best score is close to max
            scores_sorted = sorted(col_scores.values(), reverse=True)
            if len(scores_sorted) > 1 and scores_sorted[1] > (max_score - 0.15):
                # Ambiguous
                digits_list.append(StudentIdDigit(col=col_idx, digit=max_digit_char, status='ambiguous'))
            else:
                digits_list.append(StudentIdDigit(col=col_idx, digit=max_digit_char, status='single'))
            id_parts.append(max_digit_char)
    
    # Full ID: join parts, but if any is '?', set full ID to None
    full_id = ''.join(id_parts) if '?' not in id_parts else None
    
    return full_id, digits_list


def build_answer_object(q_idx: int,
                       status: str,
                       choices: list[str],
                       scores: dict[str, float]) -> Answer:
    """Create an Answer pydantic model."""
    return Answer(
        q=q_idx,
        choices=choices,
        status=status,
        scores=scores
    )

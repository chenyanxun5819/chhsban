"""Result schema models (pydantic v2)."""

from typing import Optional
from pydantic import BaseModel, Field


# ============================================================================
# Result JSON Schema (matches PLAN.md § 7)
# ============================================================================

class SheetQuality(BaseModel):
    """Sheet image quality metrics."""
    fiducial_rms_px: float = Field(..., description="RMS error of fiducial reprojection (pixels)")
    skew_deg: float = Field(..., description="Detected skew angle (degrees)")
    rotated_180: bool = Field(..., description="Whether image was rotated 180°")
    paper_level: int = Field(..., description="Paper white level (0–255)")
    ink_level: int = Field(..., description="Ink black level (0–255)")


class StudentIdDigit(BaseModel):
    """Single digit of student ID."""
    col: int = Field(..., description="Column index (0-indexed)")
    digit: str = Field(..., description="Recognized digit (0–9 or '?')")
    status: str = Field(..., description="Recognition status: single|multi|ambiguous|blank")


class StudentId(BaseModel):
    """Student ID recognition result."""
    value: Optional[str] = Field(default=None, description="Full ID string (or None if any digit is '?')")
    digits: list[StudentIdDigit] = Field(default_factory=list, description="Per-digit breakdown")


class Answer(BaseModel):
    """Answer to a single question."""
    q: int = Field(..., description="Question number (1-indexed)")
    choices: list[str] = Field(default_factory=list, description="Selected choices (A–E) or empty")
    status: str = Field(..., description="Recognition status: single|blank|multi|ambiguous")
    scores: dict[str, float] = Field(..., description="Fill scores for all options")


class RecognitionError(BaseModel):
    """Error information if recognition failed."""
    code: str = Field(..., description="Error code (e.g., FIDUCIAL_NOT_FOUND)")
    message: str = Field(..., description="Human-readable error message")


class AnswerSummary(BaseModel):
    """Summary of answer counts by status."""
    single: int = Field(default=0, description="Count of single-choice answers")
    blank: int = Field(default=0, description="Count of blank answers")
    multi: int = Field(default=0, description="Count of multi-choice answers")
    ambiguous: int = Field(default=0, description="Count of ambiguous answers")


class RecognitionResult(BaseModel):
    """Complete recognition result (PLAN.md § 7)."""
    schema_version: str = "1.0"
    template_id: str = Field(..., description="e.g., 'T100-A4-v1'")
    batch_id: Optional[str] = Field(default=None, description="Batch identifier for future use")
    source_page_index: int = Field(default=0, description="Page index in source PDF (0-indexed)")
    status: str = Field(..., description="ok|needs_review|failed")
    error: Optional[RecognitionError] = Field(default=None, description="Error details if status != 'ok'")
    sheet_quality: Optional[SheetQuality] = Field(default=None, description="Quality metrics")
    student_id: Optional[StudentId] = Field(default=None, description="Student ID recognition")
    answers: list[Answer] = Field(default_factory=list, description="Per-question answers")
    summary: AnswerSummary = Field(default_factory=AnswerSummary, description="Summary counts")
    timing_ms: int = Field(default=0, description="Recognition time in milliseconds")

    def needs_review(self) -> bool:
        """Check if result needs manual review."""
        # Needs review if:
        # - Any answer is ambiguous or multi-choice
        # - Student ID has unknown digits
        # - Quality metrics indicate problems
        if self.status == "needs_review":
            return True
        if self.summary.ambiguous > 0 or self.summary.multi > 0:
            return True
        if self.student_id and "?" in (self.student_id.value or ""):
            return True
        return False

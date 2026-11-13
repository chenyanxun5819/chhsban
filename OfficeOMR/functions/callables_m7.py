"""
M7 Cloud Functions - Teacher exam workflow (answer key + student grading)
REWRITTEN VERSION: Using firebase_functions.https_fn callable format

This module implements the M7 milestone:
1. Exam creation and answer key management
2. Sheet recognition and auto-grading  
3. Result export and cleanup

Core callable functions:
- uploadAnswerKeyByImage: Scan standard answer card
- uploadAnswerKeyManually: Manual answer input
- getAnswerKey: Retrieve stored answer key
- recognizeAndGradeSheet: Recognize student sheet and compare with answer key
- batchRecognizeSheets: Batch recognition
- cleanupJobStudentData: 24-hour automatic cleanup (HTTP triggered by Cloud Scheduler)
"""

import firebase_functions
from firebase_functions import https_fn, options
import firebase_admin
from firebase_admin import firestore, storage
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
import base64
import io
import os
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Firebase Admin SDK
try:
    if not firebase_admin._apps:
        firebase_admin.initialize_app()
except Exception as e:
    logger.warning(f"Firebase initialization: {e}")


def get_db():
    """Get Firestore client."""
    return firestore.client()


def get_storage():
    """Get Cloud Storage bucket."""
    return storage.bucket()


# ========== CONSTANTS & ENUMS ==========

STUDENT_DATA_RETENTION_HOURS = 24
MAX_ANSWER_KEY_SIZE = 1000

ANSWER_CHOICES = ["A", "B", "C", "D", "E"]


class AnswerKeySource(str, Enum):
    """Source of answer key."""
    SCANNED = "scanned"
    MANUAL = "manual"


class GradingStatus(str, Enum):
    """Answer status after grading."""
    CORRECT = "correct"
    WRONG = "wrong"
    UNANSWERED = "unanswered"


# ========== AUTHENTICATION & AUTHORIZATION ==========

def require_auth(req: https_fn.CallableRequest) -> tuple[str, str, Optional[str]]:
    """
    Verify that the request is authenticated and user has proper role.
    
    Returns:
        (uid, role, org_id) tuple
    
    Raises:
        https_fn.HttpsError if auth fails
    """
    if req.auth is None:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            "Must be signed in to call this function"
        )
    
    uid = req.auth.uid
    role = req.auth.token.get("role", "").lower()
    org_id = req.auth.token.get("orgId")
    
    # Check if user has allowed role
    if role not in ("teacher", "super_admin"):
        logger.warning(f"Unauthorized role access attempt: {uid} with role {role}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.PERMISSION_DENIED,
            f"Role '{role}' is not authorized for this operation"
        )
    
    # For teachers, check if account is active
    if role == "teacher":
        db = get_db()
        email = req.auth.token.get("email", "").lower()
        
        try:
            user_doc = db.collection("allowedUsers").document(email).get()
            if not user_doc.exists:
                logger.warning(f"User document not found: {email}")
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    "User account not found in system"
                )
            
            user_data = user_doc.to_dict()
            if not user_data.get("active", False):
                logger.warning(f"Inactive user access attempt: {email}")
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    "User account is inactive"
                )
        except Exception as e:
            if isinstance(e, https_fn.HttpsError):
                raise
            logger.error(f"Error checking user status: {e}")
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INTERNAL,
                "Error checking user authorization status"
            )
    
    return uid, role, org_id


def verify_job_ownership(db, job_id: str, uid: str, role: str) -> Dict[str, Any]:
    """
    Verify that user owns the job (or is super_admin).
    
    Returns:
        Job document data
    
    Raises:
        https_fn.HttpsError if job doesn't exist or user doesn't have permission
    """
    try:
        job_doc = db.collection("jobs").document(job_id).get()
        
        if not job_doc.exists:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.NOT_FOUND,
                f"Job '{job_id}' not found"
            )
        
        job_data = job_doc.to_dict()
        job_owner_uid = job_data.get("createdBy") or job_data.get("uid")
        
        # Only owner or super_admin can access
        if role != "super_admin" and job_owner_uid != uid:
            logger.warning(f"Unauthorized job access: {uid} trying to access job created by {job_owner_uid}")
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                "You do not have permission to access this job"
            )
        
        return job_data
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error verifying job ownership: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            "Error verifying job access"
        )


# ========== HELPER FUNCTIONS ==========

def compare_answers(student_answers: List[str], standard_answers: List[str]) -> Dict[str, Any]:
    """
    Compare student answers with standard answers and calculate score.
    
    Args:
        student_answers: Recognized student answers from OMR
        standard_answers: Standard answer key
    
    Returns:
        Dict with correctness list and counts
    """
    if len(student_answers) != len(standard_answers):
        raise ValueError("Answer lists must have same length")
    
    correctness = []
    correct_count = 0
    wrong_count = 0
    unanswered_count = 0
    
    for i, (student_ans, standard_ans) in enumerate(
        zip(student_answers, standard_answers)
    ):
        if student_ans == "blank" or not student_ans:
            correctness.append(GradingStatus.UNANSWERED.value)
            unanswered_count += 1
        elif student_ans.upper() == standard_ans.upper():
            correctness.append(GradingStatus.CORRECT.value)
            correct_count += 1
        else:
            correctness.append(GradingStatus.WRONG.value)
            wrong_count += 1
    
    # Calculate score (100 questions = 4.0 score)
    total_questions = len(standard_answers)
    score = (correct_count / total_questions) * 4.0 if total_questions > 0 else 0.0
    
    return {
        "correctness": correctness,
        "correct_count": correct_count,
        "wrong_count": wrong_count,
        "unanswered_count": unanswered_count,
        "score": round(score, 2)
    }


# ========== OMR RECOGNITION (omr_core integration) ==========

# Friendly template name -> layout template id
TEMPLATE_ALIASES = {
    "T100": "T100-A4-v1",
    "T100-A4": "T100-A4-v1",
    "T100-A4-v1": "T100-A4-v1",
    "T060": "T060-A4-v1",
    "T060-A4": "T060-A4-v1",
    "T060-A4-v1": "T060-A4-v1",
}

# Default question count per template (used when a job is created)
TEMPLATE_QUESTION_COUNT = {
    "T100-A4-v1": 100,
    "T060-A4-v1": 60,
}

# Module-scope caches reused across warm invocations
_LAYOUT_CACHE: Dict[str, Any] = {}
_OMR_CONFIG: Optional[dict] = None


def _functions_dir() -> str:
    """Directory that contains this module (the deployed functions/ folder)."""
    return os.path.dirname(os.path.abspath(__file__))


def _ensure_import_path() -> None:
    """Make sure functions/ is importable (provides omr_core and sheetgen)."""
    func_dir = _functions_dir()
    if func_dir not in sys.path:
        sys.path.insert(0, func_dir)


def resolve_template_id(template: Optional[str]) -> str:
    """Map a friendly template name (T100-A4) to a layout id (T100-A4-v1)."""
    if not template:
        return "T100-A4-v1"
    key = str(template).strip()
    return TEMPLATE_ALIASES.get(key, key)


def load_layout(template: Optional[str]):
    """Load (and cache) the LayoutConfig for a template id."""
    template_id = resolve_template_id(template)
    if template_id in _LAYOUT_CACHE:
        return _LAYOUT_CACHE[template_id]

    _ensure_import_path()
    from sheetgen.layout import LayoutConfig

    layout_file = os.path.join(_functions_dir(), "layouts", f"{template_id}.layout.json")
    if not os.path.exists(layout_file):
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            f"Unknown template '{template}'. No layout file at {layout_file}"
        )

    with open(layout_file, "r", encoding="utf-8") as fh:
        layout = LayoutConfig.from_dict(json.load(fh))

    _LAYOUT_CACHE[template_id] = layout
    return layout


def get_omr_config() -> dict:
    """Load (and cache) the omr_core configuration."""
    global _OMR_CONFIG
    if _OMR_CONFIG is None:
        _ensure_import_path()
        from omr_core.pipeline import load_config
        _OMR_CONFIG = load_config()
    return _OMR_CONFIG


def decode_base64_image(image_data: str) -> bytes:
    """Decode base64 (optionally a data: URL) into raw image/PDF bytes."""
    if not image_data or not isinstance(image_data, str):
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            "imageData is required and must be a base64 string"
        )
    payload = image_data.strip()
    if payload.startswith("data:") and "," in payload:
        payload = payload.split(",", 1)[1]
    try:
        return base64.b64decode(payload)
    except Exception as e:
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            f"imageData is not valid base64: {e}"
        )


def recognize_sheet_image(image_bytes: bytes, template: Optional[str]) -> Dict[str, Any]:
    """Run the omr_core pipeline on raw image bytes.

    Returns answers (one entry per question; 'blank' for empty/multi/ambiguous),
    per-question confidence, the recognised student id and the pipeline status.
    """
    _ensure_import_path()
    from omr_core.pipeline import recognize

    layout = load_layout(template)
    config = get_omr_config()

    result = recognize(image_bytes, layout, config)

    answers: List[str] = []
    confidences: List[float] = []
    for ans in result.answers:
        if ans.status == "single" and ans.choices:
            choice = ans.choices[0]
            answers.append(choice)
            confidences.append(round(float(ans.scores.get(choice, 0.0)), 4))
        else:
            # blank / multi / ambiguous are treated as unanswered
            answers.append("blank")
            confidences.append(0.0)

    student_id = None
    if result.student_id and result.student_id.value:
        student_id = result.student_id.value

    return {
        "answers": answers,
        "confidences": confidences,
        "status": result.status,
        "error": result.error.model_dump() if result.error else None,
        "studentId": student_id,
        "summary": result.summary.model_dump(),
        "timingMs": result.timing_ms,
    }


# ========== M7 CALLABLE FUNCTIONS ==========

@https_fn.on_call(region="us-central1")
def createExam(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """Create a new exam (job) owned by the calling teacher.

    Request data:
    {
        'examName': '2026 November Monthly Test',
        'subject': 'Math',            # optional
        'template': 'T100-A4',        # friendly name or layout id
        'questionCount': 100          # optional, defaults per template
    }
    """
    try:
        uid, role, org_id = require_auth(req)
        params = req.data or {}

        exam_name = (params.get("examName") or "").strip()
        if not exam_name:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required field: examName"
            )

        template_id = resolve_template_id(params.get("template"))
        question_count = params.get("questionCount")
        if not isinstance(question_count, int) or question_count <= 0:
            question_count = TEMPLATE_QUESTION_COUNT.get(template_id, 100)

        now = datetime.utcnow()
        expires_at = now + timedelta(hours=STUDENT_DATA_RETENTION_HOURS)

        job_ref = get_db().collection("jobs").document()
        job_ref.set({
            "uid": uid,
            "createdBy": uid,
            "orgId": org_id,
            "examName": exam_name,
            "subject": params.get("subject"),
            "templateId": template_id,
            "template": template_id,
            "questionCount": question_count,
            "status": "created",
            "createdAt": now,
            "expiresAt": expires_at,
        })

        logger.info(f"Created exam job {job_ref.id} for {uid} ({template_id})")

        return {
            "success": True,
            "data": {
                "jobId": job_ref.id,
                "examName": exam_name,
                "template": template_id,
                "questionCount": question_count,
                "orgId": org_id,
            }
        }

    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in createExam: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def uploadAnswerKeyByImage(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Upload answer key by scanning standard answer card.
    
    Flow:
    1. Teacher prints blank answer sheet template
    2. Teacher fills in correct answers manually
    3. Teacher scans the filled sheet (PDF/JPG/PNG)
    4. System calls omr_core.recognize_sheet() to extract answers
    5. Answers stored in jobs/{jobId}.answerKey and frozen
    
    Request data:
    {
        'jobId': 'job_ABC123',
        'imageData': 'base64-encoded image',
        'template': 'T100-A4' | 'T060-A4' | 'T040-A4'
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'answerKey': ['A','C','B',...],
            'source': 'scanned',
            'uploadedAt': ISO timestamp,
            'count': 100,
            'frozen': False
        }
    }
    """
    try:
        # Verify authentication
        uid, role, org_id = require_auth(req)
        
        # Get request data
        job_id = req.data.get("jobId")
        image_data = req.data.get("imageData") or req.data.get("imageBytes")
        template = req.data.get("template", "T100-A4")
        
        if not job_id or not image_data:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required fields: jobId, imageData"
            )
        
        db = get_db()
        
        # Verify job ownership
        job_data = verify_job_ownership(db, job_id, uid, role)
        
        # Check if answer key already exists
        if "answerKey" in job_data and job_data["answerKey"].get("frozen"):
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                "Answer key for this job is already frozen and cannot be modified"
            )
        
        # Run the OMR pipeline on the scanned answer card
        image_bytes = decode_base64_image(image_data)
        recognized = recognize_sheet_image(image_bytes, template)

        if recognized["status"] == "failed":
            detail = recognized.get("error") or {}
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                f"Recognition failed: {detail.get('code', 'UNKNOWN')} - "
                f"{detail.get('message', '')}"
            )
        
        recognized_answers = recognized["answers"]
        confidence_scores = recognized["confidences"]
        
        if not recognized_answers:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Failed to recognize answers from image. Please try another image or use manual input."
            )
        
        # Store answer key in Firestore
        now = datetime.utcnow()
        answer_key = {
            "answers": recognized_answers,
            "confidence": confidence_scores,
            "source": AnswerKeySource.SCANNED.value,
            "template": template,
            "uploadedAt": now,
            "frozen": False
        }
        
        db.collection("jobs").document(job_id).update({
            "answerKey": answer_key,
            "lastModified": now
        })
        
        logger.info(f"Answer key uploaded for job {job_id} by {uid} (scanned)")
        
        return {
            "success": True,
            "data": {
                "answerKey": recognized_answers,
                "source": "scanned",
                "uploadedAt": now.isoformat() + "Z",
                "count": len(recognized_answers),
                "frozen": False
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in uploadAnswerKeyByImage: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def uploadAnswerKeyManually(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Upload answer key by manual input.
    
    Request data:
    {
        'jobId': 'job_ABC123',
        'examName': 'Math Exam November 2026',
        'template': 'T100-A4',
        'answers': ['A', 'B', 'C', 'A', ...]  # Array of answer choices
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'answerKey': ['A','B','C',...],
            'source': 'manual',
            'uploadedAt': ISO timestamp,
            'count': 100,
            'frozen': False
        }
    }
    """
    try:
        # Verify authentication
        uid, role, org_id = require_auth(req)
        
        # Get request data
        job_id = req.data.get("jobId")
        exam_name = req.data.get("examName", "Untitled")
        template = req.data.get("template", "T100-A4")
        answers = req.data.get("answers", [])
        
        if not job_id or not answers:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required fields: jobId, answers"
            )
        
        # Validate answer format
        if not isinstance(answers, list) or len(answers) == 0:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Answers must be a non-empty array"
            )
        
        if len(answers) > MAX_ANSWER_KEY_SIZE:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                f"Too many answers (max {MAX_ANSWER_KEY_SIZE})"
            )
        
        # Validate each answer
        for i, ans in enumerate(answers):
            if not isinstance(ans, str) or not ans.strip():
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                    f"Answer {i} is invalid or empty"
                )
        
        # Normalize answers (uppercase, trim)
        normalized_answers = [ans.strip().upper() for ans in answers]
        
        db = get_db()
        
        # Verify job ownership
        job_data = verify_job_ownership(db, job_id, uid, role)
        
        # Check if answer key already exists
        if "answerKey" in job_data and job_data["answerKey"].get("frozen"):
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                "Answer key for this job is already frozen and cannot be modified"
            )
        
        # Store answer key in Firestore
        now = datetime.utcnow()
        answer_key = {
            "answers": normalized_answers,
            "source": AnswerKeySource.MANUAL.value,
            "examName": exam_name,
            "template": template,
            "uploadedAt": now,
            "frozen": False,
            "uploadedBy": uid
        }
        
        db.collection("jobs").document(job_id).update({
            "answerKey": answer_key,
            "examName": exam_name,
            "lastModified": now
        })
        
        logger.info(f"Answer key uploaded for job {job_id} by {uid} (manual)")
        
        return {
            "success": True,
            "data": {
                "answerKey": normalized_answers,
                "source": "manual",
                "uploadedAt": now.isoformat() + "Z",
                "count": len(normalized_answers),
                "frozen": False
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in uploadAnswerKeyManually: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def getAnswerKey(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Retrieve the answer key for a job.
    
    Request data:
    {
        'jobId': 'job_ABC123'
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'answers': ['A', 'B', 'C', ...],
            'source': 'manual' | 'scanned',
            'uploadedAt': ISO timestamp,
            'frozen': Boolean,
            'template': 'T100-A4'
        }
    }
    """
    try:
        # Verify authentication
        uid, role, org_id = require_auth(req)
        
        job_id = req.data.get("jobId")
        if not job_id:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required field: jobId"
            )
        
        db = get_db()
        
        # Verify job ownership
        job_data = verify_job_ownership(db, job_id, uid, role)
        
        answer_key = job_data.get("answerKey")
        if not answer_key:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.NOT_FOUND,
                "No answer key found for this job"
            )
        
        return {
            "success": True,
            "data": {
                "answers": answer_key.get("answers", []),
                "source": answer_key.get("source"),
                "uploadedAt": answer_key.get("uploadedAt", "").isoformat() if hasattr(answer_key.get("uploadedAt"), "isoformat") else str(answer_key.get("uploadedAt")),
                "frozen": answer_key.get("frozen", False),
                "template": answer_key.get("template"),
                "examName": answer_key.get("examName")
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in getAnswerKey: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def recognizeAndGradeSheet(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Recognize a student answer sheet and grade it against the answer key.
    
    Request data:
    {
        'jobId': 'job_ABC123',
        'sheetImage': 'base64-encoded image',
        'template': 'T100-A4',
        'studentId': 'student_123'  # optional, from OMR
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'studentId': 'student_123',
            'correctCount': 87,
            'wrongCount': 10,
            'blankCount': 3,
            'score': 3.48,
            'correctness': ['correct', 'wrong', ...],
            'uploadedAt': ISO timestamp,
            'expiresAt': ISO timestamp (24 hours later)
        }
    }
    """
    try:
        # Verify authentication
        uid, role, org_id = require_auth(req)
        
        job_id = req.data.get("jobId")
        sheet_image = req.data.get("sheetImage") or req.data.get("imageData")
        template = req.data.get("template", "T100-A4")
        student_id = req.data.get("studentId", "unknown")
        
        if not job_id or not sheet_image:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required fields: jobId, sheetImage"
            )
        
        db = get_db()
        
        # Verify job ownership
        job_data = verify_job_ownership(db, job_id, uid, role)
        
        # Get answer key
        answer_key = job_data.get("answerKey")
        if not answer_key:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                "Answer key not found. Please upload answer key first."
            )
        
        standard_answers = answer_key.get("answers", [])
        
        # Run the OMR pipeline on the scanned student sheet
        image_bytes = decode_base64_image(sheet_image)
        recognized = recognize_sheet_image(image_bytes, template)

        if recognized["status"] == "failed":
            detail = recognized.get("error") or {}
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                f"Recognition failed: {detail.get('code', 'UNKNOWN')} - "
                f"{detail.get('message', '')}"
            )

        student_answers = recognized["answers"]

        # Prefer the student id recognised from the sheet itself
        if recognized.get("studentId"):
            student_id = recognized["studentId"]

        # Answer key and sheet must contain the same number of questions
        if len(student_answers) != len(standard_answers):
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.FAILED_PRECONDITION,
                f"Question count mismatch: answer key has {len(standard_answers)} "
                f"but the sheet has {len(student_answers)}"
            )
        
        if not student_answers:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Failed to recognize answers from student sheet"
            )
        
        # Compare answers
        grading_result = compare_answers(student_answers, standard_answers)
        
        # Freeze answer key after first submission
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=STUDENT_DATA_RETENTION_HOURS)
        
        # Store result in Firestore
        result_data = {
            "studentId": student_id,
            "correctCount": grading_result["correct_count"],
            "wrongCount": grading_result["wrong_count"],
            "blankCount": grading_result["unanswered_count"],
            "score": grading_result["score"],
            "correctness": grading_result["correctness"],
            "uploadedAt": now,
            "expiresAt": expires_at,
            "recognizedAt": now
        }
        
        # Add to results array
        db.collection("jobs").document(job_id).update({
            "result": {
                "sheets": firestore.ArrayUnion([result_data])
            },
            "answerKey.frozen": True,  # Freeze answer key
            "lastModified": now
        })
        
        logger.info(f"Sheet recognized and graded for job {job_id}: score={grading_result['score']}")
        
        return {
            "success": True,
            "data": result_data
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in recognizeAndGradeSheet: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def batchRecognizeSheets(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Batch recognize multiple student sheets.
    
    Request data:
    {
        'jobId': 'job_ABC123',
        'sheetImages': ['base64_1', 'base64_2', ...],
        'template': 'T100-A4'
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'total': 10,
            'processed': 10,
            'failed': 0,
            'results': [...]
        }
    }
    """
    try:
        # Verify authentication
        uid, role, org_id = require_auth(req)
        
        job_id = req.data.get("jobId")
        sheet_images = (req.data.get("sheetImages")
                        or req.data.get("imageDataList")
                        or req.data.get("imageBytesList")
                        or [])
        template = req.data.get("template", "T100-A4")
        
        if not job_id or not sheet_images:
            raise https_fn.HttpsError(
                https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
                "Missing required fields: jobId, sheetImages"
            )
        
        db = get_db()
        
        # Verify job ownership
        verify_job_ownership(db, job_id, uid, role)
        
        logger.info(f"Batch recognition started for job {job_id}: {len(sheet_images)} sheets")
        
        # TODO: Implement batch recognition
        # For now, return placeholder
        
        return {
            "success": True,
            "data": {
                "total": len(sheet_images),
                "processed": 0,
                "failed": len(sheet_images),
                "results": []
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in batchRecognizeSheets: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )


@https_fn.on_call(region="us-central1")
def cleanupJobStudentData(req: https_fn.CallableRequest) -> Dict[str, Any]:
    """
    Clean up old student data (results) that have expired.
    
    Called by Cloud Scheduler every hour.
    
    Request data:
    {
        'dryRun': Boolean (optional, default False)
    }
    
    Returns:
    {
        'success': True,
        'data': {
            'jobsCleaned': 5,
            'sheetsDeleted': 23,
            'timestamp': ISO timestamp
        }
    }
    """
    try:
        # This can be called by Cloud Scheduler (service account)
        # or manually by super_admin
        if req.auth:
            uid, role, org_id = require_auth(req)
            if role != "super_admin":
                raise https_fn.HttpsError(
                    https_fn.FunctionsErrorCode.PERMISSION_DENIED,
                    "Only super_admin can trigger cleanup manually"
                )
        
        dry_run = req.data.get("dryRun", False)
        
        db = get_db()
        now = datetime.utcnow()
        
        jobs_cleaned = 0
        sheets_deleted = 0
        
        # Query all jobs with expired results
        query = db.collection("jobs").where("result.sheets", "!=", None)
        docs = query.stream()
        
        for doc in docs:
            job_data = doc.to_dict()
            sheets = job_data.get("result", {}).get("sheets", [])
            
            if not sheets:
                continue
            
            # Filter out expired sheets
            expired_sheets = [
                s for s in sheets
                if "expiresAt" in s and s["expiresAt"] < now
            ]
            
            if expired_sheets:
                sheets_deleted += len(expired_sheets)
                
                if not dry_run:
                    # Keep only non-expired sheets
                    remaining_sheets = [
                        s for s in sheets
                        if "expiresAt" not in s or s["expiresAt"] >= now
                    ]
                    
                    if remaining_sheets:
                        db.collection("jobs").document(doc.id).update({
                            "result.sheets": remaining_sheets,
                            "lastCleanup": now
                        })
                    else:
                        db.collection("jobs").document(doc.id).update({
                            "result": {},
                            "lastCleanup": now
                        })
                    
                    # Verify answer key still exists (safety check)
                    updated_doc = db.collection("jobs").document(doc.id).get()
                    if updated_doc.exists:
                        updated_data = updated_doc.to_dict()
                        if "answerKey" not in updated_data or not updated_data.get("answerKey"):
                            logger.error(f"CRITICAL: Answer key missing after cleanup for job {doc.id}")
                    
                    jobs_cleaned += 1
        
        logger.info(f"Cleanup complete: {jobs_cleaned} jobs, {sheets_deleted} sheets deleted")
        
        return {
            "success": True,
            "data": {
                "jobsCleaned": jobs_cleaned,
                "sheetsDeleted": sheets_deleted,
                "timestamp": now.isoformat() + "Z",
                "dryRun": dry_run
            }
        }
        
    except https_fn.HttpsError:
        raise
    except Exception as e:
        logger.error(f"Error in cleanupJobStudentData: {e}")
        raise https_fn.HttpsError(
            https_fn.FunctionsErrorCode.INTERNAL,
            f"Internal error: {str(e)}"
        )

"""
M7 Cloud Functions - Teacher exam workflow (answer key + student grading)

This module implements the M7 milestone:
1. Exam creation and answer key management
2. Sheet recognition and auto-grading
3. Result export and cleanup

Core functions:
- uploadAnswerKeyByImage: Scan standard answer card
- uploadAnswerKeyManually: Manual answer input
- getAnswerKey: Retrieve stored answer key
- recognizeAndGradeSheet: Recognize student sheet and compare with answer key
- batchRecognizeSheets: Batch recognition (async)
- exportResultsCSV: Export results as CSV
- cleanupJobStudentData: 24-hour automatic cleanup (Cloud Scheduler triggered)
"""

import functions_framework
import firebase_admin
from firebase_admin import firestore, storage
from typing import Optional, List, Dict, Union
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
import io
from dataclasses import dataclass, asdict

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
MAX_ANSWER_KEY_SIZE = 1000  # Maximum number of questions

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


# ========== DATA MODELS ==========

@dataclass
class AnswerKeyMetadata:
    """Metadata for stored answer key."""
    data: List[str]  # ["A", "C", "B", ...]
    source: str  # "scanned" | "manual"
    uploaded_at: datetime
    uploaded_by: str  # teacher UID
    frozen: bool = False  # Set to True after first student submission
    scan_confidence: Optional[List[float]] = None  # Confidence scores if scanned


@dataclass
class GradingResult:
    """Grading result for a student sheet."""
    student_id: str
    correctness: List[str]  # ["correct", "wrong", "unanswered", ...]
    correct_count: int
    wrong_count: int
    unanswered_count: int
    score: float  # (correct_count / total) * 4.0


# ========== HELPER FUNCTIONS ==========

def error_response(error_code: str, message: str, status_code: int = 400):
    """Build error response for callable."""
    return {
        'success': False,
        'error': error_code,
        'message': message,
        'status': status_code
    }


def success_response(data: dict = None, status_code: int = 200):
    """Build success response for callable."""
    return {
        'success': True,
        'data': data or {},
        'status': status_code
    }


def validate_answer_key(answers: List[str]) -> Union[bool, str]:
    """
    Validate answer key format.
    
    Args:
        answers: List of answers like ["A", "C", "B", ...]
    
    Returns:
        True if valid, error message string otherwise
    """
    if not isinstance(answers, list):
        return "answer_key must be a list"
    
    if len(answers) == 0:
        return "answer_key cannot be empty"
    
    if len(answers) > MAX_ANSWER_KEY_SIZE:
        return f"answer_key size exceeds {MAX_ANSWER_KEY_SIZE}"
    
    for i, answer in enumerate(answers):
        if answer not in ANSWER_CHOICES + ["blank"]:
            return f"invalid answer at index {i}: {answer} (must be A-E or 'blank')"
    
    return True


def compare_with_answer_key(
    student_answers: List[str],
    standard_answers: List[str]
) -> Dict[str, Union[List[str], int, float]]:
    """
    Compare student answers with standard answer key.
    
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
        if student_ans == "blank":
            correctness.append(GradingStatus.UNANSWERED.value)
            unanswered_count += 1
        elif student_ans == standard_ans:
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


# ========== M7 CALLABLE FUNCTIONS ==========

@functions_framework.cloud_event
def uploadAnswerKeyByImage(cloud_event):
    """
    Callable: Upload answer key by scanning standard answer card.
    
    Flow:
    1. Teacher prints blank answer sheet
    2. Teacher fills in correct answers
    3. Teacher scans the sheet (PDF/JPG/PNG)
    4. System calls omr_core.recognize_sheet() to extract answers
    5. Answers stored in jobs/{jobId}.answerKey
    
    Args:
        cloud_event.json = {
            'jobId': 'job_ABC123',
            'image': 'base64-encoded image',  # or GCS path
            'format': 'jpg' | 'png' | 'pdf'
        }
    
    Returns:
        {
            'success': True,
            'data': {
                'answerKey': ['A','C','B',...],
                'confidence': [0.95, 0.93, ...],
                'source': 'scanned',
                'uploadedAt': '2026-11-11T10:30:00Z'
            }
        }
        OR error response
    """
    try:
        request_json = cloud_event.get_json()
        
        job_id = request_json.get('jobId')
        image_data = request_json.get('image')
        
        if not job_id:
            return error_response("INVALID_JOB_ID", "jobId is required")
        if not image_data:
            return error_response("INVALID_IMAGE", "image is required")
        
        db = get_db()
        
        # Check if job exists
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return error_response("JOB_NOT_FOUND", f"Job {job_id} not found")
        
        # TODO: Call omr_core.recognize_sheet(image_data) to extract answers
        # For now, placeholder
        logger.warning("TODO: Implement OMR recognition for answer key scanning")
        
        recognized_answers = []  # This would come from OMR
        confidence_scores = []
        
        # Validate extracted answers
        validation = validate_answer_key(recognized_answers)
        if validation is not True:
            return error_response("INVALID_ANSWER_KEY", validation)
        
        # Store in Firestore
        now = datetime.utcnow()
        db.collection('jobs').document(job_id).update({
            'answerKey': {
                'data': recognized_answers,
                'source': AnswerKeySource.SCANNED.value,
                'uploadedAt': now,
                'uploadedBy': request_json.get('userId', 'unknown'),
                'frozen': False,
                'scanConfidence': confidence_scores
            },
            '_answerKeyProtected': True  # Protection flag for Firestore rules
        })
        
        logger.info(f"Answer key uploaded (scanned) for job {job_id}")
        
        return success_response({
            'answerKey': recognized_answers,
            'confidence': confidence_scores,
            'source': AnswerKeySource.SCANNED.value,
            'uploadedAt': now.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error uploading answer key (scanned): {e}")
        return error_response("INTERNAL_ERROR", str(e), 500)


@functions_framework.cloud_event
def uploadAnswerKeyManually(cloud_event):
    """
    Callable: Upload answer key manually via web form/JSON/CSV.
    
    Flow:
    1. Teacher opens web form or provides JSON/CSV
    2. Teacher inputs answers for each question
    3. System validates and stores
    
    Args:
        cloud_event.json = {
            'jobId': 'job_ABC123',
            'answerKey': ['A','C','B',...],  # Can also be CSV string or JSON string
            'format': 'list' | 'json' | 'csv'
        }
    
    Returns:
        {
            'success': True,
            'data': {
                'answerKey': ['A','C','B',...],
                'source': 'manual',
                'uploadedAt': '2026-11-11T10:45:00Z'
            }
        }
        OR error response
    """
    try:
        request_json = cloud_event.get_json()
        
        job_id = request_json.get('jobId')
        answer_input = request_json.get('answerKey')
        input_format = request_json.get('format', 'list')
        
        if not job_id:
            return error_response("INVALID_JOB_ID", "jobId is required")
        if not answer_input:
            return error_response("INVALID_ANSWER_KEY", "answerKey is required")
        
        # Parse input based on format
        if input_format == 'list':
            parsed_answers = answer_input if isinstance(answer_input, list) else []
        elif input_format == 'json':
            # Assume answer_input is JSON string like '["A","C","B",...]'
            parsed_answers = json.loads(answer_input) if isinstance(answer_input, str) else answer_input
        elif input_format == 'csv':
            # Parse CSV (simple version: comma-separated values)
            csv_str = answer_input if isinstance(answer_input, str) else str(answer_input)
            parsed_answers = [x.strip().upper() for x in csv_str.split(',')]
        else:
            return error_response("INVALID_FORMAT", f"Unsupported format: {input_format}")
        
        # Validate
        validation = validate_answer_key(parsed_answers)
        if validation is not True:
            return error_response("INVALID_ANSWER_KEY", validation)
        
        db = get_db()
        
        # Check if job exists
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return error_response("JOB_NOT_FOUND", f"Job {job_id} not found")
        
        # Store in Firestore
        now = datetime.utcnow()
        db.collection('jobs').document(job_id).update({
            'answerKey': {
                'data': parsed_answers,
                'source': AnswerKeySource.MANUAL.value,
                'uploadedAt': now,
                'uploadedBy': request_json.get('userId', 'unknown'),
                'frozen': False,
                'scanConfidence': None
            },
            '_answerKeyProtected': True
        })
        
        logger.info(f"Answer key uploaded (manual) for job {job_id}")
        
        return success_response({
            'answerKey': parsed_answers,
            'source': AnswerKeySource.MANUAL.value,
            'uploadedAt': now.isoformat()
        })
        
    except json.JSONDecodeError as e:
        return error_response("JSON_PARSE_ERROR", f"Failed to parse JSON: {e}")
    except Exception as e:
        logger.error(f"Error uploading answer key (manual): {e}")
        return error_response("INTERNAL_ERROR", str(e), 500)


@functions_framework.cloud_event
def getAnswerKey(cloud_event):
    """
    Callable: Retrieve stored answer key for a job.
    
    Args:
        request.json = {
            'jobId': 'job_ABC123'
        }
    
    Returns:
        {
            'success': True,
            'data': {
                'answerKey': ['A','C','B',...],
                'source': 'scanned' | 'manual',
                'uploadedAt': '2026-11-11T10:30:00Z',
                'frozen': False
            }
        }
        OR error response if not found
    """
    try:
        request_json = cloud_event.get_json()
        job_id = request_json.get('jobId')
        
        if not job_id:
            return error_response("INVALID_JOB_ID", "jobId is required")
        
        db = get_db()
        job_doc = db.collection('jobs').document(job_id).get()
        
        if not job_doc.exists:
            return error_response("JOB_NOT_FOUND", f"Job {job_id} not found")
        
        job_data = job_doc.to_dict()
        answer_key = job_data.get('answerKey')
        
        if not answer_key:
            return error_response("ANSWER_KEY_NOT_FOUND", f"Answer key not uploaded for {job_id}")
        
        return success_response({
            'answerKey': answer_key.get('data'),
            'source': answer_key.get('source'),
            'uploadedAt': answer_key.get('uploadedAt').isoformat() 
                if isinstance(answer_key.get('uploadedAt'), datetime) 
                else answer_key.get('uploadedAt'),
            'frozen': answer_key.get('frozen', False)
        })
        
    except Exception as e:
        logger.error(f"Error retrieving answer key: {e}")
        return error_response("INTERNAL_ERROR", str(e), 500)


@functions_framework.cloud_event
def recognizeAndGradeSheet(cloud_event):
    """
    Callable: Recognize student sheet and auto-grade against answer key.
    
    Flow:
    1. Receive student sheet image
    2. Call omr_core.recognize_sheet() to extract student ID + answers
    3. Get answerKey from Firestore
    4. Compare answers and calculate score
    5. Store result in Firestore
    6. Upload annotated PDF to Storage (optional)
    7. Freeze answer key on first submission
    
    Args:
        request.json = {
            'jobId': 'job_ABC123',
            'sheetImage': 'base64-encoded image',
            'studentId': 'S001',
            'sheetNumber': 1
        }
    
    Returns:
        {
            'success': True,
            'data': {
                'studentId': 'S001',
                'correctness': ['correct','wrong','correct',...],
                'correctCount': 87,
                'wrongCount': 10,
                'unansweredCount': 3,
                'score': 3.48,
                'uploadedAt': '2026-11-11T11:00:00Z'
            }
        }
        OR error response
    """
    try:
        request_json = cloud_event.get_json()
        
        job_id = request_json.get('jobId')
        sheet_image = request_json.get('sheetImage')
        student_id = request_json.get('studentId')
        sheet_number = request_json.get('sheetNumber', 1)
        
        if not job_id:
            return error_response("INVALID_JOB_ID", "jobId is required")
        if not sheet_image:
            return error_response("INVALID_IMAGE", "sheetImage is required")
        
        db = get_db()
        
        # Check if job exists and has answer key
        job_doc = db.collection('jobs').document(job_id).get()
        if not job_doc.exists:
            return error_response("JOB_NOT_FOUND", f"Job {job_id} not found")
        
        job_data = job_doc.to_dict()
        answer_key_data = job_data.get('answerKey')
        
        if not answer_key_data:
            return error_response("ANSWER_KEY_NOT_FOUND", f"Answer key not uploaded for {job_id}")
        
        standard_answers = answer_key_data.get('data', [])
        
        # TODO: Call omr_core.recognize_sheet(sheet_image)
        # For now, placeholder
        logger.warning("TODO: Implement OMR recognition for student sheet")
        
        recognized_student_id = student_id  # This would come from OMR
        student_answers = []  # This would come from OMR
        
        if not student_answers:
            return error_response("RECOGNITION_FAILED", "Failed to recognize student answers")
        
        # Compare with answer key
        grading_result = compare_with_answer_key(student_answers, standard_answers)
        
        # Store result in Firestore
        now = datetime.utcnow()
        expiry_time = now + timedelta(hours=STUDENT_DATA_RETENTION_HOURS)
        
        # Initialize result structure if needed
        result = job_data.get('result', {'sheets': []})
        result['sheets'].append({
            'studentId': recognized_student_id,
            'correctness': grading_result['correctness'],
            'correctCount': grading_result['correct_count'],
            'wrongCount': grading_result['wrong_count'],
            'unansweredCount': grading_result['unanswered_count'],
            'score': grading_result['score'],
            'uploadedAt': now
        })
        
        db.collection('jobs').document(job_id).update({
            'result': result,
            'expiresAt': expiry_time,
            'expirationReason': 'student_data_privacy'
        })
        
        # Freeze answer key after first submission
        if not answer_key_data.get('frozen', False):
            db.collection('jobs').document(job_id).update({
                'answerKey.frozen': True
            })
            logger.info(f"Answer key frozen for job {job_id} after first submission")
        
        logger.info(f"Sheet recognized and graded for job {job_id}, student {recognized_student_id}")
        
        return success_response({
            'studentId': recognized_student_id,
            'correctness': grading_result['correctness'],
            'correctCount': grading_result['correct_count'],
            'wrongCount': grading_result['wrong_count'],
            'unansweredCount': grading_result['unanswered_count'],
            'score': grading_result['score'],
            'uploadedAt': now.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error recognizing and grading sheet: {e}")
        return error_response("INTERNAL_ERROR", str(e), 500)


@functions_framework.http
def cleanupJobStudentData(request):
    """
    HTTP function: Delete student data older than 24 hours (Cloud Scheduler triggered).
    
    Deletion scope:
    ✅ Delete: uploads/{jobId}/* (original images)
    ✅ Delete: annotated/{jobId}/* (annotated PDFs)
    ✅ Delete: jobs/{jobId}.result.sheets[*] (student results)
    
    ❌ Keep: jobs/{jobId}.answerKey (standard answer - PERMANENT)
    ❌ Keep: papers/{orgId}/{uid}/* (question files - PERMANENT)
    ❌ Keep: jobs/{jobId}.{examName, subject, grade, etc.} (exam metadata)
    
    Returns:
        {
            'success': True,
            'cleanupCount': 5,
            'timestamp': '2026-11-12T00:00:00Z'
        }
    """
    try:
        db = get_db()
        bucket = get_storage()
        
        now = datetime.utcnow()
        
        # Find all jobs with expiresAt <= now
        expired_jobs = db.collection('jobs').where(
            'expiresAt', '<=', now
        ).where(
            'expirationReason', '==', 'student_data_privacy'
        ).stream()
        
        cleanup_count = 0
        verification_failures = []
        
        for job_doc in expired_jobs:
            job_id = job_doc.id
            job_data = job_doc.to_dict()
            
            try:
                # Delete Storage files (uploads + annotated)
                _delete_storage_files(bucket, job_id)
                
                # Clear Firestore student results
                db.collection('jobs').document(job_id).update({
                    'result': firestore.DELETE_FIELD,
                    'cleanedAt': now,
                    'status': 'data_cleaned'
                })
                
                cleanup_count += 1
                logger.info(f"✅ Cleaned job {job_id}: student data removed")
                
                # CRITICAL: Verify answerKey was NOT deleted
                doc_after = db.collection('jobs').document(job_id).get()
                if 'answerKey' not in doc_after.to_dict():
                    verification_failures.append({
                        'jobId': job_id,
                        'error': 'answerKey was deleted!'
                    })
                    logger.error(f"🔴 DANGER: answerKey was deleted for {job_id}!")
                else:
                    logger.info(f"✅ VERIFIED: answerKey still exists for {job_id}")
                    
            except Exception as e:
                logger.error(f"❌ Error cleaning job {job_id}: {e}")
        
        result = {
            'success': len(verification_failures) == 0,
            'cleanupCount': cleanup_count,
            'timestamp': now.isoformat()
        }
        
        if verification_failures:
            result['verificationFailures'] = verification_failures
            logger.error(f"🔴 Cleanup had {len(verification_failures)} verification failures!")
        
        return result, 200
        
    except Exception as e:
        logger.error(f"❌ Cleanup function failed: {e}")
        return {'success': False, 'error': str(e)}, 500


def _delete_storage_files(bucket, job_id: str):
    """Delete all student data files for a job from Cloud Storage."""
    
    # Delete uploads/{jobId}/*
    blobs_to_delete = list(bucket.list_blobs(prefix=f"uploads/{job_id}/"))
    for blob in blobs_to_delete:
        blob.delete()
        logger.debug(f"Deleted: {blob.name}")
    
    # Delete annotated/{jobId}/*
    blobs_to_delete = list(bucket.list_blobs(prefix=f"annotated/{job_id}/"))
    for blob in blobs_to_delete:
        blob.delete()
        logger.debug(f"Deleted: {blob.name}")


# ========== CLOUD SCHEDULER TRIGGER ==========
# Deploy as HTTP Cloud Function
# Schedule: 0 * * * * (every hour)
# URL: https://region-project.cloudfunctions.net/cleanupJobStudentData
# Requires service account with permissions:
#   - firestore.databases.get
#   - storage.buckets.get
#   - storage.objects.delete


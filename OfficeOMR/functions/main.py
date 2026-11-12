"""Google Cloud Functions for OfficeOMR - recognize_sheet endpoint."""

import functions_framework
import firebase_admin
from firebase_admin import storage, firestore, auth
from flask import make_response
import os
import json
import uuid
from datetime import datetime, timedelta, timezone

import cv2

# Note: omr_core is imported lazily inside functions to avoid
# issues during function discovery phase.

# Day boundaries for quota use Malaysia time (UTC+8).
MYT = timezone(timedelta(hours=8))

CORS_HEADERS = {'Access-Control-Allow-Origin': '*'}

# Initialize Firebase Admin SDK.
# Set STORAGE_BUCKET as an environment variable at deploy time, e.g.
#   --set-env-vars STORAGE_BUCKET=officeomr-fe542.firebasestorage.app
# (check the actual bucket name in the Firebase console -> Storage)
try:
    if not firebase_admin._apps:
        _bucket_name = os.environ.get('STORAGE_BUCKET')
        if _bucket_name:
            firebase_admin.initialize_app(options={'storageBucket': _bucket_name})
        else:
            firebase_admin.initialize_app()
except Exception as e:
    print(f"Firebase initialization warning: {e}")

# Global clients (lazy initialization)
_db = None
_bucket = None
_config = None


def get_db():
    """Lazy initialization of Firestore client."""
    global _db
    if _db is None:
        _db = firestore.client()
    return _db


def get_bucket():
    """Lazy initialization of Storage bucket client."""
    global _bucket
    if _bucket is None:
        _bucket = storage.bucket()
    return _bucket


def get_config():
    """Lazy initialization of OMR config."""
    global _config
    if _config is None:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from omr_core.pipeline import load_config
        _config = load_config()
    return _config


def error_response(error, message, status):
    """Build a JSON error response with CORS headers."""
    response = make_response(
        json.dumps({'error': error, 'message': message}, ensure_ascii=False),
        status)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# Layout cache: module-level dict to store parsed layouts
_layout_cache = {}
ALLOWED_TEMPLATES = {'T100-A4-v1', 'T060-A4-v1'}


def load_layout_from_file(template_name):
    """
    Load layout from JSON file with caching.
    
    Args:
        template_name: Template identifier (T100-A4-v1 or T060-A4-v1)
    
    Returns:
        LayoutConfig instance
    
    Raises:
        ValueError: If template is not allowed (returns 400 in caller)
        IOError: If layout file not found or cannot be parsed (returns 500 in caller)
    """
    # Check if already cached
    if template_name in _layout_cache:
        return _layout_cache[template_name]
    
    # Validate template name
    if template_name not in ALLOWED_TEMPLATES:
        raise ValueError(f'Unsupported template: {template_name}. Allowed: {ALLOWED_TEMPLATES}')
    
    # Build path to layout file
    func_dir = os.path.dirname(__file__)
    layout_file = os.path.join(func_dir, 'layouts', f'{template_name}.layout.json')
    
    try:
        # Read and parse JSON
        with open(layout_file, 'r', encoding='utf-8') as f:
            layout_data = json.load(f)
        
        # Import and deserialize with from_dict()
        from sheetgen.layout import LayoutConfig
        layout = LayoutConfig.from_dict(layout_data)
        
        # Cache for future requests
        _layout_cache[template_name] = layout
        
        return layout
    
    except FileNotFoundError as e:
        raise IOError(
            f'Layout file not found: {layout_file}. '
            f'Ensure {template_name}.layout.json exists in functions/layouts/ directory.'
        ) from e
    except json.JSONDecodeError as e:
        raise IOError(f'Invalid JSON in layout file {layout_file}: {str(e)}') from e
    except ValueError as e:
        # Re-raise ValueError from from_dict() as IOError (500 error)
        raise IOError(f'Invalid layout format in {layout_file}: {str(e)}') from e
    except Exception as e:
        raise IOError(
            f'Failed to load layout from {layout_file}: {str(e)}'
        ) from e


@functions_framework.http
def recognize_sheet(request):
    """
    Cloud Function: Recognize an OMR sheet from an uploaded image.

    Expected request:
    - Method: POST
    - Headers:
        - Authorization: Bearer <firebase_id_token>
    - Form data:
        - image: file (PNG or JPG)
        - template: string (T100-A4-v1 or T060-A4-v1)

    Returns:
    {
        "job_id": "...",
        "status": "completed",
        "result": { ... recognition result JSON ... },
        "annotated_image_url": null,
        "expires_at": "...",
        "message": "Recognition completed successfully"
    }
    """

    # CORS preflight — MUST use make_response to ensure headers are sent
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response

    # Lazy imports for omr_core modules
    try:
        import sys
        sys.path.insert(0, os.path.dirname(__file__))
        from omr_core.pipeline import recognize
        from omr_core import pdfio
    except Exception as e:
        return error_response(
            'InternalError', f'Could not load OMR modules: {str(e)}', 500)

    try:
        # Step 1: Verify authentication
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return error_response(
                'Unauthorized', 'Missing or invalid Authorization header', 401)

        token = auth_header.split('Bearer ', 1)[1]

        try:
            decoded_token = auth.verify_id_token(token)
            user_id = decoded_token['uid']
            user_email = decoded_token.get('email', 'unknown')
        except Exception as e:
            return error_response(
                'Unauthorized', f'Invalid token: {str(e)}', 401)

        # Step 2: Allowlist check (user must exist in Firestore and have org_id).
        # No fallback: if Firestore cannot be read, the request is rejected.
        try:
            user_doc = get_db().collection('users').document(user_id).get()
        except Exception as e:
            print(f"Error reading user from Firestore: {e}")
            return error_response(
                'InternalError', 'Could not verify user account', 500)

        if not user_doc.exists:
            return error_response(
                'Forbidden',
                'User account not approved. Please contact administrator.',
                403)

        user_data = user_doc.to_dict() or {}
        
        # Check if user is approved
        if not user_data.get('approved', False):
            return error_response(
                'Forbidden',
                'User account not approved. Please contact administrator.',
                403)
        
        org_id = user_data.get('org_id')
        if not org_id:
            return error_response(
                'Forbidden',
                'User org_id not set. Please contact administrator.',
                403)

        # Step 3: Check daily quota
        today_str = datetime.now(MYT).strftime('%Y-%m-%d')
        daily_limit = 100  # default
        try:
            settings_doc = get_db().collection('settings').document('global').get()
            if settings_doc.exists:
                settings = settings_doc.to_dict() or {}
                daily_limit = settings.get('daily_limit_per_teacher', 100)

            usage_doc = get_db().collection('usage').document(today_str).get()
            usage_data = (usage_doc.to_dict() or {}) if usage_doc.exists else {}
            user_usage = usage_data.get('users', {}).get(user_id, 0)
        except Exception as e:
            print(f"Warning: Could not check quota: {e}")
            user_usage = 0

        if user_usage >= daily_limit:
            response = make_response(
                json.dumps({
                    'error': 'QUOTA_EXCEEDED',
                    'message': f'Daily limit ({daily_limit}) reached',
                    'remaining': 0
                }, ensure_ascii=False),
                429)
            response.headers['Content-Type'] = 'application/json; charset=utf-8'
            response.headers['Access-Control-Allow-Origin'] = '*'
            return response

        # Step 4: Get uploaded file and template
        if 'image' not in request.files:
            return error_response(
                'BadRequest', 'Missing "image" file in form data', 400)

        image_file = request.files['image']
        template_name = request.form.get('template', 'T100-A4-v1')

        # Step 5: Read input bytes and decode pages (PNG/JPG/PDF)
        try:
            image_bytes = image_file.read()
            if not image_bytes:
                raise ValueError('Empty file')
            input_name = image_file.filename or 'upload.bin'
            page_images = list(pdfio.read_bytes(image_bytes, filename=input_name))
            if not page_images:
                raise ValueError('No decodable pages found')
        except Exception as e:
            return error_response(
                'BadRequest', f'Could not process image: {str(e)}', 400)

        # Step 6: Load layout from template parameter
        try:
            layout = load_layout_from_file(template_name)
        except ValueError as e:
            # Template name not allowed (400 Bad Request)
            return error_response(
                'BadRequest', f'Invalid template: {str(e)}', 400)
        except IOError as e:
            # File not found or parse error (500 Internal Server Error)
            return error_response(
                'InternalError', f'Could not load layout file: {str(e)}', 500)

        # Step 7: Run recognition for each page
        try:
            result_pages = []
            for page_index in range(len(page_images)):
                page_result = recognize(
                    image_bytes,
                    layout,
                    get_config(),
                    template_id=layout.template_id,
                    page_index=page_index,
                )
                result_pages.append(page_result.model_dump(mode='json'))

            if not result_pages:
                raise ValueError('Recognition returned no page results')

            result = result_pages[0]
        except Exception as e:
            return error_response(
                'InternalError', f'Recognition failed: {str(e)}', 500)

        # Step 8: Annotated image (TODO: implement visualization)
        annotated_image_url = None

        # Step 9: Create job record
        job_id = uuid.uuid4().hex
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)

        job_data = {
            'user_id': user_id,
            'user_email': user_email,
            'org_id': org_id,
            'template': template_name,
            'status': 'completed',
            'created_at': firestore.SERVER_TIMESTAMP,
            'expires_at': expires_at,
            'accuracy': result.get('summary', {}).get('overall_accuracy', 0),
            'student_id': result.get('student_id'),
            'answer_count': sum(len(p.get('answers', [])) for p in result_pages),
            'page_count': len(result_pages),
        }

        # Step 10: Save job to Firestore
        try:
            get_db().collection('jobs').document(job_id).set(job_data)
        except Exception as e:
            print(f"Error saving job to Firestore: {e}")
            return error_response(
                'InternalError', f'Could not save job: {str(e)}', 500)

        # Step 11: Save result JSON and image to Storage (optional)
        try:
            result_path = f'jobs/{job_id}/result.json'
            get_bucket().blob(result_path).upload_from_string(
                json.dumps({'results': result_pages}, indent=2, ensure_ascii=False),
                content_type='application/json'
            )

            image_path = f'jobs/{job_id}/image.png'
            ok, image_png = cv2.imencode('.png', page_images[0])
            if ok:
                get_bucket().blob(image_path).upload_from_string(
                    image_png.tobytes(), content_type='image/png')
        except Exception as e:
            print(f"Warning: Could not save files to Storage: {e}")

        # Step 12: Increment usage counter (nested field users.<uid>)
        try:
            get_db().collection('usage').document(today_str).set(
                {'users': {user_id: firestore.Increment(1)}},
                merge=True
            )
        except Exception as e:
            print(f"Warning: Could not update usage: {e}")

        # Step 13: Return success response with CORS headers
        response_data = {
            'job_id': job_id,
            'status': 'completed',
            'result': result,
            'results': result_pages,
            'annotated_image_url': annotated_image_url,
            'expires_at': expires_at.isoformat(),
            'message': 'Recognition completed successfully'
        }
        response = make_response(json.dumps(response_data, ensure_ascii=False), 200)
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response

    except Exception as e:
        print(f"Unexpected error: {e}")
        response = make_response(
            json.dumps({'error': 'InternalError', 'message': 'An unexpected error occurred'}, 
                      ensure_ascii=False), 
            500)
        response.headers['Content-Type'] = 'application/json; charset=utf-8'
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response


@functions_framework.http
def health_check(request):
    """Health check endpoint."""
    response = make_response(
        json.dumps({
            'status': 'ok',
            'service': 'OfficeOMR recognize_sheet',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }, ensure_ascii=False),
        200)
    response.headers['Content-Type'] = 'application/json; charset=utf-8'
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


# ========== M7 CALLABLE FUNCTIONS ==========
# Import M7 callable functions from separate module
# These are exposed by the firebase_functions framework automatically
try:
    from callables_m7 import (
        uploadAnswerKeyByImage,
        uploadAnswerKeyManually,
        getAnswerKey,
        recognizeAndGradeSheet,
        batchRecognizeSheets,
        cleanupJobStudentData
    )
    print("[OK] M7 callable functions imported successfully")
except ImportError as e:
    print(f"[WARNING] Could not import M7 callable functions: {e}")
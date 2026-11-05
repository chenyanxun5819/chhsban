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
import numpy as np

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
        from omr_core.layout import LayoutConfig
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

        # Step 5: Read and decode image
        try:
            image_bytes = image_file.read()
            if not image_bytes:
                raise ValueError('Empty file')

            # PNG/JPG only for now (PDF support in a later version)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)

            if image is None:
                raise ValueError('Could not decode image')
        except Exception as e:
            return error_response(
                'BadRequest', f'Could not process image: {str(e)}', 400)

        # Step 6: Load layout (TODO: fetch from Firestore instead of file)
        try:
            layout_path = os.path.join(os.path.dirname(__file__), 'layout.json')
            with open(layout_path, 'r', encoding='utf-8') as f:
                layout_dict = json.load(f)
            layout = LayoutConfig(**layout_dict)
        except Exception as e:
            print(f"Warning: Could not load layout.json: {e}")
            layout = None

        # Step 7: Run recognition
        try:
            result = recognize(image, layout, get_config())
            if not result:
                raise ValueError('Recognition returned empty result')
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
            'answer_count': len(result.get('answers', []))
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
                json.dumps(result, indent=2, ensure_ascii=False),
                content_type='application/json'
            )

            image_path = f'jobs/{job_id}/image.png'
            ok, image_png = cv2.imencode('.png', image)
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